import { useState, useCallback, useEffect, useRef } from 'react'
import { StyleConfig } from '../../../shared/utils/styleConfig'
import { snapPolygonToGrid, getGrid, worldToGrid, gridToWorld, type LatLng, type GridCoords } from '@/features/solar-panels/utils/gridSnapping'
import type { Coordinate, PanelGenerationResponse } from '@/features/solar-panels/types/panel'

interface UsePanelPlacementProps {
  map: google.maps.Map | null
  isEditMode: boolean
  existingPanels: google.maps.Polygon[]
  panelData: PanelGenerationResponse | null
  onPanelPlaced: (panel: google.maps.Polygon, gridId: number) => void
}

interface GridPanelTemplate {
  gridId: number
  width: number  // in grid units
  height: number // in grid units
}

export function usePanelPlacement({
  map,
  isEditMode,
  existingPanels,
  panelData,
  onPanelPlaced
}: UsePanelPlacementProps) {
  const [isPlacing, setIsPlacing] = useState(false)
  const [selectedGridId, setSelectedGridId] = useState<number | null>(null)
  const [availableGrids, setAvailableGrids] = useState<number[]>([])
  const ghostPanelRef = useRef<google.maps.Polygon | null>(null)
  const gridHighlightRef = useRef<google.maps.Polygon | null>(null)
  const mouseMoveListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const lastValidPositionRef = useRef<{ coords: Coordinate[]; gridId: number } | null>(null)
  const panelTemplatesRef = useRef<Map<number, GridPanelTemplate>>(new Map())

  // Performance optimization refs
  const lastGridPosRef = useRef<{ gridId: number; x: number; y: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingUpdateRef = useRef<google.maps.LatLng | null>(null)
  const spatialGridRef = useRef<Map<string, google.maps.Polygon[]>>(new Map())

  /**
   * Extract panel dimensions from generated panel data for each grid
   */
  useEffect(() => {
    if (!panelData || !panelData.roofs) {
      panelTemplatesRef.current.clear()
      setAvailableGrids([])
      setSelectedGridId(null)
      return
    }

    const templates = new Map<number, GridPanelTemplate>()
    const grids: number[] = []

    panelData.roofs.forEach((roof, gridId) => {
      if (!roof.panels || roof.panels.length === 0) return

      // Get first panel from this roof
      const firstPanel = roof.panels[0]
      const coords = firstPanel.coords || firstPanel
      if (!Array.isArray(coords) || coords.length < 4) return

      // Convert to grid space to get dimensions
      const grid = getGrid(gridId)
      if (!grid) return

      const p0 = worldToGrid({ lat: coords[0].lat, lng: coords[0].lng }, gridId)
      const p1 = worldToGrid({ lat: coords[1].lat, lng: coords[1].lng }, gridId)
      const p3 = worldToGrid({ lat: coords[3].lat, lng: coords[3].lng }, gridId)

      if (!p0 || !p1 || !p3) return

      // Calculate panel dimensions in grid units
      const width = Math.abs(p1.x - p0.x)
      const height = Math.abs(p3.y - p0.y)

      templates.set(gridId, { gridId, width, height })
      grids.push(gridId)
    })

    panelTemplatesRef.current = templates
    setAvailableGrids(grids)

    // Auto-select first grid if none selected
    if (grids.length > 0 && selectedGridId === null) {
      setSelectedGridId(grids[0])
    }
  }, [panelData, selectedGridId])

  /**
   * Create panel coordinates from grid position using the actual panel template for that grid
   */
  const createPanelCoords = useCallback((gridId: number, gridX: number, gridY: number): Coordinate[] | null => {
    const grid = getGrid(gridId)
    const template = panelTemplatesRef.current.get(gridId)

    if (!grid || !template) return null

    // Define panel corners in grid space using actual panel dimensions
    const corners: GridCoords[] = [
      { x: gridX, y: gridY }, // Bottom-left
      { x: gridX + template.width, y: gridY }, // Bottom-right
      { x: gridX + template.width, y: gridY + template.height }, // Top-right
      { x: gridX, y: gridY + template.height } // Top-left
    ]

    // Convert to world coordinates
    return corners.map(corner => {
      const worldPos = gridToWorld(corner, gridId)
      return worldPos ? { lat: worldPos.lat, lng: worldPos.lng } : null
    }).filter((coord): coord is Coordinate => coord !== null)
  }, [])

  /**
   * Calculate dynamic cell size based on latitude
   * At higher latitudes, longitude degrees represent smaller distances
   * cellSize ≈ 11 meters at all latitudes
   */
  const getCellSize = useCallback((lat: number): { latSize: number; lngSize: number } => {
    // Target cell size in meters
    const TARGET_CELL_METERS = 11

    // Latitude: 1 degree ≈ 111,320 meters (roughly constant)
    const latSize = TARGET_CELL_METERS / 111320

    // Longitude: varies with latitude
    // At equator: 1 degree ≈ 111,320 meters
    // At latitude φ: 1 degree ≈ 111,320 * cos(φ) meters
    const latRad = (Math.abs(lat) * Math.PI) / 180
    const lngMetersPerDegree = 111320 * Math.cos(latRad)
    const lngSize = lngMetersPerDegree > 0 ? TARGET_CELL_METERS / lngMetersPerDegree : latSize

    return { latSize, lngSize }
  }, [])

  /**
   * Generate deterministic grid key using fixed precision
   * Avoids floating point precision issues in string concatenation
   */
  const getGridKey = useCallback((lat: number, lng: number): string => {
    // Use 8 decimal places for lat/lng (≈1.1mm precision)
    // This ensures consistent key generation regardless of floating point errors
    const latFixed = lat.toFixed(8)
    const lngFixed = lng.toFixed(8)
    return `${latFixed}|${lngFixed}`
  }, [])

  const buildSpatialGrid = useCallback(() => {
    const grid = new Map<string, google.maps.Polygon[]>()

    for (const panel of existingPanels) {
      const path = panel.getPath()
      if (!path) continue

      const bounds = new google.maps.LatLngBounds()
      path.forEach(latLng => bounds.extend(latLng))

      const swLat = bounds.getSouthWest().lat()
      const swLng = bounds.getSouthWest().lng()
      const neLat = bounds.getNorthEast().lat()
      const neLng = bounds.getNorthEast().lng()

      const centerLat = (swLat + neLat) / 2
      const { latSize, lngSize } = getCellSize(centerLat)

      const minLatCell = Math.floor(swLat / latSize)
      const maxLatCell = Math.ceil(neLat / latSize)
      const minLngCell = Math.floor(swLng / lngSize)
      const maxLngCell = Math.ceil(neLng / lngSize)

      for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
        for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
          const cellLat = latCell * latSize
          const cellLng = lngCell * lngSize
          const key = getGridKey(cellLat, cellLng)

          const existing = grid.get(key) || []
          existing.push(panel)
          grid.set(key, existing)
        }
      }
    }

    spatialGridRef.current = grid
  }, [existingPanels, getCellSize, getGridKey])

  /**
   * Get nearby panels using spatial grid with latitude-corrected cell sizes
   */
  const getNearbyPanels = useCallback((coords: Coordinate[]): google.maps.Polygon[] => {
    if (spatialGridRef.current.size === 0) return existingPanels

    const nearbyPanels = new Set<google.maps.Polygon>()

    // Calculate center of test panel
    const centerLat = (coords[0].lat + coords[2].lat) / 2
    const centerLng = (coords[0].lng + coords[2].lng) / 2

    // Get latitude-corrected cell sizes
    const { latSize, lngSize } = getCellSize(centerLat)

    // Calculate cell indices
    const centerCellLat = Math.floor(centerLat / latSize)
    const centerCellLng = Math.floor(centerLng / lngSize)

    // Check 9 cells around the panel (3x3 grid)
    for (let latOffset = -1; latOffset <= 1; latOffset++) {
      for (let lngOffset = -1; lngOffset <= 1; lngOffset++) {
        const cellLat = (centerCellLat + latOffset) * latSize
        const cellLng = (centerCellLng + lngOffset) * lngSize
        const key = getGridKey(cellLat, cellLng)

        const panels = spatialGridRef.current.get(key)
        if (panels) {
          panels.forEach(p => nearbyPanels.add(p))
        }
      }
    }

    return Array.from(nearbyPanels)
  }, [existingPanels, getCellSize, getGridKey])

  /**
   * Check if panel position overlaps with existing panels
   * Uses multiple test points for more robust collision detection
   * This allows edge-to-edge placement (touching panels are OK)
   */
  const checkCollision = useCallback((coords: Coordinate[]): boolean => {
    if (coords.length !== 4) return true

    // Calculate center point
    const centerLat = (coords[0].lat + coords[2].lat) / 2
    const centerLng = (coords[0].lng + coords[2].lng) / 2

    // Calculate additional test points at 25% and 75% along each axis
    // This provides better detection for edge cases
    const testPoints: google.maps.LatLng[] = [
      // Center
      new google.maps.LatLng(centerLat, centerLng),
      // Quadrant centers (at 25% and 75% along each axis)
      new google.maps.LatLng(
        coords[0].lat + (centerLat - coords[0].lat) * 0.5,
        coords[0].lng + (centerLng - coords[0].lng) * 0.5
      ),
      new google.maps.LatLng(
        coords[0].lat + (centerLat - coords[0].lat) * 0.5,
        coords[0].lng + (centerLng - coords[0].lng) * 1.5
      ),
      new google.maps.LatLng(
        coords[0].lat + (centerLat - coords[0].lat) * 1.5,
        coords[0].lng + (centerLng - coords[0].lng) * 0.5
      ),
      new google.maps.LatLng(
        coords[0].lat + (centerLat - coords[0].lat) * 1.5,
        coords[0].lng + (centerLng - coords[0].lng) * 1.5
      )
    ]

    // Only check nearby panels using spatial grid
    const nearbyPanels = getNearbyPanels(coords)

    // Check if any test point is inside an existing panel
    for (const panel of nearbyPanels) {
      for (const testPoint of testPoints) {
        if (google.maps.geometry.poly.containsLocation(testPoint, panel)) {
          return true
        }
      }
    }

    return false
  }, [getNearbyPanels])

  /**
   * Find position on selected grid only
   */
  const findBestGridPosition = useCallback((latLng: google.maps.LatLng): { coords: Coordinate[]; gridId: number; hasCollision: boolean } | null => {
    if (selectedGridId === null) return null

    const lat = latLng.lat()
    const lng = latLng.lng()

    const grid = getGrid(selectedGridId)
    const template = panelTemplatesRef.current.get(selectedGridId)
    if (!grid || !template) return null

    // Convert cursor position to grid space
    const gridPos = worldToGrid({ lat, lng }, selectedGridId)
    if (!gridPos) return null

    // Offset to center the panel under the cursor
    // Subtract half the panel dimensions so cursor is at panel center
    const offsetX = gridPos.x - (template.width / 2)
    const offsetY = gridPos.y - (template.height / 2)

    // Round to nearest grid point
    const gridX = Math.round(offsetX)
    const gridY = Math.round(offsetY)

    // Check if this is the same position we already calculated
    if (lastGridPosRef.current &&
        lastGridPosRef.current.gridId === selectedGridId &&
        lastGridPosRef.current.x === gridX &&
        lastGridPosRef.current.y === gridY) {
      return null // Skip - already at this position
    }

    // Create panel at this position
    const coords = createPanelCoords(selectedGridId, gridX, gridY)
    if (!coords || coords.length !== 4) return null

    // Check collision
    const hasCollision = checkCollision(coords)

    // Store grid position to avoid redundant calculations
    lastGridPosRef.current = { gridId: selectedGridId, x: gridX, y: gridY }

    return { coords, gridId: selectedGridId, hasCollision }
  }, [selectedGridId, createPanelCoords, checkCollision])

  /**
   * Update ghost panel preview (optimized with RAF)
   */
  const updateGhostPanel = useCallback((latLng: google.maps.LatLng) => {
    if (!map) return

    const result = findBestGridPosition(latLng)
    if (!result) {
      return
    }

    const { coords, gridId, hasCollision } = result

    if (!hasCollision) {
      lastValidPositionRef.current = { coords, gridId }
    }

    const path = coords.map(c => new google.maps.LatLng(c.lat, c.lng))

    if (!ghostPanelRef.current) {
      const panelOptions = StyleConfig.getPanelOptions('default')
      ghostPanelRef.current = new google.maps.Polygon({
        paths: path,
        map,
        ...panelOptions,
        clickable: false,
        zIndex: 3000
      })
    } else {
      ghostPanelRef.current.setPaths(path)
    }

    // Keep panel appearance but adjust opacity based on collision
    ghostPanelRef.current.setOptions({
      fillOpacity: hasCollision ? 0.4 : 0.8,
      strokeOpacity: hasCollision ? 0.4 : 0.9,
      strokeWeight: hasCollision ? 1.5 : 2.0
    })
  }, [map, findBestGridPosition])

  const scheduleUpdate = useCallback((latLng: google.maps.LatLng) => {
    pendingUpdateRef.current = latLng
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (pendingUpdateRef.current) {
        updateGhostPanel(pendingUpdateRef.current)
        pendingUpdateRef.current = null
      }
    })
  }, [updateGhostPanel])

  /**
   * Place panel at current position
   */
  const placePanel = useCallback(() => {
    if (!map || !lastValidPositionRef.current) return

    const { coords, gridId } = lastValidPositionRef.current

    if (checkCollision(coords)) {
      console.warn('Cannot place panel: collision detected')
      return
    }

    const path = coords.map(c => ({ lat: c.lat, lng: c.lng }))
    const panelOptions = StyleConfig.getPanelOptions('default')

    const panel = new google.maps.Polygon({
      paths: path,
      map,
      ...panelOptions,
      clickable: true,
      isPanelElement: true
    } as google.maps.PolygonOptions & { isPanelElement: boolean })

    onPanelPlaced(panel, gridId)
    lastValidPositionRef.current = null
  }, [map, checkCollision, onPanelPlaced])

  /**
   * Start panel placement mode
   */
  const startPlacement = useCallback(() => {
    if (!map || !isEditMode || panelTemplatesRef.current.size === 0) {
      console.warn('Cannot start panel placement: no panel templates available')
      return
    }

    // Require grid selection first
    if (selectedGridId === null && availableGrids.length > 0) {
      setSelectedGridId(availableGrids[0])
    }

    // Build spatial grid for fast collision detection
    buildSpatialGrid()

    setIsPlacing(true)
    lastGridPosRef.current = null

    map.setOptions({
      draggable: false,
      scrollwheel: false,
      gestureHandling: 'none',
      disableDoubleClickZoom: true,
      clickableIcons: false
    })
  }, [map, isEditMode, selectedGridId, availableGrids, buildSpatialGrid])

  /**
   * Stop panel placement mode
   */
  const stopPlacement = useCallback(() => {
    setIsPlacing(false)

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (ghostPanelRef.current) {
      ghostPanelRef.current.setMap(null)
      ghostPanelRef.current = null
    }

    if (gridHighlightRef.current) {
      gridHighlightRef.current.setMap(null)
      gridHighlightRef.current = null
    }

    lastValidPositionRef.current = null
    lastGridPosRef.current = null
    pendingUpdateRef.current = null
    spatialGridRef.current.clear()

    if (map) {
      map.setOptions({
        draggable: !isEditMode,
        scrollwheel: !isEditMode,
        gestureHandling: isEditMode ? 'none' : 'auto',
        disableDoubleClickZoom: isEditMode
      })
    }
  }, [map, isEditMode])

  // Mouse move listener - update ghost panel with RAF throttling
  useEffect(() => {
    if (!map || !isPlacing) {
      if (mouseMoveListenerRef.current) {
        google.maps.event.removeListener(mouseMoveListenerRef.current)
        mouseMoveListenerRef.current = null
      }
      return
    }

    mouseMoveListenerRef.current = map.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        scheduleUpdate(e.latLng)
      }
    })

    return () => {
      if (mouseMoveListenerRef.current) {
        google.maps.event.removeListener(mouseMoveListenerRef.current)
        mouseMoveListenerRef.current = null
      }
    }
  }, [map, isPlacing, scheduleUpdate])

  // Click listener - place panel
  useEffect(() => {
    if (!map || !isPlacing) {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
      return
    }

    clickListenerRef.current = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      e.stop?.()
      placePanel()
    })

    return () => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
    }
  }, [map, isPlacing, placePanel])

  // ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlacing) {
        stopPlacement()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPlacing, stopPlacement])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      if (ghostPanelRef.current) {
        ghostPanelRef.current.setMap(null)
      }
      if (gridHighlightRef.current) {
        gridHighlightRef.current.setMap(null)
      }
    }
  }, [])

  return {
    isPlacing,
    startPlacement,
    stopPlacement,
    selectedGridId,
    availableGrids,
    setSelectedGridId
  }
}

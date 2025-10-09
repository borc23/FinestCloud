import { useState, useCallback, useEffect, useRef } from 'react'
import { StyleConfig } from '../utils/styleConfig'
import { snapPolygonToGrid, getGrid, worldToGrid, gridToWorld, type LatLng, type GridCoords } from '../utils/gridSnapping'
import type { Coordinate, PanelGenerationResponse } from '../types/panel'

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
   * Check if panel position overlaps with existing panels
   * Only checks if new panel's center is inside an existing panel
   * This allows edge-to-edge placement (touching panels are OK)
   */
  const checkCollision = useCallback((coords: Coordinate[]): boolean => {
    if (coords.length !== 4) return true

    // Calculate center of test panel
    const testCenterLat = (coords[0].lat + coords[2].lat) / 2
    const testCenterLng = (coords[0].lng + coords[2].lng) / 2
    const testCenter = new google.maps.LatLng(testCenterLat, testCenterLng)

    // Only check if the center of the new panel is inside an existing panel
    // This allows edge-to-edge placement while preventing overlaps
    for (const panel of existingPanels) {
      if (google.maps.geometry.poly.containsLocation(testCenter, panel)) {
        return true
      }
    }

    return false
  }, [existingPanels])

  /**
   * Find position on selected grid only
   */
  const findBestGridPosition = useCallback((latLng: google.maps.LatLng): { coords: Coordinate[]; gridId: number; hasCollision: boolean } | null => {
    if (selectedGridId === null) return null

    const lat = latLng.lat()
    const lng = latLng.lng()

    const grid = getGrid(selectedGridId)
    if (!grid) return null

    // Convert cursor position to grid space
    const gridPos = worldToGrid({ lat, lng }, selectedGridId)
    if (!gridPos) return null

    // Round to nearest grid point
    const gridX = Math.round(gridPos.x)
    const gridY = Math.round(gridPos.y)

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
    if (!result) return

    const { coords, gridId, hasCollision } = result

    // Store last valid position
    if (!hasCollision) {
      lastValidPositionRef.current = { coords, gridId }
    }

    // Update ghost panel visualization
    if (ghostPanelRef.current) {
      ghostPanelRef.current.setMap(null)
    }

    const path = coords.map(c => new google.maps.LatLng(c.lat, c.lng))
    const panelOptions = StyleConfig.getPanelOptions('default', 'STANDARD')

    ghostPanelRef.current = new google.maps.Polygon({
      paths: path,
      map,
      ...panelOptions,
      fillOpacity: hasCollision ? 0.3 : 0.5,
      strokeOpacity: hasCollision ? 0.5 : 0.8,
      fillColor: hasCollision ? '#ff453a' : '#34c759',
      strokeColor: hasCollision ? '#ff453a' : '#34c759',
      clickable: false,
      zIndex: 3000
    })
  }, [map, findBestGridPosition])

  /**
   * Throttled update with requestAnimationFrame
   */
  const scheduleUpdate = useCallback((latLng: google.maps.LatLng) => {
    pendingUpdateRef.current = latLng

    if (rafRef.current !== null) return // Already scheduled

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

    // Check collision one more time
    if (checkCollision(coords)) {
      console.warn('Cannot place panel: collision detected')
      return
    }

    const path = coords.map(c => new google.maps.LatLng(c.lat, c.lng))
    const panelOptions = StyleConfig.getPanelOptions('default', 'STANDARD')

    const panel = new google.maps.Polygon({
      paths: path,
      map,
      ...panelOptions,
      clickable: true,
      isPanelElement: true,
      moduleType: 'STANDARD'
    } as google.maps.PolygonOptions & { isPanelElement: boolean; moduleType: string })

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

    setIsPlacing(true)
    lastGridPosRef.current = null

    map.setOptions({
      draggable: false,
      scrollwheel: false,
      gestureHandling: 'none',
      disableDoubleClickZoom: true,
      clickableIcons: false
    })
  }, [map, isEditMode, selectedGridId, availableGrids])

  /**
   * Stop panel placement mode
   */
  const stopPlacement = useCallback(() => {
    setIsPlacing(false)

    // Cancel pending RAF
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

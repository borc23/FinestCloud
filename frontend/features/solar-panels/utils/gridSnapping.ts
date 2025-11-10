/**
 * Grid snapping utility for panel movement
 * Supports multiple grids (one per roof) with different orientations
 * Uses pure grid-space mathematics for precise multi-panel dragging
 */

// ============================================================================
// Types
// ============================================================================

export interface LatLng {
  lat: number
  lng: number
}

export interface Vec2 {
  lat: number
  lng: number
}

export interface GridCoords {
  x: number
  y: number
}

export interface GridDelta {
  dx: number
  dy: number
}

interface PanelData {
  roofs?: Array<{
    panels?: Array<{
      coords?: Array<{ lat: number; lng: number }>
    }>
  }>
}

// ============================================================================
// Grid Class - Pure coordinate transformation
// ============================================================================

class Grid {
  private readonly origin: LatLng
  private readonly vecX: Vec2
  private readonly vecY: Vec2
  private readonly det: number

  constructor(origin: LatLng, vecX: Vec2, vecY: Vec2) {
    this.origin = origin
    this.vecX = vecX
    this.vecY = vecY
    this.det = vecX.lat * vecY.lng - vecX.lng * vecY.lat

    if (Math.abs(this.det) < 1e-10) {
      throw new Error('Grid vectors are collinear or near-collinear (determinant ≈ 0). Cannot create valid grid.')
    }
  }

  /**
   * Convert world coordinates (lat/lng) to grid coordinates (x, y steps)
   * Uses matrix inversion to solve: fromOrigin = x * vecX + y * vecY
   */
  worldToGrid(latLng: LatLng): GridCoords {
    const fromOrigin = {
      lat: latLng.lat - this.origin.lat,
      lng: latLng.lng - this.origin.lng
    }

    return {
      x: (this.vecY.lng * fromOrigin.lat - this.vecY.lat * fromOrigin.lng) / this.det,
      y: (this.vecX.lat * fromOrigin.lng - this.vecX.lng * fromOrigin.lat) / this.det
    }
  }

  /**
   * Convert grid coordinates (x, y steps) to world coordinates (lat/lng)
   */
  gridToWorld(gridCoords: GridCoords): LatLng {
    return {
      lat: this.origin.lat + gridCoords.x * this.vecX.lat + gridCoords.y * this.vecY.lat,
      lng: this.origin.lng + gridCoords.x * this.vecX.lng + gridCoords.y * this.vecY.lng
    }
  }

  /**
   * Snap a world position to the nearest grid point
   */
  snapToGrid(latLng: LatLng): LatLng {
    const gridCoords = this.worldToGrid(latLng)
    const snapped: GridCoords = {
      x: Math.round(gridCoords.x),
      y: Math.round(gridCoords.y)
    }
    return this.gridToWorld(snapped)
  }

  /**
   * Calculate grid delta between two world positions
   * Returns how many grid steps (dx, dy) to move from 'from' to 'to'
   */
  calculateGridDelta(from: LatLng, to: LatLng): GridDelta {
    const fromGrid = this.worldToGrid(from)
    const toGrid = this.worldToGrid(to)
    return {
      dx: toGrid.x - fromGrid.x,
      dy: toGrid.y - fromGrid.y
    }
  }

  /**
   * Apply a grid delta to a position
   */
  applyGridDelta(startPos: LatLng, delta: GridDelta, snap = true): LatLng {
    const startGrid = this.worldToGrid(startPos)
    const newGrid: GridCoords = {
      x: startGrid.x + delta.dx,
      y: startGrid.y + delta.dy
    }

    if (snap) {
      newGrid.x = Math.round(newGrid.x)
      newGrid.y = Math.round(newGrid.y)
    }

    return this.gridToWorld(newGrid)
  }
}

// ============================================================================
// GridManager - Manages multiple grids and polygon associations
// ============================================================================

class GridManager {
  private grids: Grid[] = []
  private polygonToGridId = new WeakMap<google.maps.Polygon, number>()
  private snapCache = new Map<string, { gridId: number; timestamp: number }>()

  /**
   * Initialize grids from panel data
   */
  setGridsFromPanelData(panelData: PanelData): void {
    this.grids = []

    if (!panelData?.roofs) return

    panelData.roofs.forEach(roof => {
      if (roof.panels && roof.panels.length > 0) {
        const grid = this.createGridFromPanels(roof.panels)
        if (grid) {
          this.grids.push(grid)
        }
      }
    })
  }

  /**
   * Create a Grid instance from panel coordinates
   */
  private createGridFromPanels(panels: Array<{ coords?: Array<LatLng> }>): Grid | null {
    if (!panels || panels.length === 0) return null

    const panel = panels[0]
    const coords: LatLng[] | undefined = ('coords' in panel) ? panel.coords : (panel as any as LatLng[])

    if (coords && Array.isArray(coords) && coords.length >= 4) {
      const p0: LatLng = { lat: coords[0].lat, lng: coords[0].lng }
      const p1: LatLng = { lat: coords[1].lat, lng: coords[1].lng }
      const p3: LatLng = { lat: coords[3].lat, lng: coords[3].lng }

      const vecX: Vec2 = { lat: p1.lat - p0.lat, lng: p1.lng - p0.lng }
      const vecY: Vec2 = { lat: p3.lat - p0.lat, lng: p3.lng - p0.lng }

      return new Grid(p0, vecX, vecY)
    }

    return null
  }

  /**
   * Clear all grids
   */
  clear(): void {
    this.grids = []
    this.snapCache.clear()
  }

  /**
   * Tag a polygon with its grid ID
   */
  tagPolygon(polygon: google.maps.Polygon, gridId: number): void {
    this.polygonToGridId.set(polygon, gridId)
  }

  /**
   * Get grid ID for a polygon
   */
  getPolygonGridId(polygon: google.maps.Polygon): number | undefined {
    return this.polygonToGridId.get(polygon)
  }

  /**
   * Get a grid by ID
   */
  getGrid(gridId: number): Grid | null {
    return this.grids[gridId] ?? null
  }

  /**
   * Snap a polygon's path to its grid
   * @param polygon Optional - if provided and tagged, uses its specific grid; otherwise finds closest grid
   */
  snapPolygonToGrid(path: google.maps.LatLng[], polygon?: google.maps.Polygon): google.maps.LatLng[] {
    if (this.grids.length === 0 || path.length === 0) return path

    const firstCorner = { lat: path[0].lat(), lng: path[0].lng() }
    let snappedFirst: LatLng

    if (polygon) {
      const gridId = this.polygonToGridId.get(polygon)
      if (gridId !== undefined) {
        const grid = this.getGrid(gridId)
        snappedFirst = grid ? grid.snapToGrid(firstCorner) : firstCorner
      } else {
        snappedFirst = this.snapToClosestGrid(firstCorner)
      }
    } else {
      snappedFirst = this.snapToClosestGrid(firstCorner)
    }

    // Apply offset to entire polygon
    const offsetLat = snappedFirst.lat - firstCorner.lat
    const offsetLng = snappedFirst.lng - firstCorner.lng

    return path.map(ll =>
      new google.maps.LatLng(ll.lat() + offsetLat, ll.lng() + offsetLng)
    )
  }

  /**
   * Snap to the closest grid (fallback when gridId is unknown)
   * Uses spatial cache to avoid O(n) grid search on every operation
   */
  private snapToClosestGrid(latLng: LatLng): LatLng {
    if (this.grids.length === 0) return latLng

    // Create cache key based on quantized position (100m resolution)
    const cacheKey = `${Math.round(latLng.lat * 1000)},${Math.round(latLng.lng * 1000)}`
    const now = Date.now()
    const cached = this.snapCache.get(cacheKey)

    // Use cached grid if available and recent (< 5 seconds)
    if (cached && now - cached.timestamp < 5000) {
      const grid = this.grids[cached.gridId]
      if (grid) {
        return grid.snapToGrid(latLng)
      }
    }

    // Find closest grid
    let closestGridId = 0
    let closestSnap = latLng
    let minDistance = Infinity

    this.grids.forEach((grid, index) => {
      const snapped = grid.snapToGrid(latLng)
      const distance = Math.sqrt(
        Math.pow(snapped.lat - latLng.lat, 2) +
        Math.pow(snapped.lng - latLng.lng, 2)
      )

      if (distance < minDistance) {
        minDistance = distance
        closestSnap = snapped
        closestGridId = index
      }
    })

    // Cache the result
    this.snapCache.set(cacheKey, { gridId: closestGridId, timestamp: now })

    // Limit cache size to prevent memory leaks
    if (this.snapCache.size > 1000) {
      const oldestKey = this.snapCache.keys().next().value
      if (oldestKey !== undefined) {
        this.snapCache.delete(oldestKey)
      }
    }

    return closestSnap
  }
}

// ============================================================================
// Singleton Instance & Public API
// ============================================================================

const gridManager = new GridManager()

/**
 * Set grid vectors from panel data (called when panels are generated)
 */
export function setGridVectors(panelData: PanelData): void {
  gridManager.setGridsFromPanelData(panelData)
}

/**
 * Clear all grid vectors (called when panels are cleared)
 */
export function clearGridVectors(): void {
  gridManager.clear()
}

/**
 * Tag a panel polygon with its grid ID
 */
export function tagPanelWithGrid(polygon: google.maps.Polygon, gridId: number): void {
  gridManager.tagPolygon(polygon, gridId)
}

/**
 * Get the grid ID for a polygon
 */
export function getPolygonGridId(polygon: google.maps.Polygon): number | undefined {
  return gridManager.getPolygonGridId(polygon)
}

/**
 * Snap a polygon path to its grid
 */
export function snapPolygonToGrid(path: google.maps.LatLng[], polygon?: google.maps.Polygon): google.maps.LatLng[] {
  return gridManager.snapPolygonToGrid(path, polygon)
}

/**
 * Get grid instance for advanced operations
 */
export function getGrid(gridId: number): Grid | null {
  return gridManager.getGrid(gridId)
}

/**
 * Convert world coordinates to grid coordinates
 */
export function worldToGrid(latLng: LatLng, gridId: number): GridCoords | null {
  const grid = gridManager.getGrid(gridId)
  if (!grid) throw new Error(`Invalid gridId: ${gridId}`)
  return grid.worldToGrid(latLng)
}

/**
 * Convert grid coordinates to world coordinates
 */
export function gridToWorld(gridCoords: GridCoords, gridId: number): LatLng | null {
  const grid = gridManager.getGrid(gridId)
  if (!grid) throw new Error(`Invalid gridId: ${gridId}`)
  return grid.gridToWorld(gridCoords)
}

/**
 * Calculate grid delta between two positions
 */
export function calculateGridDelta(from: LatLng, to: LatLng, gridId: number): GridDelta | null {
  const grid = gridManager.getGrid(gridId)
  if (!grid) throw new Error(`Invalid gridId: ${gridId}`)
  return grid.calculateGridDelta(from, to)
}

/**
 * Apply grid delta to a position
 */
export function applyGridDelta(startPos: LatLng, delta: GridDelta, gridId: number, snap = true): LatLng | null {
  const grid = gridManager.getGrid(gridId)
  if (!grid) throw new Error(`Invalid gridId: ${gridId}`)
  return grid.applyGridDelta(startPos, delta, snap)
}

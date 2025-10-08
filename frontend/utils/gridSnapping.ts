/**
 * Grid snapping utility for panel movement
 * Supports multiple grids (one per roof) with different orientations
 * Each panel is tagged with its gridId for O(1) lookup
 */

interface GridVectors {
  origin: { lat: number; lng: number }
  vecX: { lat: number; lng: number }
  vecY: { lat: number; lng: number }
}

interface ExtendedPolygon extends google.maps.Polygon {
  gridId?: number
}

let cachedGrids: GridVectors[] = []
const polygonToGridMap = new WeakMap<google.maps.Polygon, number>()

/**
 * Calculate grid vectors for a single roof's panels
 */
function calculateGridVectorsForRoof(panels: any[]): GridVectors | null {
  if (!panels || panels.length === 0) return null

  const panel = panels[0]
  const coords = panel.coords || panel
  if (coords.length === 4) {
    const p0 = { lat: coords[0].lat, lng: coords[0].lng }
    const p1 = { lat: coords[1].lat, lng: coords[1].lng }
    const p3 = { lat: coords[3].lat, lng: coords[3].lng }

    return {
      origin: p0,
      vecX: { lat: p1.lat - p0.lat, lng: p1.lng - p0.lng },
      vecY: { lat: p3.lat - p0.lat, lng: p3.lng - p0.lng }
    }
  }

  return null
}

/**
 * Set grid vectors (called when panels are generated)
 * Calculates separate grid for each roof
 */
export function setGridVectors(panelData: any) {
  cachedGrids = []

  if (!panelData?.roofs) return

  // Calculate grid for each roof
  panelData.roofs.forEach((roof: any) => {
    if (roof.panels && roof.panels.length > 0) {
      const grid = calculateGridVectorsForRoof(roof.panels)
      if (grid) {
        cachedGrids.push(grid)
      }
    }
  })
}

/**
 * Clear grid vectors (called when panels are cleared)
 */
export function clearGridVectors() {
  cachedGrids = []
  // WeakMap clears automatically when polygons are garbage collected
}

/**
 * Tag a panel polygon with its grid ID and detect if it's on half-step
 * Called during panel generation to associate panel with its grid
 */
export function tagPanelWithGrid(polygon: google.maps.Polygon, gridId: number) {
  polygonToGridMap.set(polygon, gridId)
  ;(polygon as ExtendedPolygon).gridId = gridId
}

/**
 * Snap to a specific grid by ID with optional half-step constraint
 * O(1) performance using direct grid lookup
 */
function snapToGridById(latLng: { lat: number; lng: number }, gridId: number): { lat: number; lng: number } {
  if (gridId < 0 || gridId >= cachedGrids.length) return latLng

  const grid = cachedGrids[gridId]
  const { origin, vecX, vecY } = grid

  // Vector from origin to point
  const fromOrigin = {
    lat: latLng.lat - origin.lat,
    lng: latLng.lng - origin.lng
  }

  // Project onto grid axes
  const magXSq = vecX.lat * vecX.lat + vecX.lng * vecX.lng
  const magYSq = vecY.lat * vecY.lat + vecY.lng * vecY.lng

  const dotX = fromOrigin.lat * vecX.lat + fromOrigin.lng * vecX.lng
  const dotY = fromOrigin.lat * vecY.lat + fromOrigin.lng * vecY.lng

  // Grid coordinates in floating point
  const gridX = dotX / magXSq
  const gridY = dotY / magYSq

  // Snap to nearest 0.5 grid (allows both integer and half-step positions)
  const snappedGridX = Math.round(gridX * 2) / 2
  const snappedGridY = Math.round(gridY)

  // Convert back to lat/lng
  return {
    lat: origin.lat + snappedGridX * vecX.lat + snappedGridY * vecY.lat,
    lng: origin.lng + snappedGridX * vecX.lng + snappedGridY * vecY.lng
  }
}

/**
 * Snap an entire polygon path to grid
 * Uses the polygon's tagged gridId and half-step info for O(1) lookup
 * Falls back to closest grid if no tag found
 */
export function snapPolygonToGrid(path: google.maps.LatLng[], polygon?: google.maps.Polygon): google.maps.LatLng[] {
  if (cachedGrids.length === 0 || path.length === 0) return path

  const firstCorner = { lat: path[0].lat(), lng: path[0].lng() }
  let snappedFirst: { lat: number; lng: number }

  // Try to get gridId from polygon
  if (polygon) {
    const gridId = polygonToGridMap.get(polygon) ?? (polygon as ExtendedPolygon).gridId
    if (gridId !== undefined) {
      // O(1) direct lookup
      snappedFirst = snapToGridById(firstCorner, gridId)
    } else {
      // Fallback: find closest grid (for non-tagged polygons)
      snappedFirst = snapToClosestGrid(firstCorner)
    }
  } else {
    // No polygon reference, use closest grid
    snappedFirst = snapToClosestGrid(firstCorner)
  }

  // Calculate offset
  const offsetLat = snappedFirst.lat - firstCorner.lat
  const offsetLng = snappedFirst.lng - firstCorner.lng

  // Apply same offset to all corners
  return path.map(ll =>
    new google.maps.LatLng(ll.lat() + offsetLat, ll.lng() + offsetLng)
  )
}

/**
 * Fallback: Find closest grid by distance (used when gridId not available)
 */
function snapToClosestGrid(latLng: { lat: number; lng: number }): { lat: number; lng: number } {
  if (cachedGrids.length === 0) return latLng

  let closestSnap = latLng
  let minDistance = Infinity

  cachedGrids.forEach((_, gridId) => {
    const snapped = snapToGridById(latLng, gridId)
    const distance = Math.sqrt(
      Math.pow(snapped.lat - latLng.lat, 2) +
      Math.pow(snapped.lng - latLng.lng, 2)
    )

    if (distance < minDistance) {
      minDistance = distance
      closestSnap = snapped
    }
  })

  return closestSnap
}

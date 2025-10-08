/**
 * Grid snapping utility for panel movement
 * Snaps panel positions to either normal grid or half-step grid
 */

interface GridVectors {
  origin: { lat: number; lng: number }
  vecX: { lat: number; lng: number }
  vecY: { lat: number; lng: number }
}

let cachedGridVectors: GridVectors | null = null

/**
 * Calculate and cache grid vectors from panel data
 */
export function calculateGridVectors(panelData: any): GridVectors | null {
  if (!panelData?.roofs) return null

  // Extract first panel to get grid vectors
  for (const roof of panelData.roofs) {
    if (roof.panels && roof.panels.length > 0) {
      const panel = roof.panels[0]
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
    }
  }

  return null
}

/**
 * Set grid vectors (called when panels are generated)
 */
export function setGridVectors(panelData: any) {
  cachedGridVectors = calculateGridVectors(panelData)
}

/**
 * Clear grid vectors (called when panels are cleared)
 */
export function clearGridVectors() {
  cachedGridVectors = null
}

/**
 * Snap a lat/lng point to the nearest grid position
 * Considers both normal grid (0.0) and half-step grid (0.5)
 */
export function snapToGrid(latLng: { lat: number; lng: number }): { lat: number; lng: number } {
  if (!cachedGridVectors) return latLng

  const { origin, vecX, vecY } = cachedGridVectors

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
 */
export function snapPolygonToGrid(path: google.maps.LatLng[]): google.maps.LatLng[] {
  if (!cachedGridVectors || path.length === 0) return path

  // Snap first corner
  const firstCorner = { lat: path[0].lat(), lng: path[0].lng() }
  const snappedFirst = snapToGrid(firstCorner)

  // Calculate offset
  const offsetLat = snappedFirst.lat - firstCorner.lat
  const offsetLng = snappedFirst.lng - firstCorner.lng

  // Apply same offset to all corners
  return path.map(ll =>
    new google.maps.LatLng(ll.lat() + offsetLat, ll.lng() + offsetLng)
  )
}

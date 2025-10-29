/**
 * Polygon utility functions for Google Maps operations
 */

export interface PolygonCoordinates {
  lat: number
  lng: number
}

/**
 * Extract coordinates from a Google Maps Polygon
 * @param polygon - Google Maps Polygon
 * @returns Array of coordinates with lat/lng
 */
export function extractPolygonCoordinates(polygon: google.maps.Polygon): PolygonCoordinates[] {
  const path = polygon.getPath()
  const coords: PolygonCoordinates[] = []

  for (let i = 0; i < path.getLength(); i++) {
    const point = path.getAt(i)
    coords.push({
      lat: point.lat(),
      lng: point.lng()
    })
  }

  return coords
}

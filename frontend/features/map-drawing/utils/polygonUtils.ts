/**
 * Polygon utility functions for Google Maps operations
 */

import type { Coordinate } from "@/features/solar-panels/types/panel";

/**
 * Extract coordinates from a Google Maps Polygon
 */
export function extractPolygonCoordinates(
  polygon: google.maps.Polygon,
): Coordinate[] {
  return polygon
    .getPath()
    .getArray()
    .map((point) => ({ lat: point.lat(), lng: point.lng() }));
}

/**
 * Average of the given points ({0, 0} for an empty list)
 */
export function calculateCentroid(coords: Coordinate[]): Coordinate {
  if (coords.length === 0) return { lat: 0, lng: 0 };
  const sum = coords.reduce(
    (acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
}

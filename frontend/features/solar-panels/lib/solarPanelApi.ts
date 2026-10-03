/**
 * Solar API client: fetches Solar API data for each roof polygon
 */

import {
  calculateCentroid,
  extractPolygonCoordinates,
} from "@/features/map-drawing/utils/polygonUtils";
import type { SolarDataSegment } from "@/features/solar-panels/types/panel";

/**
 * Fetch solar data for each polygon from the backend. Polygons without
 * coverage get `solarData: null` so the user can enter values manually.
 */
export function fetchSolarDataForPolygons(
  roofPolygons: google.maps.Polygon[],
): Promise<SolarDataSegment[]> {
  return Promise.all(
    roofPolygons.map(async (polygon, index) => {
      const coords = extractPolygonCoordinates(polygon);
      const center = calculateCentroid(coords);
      let solarData: SolarDataSegment["solarData"] = null;

      try {
        const response = await fetch(
          `/api/generate_panels?latitude=${center.lat}&longitude=${center.lng}`,
        );
        if (response.ok) {
          solarData = await response.json();
        } else {
          console.warn(
            `Solar API not available for polygon ${index} at ${center.lat}, ${center.lng}`,
          );
        }
      } catch (fetchError) {
        console.warn(
          `Failed to fetch solar data for polygon ${index}:`,
          fetchError,
        );
      }

      return { polygonIndex: index, coords, center, solarData };
    }),
  );
}

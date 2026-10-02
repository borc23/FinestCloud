/**
 * Solar Panel Generation API Service
 * Modern React implementation for calling Solar API and generating panel data
 */

import {
  extractPolygonCoordinates,
  type PolygonCoordinates,
} from "@/features/map-drawing/utils/polygonUtils";
import type { SolarDataSegment } from "@/features/solar-panels/types/panel";

interface SolarApiResponse {
  success: boolean;
  data?: SolarDataSegment[];
  error?: string;
  coverageWarning?: string;
}

export class SolarPanelApiService {
  /**
   * Fetch solar data for each polygon from the backend
   * @param roofPolygons - Array of Google Maps polygons representing roofs
   */
  async fetchSolarDataForPolygons(
    roofPolygons: google.maps.Polygon[],
  ): Promise<SolarApiResponse> {
    try {
      const polygonDataPromises = roofPolygons.map(async (polygon, index) => {
        // Get polygon center for the API call
        const coords = extractPolygonCoordinates(polygon);
        const center = this.calculatePolygonCenter(coords);

        // Call the solar API proxy for this polygon via Next.js API route
        const apiUrl = `/api/generate_panels?latitude=${center.lat}&longitude=${center.lng}`;

        try {
          const response = await fetch(apiUrl);

          if (!response.ok) {
            // If API fails, return minimal structure for manual input
            console.warn(
              `Solar API not available for polygon ${index} at ${center.lat}, ${center.lng}`,
            );
            return {
              polygonIndex: index,
              coords,
              center,
              solarData: null, // No data available - user will input manually
            };
          }

          const data = await response.json();

          return {
            polygonIndex: index,
            coords,
            center,
            solarData: data,
          };
        } catch (fetchError) {
          // Network or parsing error - return minimal structure
          console.warn(
            `Failed to fetch solar data for polygon ${index}:`,
            fetchError,
          );
          return {
            polygonIndex: index,
            coords,
            center,
            solarData: null,
          };
        }
      });

      // Wait for all polygon data to be fetched
      const polygonResults = await Promise.all(polygonDataPromises);

      return {
        success: true,
        data: polygonResults,
      };
    } catch (error) {
      console.error("Error fetching solar panel data:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Calculate the center point of a polygon
   * @param coords - Array of polygon coordinates
   */
  private calculatePolygonCenter(coords: PolygonCoordinates[]): {
    lat: number;
    lng: number;
  } {
    if (coords.length === 0) {
      throw new Error("Cannot calculate center of empty polygon");
    }

    let totalLat = 0;
    let totalLng = 0;

    coords.forEach((coord) => {
      totalLat += coord.lat;
      totalLng += coord.lng;
    });

    return {
      lat: totalLat / coords.length,
      lng: totalLng / coords.length,
    };
  }

  /**
   * Get map bounds from a Google Maps instance
   * @param map - Google Maps instance
   */
  getMapBounds(map: google.maps.Map): { center: { lat: number; lng: number } } {
    const center = map.getCenter();

    if (!center) {
      throw new Error("Unable to get map center");
    }

    return {
      center: {
        lat: center.lat(),
        lng: center.lng(),
      },
    };
  }
}

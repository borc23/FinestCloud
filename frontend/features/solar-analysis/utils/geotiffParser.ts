/**
 * GeoTIFF Parser Utility
 * Parses and decodes GeoTIFF files from Google Solar API data layers
 */

import { fromArrayBuffer, GeoTIFF } from "geotiff";
import proj4 from "proj4";

export interface GeoTIFFData {
  width: number;
  height: number;
  rasters: Float32Array[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  min: number;
  max: number;
}

/**
 * Parse GeoTIFF from ArrayBuffer (for already downloaded data)
 */
export async function parseGeoTIFFFromBuffer(
  buffer: ArrayBuffer,
): Promise<GeoTIFFData> {
  try {
    const tiff: GeoTIFF = await fromArrayBuffer(buffer);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const rasters = await image.readRasters({ samples: [0] });
    const bbox = image.getBoundingBox();
    const geoKeys = image.getGeoKeys();

    let bounds = {
      west: bbox[0],
      south: bbox[1],
      east: bbox[2],
      north: bbox[3],
    };

    // Reproject anything that isn't already WGS84 (EPSG:4326)
    const sourceEpsg: number | null =
      geoKeys.ProjectedCSTypeGeoKey ||
      (geoKeys.GeographicTypeGeoKey !== 4326 && geoKeys.GeographicTypeGeoKey) ||
      null;

    if (sourceEpsg) {
      try {
        const fromProj = `EPSG:${sourceEpsg}`;
        const toProj = "EPSG:4326"; // WGS84 lat/lng for Google Maps

        // Sample points along all four edges: projected bboxes aren't rectangles in lat/lng
        const extentX = bbox[2] - bbox[0]; // meters
        const extentY = bbox[3] - bbox[1]; // meters
        const lngs: number[] = [];
        const lats: number[] = [];

        for (let i = 0; i < 5; i++) {
          const t = i / 4;
          const x = bbox[0] + extentX * t;
          const y = bbox[1] + extentY * t;
          for (const point of [
            [x, bbox[1]], // Bottom edge
            [x, bbox[3]], // Top edge
            [bbox[0], y], // Left edge
            [bbox[2], y], // Right edge
          ]) {
            const [lng, lat] = proj4(fromProj, toProj, point);
            lngs.push(lng);
            lats.push(lat);
          }
        }

        bounds = {
          west: Math.min(...lngs),
          south: Math.min(...lats),
          east: Math.max(...lngs),
          north: Math.max(...lats),
        };
      } catch (error) {
        console.warn(
          `Failed to reproject GeoTIFF from EPSG:${sourceEpsg}; overlay will be misaligned`,
          error,
        );
      }
    } else if (Math.abs(bbox[0]) > 180 || Math.abs(bbox[2]) > 180) {
      console.warn(
        "GeoTIFF appears to be in projected coordinates but no EPSG code found",
      );
    }

    const data = rasters[0] as Float32Array;

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      if (value < min) min = value;
      if (value > max) max = value;
    }

    return {
      width,
      height,
      rasters: [data],
      bounds,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse GeoTIFF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Query GeoTIFF values for multiple coordinates (batch operation)
 * Batch lookup: opens the raster once for all coordinates
 *
 * @param geotiffData - Parsed GeoTIFF data (already in WGS84)
 * @param coordinates - Array of {lat, lng} coordinates in WGS84
 * @returns Array of values (null for out of bounds or no-data)
 */
export function getValuesAtCoordinates(
  geotiffData: GeoTIFFData,
  coordinates: { lat: number; lng: number }[],
): (number | null)[] {
  return coordinates.map(({ lat, lng }) => {
    // Check bounds
    if (
      lat < geotiffData.bounds.south ||
      lat > geotiffData.bounds.north ||
      lng < geotiffData.bounds.west ||
      lng > geotiffData.bounds.east
    ) {
      return null;
    }

    // Convert to pixel coordinates
    const x = Math.floor(
      ((lng - geotiffData.bounds.west) /
        (geotiffData.bounds.east - geotiffData.bounds.west)) *
        geotiffData.width,
    );
    const y = Math.floor(
      ((geotiffData.bounds.north - lat) /
        (geotiffData.bounds.north - geotiffData.bounds.south)) *
        geotiffData.height,
    );

    // Clamp and get value
    const clampedX = Math.max(0, Math.min(geotiffData.width - 1, x));
    const clampedY = Math.max(0, Math.min(geotiffData.height - 1, y));
    const index = clampedY * geotiffData.width + clampedX;
    const value = geotiffData.rasters[0][index];

    return isNaN(value) ? null : value;
  });
}

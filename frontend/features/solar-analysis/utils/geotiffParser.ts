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
    const rasters = await image.readRasters();
    const bbox = image.getBoundingBox();
    const geoKeys = image.getGeoKeys();

    let bounds = {
      west: bbox[0],
      south: bbox[1],
      east: bbox[2],
      north: bbox[3],
    };

    let needsReprojection = false;
    let sourceEpsg: number | null = null;

    if (geoKeys.ProjectedCSTypeGeoKey) {
      sourceEpsg = geoKeys.ProjectedCSTypeGeoKey;
      needsReprojection = true;
    } else if (
      geoKeys.GeographicTypeGeoKey &&
      geoKeys.GeographicTypeGeoKey !== 4326
    ) {
      sourceEpsg = geoKeys.GeographicTypeGeoKey;
      needsReprojection = true;
    } else if (Math.abs(bbox[0]) > 180 || Math.abs(bbox[2]) > 180) {
      console.warn(
        "GeoTIFF appears to be in projected coordinates but no EPSG code found",
      );
      console.warn("This may cause alignment issues - check GeoTIFF metadata");
    }

    if (needsReprojection && sourceEpsg) {
      try {
        const fromProj = `EPSG:${sourceEpsg}`;
        const toProj = "EPSG:4326"; // WGS84 lat/lng for Google Maps

        const extentX = bbox[2] - bbox[0]; // meters
        const extentY = bbox[3] - bbox[1]; // meters
        const sampleCount = 5;
        let minLng = Infinity,
          maxLng = -Infinity;
        let minLat = Infinity,
          maxLat = -Infinity;

        for (let i = 0; i < sampleCount; i++) {
          const t = i / (sampleCount - 1);

          // Bottom edge
          const [lngB, latB] = proj4(fromProj, toProj, [
            bbox[0] + extentX * t,
            bbox[1],
          ]);
          // Top edge
          const [lngT, latT] = proj4(fromProj, toProj, [
            bbox[0] + extentX * t,
            bbox[3],
          ]);
          // Left edge
          const [lngL, latL] = proj4(fromProj, toProj, [
            bbox[0],
            bbox[1] + extentY * t,
          ]);
          // Right edge
          const [lngR, latR] = proj4(fromProj, toProj, [
            bbox[2],
            bbox[1] + extentY * t,
          ]);

          minLng = Math.min(minLng, lngB, lngT, lngL, lngR);
          maxLng = Math.max(maxLng, lngB, lngT, lngL, lngR);
          minLat = Math.min(minLat, latB, latT, latL, latR);
          maxLat = Math.max(maxLat, latB, latT, latL, latR);
        }

        bounds = {
          west: minLng,
          south: minLat,
          east: maxLng,
          north: maxLat,
        };
      } catch (error) {
        console.error("Failed to reproject coordinates:", error);
        console.error("Source EPSG:", sourceEpsg);
        console.warn("Using untransformed bounds - overlay WILL be misaligned");
      }
    } else if (
      geoKeys.GeographicTypeGeoKey === 4326 ||
      (!geoKeys.ProjectedCSTypeGeoKey && !geoKeys.GeographicTypeGeoKey)
    ) {
      console.info("GeoTIFF is already in WGS84 (EPSG:4326) or assumed to be");
    }

    let data = rasters[0] as Float32Array;

    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      if (value !== null && value !== undefined && !isNaN(value)) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
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
    console.error("Error parsing GeoTIFF from buffer:", error);
    throw new Error(
      `Failed to parse GeoTIFF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Convert GeoTIFF data to RGBA canvas data for visualization
 * Uses a color scale to represent values (e.g., blue = low, red = high)
 */
export function geotiffToRGBA(
  data: Float32Array,
  width: number,
  height: number,
  min: number,
  max: number,
  colorScale: "viridis" | "heat" | "sunshine" = "sunshine",
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    const idx = i * 4;

    // Handle no-data values
    if (value === null || value === undefined || isNaN(value)) {
      rgba[idx] = 0; // R
      rgba[idx + 1] = 0; // G
      rgba[idx + 2] = 0; // B
      rgba[idx + 3] = 0; // A (transparent)
      continue;
    }

    // Normalize value to 0-1 range
    const normalized = max > min ? (value - min) / (max - min) : 0;

    // Apply color scale
    const color = getColorFromScale(normalized, colorScale);

    rgba[idx] = color.r;
    rgba[idx + 1] = color.g;
    rgba[idx + 2] = color.b;
    rgba[idx + 3] = 200; // Semi-transparent overlay
  }

  return rgba;
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

    return value === null || value === undefined || isNaN(value) ? null : value;
  });
}

/**
 * Calculate centroid of a polygon
 */
export function calculateCentroid(coords: { lat: number; lng: number }[]): {
  lat: number;
  lng: number;
} {
  const total = coords.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.lat,
      lng: acc.lng + coord.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: total.lat / coords.length,
    lng: total.lng / coords.length,
  };
}

/**
 * Get RGB color from value and color scale
 */
function getColorFromScale(
  normalized: number,
  scale: "viridis" | "heat" | "sunshine",
): { r: number; g: number; b: number } {
  // Clamp to 0-1
  const t = Math.max(0, Math.min(1, normalized));

  switch (scale) {
    case "sunshine":
      // Blue (low) -> Yellow (medium) -> Red (high)
      if (t < 0.5) {
        // Blue to yellow
        const t2 = t * 2;
        return {
          r: Math.round(t2 * 255),
          g: Math.round(t2 * 255),
          b: Math.round((1 - t2) * 255),
        };
      } else {
        // Yellow to red
        const t2 = (t - 0.5) * 2;
        return {
          r: 255,
          g: Math.round((1 - t2) * 255),
          b: 0,
        };
      }

    case "heat":
      // Black -> Red -> Yellow -> White
      if (t < 0.33) {
        const t2 = t * 3;
        return { r: Math.round(t2 * 255), g: 0, b: 0 };
      } else if (t < 0.67) {
        const t2 = (t - 0.33) * 3;
        return { r: 255, g: Math.round(t2 * 255), b: 0 };
      } else {
        const t2 = (t - 0.67) * 3;
        return { r: 255, g: 255, b: Math.round(t2 * 255) };
      }

    case "viridis":
      // Approximate viridis color scale
      // Purple -> Blue -> Green -> Yellow
      if (t < 0.25) {
        const t2 = t * 4;
        return {
          r: Math.round(68 + t2 * (32 - 68)),
          g: Math.round(1 + t2 * (79 - 1)),
          b: Math.round(84 + t2 * (138 - 84)),
        };
      } else if (t < 0.5) {
        const t2 = (t - 0.25) * 4;
        return {
          r: Math.round(32 + t2 * (42 - 32)),
          g: Math.round(79 + t2 * (120 - 79)),
          b: Math.round(138 + t2 * (142 - 138)),
        };
      } else if (t < 0.75) {
        const t2 = (t - 0.5) * 4;
        return {
          r: Math.round(42 + t2 * (138 - 42)),
          g: Math.round(120 + t2 * (176 - 120)),
          b: Math.round(142 + t2 * (64 - 142)),
        };
      } else {
        const t2 = (t - 0.75) * 4;
        return {
          r: Math.round(138 + t2 * (253 - 138)),
          g: Math.round(176 + t2 * (231 - 176)),
          b: Math.round(64 + t2 * (37 - 64)),
        };
      }

    default:
      return { r: 255, g: 0, b: 0 };
  }
}

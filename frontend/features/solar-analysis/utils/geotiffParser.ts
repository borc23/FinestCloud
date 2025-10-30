/**
 * GeoTIFF Parser Utility
 * Parses and decodes GeoTIFF files from Google Solar API data layers
 */

import { fromUrl, fromArrayBuffer, GeoTIFF } from 'geotiff'
import proj4 from 'proj4'

export interface GeoTIFFData {
  width: number
  height: number
  rasters: Float32Array[]
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  min: number
  max: number
}

export interface GeoTIFFMetadata {
  width: number
  height: number
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  resolution: number
}

/**
 * Fetch and parse a GeoTIFF file from a URL
 */
export async function parseGeoTIFFFromUrl(url: string): Promise<GeoTIFFData> {
  try {
    console.log('Fetching GeoTIFF from URL:', url)

    const tiff: GeoTIFF = await fromUrl(url)
    const image = await tiff.getImage()

    // Get image dimensions
    const width = image.getWidth()
    const height = image.getHeight()

    console.log('GeoTIFF dimensions:', { width, height })

    // Read raster data
    const rasters = await image.readRasters()

    // Get bounding box
    const bbox = image.getBoundingBox()
    const bounds = {
      west: bbox[0],
      south: bbox[1],
      east: bbox[2],
      north: bbox[3]
    }

    console.log('GeoTIFF bounds:', bounds)

    // Calculate min/max values for normalization
    const data = rasters[0] as Float32Array
    let min = Infinity
    let max = -Infinity

    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      if (value !== null && value !== undefined && !isNaN(value)) {
        if (value < min) min = value
        if (value > max) max = value
      }
    }

    console.log('GeoTIFF value range:', { min, max })

    return {
      width,
      height,
      rasters: [data],
      bounds,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max
    }
  } catch (error) {
    console.error('Error parsing GeoTIFF:', error)
    throw new Error(`Failed to parse GeoTIFF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse GeoTIFF from ArrayBuffer (for already downloaded data)
 */
export async function parseGeoTIFFFromBuffer(buffer: ArrayBuffer): Promise<GeoTIFFData> {
  try {
    const tiff: GeoTIFF = await fromArrayBuffer(buffer)
    const image = await tiff.getImage()

    const width = image.getWidth()
    const height = image.getHeight()

    const rasters = await image.readRasters()

    // Get bounding box and projection information
    const bbox = image.getBoundingBox()
    console.log('GeoTIFF raw bbox:', bbox)

    // Get the projection information
    const geoKeys = image.getGeoKeys()
    console.log('GeoTIFF GeoKeys:', geoKeys)

    let bounds = {
      west: bbox[0],
      south: bbox[1],
      east: bbox[2],
      north: bbox[3]
    }

    // Determine source coordinate system and reproject to WGS84 if needed
    let needsReprojection = false
    let sourceEpsg: number | null = null

    // Check for projected coordinate system
    if (geoKeys.ProjectedCSTypeGeoKey) {
      sourceEpsg = geoKeys.ProjectedCSTypeGeoKey
      needsReprojection = true
    }
    // Check for geographic coordinate system (might not be WGS84)
    else if (geoKeys.GeographicTypeGeoKey && geoKeys.GeographicTypeGeoKey !== 4326) {
      sourceEpsg = geoKeys.GeographicTypeGeoKey
      needsReprojection = true
    }
    // If no explicit CRS but coordinates look projected (large values)
    else if (Math.abs(bbox[0]) > 180 || Math.abs(bbox[2]) > 180) {
      console.warn('GeoTIFF appears to be in projected coordinates but no EPSG code found')
      console.warn('This may cause alignment issues - check GeoTIFF metadata')
    }

    // Perform reprojection if needed
    if (needsReprojection && sourceEpsg) {
      try {
        const fromProj = `EPSG:${sourceEpsg}`
        const toProj = 'EPSG:4326' // WGS84 lat/lng for Google Maps

        // Transform all four corners for accuracy
        const [westLng, southLat] = proj4(fromProj, toProj, [bbox[0], bbox[1]])
        const [eastLng, northLat] = proj4(fromProj, toProj, [bbox[2], bbox[3]])

        bounds = {
          west: westLng,
          south: southLat,
          east: eastLng,
          north: northLat
        }

      } catch (error) {
        console.error('Failed to reproject coordinates:', error)
        console.error('Source EPSG:', sourceEpsg)
        console.warn('Using untransformed bounds - overlay WILL be misaligned')
      }
    } else if (geoKeys.GeographicTypeGeoKey === 4326 || (!geoKeys.ProjectedCSTypeGeoKey && !geoKeys.GeographicTypeGeoKey)) {
      console.log('GeoTIFF is already in WGS84 (EPSG:4326) or assumed to be')
    }

    const data = rasters[0] as Float32Array
    let min = Infinity
    let max = -Infinity

    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      if (value !== null && value !== undefined && !isNaN(value)) {
        if (value < min) min = value
        if (value > max) max = value
      }
    }

    return {
      width,
      height,
      rasters: [data],
      bounds,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max
    }
  } catch (error) {
    console.error('Error parsing GeoTIFF from buffer:', error)
    throw new Error(`Failed to parse GeoTIFF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get metadata from GeoTIFF without loading full raster data
 */
export async function getGeoTIFFMetadata(url: string): Promise<GeoTIFFMetadata> {
  try {
    const tiff: GeoTIFF = await fromUrl(url)
    const image = await tiff.getImage()

    const width = image.getWidth()
    const height = image.getHeight()

    const bbox = image.getBoundingBox()
    const bounds = {
      west: bbox[0],
      south: bbox[1],
      east: bbox[2],
      north: bbox[3]
    }

    // Calculate resolution in meters per pixel
    const resolution = image.getResolution()[0]

    return {
      width,
      height,
      bounds,
      resolution
    }
  } catch (error) {
    console.error('Error getting GeoTIFF metadata:', error)
    throw new Error(`Failed to get GeoTIFF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
  colorScale: 'viridis' | 'heat' | 'sunshine' = 'sunshine'
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4)

  for (let i = 0; i < data.length; i++) {
    const value = data[i]
    const idx = i * 4

    // Handle no-data values
    if (value === null || value === undefined || isNaN(value)) {
      rgba[idx] = 0     // R
      rgba[idx + 1] = 0 // G
      rgba[idx + 2] = 0 // B
      rgba[idx + 3] = 0 // A (transparent)
      continue
    }

    // Normalize value to 0-1 range
    const normalized = max > min ? (value - min) / (max - min) : 0

    // Apply color scale
    const color = getColorFromScale(normalized, colorScale)

    rgba[idx] = color.r
    rgba[idx + 1] = color.g
    rgba[idx + 2] = color.b
    rgba[idx + 3] = 200 // Semi-transparent overlay
  }

  return rgba
}

/**
 * Query GeoTIFF value at specific coordinates
 *
 * @param geotiffData - Parsed GeoTIFF data (already in WGS84)
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 * @returns The value at the specified coordinates, or null if out of bounds
 */
export function getValueAtCoordinate(
  geotiffData: GeoTIFFData,
  lat: number,
  lng: number
): number | null {
  // Check if coordinates are within bounds
  if (
    lat < geotiffData.bounds.south ||
    lat > geotiffData.bounds.north ||
    lng < geotiffData.bounds.west ||
    lng > geotiffData.bounds.east
  ) {
    return null
  }

  // Convert lat/lng to pixel coordinates
  const x = Math.floor(
    ((lng - geotiffData.bounds.west) / (geotiffData.bounds.east - geotiffData.bounds.west)) * geotiffData.width
  )
  const y = Math.floor(
    ((geotiffData.bounds.north - lat) / (geotiffData.bounds.north - geotiffData.bounds.south)) * geotiffData.height
  )

  // Clamp to valid pixel range
  const clampedX = Math.max(0, Math.min(geotiffData.width - 1, x))
  const clampedY = Math.max(0, Math.min(geotiffData.height - 1, y))

  // Get value from raster data
  const index = clampedY * geotiffData.width + clampedX
  const value = geotiffData.rasters[0][index]

  // Return null for no-data values
  if (value === null || value === undefined || isNaN(value)) {
    return null
  }

  return value
}

/**
 * Query GeoTIFF values for multiple coordinates (batch operation)
 * More efficient than calling getValueAtCoordinate multiple times
 *
 * @param geotiffData - Parsed GeoTIFF data (already in WGS84)
 * @param coordinates - Array of {lat, lng} coordinates in WGS84
 * @returns Array of values (null for out of bounds or no-data)
 */
export function getValuesAtCoordinates(
  geotiffData: GeoTIFFData,
  coordinates: { lat: number; lng: number }[]
): (number | null)[] {
  return coordinates.map(({ lat, lng }) => {
    // Check bounds
    if (
      lat < geotiffData.bounds.south ||
      lat > geotiffData.bounds.north ||
      lng < geotiffData.bounds.west ||
      lng > geotiffData.bounds.east
    ) {
      return null
    }

    // Convert to pixel coordinates
    const x = Math.floor(
      ((lng - geotiffData.bounds.west) / (geotiffData.bounds.east - geotiffData.bounds.west)) * geotiffData.width
    )
    const y = Math.floor(
      ((geotiffData.bounds.north - lat) / (geotiffData.bounds.north - geotiffData.bounds.south)) * geotiffData.height
    )

    // Clamp and get value
    const clampedX = Math.max(0, Math.min(geotiffData.width - 1, x))
    const clampedY = Math.max(0, Math.min(geotiffData.height - 1, y))
    const index = clampedY * geotiffData.width + clampedX
    const value = geotiffData.rasters[0][index]

    return (value === null || value === undefined || isNaN(value)) ? null : value
  })
}

/**
 * Calculate centroid of a polygon
 */
export function calculateCentroid(coords: { lat: number; lng: number }[]): { lat: number; lng: number } {
  const total = coords.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.lat,
      lng: acc.lng + coord.lng
    }),
    { lat: 0, lng: 0 }
  )

  return {
    lat: total.lat / coords.length,
    lng: total.lng / coords.length
  }
}

/**
 * Get RGB color from value and color scale
 */
function getColorFromScale(
  normalized: number,
  scale: 'viridis' | 'heat' | 'sunshine'
): { r: number; g: number; b: number } {
  // Clamp to 0-1
  const t = Math.max(0, Math.min(1, normalized))

  switch (scale) {
    case 'sunshine':
      // Blue (low) -> Yellow (medium) -> Red (high)
      if (t < 0.5) {
        // Blue to yellow
        const t2 = t * 2
        return {
          r: Math.round(t2 * 255),
          g: Math.round(t2 * 255),
          b: Math.round((1 - t2) * 255)
        }
      } else {
        // Yellow to red
        const t2 = (t - 0.5) * 2
        return {
          r: 255,
          g: Math.round((1 - t2) * 255),
          b: 0
        }
      }

    case 'heat':
      // Black -> Red -> Yellow -> White
      if (t < 0.33) {
        const t2 = t * 3
        return { r: Math.round(t2 * 255), g: 0, b: 0 }
      } else if (t < 0.67) {
        const t2 = (t - 0.33) * 3
        return { r: 255, g: Math.round(t2 * 255), b: 0 }
      } else {
        const t2 = (t - 0.67) * 3
        return { r: 255, g: 255, b: Math.round(t2 * 255) }
      }

    case 'viridis':
      // Approximate viridis color scale
      // Purple -> Blue -> Green -> Yellow
      if (t < 0.25) {
        const t2 = t * 4
        return {
          r: Math.round(68 + t2 * (32 - 68)),
          g: Math.round(1 + t2 * (79 - 1)),
          b: Math.round(84 + t2 * (138 - 84))
        }
      } else if (t < 0.5) {
        const t2 = (t - 0.25) * 4
        return {
          r: Math.round(32 + t2 * (42 - 32)),
          g: Math.round(79 + t2 * (120 - 79)),
          b: Math.round(138 + t2 * (142 - 138))
        }
      } else if (t < 0.75) {
        const t2 = (t - 0.5) * 4
        return {
          r: Math.round(42 + t2 * (138 - 42)),
          g: Math.round(120 + t2 * (176 - 120)),
          b: Math.round(142 + t2 * (64 - 142))
        }
      } else {
        const t2 = (t - 0.75) * 4
        return {
          r: Math.round(138 + t2 * (253 - 138)),
          g: Math.round(176 + t2 * (231 - 176)),
          b: Math.round(64 + t2 * (37 - 64))
        }
      }

    default:
      return { r: 255, g: 0, b: 0 }
  }
}

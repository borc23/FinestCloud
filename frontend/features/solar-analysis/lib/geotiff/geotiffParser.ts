/**
 * GeoTIFF Parser for Google Solar API Shade Maps
 * Parses hourly shade URLs to extract pixel-level shade data
 */

import { fromUrl, fromArrayBuffer } from 'geotiff'
import type { GeoTIFF, GeoTIFFImage } from 'geotiff'

export interface GeoTIFFBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface GeoTIFFMetadata {
  width: number
  height: number
  bounds: GeoTIFFBounds
  pixelWidth: number
  pixelHeight: number
  origin: { lat: number; lng: number }
}

export class GeoTIFFParser {
  private tiff: GeoTIFF | null = null
  private image: GeoTIFFImage | null = null
  private rasterData: Uint8Array | null = null
  private metadata: GeoTIFFMetadata | null = null

  /**
   * Load GeoTIFF from URL
   */
  async loadFromUrl(url: string): Promise<void> {
    try {
      this.tiff = await fromUrl(url)
      await this.parseImage()
    } catch (error) {
      console.error('Error loading GeoTIFF from URL:', error)
      throw new Error(`Failed to load GeoTIFF: ${error}`)
    }
  }

  /**
   * Load GeoTIFF from ArrayBuffer (for cached data)
   */
  async loadFromBuffer(buffer: ArrayBuffer): Promise<void> {
    try {
      this.tiff = await fromArrayBuffer(buffer)
      await this.parseImage()
    } catch (error) {
      console.error('Error loading GeoTIFF from buffer:', error)
      throw new Error(`Failed to load GeoTIFF: ${error}`)
    }
  }

  /**
   * Parse the GeoTIFF image and extract metadata
   */
  private async parseImage(): Promise<void> {
    if (!this.tiff) {
      throw new Error('GeoTIFF not loaded')
    }

    this.image = await this.tiff.getImage()
    const width = this.image.getWidth()
    const height = this.image.getHeight()

    // Get bounding box from GeoTIFF metadata
    const bbox = this.image.getBoundingBox()
    const bounds: GeoTIFFBounds = {
      minLng: bbox[0],
      minLat: bbox[1],
      maxLng: bbox[2],
      maxLat: bbox[3],
    }

    // Calculate pixel size
    const pixelWidth = (bounds.maxLng - bounds.minLng) / width
    const pixelHeight = (bounds.maxLat - bounds.minLat) / height

    this.metadata = {
      width,
      height,
      bounds,
      pixelWidth,
      pixelHeight,
      origin: { lat: bounds.maxLat, lng: bounds.minLng },
    }

    // Read raster data
    const rasters = await this.image.readRasters()
    this.rasterData = rasters[0] as Uint8Array
  }

  /**
   * Get shade value at specific lat/lng coordinates
   * @returns Shade value (0-255, where 0 = full sun, 255 = full shade) or null if outside bounds
   */
  getShadeAtLocation(latitude: number, longitude: number): number | null {
    if (!this.metadata || !this.rasterData) {
      throw new Error('GeoTIFF not loaded or parsed')
    }

    const { bounds, width, height, origin, pixelWidth, pixelHeight } = this.metadata

    // Check if location is within bounds
    if (
      latitude < bounds.minLat ||
      latitude > bounds.maxLat ||
      longitude < bounds.minLng ||
      longitude > bounds.maxLng
    ) {
      return null
    }

    // Convert lat/lng to pixel coordinates
    const x = Math.floor((longitude - origin.lng) / pixelWidth)
    const y = Math.floor((origin.lat - latitude) / pixelHeight)

    // Bounds check
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return null
    }

    // Get pixel value
    const index = y * width + x
    return this.rasterData[index]
  }

  /**
   * Get average shade value for a polygon (panel)
   * Samples multiple points within the polygon for accuracy
   */
  getAverageShadeForPolygon(coordinates: { lat: number; lng: number }[]): number | null {
    if (!this.metadata || !this.rasterData) {
      throw new Error('GeoTIFF not loaded or parsed')
    }

    // Calculate bounding box of polygon
    const lats = coordinates.map(c => c.lat)
    const lngs = coordinates.map(c => c.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Calculate centroid
    const centroidLat = (minLat + maxLat) / 2
    const centroidLng = (minLng + maxLng) / 2

    // Sample grid: center + 4 corners + 4 midpoints = 9 samples
    const samplePoints = [
      { lat: centroidLat, lng: centroidLng }, // Center
      { lat: minLat, lng: minLng }, // Bottom-left
      { lat: maxLat, lng: minLng }, // Top-left
      { lat: minLat, lng: maxLng }, // Bottom-right
      { lat: maxLat, lng: maxLng }, // Top-right
      { lat: centroidLat, lng: minLng }, // Left midpoint
      { lat: centroidLat, lng: maxLng }, // Right midpoint
      { lat: minLat, lng: centroidLat }, // Bottom midpoint
      { lat: maxLat, lng: centroidLat }, // Top midpoint
    ]

    // Get shade values for all sample points
    const shadeValues: number[] = []
    for (const point of samplePoints) {
      const shade = this.getShadeAtLocation(point.lat, point.lng)
      if (shade !== null) {
        shadeValues.push(shade)
      }
    }

    // Return null if no valid samples
    if (shadeValues.length === 0) {
      return null
    }

    // Calculate average
    const sum = shadeValues.reduce((a, b) => a + b, 0)
    return sum / shadeValues.length
  }

  /**
   * Convert shade value (0-255) to shade percentage (0-100%)
   */
  shadeValueToPercentage(shadeValue: number): number {
    return (shadeValue / 255) * 100
  }

  /**
   * Convert shade percentage to loss factor (0-1)
   * Loss factor represents the amount of production retained (1 = no shade, 0 = full shade)
   */
  shadePercentageToLossFactor(shadePercentage: number): number {
    // Non-linear conversion: shade impact is more severe at higher percentages
    // This accounts for the fact that partial shading can significantly reduce panel output
    const normalizedShade = shadePercentage / 100
    return Math.pow(1 - normalizedShade, 1.2) // Slightly exponential falloff
  }

  /**
   * Get metadata about the loaded GeoTIFF
   */
  getMetadata(): GeoTIFFMetadata | null {
    return this.metadata
  }

  /**
   * Check if a location is within the GeoTIFF bounds
   */
  isLocationInBounds(latitude: number, longitude: number): boolean {
    if (!this.metadata) return false
    const { bounds } = this.metadata
    return (
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat &&
      longitude >= bounds.minLng &&
      longitude <= bounds.maxLng
    )
  }
}

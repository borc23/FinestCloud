/**
 * Data Layers API Service
 * Service for fetching GeoTIFF data layers from Google Solar API
 */

import type {
  DataLayersResponse,
  DataLayersApiResponse,
  DataLayersRequest
} from '@/features/solar-analysis/types/solar-api'

export class DataLayersApiService {
  private baseUrl = '/api/solar-data-layers'
  private cachedData: Map<string, DataLayersResponse> = new Map()
  private cacheTimestamp: Map<string, number> = new Map()
  private cacheTTL: number = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  private inFlightRequests: Map<string, Promise<DataLayersResponse>> = new Map()

  /**
   * Get data layers for a specific location
   */
  async getDataLayers(
    latitude: number,
    longitude: number,
    radiusMeters: number = 50,
    requiredQuality: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH'
  ): Promise<DataLayersResponse> {
    const cacheKey = this.getCacheKey(latitude, longitude, radiusMeters)

    // Check cache
    if (this.isCachedDataValid(cacheKey)) {
      const cached = this.cachedData.get(cacheKey)
      if (cached) {
        console.log('Returning cached data layers')
        return cached
      }
    }

    // Check if there's an in-flight request
    const inFlight = this.inFlightRequests.get(cacheKey)
    if (inFlight) {
      console.log('Waiting for in-flight data layers request')
      return inFlight
    }

    // Create new request
    const requestPromise = this.executeDataLayersRequest(
      latitude,
      longitude,
      radiusMeters,
      requiredQuality
    )
    this.inFlightRequests.set(cacheKey, requestPromise)

    try {
      const data = await requestPromise
      // Cache the result
      this.cachedData.set(cacheKey, data)
      this.cacheTimestamp.set(cacheKey, Date.now())
      console.log('Data layers fetched and cached successfully')
      return data
    } finally {
      this.inFlightRequests.delete(cacheKey)
    }
  }

  /**
   * Execute data layers request
   */
  private async executeDataLayersRequest(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    requiredQuality: 'LOW' | 'MEDIUM' | 'HIGH'
  ): Promise<DataLayersResponse> {
    const requestBody: DataLayersRequest = {
      location: {
        latitude,
        longitude,
      },
      radiusMeters,
      requiredQuality,
      view: 'IMAGERY_AND_ANNUAL_FLUX_LAYERS', // Focus on annual flux for now
      pixelSizeMeters: 0.5, // High resolution
    }

    console.log('Fetching data layers:', requestBody)

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch data layers: ${response.statusText}`)
    }

    const result: DataLayersApiResponse = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get data layers')
    }

    return result.data
  }

  /**
   * Get cache key for location and radius
   */
  private getCacheKey(latitude: number, longitude: number, radiusMeters: number): string {
    // Round to 5 decimal places (~1m precision)
    const lat = Math.round(latitude * 100000) / 100000
    const lng = Math.round(longitude * 100000) / 100000
    return `${lat},${lng},${radiusMeters}`
  }

  /**
   * Check if cached data is still valid
   */
  private isCachedDataValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamp.get(cacheKey)
    if (!timestamp) return false

    const age = Date.now() - timestamp
    return age < this.cacheTTL
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cachedData.clear()
    this.cacheTimestamp.clear()
    this.inFlightRequests.clear()
  }

  /**
   * Clear cache for specific location
   */
  clearLocationCache(latitude: number, longitude: number, radiusMeters: number = 50): void {
    const cacheKey = this.getCacheKey(latitude, longitude, radiusMeters)
    this.cachedData.delete(cacheKey)
    this.cacheTimestamp.delete(cacheKey)
  }
}

// Export singleton instance
export const dataLayersApi = new DataLayersApiService()

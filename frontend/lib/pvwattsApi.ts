/**
 * PVWatts API Service
 * Service for fetching accurate solar production data from NREL PVWatts API
 */

import type {
  PVWattsRequest,
  PVWattsSystemRequest,
  PVWattsResponse,
  MonthlyProductionData,
  PVWattsCalculationParams
} from '@/types/pvwatts'

export class PVWattsApiService {
  private baseUrl = '/api/pvwatts'
  private cachedData: PVWattsResponse | null = null
  private lastRequestParams: PVWattsCalculationParams | null = null
  private cacheTimestamp: number | null = null
  private cacheTTL: number = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  private inFlightRequest: Promise<PVWattsResponse> | null = null
  private inFlightParams: PVWattsCalculationParams | null = null

  /**
   * Calculate solar production using PVWatts API
   */
  async calculateProduction(params: PVWattsCalculationParams): Promise<PVWattsResponse> {
    // Check cache
    if (this.isCachedDataValid(params) && this.cachedData) {
      return this.cachedData
    }

    // Check if there's an in-flight request with the same parameters
    if (this.inFlightRequest && this.paramsMatch(this.inFlightParams, params)) {
      return this.inFlightRequest
    }

    // Create new request
    this.inFlightParams = params
    this.inFlightRequest = this.executeCalculation(params)

    try {
      const data = await this.inFlightRequest
      // Cache the result with timestamp
      this.cachedData = data
      this.lastRequestParams = params
      this.cacheTimestamp = Date.now()
      return data
    } finally {
      this.inFlightRequest = null
      this.inFlightParams = null
    }
  }

  private async executeCalculation(params: PVWattsCalculationParams): Promise<PVWattsResponse> {
    const requestData: PVWattsRequest = {
      latitude: params.latitude,
      longitude: params.longitude,
      panel_count: params.panelCount,
      panel_wattage: params.panelWattage,
      tilt: params.tilt || 20,
      azimuth: params.azimuth || 180
    }

    const response = await fetch(`${this.baseUrl}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      let errorMessage = `PVWatts API request failed with status ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.detail || errorMessage
      } catch {
        // Response is not JSON, use status text or default message
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    return await response.json()
  }

  /**
   * Calculate production by system capacity
   */
  async calculateBySystemCapacity(params: {
    latitude: number
    longitude: number
    systemCapacity: number
    tilt?: number
    azimuth?: number
  }): Promise<PVWattsResponse> {
    const requestData: PVWattsSystemRequest = {
      latitude: params.latitude,
      longitude: params.longitude,
      system_capacity: params.systemCapacity,
      tilt: params.tilt || 20,
      azimuth: params.azimuth || 180
    }

    const response = await fetch(`${this.baseUrl}/calculate_system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      let errorMessage = `PVWatts API request failed with status ${response.status}`
      try {
        const error = await response.json()
        errorMessage = error.detail || errorMessage
      } catch {
        // Response is not JSON, use status text or default message
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    return await response.json()
  }

  /**
   * Get month names for labeling
   */
  getMonthNames(): string[] {
    return [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
  }

  /**
   * Format monthly data for display
   */
  formatMonthlyData(monthlyProduction: number[]): MonthlyProductionData[] {
    const months = this.getMonthNames()
    return monthlyProduction.map((production, index) => ({
      month: months[index],
      production: Math.round(production),
      productionKwh: production
    }))
  }

  /**
   * Check if two parameter sets match
   */
  private paramsMatch(
    params1: PVWattsCalculationParams | null,
    params2: PVWattsCalculationParams
  ): boolean {
    if (!params1) {
      return false
    }

    return (
      params1.latitude === params2.latitude &&
      params1.longitude === params2.longitude &&
      params1.panelCount === params2.panelCount &&
      params1.panelWattage === params2.panelWattage &&
      (params1.tilt || 20) === (params2.tilt || 20) &&
      (params1.azimuth || 180) === (params2.azimuth || 180)
    )
  }

  /**
   * Check if cached data is valid for given parameters
   */
  private isCachedDataValid(params: PVWattsCalculationParams): boolean {
    if (!this.cachedData || !this.lastRequestParams || !this.cacheTimestamp) {
      return false
    }

    // Check if cache has expired
    const cacheAge = Date.now() - this.cacheTimestamp
    if (cacheAge > this.cacheTTL) {
      return false
    }

    return this.paramsMatch(this.lastRequestParams, params)
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData = null
    this.lastRequestParams = null
    this.cacheTimestamp = null
  }

  /**
   * Set cache TTL (time-to-live) in milliseconds
   */
  setCacheTTL(ttlMs: number): void {
    this.cacheTTL = ttlMs
  }

  /**
   * Get current cache TTL in milliseconds
   */
  getCacheTTL(): number {
    return this.cacheTTL
  }

  /**
   * Get cached data if available
   */
  getCachedData(): PVWattsResponse | null {
    return this.cachedData
  }
}

// Export default instance for convenience
// Consumers can import the class to create their own instances for testing/DI
export const pvwattsApi = new PVWattsApiService()

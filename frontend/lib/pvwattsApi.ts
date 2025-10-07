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

  /**
   * Calculate solar production using PVWatts API
   */
  async calculateProduction(params: PVWattsCalculationParams): Promise<PVWattsResponse> {
    // Check cache
    if (this.isCachedDataValid(params)) {
      console.log('Using cached PVWatts data')
      return this.cachedData!
    }

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
      const error = await response.json()
      throw new Error(error.detail || 'PVWatts API request failed')
    }

    const data: PVWattsResponse = await response.json()

    // Cache the result
    this.cachedData = data
    this.lastRequestParams = params

    return data
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
      const error = await response.json()
      throw new Error(error.detail || 'PVWatts API request failed')
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
   * Check if cached data is valid for given parameters
   */
  private isCachedDataValid(params: PVWattsCalculationParams): boolean {
    if (!this.cachedData || !this.lastRequestParams) {
      return false
    }

    const lastParams = this.lastRequestParams
    return (
      lastParams.latitude === params.latitude &&
      lastParams.longitude === params.longitude &&
      lastParams.panelCount === params.panelCount &&
      lastParams.panelWattage === params.panelWattage &&
      (lastParams.tilt || 20) === (params.tilt || 20) &&
      (lastParams.azimuth || 180) === (params.azimuth || 180)
    )
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData = null
    this.lastRequestParams = null
  }

  /**
   * Get cached data if available
   */
  getCachedData(): PVWattsResponse | null {
    return this.cachedData
  }
}

// Export singleton instance
export const pvwattsApi = new PVWattsApiService()

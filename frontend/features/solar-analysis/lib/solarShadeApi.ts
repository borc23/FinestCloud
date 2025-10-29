/**
 * Solar Shade API Service
 * Service for fetching shade analysis data from Google Solar API
 */

import type {
  ShadeAnalysis,
  SolarShadeResponse,
  ShadeImpactSummary,
  PanelShadeData
} from '@/features/solar-analysis/types/solar-api'

export class SolarShadeApiService {
  private baseUrl = '/api/solar-shade'
  private cachedData: Map<string, ShadeAnalysis> = new Map()
  private cacheTimestamp: Map<string, number> = new Map()
  private cacheTTL: number = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  private inFlightRequests: Map<string, Promise<ShadeAnalysis>> = new Map()

  /**
   * Get shade analysis for a specific location
   */
  async getShadeAnalysis(
    latitude: number,
    longitude: number,
    requiredQuality: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH'
  ): Promise<ShadeAnalysis> {
    const cacheKey = this.getCacheKey(latitude, longitude)

    // Check cache
    if (this.isCachedDataValid(cacheKey)) {
      const cached = this.cachedData.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Check if there's an in-flight request
    const inFlight = this.inFlightRequests.get(cacheKey)
    if (inFlight) {
      return inFlight
    }

    // Create new request
    const requestPromise = this.executeShadeAnalysis(latitude, longitude, requiredQuality)
    this.inFlightRequests.set(cacheKey, requestPromise)

    try {
      const data = await requestPromise
      // Cache the result
      this.cachedData.set(cacheKey, data)
      this.cacheTimestamp.set(cacheKey, Date.now())
      return data
    } finally {
      this.inFlightRequests.delete(cacheKey)
    }
  }

  /**
   * Execute shade analysis request
   */
  private async executeShadeAnalysis(
    latitude: number,
    longitude: number,
    requiredQuality: 'LOW' | 'MEDIUM' | 'HIGH'
  ): Promise<ShadeAnalysis> {
    const response = await fetch(`${this.baseUrl}/building-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        requiredQuality,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch shade analysis: ${response.statusText}`)
    }

    const result: SolarShadeResponse = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get shade analysis')
    }

    return result.data
  }

  /**
   * Calculate shade impact for placed panels
   */
  calculateShadeImpact(
    shadeAnalysis: ShadeAnalysis,
    totalPanels: number,
    annualProductionKwh: number,
    electricityRateEuro: number
  ): ShadeImpactSummary {
    const shadeLossFactor = shadeAnalysis.shadeLossFactor
    const shadePercentage = shadeAnalysis.shadePercentage

    // Calculate energy loss
    const estimatedAnnualLoss = annualProductionKwh * (1 - shadeLossFactor)

    // Calculate financial loss
    const estimatedFinancialLoss = estimatedAnnualLoss * electricityRateEuro

    // Generate recommendation
    let recommendation = ''
    if (shadePercentage < 5) {
      recommendation = 'Excellent! Minimal shade impact on your solar panels.'
    } else if (shadePercentage < 15) {
      recommendation = 'Good solar potential with minor shade. Consider microinverters for optimal performance.'
    } else if (shadePercentage < 25) {
      recommendation = 'Moderate shade detected. Microinverters or power optimizers are recommended to maximize production.'
    } else {
      recommendation = 'Significant shade detected. Microinverters strongly recommended. Consider tree trimming to improve solar access.'
    }

    return {
      totalPanels,
      averageShadePercentage: shadePercentage,
      totalShadeLossFactor: shadeLossFactor,
      estimatedAnnualLoss: Math.round(estimatedAnnualLoss),
      estimatedFinancialLoss: Math.round(estimatedFinancialLoss),
      recommendation,
    }
  }

  /**
   * Map shade data to individual panels
   */
  mapShadeToPanels(
    shadeAnalysis: ShadeAnalysis,
    panelCount: number,
    annualProductionKwh: number
  ): PanelShadeData[] {
    const { roofSegmentShade } = shadeAnalysis
    const panels: PanelShadeData[] = []

    // If we have Google Solar API panel data, use it
    if (shadeAnalysis.buildingInsights.solarPotential.solarPanels.length > 0) {
      const solarPanels = shadeAnalysis.buildingInsights.solarPotential.solarPanels

      solarPanels.slice(0, panelCount).forEach((panel, index) => {
        const segment = roofSegmentShade.find(s => s.segmentIndex === panel.segmentIndex)
        const shadeLoss = segment ? segment.shadeLossFactor : shadeAnalysis.shadeLossFactor

        panels.push({
          panelIndex: index,
          center: panel.center,
          segmentIndex: panel.segmentIndex,
          shadePercentage: segment ? segment.shadePercentage : shadeAnalysis.shadePercentage,
          shadeLossFactor: shadeLoss,
          yearlyEnergyDcKwh: panel.yearlyEnergyDcKwh,
          adjustedYearlyEnergyDcKwh: panel.yearlyEnergyDcKwh * shadeLoss,
        })
      })
    } else {
      // Fallback: distribute panels across roof segments
      const panelsPerSegment = Math.ceil(panelCount / roofSegmentShade.length)
      const avgProduction = annualProductionKwh / panelCount

      roofSegmentShade.forEach((segment, segIndex) => {
        for (let i = 0; i < panelsPerSegment && panels.length < panelCount; i++) {
          panels.push({
            panelIndex: panels.length,
            center: { latitude: 0, longitude: 0 }, // Will need actual panel positions
            segmentIndex: segIndex,
            shadePercentage: segment.shadePercentage,
            shadeLossFactor: segment.shadeLossFactor,
            yearlyEnergyDcKwh: avgProduction,
            adjustedYearlyEnergyDcKwh: avgProduction * segment.shadeLossFactor,
          })
        }
      })
    }

    return panels
  }

  /**
   * Get shade data for a specific panel location (lat/lng)
   * Finds the closest roof segment and returns its shade data
   */
  getShadeDataByLocation(
    shadeAnalysis: ShadeAnalysis,
    latitude: number,
    longitude: number
  ): { shadePercentage: number; shadeLossFactor: number } | null {
    const { roofSegmentShade, buildingInsights } = shadeAnalysis

    // Try to find matching panel from Google Solar API data
    if (buildingInsights.solarPotential.solarPanels.length > 0) {
      const solarPanels = buildingInsights.solarPotential.solarPanels

      // Find closest panel to given location
      let closestPanel = null
      let minDistance = Infinity

      for (const panel of solarPanels) {
        const distance = this.getDistance(
          latitude,
          longitude,
          panel.center.latitude,
          panel.center.longitude
        )
        if (distance < minDistance) {
          minDistance = distance
          closestPanel = panel
        }
      }

      if (closestPanel && minDistance < 0.0001) { // ~10 meters
        const segment = roofSegmentShade.find(s => s.segmentIndex === closestPanel!.segmentIndex)
        if (segment) {
          return {
            shadePercentage: segment.shadePercentage,
            shadeLossFactor: segment.shadeLossFactor
          }
        }
      }
    }

    // Fallback: return average
    return {
      shadePercentage: shadeAnalysis.shadePercentage,
      shadeLossFactor: shadeAnalysis.shadeLossFactor
    }
  }

  /**
   * Calculate distance between two lat/lng points (simple approximation)
   */
  private getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dlat = lat2 - lat1
    const dlng = lng2 - lng1
    return Math.sqrt(dlat * dlat + dlng * dlng)
  }

  /**
   * Get cache key for location
   */
  private getCacheKey(latitude: number, longitude: number): string {
    // Round to 5 decimal places (~1m precision)
    const lat = Math.round(latitude * 100000) / 100000
    const lng = Math.round(longitude * 100000) / 100000
    return `${lat},${lng}`
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
  clearLocationCache(latitude: number, longitude: number): void {
    const cacheKey = this.getCacheKey(latitude, longitude)
    this.cachedData.delete(cacheKey)
    this.cacheTimestamp.delete(cacheKey)
  }
}

// Export singleton instance
export const solarShadeApi = new SolarShadeApiService()

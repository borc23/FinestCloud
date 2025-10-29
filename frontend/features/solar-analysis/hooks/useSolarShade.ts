/**
 * useSolarShade Hook
 * React hook for managing solar shade analysis with automatic caching
 */

import { useState, useEffect, useCallback } from 'react'
import { solarShadeApi, SolarShadeApiService } from '@/features/solar-analysis/lib/solarShadeApi'
import type {
  ShadeAnalysis,
  ShadeImpactSummary
} from '@/features/solar-analysis/types/solar-api'

interface UseSolarShadeParams {
  latitude?: number
  longitude?: number
  autoFetch?: boolean
  requiredQuality?: 'LOW' | 'MEDIUM' | 'HIGH'
  apiService?: SolarShadeApiService
}

interface UseSolarShadeReturn {
  shadeData: ShadeAnalysis | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  clearCache: () => void
  getShadeImpact: (
    totalPanels: number,
    annualProductionKwh: number,
    electricityRateEuro: number
  ) => ShadeImpactSummary | null
  getPanelShadeData: (
    latitude: number,
    longitude: number
  ) => { shadePercentage: number; shadeLossFactor: number } | null
}

/**
 * Hook for fetching and managing solar shade analysis data
 */
export function useSolarShade({
  latitude,
  longitude,
  autoFetch = true,
  requiredQuality = 'HIGH',
  apiService = solarShadeApi
}: UseSolarShadeParams): UseSolarShadeReturn {
  const [shadeData, setShadeData] = useState<ShadeAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!latitude || !longitude) {
      setShadeData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await apiService.getShadeAnalysis(latitude, longitude, requiredQuality)
      setShadeData(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch shade data')
      setError(error)
      console.error('Error fetching shade data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [latitude, longitude, requiredQuality, apiService])

  // Auto-fetch on mount and when coordinates change
  useEffect(() => {
    if (autoFetch && latitude && longitude) {
      fetchData()
    }
  }, [autoFetch, fetchData, latitude, longitude])

  // Calculate shade impact summary
  const getShadeImpact = useCallback((
    totalPanels: number,
    annualProductionKwh: number,
    electricityRateEuro: number
  ): ShadeImpactSummary | null => {
    if (!shadeData) return null

    return apiService.calculateShadeImpact(
      shadeData,
      totalPanels,
      annualProductionKwh,
      electricityRateEuro
    )
  }, [shadeData, apiService])

  // Get shade data for specific panel location
  const getPanelShadeData = useCallback((
    latitude: number,
    longitude: number
  ): { shadePercentage: number; shadeLossFactor: number } | null => {
    if (!shadeData) return null

    return apiService.getShadeDataByLocation(shadeData, latitude, longitude)
  }, [shadeData, apiService])

  // Clear cache function
  const clearCache = useCallback(() => {
    if (latitude && longitude) {
      apiService.clearLocationCache(latitude, longitude)
    } else {
      apiService.clearCache()
    }
  }, [latitude, longitude, apiService])

  return {
    shadeData,
    isLoading,
    error,
    refetch: fetchData,
    clearCache,
    getShadeImpact,
    getPanelShadeData,
  }
}

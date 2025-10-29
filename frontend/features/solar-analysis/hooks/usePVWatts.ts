/**
 * usePVWatts Hook
 * React hook for managing PVWatts calculations with automatic roof data integration
 */

import { useState, useEffect, useCallback } from 'react'
import { pvwattsApi, PVWattsApiService } from '@/features/solar-analysis/lib/pvwattsApi'
import type { PVWattsResponse } from '@/features/solar-analysis/types/pvwatts'

interface RoofData {
  pitch?: number
  azimuth?: number
}

interface UsePVWattsParams {
  latitude?: number
  longitude?: number
  panelCount: number
  panelWattage?: number
  roofData?: RoofData
  autoFetch?: boolean
  apiService?: PVWattsApiService
}

interface UsePVWattsReturn {
  data: PVWattsResponse | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  clearCache: () => void
}

/**
 * Hook for fetching PVWatts data with automatic roof pitch/azimuth integration
 */
export function usePVWatts({
  latitude,
  longitude,
  panelCount,
  panelWattage = 400,
  roofData,
  autoFetch = true,
  apiService = pvwattsApi
}: UsePVWattsParams): UsePVWattsReturn {
  const [data, setData] = useState<PVWattsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!latitude || !longitude || panelCount <= 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await apiService.calculateProduction({
        latitude,
        longitude,
        panelCount,
        panelWattage,
        tilt: roofData?.pitch || 20,
        azimuth: roofData?.azimuth || 180
      })

      setData(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch PVWatts data')
      setError(error)
      console.error('PVWatts fetch error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [latitude, longitude, panelCount, panelWattage, roofData?.pitch, roofData?.azimuth, apiService])

  useEffect(() => {
    if (autoFetch) {
      fetchData()
    }
  }, [autoFetch, fetchData])

  const clearCache = useCallback(() => {
    apiService.clearCache()
    setData(null)
    setError(null)
  }, [apiService])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    clearCache
  }
}

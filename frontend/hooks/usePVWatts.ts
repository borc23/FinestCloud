/**
 * usePVWatts Hook
 * React hook for managing PVWatts calculations with automatic roof data integration
 */

import { useState, useEffect, useCallback } from 'react'
import { pvwattsApi } from '@/lib/pvwattsApi'
import type { PVWattsResponse } from '@/types/pvwatts'

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
  autoFetch = true
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
      const result = await pvwattsApi.calculateProduction({
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
  }, [latitude, longitude, panelCount, panelWattage, roofData?.pitch, roofData?.azimuth])

  useEffect(() => {
    if (autoFetch) {
      fetchData()
    }
  }, [autoFetch, fetchData])

  const clearCache = useCallback(() => {
    pvwattsApi.clearCache()
    setData(null)
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    clearCache
  }
}

/**
 * useDataLayers Hook
 * React hook for managing solar data layers with automatic caching
 */

import { useState, useEffect, useCallback } from "react";
import {
  dataLayersApi,
  DataLayersApiService,
} from "@/features/solar-analysis/lib/dataLayersApi";
import type { DataLayersResponse } from "@/features/solar-analysis/types/solar-api";

interface UseDataLayersParams {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  autoFetch?: boolean;
  requiredQuality?: "LOW" | "MEDIUM" | "HIGH";
  apiService?: DataLayersApiService;
}

interface UseDataLayersReturn {
  dataLayers: DataLayersResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
  annualFluxUrl: string | null;
  rgbUrl: string | null;
  dsmUrl: string | null;
  maskUrl: string | null;
  monthlyFluxUrl: string | null;
}

/**
 * Hook for fetching and managing solar data layers
 */
export function useDataLayers({
  latitude,
  longitude,
  radiusMeters = 50,
  autoFetch = false,
  requiredQuality = "HIGH",
  apiService = dataLayersApi,
}: UseDataLayersParams): UseDataLayersReturn {
  const [dataLayers, setDataLayers] = useState<DataLayersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!latitude || !longitude) {
      setDataLayers(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiService.getDataLayers(
        latitude,
        longitude,
        radiusMeters,
        requiredQuality,
      );
      setDataLayers(data);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to fetch data layers");
      setError(error);
      console.error("Error fetching data layers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude, radiusMeters, requiredQuality, apiService]);

  // Auto-fetch on mount and when coordinates change
  useEffect(() => {
    if (autoFetch && latitude && longitude) {
      fetchData();
    }
  }, [autoFetch, fetchData, latitude, longitude]);

  // Clear cache function
  const clearCache = useCallback(() => {
    if (latitude && longitude) {
      apiService.clearLocationCache(latitude, longitude, radiusMeters);
    } else {
      apiService.clearCache();
    }
  }, [latitude, longitude, radiusMeters, apiService]);

  // Extract individual layer URLs for convenience
  const annualFluxUrl = dataLayers?.annualFluxUrl || null;
  const rgbUrl = dataLayers?.rgbUrl || null;
  const dsmUrl = dataLayers?.dsmUrl || null;
  const maskUrl = dataLayers?.maskUrl || null;
  const monthlyFluxUrl = dataLayers?.monthlyFluxUrl || null;

  return {
    dataLayers,
    isLoading,
    error,
    refetch: fetchData,
    clearCache,
    annualFluxUrl,
    rgbUrl,
    dsmUrl,
    maskUrl,
    monthlyFluxUrl,
  };
}

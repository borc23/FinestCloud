/**
 * usePVWatts Hook
 * React hook for managing PVWatts calculations with automatic roof data integration
 */

import { useState, useEffect } from "react";
import { calculateProduction } from "@/features/solar-analysis/lib/pvwattsApi";
import type { PVWattsResponse } from "@/features/solar-analysis/types/pvwatts";

interface UsePVWattsParams {
  latitude?: number;
  longitude?: number;
  panelCount: number;
  panelWattage?: number;
  tilt?: number; // roof pitch, degrees
  azimuth?: number; // degrees
}

/**
 * Hook for fetching PVWatts data for the given roof pitch/azimuth
 */
export function usePVWatts({
  latitude,
  longitude,
  panelCount,
  panelWattage = 400,
  tilt,
  azimuth,
}: UsePVWattsParams) {
  const [data, setData] = useState<PVWattsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!latitude || !longitude || panelCount <= 0) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    calculateProduction({
      latitude,
      longitude,
      panelCount,
      panelWattage,
      tilt,
      azimuth,
    })
      .then((result) => !cancelled && setData(result))
      .catch((error) => console.error("PVWatts fetch error:", error))
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, panelCount, panelWattage, tilt, azimuth]);

  return { data, isLoading };
}

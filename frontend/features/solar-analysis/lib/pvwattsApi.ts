/**
 * PVWatts API Service
 * Fetches solar production data from NREL PVWatts via the Next.js proxy
 */

import type {
  PVWattsRequest,
  PVWattsResponse,
  PVWattsCalculationParams,
} from "@/features/solar-analysis/types/pvwatts";

// Keyed by request body; shares in-flight requests and caches results for the session
const cache = new Map<string, Promise<PVWattsResponse>>();

async function fetchProduction(body: string): Promise<PVWattsResponse> {
  const response = await fetch("/api/pvwatts/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    // Proxy errors are shaped { success: false, error, details }
    const error = await response.json().catch(() => null);
    throw new Error(
      [error?.error, error?.details].filter(Boolean).join(": ") ||
        response.statusText ||
        `PVWatts API request failed with status ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Calculate solar production using PVWatts API
 */
export function calculateProduction(
  params: PVWattsCalculationParams,
): Promise<PVWattsResponse> {
  const request: PVWattsRequest = {
    latitude: params.latitude,
    longitude: params.longitude,
    panel_count: params.panelCount,
    panel_wattage: params.panelWattage,
    tilt: params.tilt ?? 20,
    azimuth: params.azimuth ?? 180,
  };
  const key = JSON.stringify(request);

  let result = cache.get(key);
  if (!result) {
    result = fetchProduction(key);
    cache.set(key, result);
    result.catch(() => cache.delete(key));
  }
  return result;
}

import { useState, useEffect } from "react";
import type { ElectricityPrice } from "@/features/financial/types/financial";

/** Round to ~1 km so small map pans don't refetch */
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Household electricity price for the country at a location.
 * Null while loading or when the lookup fails (callers fall back to defaults).
 */
export function useElectricityPrice(latitude?: number, longitude?: number) {
  const [price, setPrice] = useState<ElectricityPrice | null>(null);
  const lat = latitude && round(latitude);
  const lng = longitude && round(longitude);

  useEffect(() => {
    if (!lat || !lng) return;

    const controller = new AbortController();
    fetch(`/api/electricity-price?lat=${lat}&lng=${lng}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return response.json();
      })
      .then(setPrice)
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Electricity price fetch error:", error);
          setPrice(null);
        }
      });

    return () => controller.abort();
  }, [lat, lng]);

  return price;
}

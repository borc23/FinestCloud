/**
 * Household electricity price for a location (EU): GISCO reverse geocoding finds
 * the country, Eurostat provides its latest household price (all taxes included).
 */

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/shared/lib/apiProxy";
import type { ElectricityPrice } from "@/features/financial/types/financial";
import { guardApiCall } from "@/shared/lib/apiGuard";

const GISCO_REVERSE_URL = "https://gisco-services.ec.europa.eu/reverse";
const EUROSTAT_PRICES_URL =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204";

// Eurostat publishes twice a year, so a day of caching is plenty
const FETCH_OPTIONS = { next: { revalidate: 86400 } };

export async function GET(request: NextRequest) {
  const denied = await guardApiCall(request, { metered: false });
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return errorResponse("lat and lng are required", 400);
  }

  try {
    const country = await fetchCountry(lat, lng);
    if (!country) {
      return errorResponse("No country found for this location", 404);
    }
    const price: ElectricityPrice = {
      country,
      ...(await fetchHouseholdPrice(country)),
    };
    return NextResponse.json(price);
  } catch (error) {
    console.error("Electricity price lookup failed:", error);
    return errorResponse("Failed to fetch electricity price", 502);
  }
}

/** Country code at a coordinate (Eurostat style, e.g. EL for Greece), or undefined at sea */
async function fetchCountry(
  lat: number,
  lng: number,
): Promise<string | undefined> {
  const query = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    limit: "1",
  });
  const response = await fetch(`${GISCO_REVERSE_URL}?${query}`, FETCH_OPTIONS);
  if (!response.ok) throw new Error(`GISCO error: ${response.status}`);
  const { features } = await response.json();
  return features?.[0]?.properties?.countrycode;
}

/** Latest price for a typical household (2,500-5,000 kWh/year band), €/kWh */
async function fetchHouseholdPrice(
  country: string,
): Promise<Omit<ElectricityPrice, "country">> {
  const query = new URLSearchParams({
    format: "JSON",
    geo: country,
    nrg_cons: "KWH2500-4999",
    unit: "KWH",
    currency: "EUR",
    tax: "I_TAX",
    lastTimePeriod: "2",
  });
  const response = await fetch(
    `${EUROSTAT_PRICES_URL}?${query}`,
    FETCH_OPTIONS,
  );
  if (!response.ok) throw new Error(`Eurostat error: ${response.status}`);

  // JSON-stat: time is the only multi-valued dimension, so values are keyed by
  // time index; countries Eurostat doesn't cover return no values
  const { value, dimension } = await response.json();
  const latest = Object.entries<number>(dimension.time.category.index)
    .sort(([, a], [, b]) => b - a)
    .find(([, index]) => value[index] != null);
  return latest
    ? { costPerKwh: value[latest[1]], period: latest[0] }
    : { costPerKwh: null, period: null };
}

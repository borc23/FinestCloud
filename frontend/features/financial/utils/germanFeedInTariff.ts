/**
 * German Feed-In Tariff Calculations (EEG 2025)
 * Official rates for solar PV systems in Germany
 * Source: Bundesnetzagentur EEG 2025
 */

/**
 * German Feed-In Tariff Tiers for Partial Feed-In (Überschusseinspeisung), ct/kWh.
 * Updated for November 2025. Each rate applies to the capacity share within its tier.
 * The top tier's rate applies to all capacity above 40 kWp, so systems >100 kWp are
 * credited in full (the >100 kWp direct-marketing obligation is not modelled).
 */
const TIERS = [
  { tier: "0-10 kWp", fromKw: 0, toKw: 10, rateCt: 7.94 },
  { tier: "10-40 kWp", fromKw: 10, toKw: 40, rateCt: 6.88 },
  { tier: "40+ kWp", fromKw: 40, toKw: Infinity, rateCt: 5.62 },
];

// 2025 compensation bonus for negative price hours: +0.6 ct/kWh
const COMPENSATION_BONUS_CT = 0.6;

/**
 * Get detailed breakdown of feed-in tariff tiers for a system
 * Useful for displaying to users
 */
export function getFeedInTariffBreakdown(systemSizeKw: number) {
  return TIERS.filter(({ fromKw }) => systemSizeKw > fromKw).map(
    ({ tier, fromKw, toKw, rateCt }) => ({
      tier,
      capacityKw: Math.min(systemSizeKw, toKw) - fromKw,
      rateCtPerKwh: rateCt + COMPENSATION_BONUS_CT,
      rateEuroPerKwh: (rateCt + COMPENSATION_BONUS_CT) / 100,
    }),
  );
}

/**
 * Calculate weighted average feed-in tariff (incl. compensation bonus) for a system size
 * @returns Weighted average feed-in tariff in €/kWh
 */
export function calculateGermanFeedInTariff(systemSizeKw: number): number {
  const totalRevenue = getFeedInTariffBreakdown(systemSizeKw).reduce(
    (sum, { capacityKw, rateCtPerKwh }) => sum + capacityKw * rateCtPerKwh,
    0,
  );
  // Convert ct/kWh to €/kWh
  return totalRevenue / systemSizeKw / 100;
}

/**
 * Format feed-in tariff for display
 */
export function formatFeedInTariff(tariffEuroPerKwh: number): string {
  return `${(tariffEuroPerKwh * 100).toFixed(2)} ct/kWh`;
}

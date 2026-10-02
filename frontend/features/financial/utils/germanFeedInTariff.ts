/**
 * German Feed-In Tariff Calculations (EEG 2025)
 * Official rates for solar PV systems in Germany
 * Source: Bundesnetzagentur EEG 2025
 */

/**
 * German Feed-In Tariff Tiers for Partial Feed-In (Überschusseinspeisung)
 * Updated for November 2025 with compensation bonus for negative price hours
 */
export const GERMAN_FEED_IN_TIERS_2025 = {
  // Base rates (ct/kWh)
  tier1_0_10kW: 7.94, // First 10 kWp
  tier2_10_40kW: 6.88, // 10-40 kWp portion
  tier3_40_100kW: 5.62, // 40-100 kWp portion

  // 2025 compensation bonus for negative price hours (optional)
  compensationBonus: 0.6, // +0.6 ct/kWh to compensate for negative-price exclusions

  // Full feed-in rates (Volleinspeisung) - if user exports ALL energy
  fullFeedIn_0_10kW: 12.47,
  fullFeedIn_10_40kW: 10.4,
  fullFeedIn_40_100kW: 8.2,
} as const;

/**
 * Calculate weighted average feed-in tariff for a given system size
 * Uses tiered pricing based on EEG 2025 regulations
 *
 * @param systemSizeKw - System size in kW
 * @param includeCompensationBonus - Add 0.6 ct/kWh bonus for 2025 negative-price compensation
 * @param isFullFeedIn - Use full feed-in rates (Volleinspeisung) instead of partial
 * @returns Weighted average feed-in tariff in €/kWh
 */
export function calculateGermanFeedInTariff(
  systemSizeKw: number,
  includeCompensationBonus: boolean = true,
  isFullFeedIn: boolean = false,
): number {
  const rates = GERMAN_FEED_IN_TIERS_2025;
  const bonus = includeCompensationBonus ? rates.compensationBonus : 0;

  let totalRevenue = 0;

  if (isFullFeedIn) {
    // Full feed-in (Volleinspeisung) - export all energy
    if (systemSizeKw <= 10) {
      totalRevenue = systemSizeKw * (rates.fullFeedIn_0_10kW + bonus);
    } else if (systemSizeKw <= 40) {
      totalRevenue =
        10 * (rates.fullFeedIn_0_10kW + bonus) +
        (systemSizeKw - 10) * (rates.fullFeedIn_10_40kW + bonus);
    } else if (systemSizeKw <= 100) {
      totalRevenue =
        10 * (rates.fullFeedIn_0_10kW + bonus) +
        30 * (rates.fullFeedIn_10_40kW + bonus) +
        (systemSizeKw - 40) * (rates.fullFeedIn_40_100kW + bonus);
    } else {
      // Systems > 100 kWp typically require auction participation
      totalRevenue =
        10 * (rates.fullFeedIn_0_10kW + bonus) +
        30 * (rates.fullFeedIn_10_40kW + bonus) +
        60 * (rates.fullFeedIn_40_100kW + bonus);
    }
  } else {
    // Partial feed-in (Überschusseinspeisung) - self-consume + export excess
    if (systemSizeKw <= 10) {
      totalRevenue = systemSizeKw * (rates.tier1_0_10kW + bonus);
    } else if (systemSizeKw <= 40) {
      totalRevenue =
        10 * (rates.tier1_0_10kW + bonus) +
        (systemSizeKw - 10) * (rates.tier2_10_40kW + bonus);
    } else if (systemSizeKw <= 100) {
      totalRevenue =
        10 * (rates.tier1_0_10kW + bonus) +
        30 * (rates.tier2_10_40kW + bonus) +
        (systemSizeKw - 40) * (rates.tier3_40_100kW + bonus);
    } else {
      totalRevenue =
        10 * (rates.tier1_0_10kW + bonus) +
        30 * (rates.tier2_10_40kW + bonus) +
        60 * (rates.tier3_40_100kW + bonus);
    }
  }

  // Convert ct/kWh to €/kWh and return weighted average
  return totalRevenue / systemSizeKw / 100;
}

/**
 * Get detailed breakdown of feed-in tariff tiers for a system
 * Useful for displaying to users
 */
export function getFeedInTariffBreakdown(
  systemSizeKw: number,
  includeCompensationBonus: boolean = true,
  isFullFeedIn: boolean = false,
): {
  tier: string;
  capacityKw: number;
  rateCtPerKwh: number;
  rateEuroPerKwh: number;
}[] {
  const rates = GERMAN_FEED_IN_TIERS_2025;
  const bonus = includeCompensationBonus ? rates.compensationBonus : 0;
  const breakdown: {
    tier: string;
    capacityKw: number;
    rateCtPerKwh: number;
    rateEuroPerKwh: number;
  }[] = [];

  const tier1Rate = isFullFeedIn ? rates.fullFeedIn_0_10kW : rates.tier1_0_10kW;
  const tier2Rate = isFullFeedIn
    ? rates.fullFeedIn_10_40kW
    : rates.tier2_10_40kW;
  const tier3Rate = isFullFeedIn
    ? rates.fullFeedIn_40_100kW
    : rates.tier3_40_100kW;

  // Tier 1: 0-10 kWp
  if (systemSizeKw > 0) {
    const tier1Capacity = Math.min(systemSizeKw, 10);
    breakdown.push({
      tier: "0-10 kWp",
      capacityKw: tier1Capacity,
      rateCtPerKwh: tier1Rate + bonus,
      rateEuroPerKwh: (tier1Rate + bonus) / 100,
    });
  }

  // Tier 2: 10-40 kWp
  if (systemSizeKw > 10) {
    const tier2Capacity = Math.min(systemSizeKw - 10, 30);
    breakdown.push({
      tier: "10-40 kWp",
      capacityKw: tier2Capacity,
      rateCtPerKwh: tier2Rate + bonus,
      rateEuroPerKwh: (tier2Rate + bonus) / 100,
    });
  }

  // Tier 3: 40-100 kWp
  if (systemSizeKw > 40) {
    const tier3Capacity = Math.min(systemSizeKw - 40, 60);
    breakdown.push({
      tier: "40-100 kWp",
      capacityKw: tier3Capacity,
      rateCtPerKwh: tier3Rate + bonus,
      rateEuroPerKwh: (tier3Rate + bonus) / 100,
    });
  }

  return breakdown;
}

/**
 * Format feed-in tariff for display
 */
export function formatFeedInTariff(tariffEuroPerKwh: number): string {
  return `${(tariffEuroPerKwh * 100).toFixed(2)} ct/kWh`;
}

/**
 * Get explanation text for feed-in tariff
 */
export function getFeedInTariffExplanation(
  systemSizeKw: number,
  includeCompensationBonus: boolean = true,
): string {
  const weightedRate = calculateGermanFeedInTariff(
    systemSizeKw,
    includeCompensationBonus,
    false,
  );
  const breakdown = getFeedInTariffBreakdown(
    systemSizeKw,
    includeCompensationBonus,
    false,
  );

  let explanation = `Your ${systemSizeKw.toFixed(
    1,
  )} kW system receives a weighted average feed-in tariff of ${formatFeedInTariff(
    weightedRate,
  )} under Germany's EEG 2025 regulations.\n\n`;

  explanation += `Rate breakdown:\n`;
  breakdown.forEach((tier) => {
    explanation += `• ${tier.tier}: ${tier.capacityKw.toFixed(
      2,
    )} kW @ ${tier.rateCtPerKwh.toFixed(2)} ct/kWh\n`;
  });

  if (includeCompensationBonus) {
    explanation += `\n✓ Includes 0.6 ct/kWh bonus to compensate for exclusion during negative-price hours (2025 regulation)`;
  }

  explanation += `\n\nThis is for partial feed-in (Überschusseinspeisung) where you self-consume first and export excess energy to the grid. The feed-in tariff is guaranteed for 20 years from installation.`;

  return explanation;
}

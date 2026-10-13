/**
 * Per-country cost assumptions (EU). Indicative 2025 residential values: edit to calibrate.
 * - costPerWatt: turnkey price paid by the customer for a ~10 kWp system, €/W
 * - feedInTariff: payment for exported energy, €/kWh; omitted for Germany, which uses
 *   the tiered EEG rates (see germanFeedInTariff.ts)
 * The household electricity price is not configured here: it is fetched from Eurostat.
 */
interface CountryCosts {
  costPerWatt: number;
  feedInTariff?: number;
}

export const DEFAULT_COUNTRY = "DE";

const DEFAULT_COSTS: CountryCosts = { costPerWatt: 1.4, feedInTariff: 0.06 };

const COUNTRY_COSTS: Record<string, CountryCosts> = {
  AT: { costPerWatt: 1.5, feedInTariff: 0.05 },
  BE: { costPerWatt: 1.3, feedInTariff: 0.04 },
  CZ: { costPerWatt: 1.3, feedInTariff: 0.05 },
  DE: { costPerWatt: 1.4 },
  ES: { costPerWatt: 1.2, feedInTariff: 0.06 },
  FR: { costPerWatt: 2.0, feedInTariff: 0.04 },
  IT: { costPerWatt: 1.6, feedInTariff: 0.1 },
  NL: { costPerWatt: 1.1, feedInTariff: 0.07 },
  PL: { costPerWatt: 1.1, feedInTariff: 0.07 },
  PT: { costPerWatt: 1.2, feedInTariff: 0.05 },
  SI: { costPerWatt: 1.3, feedInTariff: 0.06 },
};

/** Cost assumptions for a country code (Eurostat style; unknown codes get the defaults) */
export const countryCosts = (country = DEFAULT_COUNTRY): CountryCosts =>
  COUNTRY_COSTS[country] ?? DEFAULT_COSTS;

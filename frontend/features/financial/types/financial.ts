/**
 * Financial Calculator Types
 * Type definitions for solar financial calculations (German market)
 */

export interface UtilityRates {
  costPerKwh: number; // €/kWh
  avgMonthlyBill?: number; // € (optional, for validation)
  escalationRate: number; // % annual increase (default 4%)
  feedInTariff: number; // €/kWh Einspeisevergütung for excess energy
}

/** Household electricity price for the installation's country (Eurostat, all taxes included) */
export interface ElectricityPrice {
  country: string; // ISO 3166-1 alpha-2, as used by Eurostat (EL for Greece)
  costPerKwh: number | null; // €/kWh; null when Eurostat has no data for the country
  period: string | null; // e.g. "2025-S2"
}

export interface FinancialInputs {
  country?: string; // ISO 3166-1 alpha-2 (default DE)
  annualProduction: number; // kWh/year
  systemSize: number; // kW
  utilityRates: UtilityRates;
  systemCost: number; // € total system cost
  stateGrant?: number; // € Bundesland-specific grants
  municipalGrant?: number; // € Stadt/Gemeinde grants
  systemDegradation?: number; // % per year (default 0.5%)
  analysisYears?: number; // years (default 25)
  selfConsumptionRate?: number; // % of energy consumed directly (default 30%)
  discountRate?: number; // % for NPV calculation (default 4%)
}

export interface FinancialResults {
  // Immediate costs
  grossSystemCost: number; // € before incentives
  vatSavings: number; // € saved by 0% VAT (systems ≤30kWp)
  netSystemCost: number; // € after incentives
  effectiveCostPerWatt: number; // €/W after incentives

  // Annual metrics
  firstYearSavings: number; // €
  firstYearFeedInRevenue: number; // € from Einspeisevergütung

  // ROI metrics
  paybackPeriod: number; // years
  twentyFiveYearSavings: number; // € total savings
  twentyFiveYearFeedInRevenue: number; // € total feed-in revenue
  roi: number; // % return on investment
  irr: number; // % Internal Rate of Return
  npv: number; // € Net Present Value

  // Energy metrics
  energyOffsetPercentage: number; // % of energy needs covered
  selfConsumptionAmount: number; // kWh consumed directly
  gridFeedInAmount: number; // kWh fed back to grid
  lifetimeCO2Offset: number; // tons

  // Monthly comparison
  avgMonthlyBillBefore: number; // €
  avgMonthlyBillAfter: number; // € (with solar)
  avgMonthlySavings: number; // €
  avgMonthlyFeedInRevenue: number; // €
}

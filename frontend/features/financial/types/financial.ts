/**
 * Financial Calculator Types
 * Type definitions for solar financial calculations (German market)
 */

export interface UtilityRates {
  costPerKwh: number; // €/kWh
  avgMonthlyBill?: number; // € (optional, for validation)
  escalationRate: number; // % annual increase (default 4%)
  feedInTariff?: number; // €/kWh Einspeisevergütung for excess energy
}

export interface SystemCost {
  totalCost: number; // € total system cost
  pricePerWatt?: number; // €/W (auto-calculated if not provided)
}

export interface Incentives {
  vatReduction: number; // % (default 0% - Nullsteuersatz since Jan 2023)
  kfwLoan?: number; // € KfW loan amount (e.g., KfW 270)
  kfwInterestRate?: number; // % reduced interest rate
  stateGrant?: number; // € Bundesland-specific grants
  municipalGrant?: number; // € Stadt/Gemeinde grants
}

export interface FinancingOption {
  type: "cash" | "loan" | "kfw";
  downPayment?: number; // € (for loan)
  loanAmount?: number; // € (for loan)
  interestRate?: number; // % (for loan)
  loanTerm?: number; // years (for loan)
  monthlyPayment?: number; // € (calculated)
}

export interface FinancialInputs {
  annualProduction: number; // kWh/year
  systemSize: number; // kW
  utilityRates: UtilityRates;
  systemCost: SystemCost;
  incentives?: Incentives;
  financing?: FinancingOption;
  systemDegradation?: number; // % per year (default 0.5%)
  analysisYears?: number; // years (default 25)
  selfConsumptionRate?: number; // % of energy consumed directly (default 30%)
  discountRate?: number; // % for NPV calculation (default 4%)
}

export interface YearlyBreakdown {
  year: number;
  production: number; // kWh (with degradation)
  savings: number; // €
  feedInRevenue: number; // € from Einspeisevergütung
  cumulativeSavings: number; // €
  netCost: number; // € (cost - cumulative savings)
}

export interface FinancialResults {
  // Immediate costs
  grossSystemCost: number; // € before incentives
  netSystemCost: number; // € after incentives
  effectiveCostPerWatt: number; // €/W after incentives

  // Annual metrics
  firstYearSavings: number; // €
  firstYearFeedInRevenue: number; // € from Einspeisevergütung
  annualSavings: number; // € average over analysis period

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

  // Loan specific (if applicable)
  monthlyLoanPayment?: number; // €
  totalLoanCost?: number; // € over loan term

  // Breakdown
  yearlyBreakdown?: YearlyBreakdown[];
}

export interface FinancialCalculatorProps {
  inputs: FinancialInputs;
  onClose?: () => void;
}

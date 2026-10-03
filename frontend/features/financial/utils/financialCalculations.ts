/**
 * Financial Calculations Utilities
 * Core calculation functions for solar financial analysis (German market)
 */

import type {
  FinancialInputs,
  FinancialResults,
} from "@/features/financial/types/financial";
import { safeDivide } from "./validation";

/** German market defaults shared by the calculator UI and the PDF report. Rates are percentages. */
export const FINANCIAL_DEFAULTS = {
  costPerKwh: 0.37,
  escalationRate: 4,
  selfConsumptionRate: 30,
};

/** VAT saved by the 0% rate (Nullsteuersatz, since Jan 2023) for systems ≤30kWp */
export function calculateVatSavings(systemSize: number, grossCost: number) {
  return systemSize <= 30 ? grossCost * 0.19 : 0;
}

/**
 * Calculate comprehensive financial analysis for solar system (German market)
 * @throws {Error} If critical input values are invalid
 */
export function calculateFinancials(inputs: FinancialInputs): FinancialResults {
  const {
    annualProduction,
    systemSize,
    utilityRates,
    systemCost: grossSystemCost,
    stateGrant = 0,
    municipalGrant = 0,
    systemDegradation = 0.5, // 0.5% per year is industry standard
    analysisYears = 25,
    selfConsumptionRate = 30, // 30% is typical for German households without battery
    discountRate = 4, // 4% discount rate for NPV
  } = inputs;
  const { feedInTariff } = utilityRates;

  // Validate critical inputs to prevent calculation errors
  if (!Number.isFinite(systemSize) || systemSize <= 0) {
    throw new Error("System size must be a positive number");
  }
  if (!Number.isFinite(annualProduction) || annualProduction <= 0) {
    throw new Error("Annual production must be a positive number");
  }
  if (!Number.isFinite(grossSystemCost) || grossSystemCost <= 0) {
    throw new Error("System cost must be a positive number");
  }
  if (
    !Number.isFinite(utilityRates.costPerKwh) ||
    utilityRates.costPerKwh <= 0
  ) {
    throw new Error("Electricity cost must be a positive number");
  }

  const vatSavings = calculateVatSavings(systemSize, grossSystemCost);
  const netSystemCost =
    grossSystemCost - (vatSavings + stateGrant + municipalGrant);

  // Calculate effective cost per watt (safe division to prevent divide by zero)
  const effectiveCostPerWatt = safeDivide(netSystemCost, systemSize * 1000, 0); // convert kW to W

  // Self-consumption and feed-in amounts (first year: no degradation, no escalation yet)
  const selfConsumptionAmount = annualProduction * (selfConsumptionRate / 100);
  const gridFeedInAmount = annualProduction - selfConsumptionAmount;
  const firstYearSavings = selfConsumptionAmount * utilityRates.costPerKwh;
  const firstYearFeedInRevenue = gridFeedInAmount * feedInTariff;

  // Yearly cash flows with degradation and escalation
  const cashFlows = [-netSystemCost];
  let cumulativeSavings = 0;
  let totalSavings = 0;
  let totalFeedInRevenue = 0;
  let paybackYear = analysisYears;
  let prevNetCost = 0; // previous year's rounded net cost (0 = none yet)
  let npv = -netSystemCost; // Start with negative initial investment

  for (let year = 1; year <= analysisYears; year++) {
    // Apply degradation to production (compounds each year)
    const degradationFactor = Math.pow(1 - systemDegradation / 100, year - 1);
    const production = annualProduction * degradationFactor;

    // Split production into self-consumption and grid feed-in
    const yearSelfConsumption = production * (selfConsumptionRate / 100);
    const yearGridFeedIn = production - yearSelfConsumption;

    // Apply escalation to utility rates (4% is German average)
    const escalationFactor = Math.pow(
      1 + utilityRates.escalationRate / 100,
      year - 1,
    );
    const currentRate = utilityRates.costPerKwh * escalationFactor;

    // Calculate savings from self-consumption (avoided electricity purchase)
    const savings = yearSelfConsumption * currentRate;

    // Calculate revenue from feed-in tariff (fixed for 20 years in Germany)
    const feedInRevenue = yearGridFeedIn * feedInTariff;

    // Calculate NPV: discount future cash flows to present value
    const discountFactor = Math.pow(1 + discountRate / 100, year);
    npv += (savings + feedInRevenue) / discountFactor;

    cumulativeSavings += savings + feedInRevenue;
    totalSavings += savings;
    totalFeedInRevenue += feedInRevenue;

    // Track when we break even
    const netCost = netSystemCost - cumulativeSavings;
    if (netCost <= 0 && paybackYear === analysisYears) {
      // Interpolate to find exact payback
      const prev = prevNetCost || netSystemCost;
      paybackYear = year - 1 + prev / (prev - netCost);
    }

    prevNetCost = Math.round(netCost);
    cashFlows.push(Math.round(savings) + Math.round(feedInRevenue));
  }

  // Calculate ROI (including feed-in revenue) - safe division
  const totalReturn = totalSavings + totalFeedInRevenue;
  const roi = safeDivide((totalReturn - netSystemCost) * 100, netSystemCost, 0);

  // Calculate energy offset percentage (German household average: ~3,500 kWh/year) - safe division
  const avgHouseholdUsage = utilityRates.avgMonthlyBill
    ? safeDivide(
        utilityRates.avgMonthlyBill * 12,
        utilityRates.costPerKwh,
        3500,
      )
    : 3500; // typical German household
  const energyOffsetPercentage = Math.min(
    safeDivide(selfConsumptionAmount * 100, avgHouseholdUsage, 0),
    100,
  );

  // Calculate CO2 offset (485g CO2 per kWh is German grid average 2024)
  const lifetimeCO2Offset = (annualProduction * analysisYears * 0.485) / 1000; // convert kg to tons

  // Monthly bill calculations
  const avgMonthlyBillBefore =
    utilityRates.avgMonthlyBill ||
    (avgHouseholdUsage * utilityRates.costPerKwh) / 12;
  const remainingPurchase = Math.max(
    0,
    avgHouseholdUsage - selfConsumptionAmount,
  );
  const avgMonthlyBillAfter =
    (remainingPurchase * utilityRates.costPerKwh) / 12;

  return {
    grossSystemCost: Math.round(grossSystemCost),
    vatSavings: Math.round(vatSavings),
    netSystemCost: Math.round(netSystemCost),
    effectiveCostPerWatt: Math.round(effectiveCostPerWatt * 100) / 100,
    firstYearSavings: Math.round(firstYearSavings),
    firstYearFeedInRevenue: Math.round(firstYearFeedInRevenue),
    paybackPeriod: Math.round(paybackYear * 10) / 10,
    twentyFiveYearSavings: Math.round(totalSavings),
    twentyFiveYearFeedInRevenue: Math.round(totalFeedInRevenue),
    roi: Math.round(roi * 10) / 10,
    irr: Math.round(calculateIRR(cashFlows) * 10) / 10,
    npv: Math.round(npv),
    energyOffsetPercentage: Math.round(energyOffsetPercentage * 10) / 10,
    selfConsumptionAmount: Math.round(selfConsumptionAmount),
    gridFeedInAmount: Math.round(gridFeedInAmount),
    lifetimeCO2Offset: Math.round(lifetimeCO2Offset * 10) / 10,
    avgMonthlyBillBefore: Math.round(avgMonthlyBillBefore),
    avgMonthlyBillAfter: Math.round(avgMonthlyBillAfter),
    avgMonthlySavings: Math.round(avgMonthlyBillBefore - avgMonthlyBillAfter),
    avgMonthlyFeedInRevenue: Math.round(firstYearFeedInRevenue / 12),
  };
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 * IRR is the discount rate that makes NPV = 0
 * @param cashFlows - negative initial investment, then positive annual cash flows
 */
function calculateIRR(cashFlows: number[]): number {
  // Newton-Raphson method to find IRR
  let irr = 0.1; // Initial guess: 10%
  const maxIterations = 100;
  const tolerance = 0.00001;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = 0;
    let derivative = 0;

    // Calculate NPV and its derivative at current IRR
    for (let year = 0; year < cashFlows.length; year++) {
      const discountFactor = Math.pow(1 + irr, year);
      npv += cashFlows[year] / discountFactor;

      // Derivative of NPV with respect to IRR
      if (year > 0) {
        derivative -= (year * cashFlows[year]) / Math.pow(1 + irr, year + 1);
      }
    }

    // Check for convergence
    if (Math.abs(npv) < tolerance) {
      return Math.round(irr * 1000) / 10; // Return as percentage with 1 decimal
    }

    // Avoid division by zero
    if (Math.abs(derivative) < tolerance) {
      break;
    }

    // Newton-Raphson iteration: x_new = x_old - f(x) / f'(x)
    const newIrr = irr - npv / derivative;

    // Prevent negative or extremely large IRR values
    if (newIrr < -0.99 || newIrr > 10) {
      break;
    }

    irr = newIrr;
  }

  // If IRR calculation fails or doesn't converge, return 0
  return 0;
}

/**
 * Estimate system cost based on size (€/W rates for German market)
 */
export function estimateSystemCost(systemSizeKw: number): number {
  // German market rates (2024) - larger systems have lower €/W
  // Note: These are net prices (after 0% VAT)
  let pricePerWatt: number;

  if (systemSizeKw <= 5) {
    pricePerWatt = 1.6; // smaller residential systems (1,600€/kWp)
  } else if (systemSizeKw <= 10) {
    pricePerWatt = 1.4; // medium residential (1,400€/kWp)
  } else if (systemSizeKw <= 20) {
    pricePerWatt = 1.25; // large residential (1,250€/kWp)
  } else {
    pricePerWatt = 1.1; // small commercial (1,100€/kWp)
  }

  return systemSizeKw * 1000 * pricePerWatt;
}

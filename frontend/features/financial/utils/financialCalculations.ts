/**
 * Financial Calculations Utilities
 * Core calculation functions for solar financial analysis (German market)
 */

import type { FinancialInputs, FinancialResults, YearlyBreakdown } from '@/features/financial/types/financial'
import { safeDivide } from './validation'

/**
 * Calculate comprehensive financial analysis for solar system (German market)
 * @throws {Error} If critical input values are invalid
 */
export function calculateFinancials(inputs: FinancialInputs): FinancialResults {
  const {
    annualProduction,
    systemSize,
    utilityRates,
    systemCost,
    incentives,
    financing,
    systemDegradation = 0.5, // 0.5% per year is industry standard
    analysisYears = 25,
    selfConsumptionRate = 30, // 30% is typical for German households without battery
    discountRate = 4 // 4% discount rate for NPV
  } = inputs

  // Validate critical inputs to prevent calculation errors
  if (!Number.isFinite(systemSize) || systemSize <= 0) {
    throw new Error('System size must be a positive number')
  }
  if (!Number.isFinite(annualProduction) || annualProduction <= 0) {
    throw new Error('Annual production must be a positive number')
  }
  if (!Number.isFinite(systemCost.totalCost) || systemCost.totalCost <= 0) {
    throw new Error('System cost must be a positive number')
  }
  if (!Number.isFinite(utilityRates.costPerKwh) || utilityRates.costPerKwh <= 0) {
    throw new Error('Electricity cost must be a positive number')
  }

  // Calculate gross and net system costs
  const grossSystemCost = systemCost.totalCost

  // VAT reduction (0% since Jan 2023 for systems ≤30kWp)
  const vatSavings = systemSize <= 30 ? grossSystemCost * 0.19 : 0 // 19% VAT saved

  // State and municipal grants
  const stateGrant = incentives?.stateGrant || 0
  const municipalGrant = incentives?.municipalGrant || 0

  const totalIncentives = vatSavings + stateGrant + municipalGrant
  const netSystemCost = grossSystemCost - totalIncentives

  // Calculate effective cost per watt (safe division to prevent divide by zero)
  const effectiveCostPerWatt = safeDivide(netSystemCost, systemSize * 1000, 0) // convert kW to W

  // Self-consumption and feed-in amounts
  const selfConsumptionAmount = annualProduction * (selfConsumptionRate / 100)
  const gridFeedInAmount = annualProduction - selfConsumptionAmount

  // Feed-in tariff (FIT) - April 2025 rate: 16.23p/kWh = 0.1623 €/kWh (applies to all systems 0-5,000kW)
  const feedInTariff = utilityRates.feedInTariff || 0.1623

  // Calculate yearly breakdown with degradation and escalation
  const yearlyBreakdown: YearlyBreakdown[] = []
  let cumulativeSavings = 0
  let totalSavings = 0
  let totalFeedInRevenue = 0
  let paybackYear = analysisYears
  let npv = -netSystemCost // Start with negative initial investment

  for (let year = 1; year <= analysisYears; year++) {
    // Apply degradation to production (compounds each year)
    const degradationFactor = Math.pow(1 - systemDegradation / 100, year - 1)
    const production = annualProduction * degradationFactor

    // Split production into self-consumption and grid feed-in
    const yearSelfConsumption = production * (selfConsumptionRate / 100)
    const yearGridFeedIn = production - yearSelfConsumption

    // Apply escalation to utility rates (4% is German average)
    const escalationFactor = Math.pow(1 + utilityRates.escalationRate / 100, year - 1)
    const currentRate = utilityRates.costPerKwh * escalationFactor

    // Calculate savings from self-consumption (avoided electricity purchase)
    const savings = yearSelfConsumption * currentRate

    // Calculate revenue from feed-in tariff (fixed for 20 years in Germany)
    const feedInRevenue = yearGridFeedIn * feedInTariff

    // Calculate NPV: discount future cash flows to present value
    const yearCashFlow = savings + feedInRevenue
    const discountFactor = Math.pow(1 + discountRate / 100, year)
    npv += yearCashFlow / discountFactor

    cumulativeSavings += savings + feedInRevenue
    totalSavings += savings
    totalFeedInRevenue += feedInRevenue

    // Track when we break even
    const netCost = netSystemCost - cumulativeSavings
    if (netCost <= 0 && paybackYear === analysisYears) {
      // Interpolate to find exact payback
      const prevNetCost = yearlyBreakdown[year - 2]?.netCost || netSystemCost
      const fractionOfYear = prevNetCost / (prevNetCost - netCost)
      paybackYear = year - 1 + fractionOfYear
    }

    yearlyBreakdown.push({
      year,
      production: Math.round(production),
      savings: Math.round(savings),
      feedInRevenue: Math.round(feedInRevenue),
      cumulativeSavings: Math.round(cumulativeSavings),
      netCost: Math.round(netCost)
    })
  }

  // First year calculations (no degradation, no escalation yet)
  const firstYearSelfConsumption = annualProduction * (selfConsumptionRate / 100)
  const firstYearGridFeedIn = annualProduction - firstYearSelfConsumption
  const firstYearSavings = firstYearSelfConsumption * utilityRates.costPerKwh
  const firstYearFeedInRevenue = firstYearGridFeedIn * feedInTariff

  // Average annual savings over analysis period
  const annualSavings = totalSavings / analysisYears

  // Calculate ROI (including feed-in revenue) - safe division
  const totalReturn = totalSavings + totalFeedInRevenue
  const roi = safeDivide((totalReturn - netSystemCost) * 100, netSystemCost, 0)

  // Calculate IRR (Internal Rate of Return)
  const irr = calculateIRR(netSystemCost, yearlyBreakdown)

  // Calculate energy offset percentage (German household average: ~3,500 kWh/year) - safe division
  const avgHouseholdUsage = utilityRates.avgMonthlyBill
    ? safeDivide(utilityRates.avgMonthlyBill * 12, utilityRates.costPerKwh, 3500)
    : 3500 // typical German household
  const energyOffsetPercentage = Math.min(safeDivide(selfConsumptionAmount * 100, avgHouseholdUsage, 0), 100)

  // Calculate CO2 offset (485g CO2 per kWh is German grid average 2024)
  const lifetimeCO2Offset = (annualProduction * analysisYears * 0.485) / 1000 // convert kg to tons

  // Monthly bill calculations - safe divisions
  const avgMonthlyBillBefore = utilityRates.avgMonthlyBill || safeDivide(avgHouseholdUsage * utilityRates.costPerKwh, 12, 0)
  const remainingPurchase = Math.max(0, avgHouseholdUsage - selfConsumptionAmount)
  const avgMonthlyBillAfter = safeDivide(remainingPurchase * utilityRates.costPerKwh, 12, 0)
  const avgMonthlySavings = avgMonthlyBillBefore - avgMonthlyBillAfter
  const avgMonthlyFeedInRevenue = safeDivide(firstYearFeedInRevenue, 12, 0)

  // Loan calculations if applicable (including KfW loans)
  let monthlyLoanPayment: number | undefined
  let totalLoanCost: number | undefined

  if (financing?.type === 'loan' || financing?.type === 'kfw') {
    const principal = financing.loanAmount || netSystemCost
    const monthlyRate = safeDivide((financing.interestRate || (financing.type === 'kfw' ? 2.5 : 4.5)), 100 * 12, 0)
    const numPayments = (financing.loanTerm || 15) * 12

    if (monthlyRate > 0 && numPayments > 0) {
      // Standard loan payment formula - safe calculation
      const powerTerm = Math.pow(1 + monthlyRate, numPayments)
      monthlyLoanPayment = safeDivide(principal * monthlyRate * powerTerm, powerTerm - 1, 0)
      totalLoanCost = monthlyLoanPayment * numPayments
    } else if (numPayments > 0) {
      monthlyLoanPayment = safeDivide(principal, numPayments, 0)
      totalLoanCost = principal
    } else {
      monthlyLoanPayment = 0
      totalLoanCost = 0
    }
  }

  return {
    grossSystemCost: Math.round(grossSystemCost),
    netSystemCost: Math.round(netSystemCost),
    effectiveCostPerWatt: Math.round(effectiveCostPerWatt * 100) / 100,
    firstYearSavings: Math.round(firstYearSavings),
    firstYearFeedInRevenue: Math.round(firstYearFeedInRevenue),
    annualSavings: Math.round(annualSavings),
    paybackPeriod: Math.round(paybackYear * 10) / 10,
    twentyFiveYearSavings: Math.round(totalSavings),
    twentyFiveYearFeedInRevenue: Math.round(totalFeedInRevenue),
    roi: Math.round(roi * 10) / 10,
    irr: Math.round(irr * 10) / 10,
    npv: Math.round(npv),
    energyOffsetPercentage: Math.round(energyOffsetPercentage * 10) / 10,
    selfConsumptionAmount: Math.round(selfConsumptionAmount),
    gridFeedInAmount: Math.round(gridFeedInAmount),
    lifetimeCO2Offset: Math.round(lifetimeCO2Offset * 10) / 10,
    avgMonthlyBillBefore: Math.round(avgMonthlyBillBefore),
    avgMonthlyBillAfter: Math.round(avgMonthlyBillAfter),
    avgMonthlySavings: Math.round(avgMonthlySavings),
    avgMonthlyFeedInRevenue: Math.round(avgMonthlyFeedInRevenue),
    monthlyLoanPayment: monthlyLoanPayment ? Math.round(monthlyLoanPayment) : undefined,
    totalLoanCost: totalLoanCost ? Math.round(totalLoanCost) : undefined,
    yearlyBreakdown
  }
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 * IRR is the discount rate that makes NPV = 0
 */
export function calculateIRR(
  initialInvestment: number,
  yearlyBreakdown: YearlyBreakdown[]
): number {
  // Build cash flow array: negative initial investment, then positive annual cash flows
  const cashFlows = [
    -initialInvestment,
    ...yearlyBreakdown.map(year => year.savings + year.feedInRevenue)
  ]

  // Newton-Raphson method to find IRR
  let irr = 0.1 // Initial guess: 10%
  const maxIterations = 100
  const tolerance = 0.00001

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let npv = 0
    let derivative = 0

    // Calculate NPV and its derivative at current IRR
    for (let year = 0; year < cashFlows.length; year++) {
      const discountFactor = Math.pow(1 + irr, year)
      npv += cashFlows[year] / discountFactor

      // Derivative of NPV with respect to IRR
      if (year > 0) {
        derivative -= (year * cashFlows[year]) / Math.pow(1 + irr, year + 1)
      }
    }

    // Check for convergence
    if (Math.abs(npv) < tolerance) {
      return Math.round(irr * 1000) / 10 // Return as percentage with 1 decimal
    }

    // Avoid division by zero
    if (Math.abs(derivative) < tolerance) {
      break
    }

    // Newton-Raphson iteration: x_new = x_old - f(x) / f'(x)
    const newIrr = irr - npv / derivative

    // Prevent negative or extremely large IRR values
    if (newIrr < -0.99 || newIrr > 10) {
      break
    }

    irr = newIrr
  }

  // If IRR calculation fails or doesn't converge, return 0
  return 0
}

/**
 * Estimate system cost based on size (€/W rates for German market)
 */
export function estimateSystemCost(systemSizeKw: number): number {
  // German market rates (2024) - larger systems have lower €/W
  // Note: These are net prices (after 0% VAT)
  let pricePerWatt: number

  if (systemSizeKw <= 5) {
    pricePerWatt = 1.60 // smaller residential systems (1,600€/kWp)
  } else if (systemSizeKw <= 10) {
    pricePerWatt = 1.40 // medium residential (1,400€/kWp)
  } else if (systemSizeKw <= 20) {
    pricePerWatt = 1.25 // large residential (1,250€/kWp)
  } else {
    pricePerWatt = 1.10 // small commercial (1,100€/kWp)
  }

  return systemSizeKw * 1000 * pricePerWatt
}

/**
 * Get default utility rates by German state (Bundesland)
 */
export function getDefaultUtilityRate(state?: string): number {
  // Average rates by Bundesland (€/kWh) - 2024 estimates
  const stateRates: Record<string, number> = {
    'BW': 0.38,  // Baden-Württemberg
    'BY': 0.37,  // Bayern
    'BE': 0.35,  // Berlin
    'BB': 0.36,  // Brandenburg
    'HB': 0.37,  // Bremen
    'HH': 0.35,  // Hamburg
    'HE': 0.38,  // Hessen
    'MV': 0.36,  // Mecklenburg-Vorpommern
    'NI': 0.37,  // Niedersachsen
    'NW': 0.37,  // Nordrhein-Westfalen
    'RP': 0.38,  // Rheinland-Pfalz
    'SL': 0.39,  // Saarland
    'SN': 0.36,  // Sachsen
    'ST': 0.36,  // Sachsen-Anhalt
    'SH': 0.36,  // Schleswig-Holstein
    'TH': 0.37   // Thüringen
  }

  return stateRates[state?.toUpperCase() || ''] || 0.37 // German average ~37ct/kWh
}

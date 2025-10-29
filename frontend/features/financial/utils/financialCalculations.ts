/**
 * Financial Calculations Utilities
 * Core calculation functions for solar financial analysis (German market)
 */

import type { FinancialInputs, FinancialResults, YearlyBreakdown } from '@/features/financial/types/financial'

/**
 * Calculate comprehensive financial analysis for solar system (German market)
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
    selfConsumptionRate = 30 // 30% is typical for German households without battery
  } = inputs

  // Calculate gross and net system costs
  const grossSystemCost = systemCost.totalCost

  // VAT reduction (0% since Jan 2023 for systems ≤30kWp)
  const vatSavings = systemSize <= 30 ? grossSystemCost * 0.19 : 0 // 19% VAT saved

  // State and municipal grants
  const stateGrant = incentives?.stateGrant || 0
  const municipalGrant = incentives?.municipalGrant || 0

  const totalIncentives = vatSavings + stateGrant + municipalGrant
  const netSystemCost = grossSystemCost - totalIncentives

  // Calculate effective cost per watt
  const effectiveCostPerWatt = netSystemCost / (systemSize * 1000) // convert kW to W

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

  // Calculate ROI (including feed-in revenue)
  const totalReturn = totalSavings + totalFeedInRevenue
  const roi = ((totalReturn - netSystemCost) / netSystemCost) * 100

  // Calculate energy offset percentage (German household average: ~3,500 kWh/year)
  const avgHouseholdUsage = utilityRates.avgMonthlyBill
    ? (utilityRates.avgMonthlyBill * 12) / utilityRates.costPerKwh
    : 3500 // typical German household
  const energyOffsetPercentage = Math.min((selfConsumptionAmount / avgHouseholdUsage) * 100, 100)

  // Calculate CO2 offset (485g CO2 per kWh is German grid average 2024)
  const lifetimeCO2Offset = (annualProduction * analysisYears * 0.485) / 1000 // convert kg to tons

  // Monthly bill calculations
  const avgMonthlyBillBefore = utilityRates.avgMonthlyBill || (avgHouseholdUsage * utilityRates.costPerKwh) / 12
  const remainingPurchase = Math.max(0, avgHouseholdUsage - selfConsumptionAmount)
  const avgMonthlyBillAfter = (remainingPurchase * utilityRates.costPerKwh) / 12
  const avgMonthlySavings = avgMonthlyBillBefore - avgMonthlyBillAfter
  const avgMonthlyFeedInRevenue = firstYearFeedInRevenue / 12

  // Loan calculations if applicable (including KfW loans)
  let monthlyLoanPayment: number | undefined
  let totalLoanCost: number | undefined

  if (financing?.type === 'loan' || financing?.type === 'kfw') {
    const principal = financing.loanAmount || netSystemCost
    const monthlyRate = (financing.interestRate || (financing.type === 'kfw' ? 2.5 : 4.5)) / 100 / 12
    const numPayments = (financing.loanTerm || 15) * 12

    if (monthlyRate > 0) {
      // Standard loan payment formula
      monthlyLoanPayment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      totalLoanCost = monthlyLoanPayment * numPayments
    } else {
      monthlyLoanPayment = principal / numPayments
      totalLoanCost = principal
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

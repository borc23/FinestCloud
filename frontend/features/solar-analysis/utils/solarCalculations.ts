/**
 * Utility functions for solar production calculations
 */

/**
 * Generate monthly estimate for German solar pattern
 * @param annualProduction - Annual production in kWh
 * @returns Array of 12 monthly production values
 */
export function generateMonthlyEstimate(annualProduction: number): number[] {
  const monthlyDistribution = [
    0.04, 0.06, 0.08, 0.10, 0.11, 0.12,  // Jan-Jun
    0.13, 0.12, 0.10, 0.07, 0.04, 0.03   // Jul-Dec
  ]
  return monthlyDistribution.map(ratio => Math.round(annualProduction * ratio))
}

/**
 * Generate 25-year production projection with degradation
 * @param annualProduction - First year annual production in kWh
 * @param degradationRate - Annual degradation rate as percentage (e.g., 0.5 for 0.5%)
 * @returns Array of 25 yearly production values
 */
export function generate25YearProjection(annualProduction: number, degradationRate: number): number[] {
  const projection: number[] = []
  for (let year = 0; year < 25; year++) {
    const degradationFactor = Math.pow(1 - degradationRate / 100, year)
    projection.push(Math.round(annualProduction * degradationFactor))
  }
  return projection
}

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
    0.04,
    0.06,
    0.08,
    0.1,
    0.11,
    0.12, // Jan-Jun
    0.13,
    0.12,
    0.1,
    0.07,
    0.04,
    0.03, // Jul-Dec
  ];
  return monthlyDistribution.map((ratio) =>
    Math.round(annualProduction * ratio),
  );
}

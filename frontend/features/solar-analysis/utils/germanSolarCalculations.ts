/**
 * German Solar Production Calculations
 * Based on Fraunhofer ISE 2025 Photovoltaics Report
 * https://www.ise.fraunhofer.de/
 */

/**
 * Validate if production estimate is realistic for Germany
 */
export function validateGermanProduction(
  systemSizeKw: number,
  reportedProduction: number,
): {
  isRealistic: boolean;
  expectedRange: { min: number; max: number };
  message: string;
} {
  // Conservative estimate (850 hours) to optimistic (1050 hours)
  const minProduction = systemSizeKw * 850;
  const maxProduction = systemSizeKw * 1050;

  const isRealistic =
    reportedProduction >= minProduction * 0.9 &&
    reportedProduction <= maxProduction * 1.1;

  let message = "";
  if (reportedProduction > maxProduction * 1.1) {
    message =
      "Production estimate appears optimistic for typical German conditions. " +
      "This would require exceptional south-facing orientation and southern German location.";
  } else if (reportedProduction < minProduction * 0.9) {
    message =
      "Production estimate appears conservative. Check for shading or non-optimal orientation.";
  } else {
    message = "Production estimate is within typical German ranges.";
  }

  return {
    isRealistic,
    expectedRange: {
      min: Math.round(minProduction),
      max: Math.round(maxProduction),
    },
    message,
  };
}

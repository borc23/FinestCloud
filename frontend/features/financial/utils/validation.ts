/**
 * Validation utilities for financial calculator inputs
 * Ensures all inputs are within valid ranges and prevents calculation errors
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validation constraints for financial inputs
 */
export const VALIDATION_CONSTRAINTS = {
  systemSize: {
    min: 0.1, // Minimum 100W system
    max: 1000, // Maximum 1MW system
    description: "System size in kW",
  },
  annualProduction: {
    min: 1,
    max: 2000000, // 2GWh max for sanity
    description: "Annual production in kWh",
  },
  costPerKwh: {
    min: 0.01,
    max: 2.0, // €2/kWh is extremely high
    description: "Electricity cost in €/kWh",
  },
  avgMonthlyBill: {
    min: 0,
    max: 100000, // €100k/month is commercial scale
    description: "Average monthly bill in €",
  },
  escalationRate: {
    min: 0,
    max: 50, // 50% escalation is extreme but possible
    description: "Rate escalation in %",
  },
  systemCost: {
    min: 100,
    max: 10000000, // €10M max for commercial
    description: "System cost in €",
  },
  feedInTariff: {
    min: 0,
    max: 1.0, // €1/kWh feed-in would be extraordinary
    description: "Feed-in tariff in €/kWh",
  },
  selfConsumptionRate: {
    min: 0,
    max: 100,
    description: "Self-consumption rate in %",
  },
  stateGrant: {
    min: 0,
    max: 1000000, // €1M max grant
    description: "State grant in €",
  },
  municipalGrant: {
    min: 0,
    max: 1000000,
    description: "Municipal grant in €",
  },
  discountRate: {
    min: 0,
    max: 30, // 30% discount rate is very conservative
    description: "Discount rate in %",
  },
  downPayment: {
    min: 0,
    max: 10000000,
    description: "Down payment in €",
  },
  loanTerm: {
    min: 1,
    max: 30, // 30 years maximum loan term
    description: "Loan term in years",
  },
  interestRate: {
    min: 0,
    max: 30, // 30% interest would be predatory but technically possible
    description: "Interest rate in %",
  },
} as const;

type FieldName = keyof typeof VALIDATION_CONSTRAINTS;

/**
 * Validate a single numeric input
 */
export function validateNumericInput(
  value: number,
  fieldName: FieldName,
): { isValid: boolean; error?: string } {
  const { min, max, description } = VALIDATION_CONSTRAINTS[fieldName];
  const error = !Number.isFinite(value)
    ? `${description} must be a valid number`
    : value < min
      ? `${description} must be at least ${min}`
      : value > max
        ? `${description} must be at most ${max}`
        : undefined;
  return { isValid: !error, error };
}

/**
 * Validate all financial calculator inputs.
 * Optional financing fields are only validated when provided.
 */
export function validateFinancialInputs(inputs: {
  systemSize: number;
  annualProduction: number;
  costPerKwh: number;
  avgMonthlyBill: number;
  escalationRate: number;
  systemCost: number;
  feedInTariff: number;
  selfConsumptionRate: number;
  stateGrant: number;
  municipalGrant: number;
  discountRate: number;
  downPayment?: number;
  loanTerm?: number;
  interestRate?: number;
  netSystemCost?: number;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of Object.keys(VALIDATION_CONSTRAINTS) as FieldName[]) {
    const value = inputs[field];
    const error =
      value !== undefined && validateNumericInput(value, field).error;
    if (error) errors.push(error);
  }

  // Cross-field validations
  if (errors.length === 0) {
    // Check if down payment exceeds net system cost
    if (
      inputs.downPayment !== undefined &&
      inputs.netSystemCost !== undefined &&
      inputs.downPayment > inputs.netSystemCost
    ) {
      errors.push("Down payment cannot exceed net system cost");
    }

    // Check if grants exceed system cost
    const totalGrants = inputs.stateGrant + inputs.municipalGrant;
    if (totalGrants > inputs.systemCost) {
      warnings.push("Total grants exceed system cost - this seems unusual");
    }

    // Production realism is checked separately by validateGermanProduction

    // Check if system cost is reasonable
    const costPerWatt = inputs.systemCost / (inputs.systemSize * 1000);
    if (costPerWatt < 0.5) {
      warnings.push(
        `System cost (€${costPerWatt.toFixed(
          2,
        )}/W) is very low. Typical German residential systems cost €1.10-€1.60/W.`,
      );
    }
    if (costPerWatt > 3.0) {
      warnings.push(
        `System cost (€${costPerWatt.toFixed(
          2,
        )}/W) is very high. Typical German residential systems cost €1.10-€1.60/W.`,
      );
    }

    // Check if electricity rate is reasonable for Germany
    if (inputs.costPerKwh < 0.25) {
      warnings.push(
        `Electricity rate (€${inputs.costPerKwh.toFixed(
          2,
        )}/kWh) is lower than typical German rates (€0.35-€0.40/kWh).`,
      );
    }
    if (inputs.costPerKwh > 0.5) {
      warnings.push(
        `Electricity rate (€${inputs.costPerKwh.toFixed(
          2,
        )}/kWh) is higher than typical German rates (€0.35-€0.40/kWh).`,
      );
    }

    // Check if feed-in tariff is reasonable (EEG 2025: 5.62-8.54 ct/kWh for partial feed-in)
    if (inputs.feedInTariff < 0.05) {
      warnings.push(
        `Feed-in tariff (${(inputs.feedInTariff * 100).toFixed(
          2,
        )} ct/kWh) is lower than German EEG 2025 rates (5.62-8.54 ct/kWh for partial feed-in).`,
      );
    }
    if (inputs.feedInTariff > 0.13) {
      warnings.push(
        `Feed-in tariff (${(inputs.feedInTariff * 100).toFixed(
          2,
        )} ct/kWh) is higher than German EEG 2025 rates. For partial feed-in (Überschusseinspeisung), rates are 5.62-8.54 ct/kWh. Full feed-in rates are up to ~13.07 ct/kWh.`,
      );
    }

    // Warn if self-consumption rate is unusual
    if (inputs.selfConsumptionRate < 15) {
      warnings.push(
        "Self-consumption rate below 15% is unusual. Typical German households achieve 25-40% without batteries.",
      );
    }
    if (inputs.selfConsumptionRate > 70 && inputs.selfConsumptionRate < 100) {
      warnings.push(
        "Self-consumption rate above 70% typically requires a battery storage system.",
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize and parse numeric input from form fields
 */
export function sanitizeNumericInput(
  value: string | number,
  defaultValue: number,
): number {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Safe division that prevents division by zero
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  defaultValue: number = 0,
): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return defaultValue;
  }
  if (denominator === 0) {
    return defaultValue;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : defaultValue;
}

/**
 * Validate if production estimate is realistic for Germany
 * Based on Fraunhofer ISE 2025: 850 (conservative) to 1,050 (optimistic) full load hours, ±10% tolerance
 */
export function validateGermanProduction(
  systemSizeKw: number,
  reportedProduction: number,
) {
  const tooHigh = reportedProduction > systemSizeKw * 1050 * 1.1;
  const tooLow = reportedProduction < systemSizeKw * 850 * 0.9;
  return {
    isRealistic: !tooHigh && !tooLow,
    expectedRange: {
      min: Math.round(systemSizeKw * 850),
      max: Math.round(systemSizeKw * 1050),
    },
    message: tooHigh
      ? "Production estimate appears optimistic for typical German conditions. " +
        "This would require exceptional south-facing orientation and southern German location."
      : tooLow
        ? "Production estimate appears conservative. Check for shading or non-optimal orientation."
        : "Production estimate is within typical German ranges.",
  };
}

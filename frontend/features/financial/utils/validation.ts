/**
 * Validation utilities for financial calculator inputs
 * Ensures all inputs are within valid ranges and prevents calculation errors
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  criticalWarnings?: string[]
}

export interface FinancialInputValidation {
  systemSize?: string
  annualProduction?: string
  costPerKwh?: string
  avgMonthlyBill?: string
  escalationRate?: string
  systemCost?: string
  feedInTariff?: string
  selfConsumptionRate?: string
  stateGrant?: string
  municipalGrant?: string
  discountRate?: string
  downPayment?: string
  loanTerm?: string
  interestRate?: string
}

/**
 * Validation constraints for financial inputs
 */
export const VALIDATION_CONSTRAINTS = {
  systemSize: {
    min: 0.1, // Minimum 100W system
    max: 1000, // Maximum 1MW system
    description: 'System size in kW'
  },
  annualProduction: {
    min: 1,
    max: 2000000, // 2GWh max for sanity
    description: 'Annual production in kWh'
  },
  costPerKwh: {
    min: 0.01,
    max: 2.0, // €2/kWh is extremely high
    description: 'Electricity cost in €/kWh'
  },
  avgMonthlyBill: {
    min: 0,
    max: 100000, // €100k/month is commercial scale
    description: 'Average monthly bill in €'
  },
  escalationRate: {
    min: 0,
    max: 50, // 50% escalation is extreme but possible
    description: 'Rate escalation in %'
  },
  systemCost: {
    min: 100,
    max: 10000000, // €10M max for commercial
    description: 'System cost in €'
  },
  feedInTariff: {
    min: 0,
    max: 1.0, // €1/kWh feed-in would be extraordinary
    description: 'Feed-in tariff in €/kWh'
  },
  selfConsumptionRate: {
    min: 0,
    max: 100,
    description: 'Self-consumption rate in %'
  },
  stateGrant: {
    min: 0,
    max: 1000000, // €1M max grant
    description: 'State grant in €'
  },
  municipalGrant: {
    min: 0,
    max: 1000000,
    description: 'Municipal grant in €'
  },
  discountRate: {
    min: 0,
    max: 30, // 30% discount rate is very conservative
    description: 'Discount rate in %'
  },
  downPayment: {
    min: 0,
    max: 10000000,
    description: 'Down payment in €'
  },
  loanTerm: {
    min: 1,
    max: 30, // 30 years maximum loan term
    description: 'Loan term in years'
  },
  interestRate: {
    min: 0,
    max: 30, // 30% interest would be predatory but technically possible
    description: 'Interest rate in %'
  }
} as const

/**
 * Validate a single numeric input
 */
export function validateNumericInput(
  value: number,
  fieldName: keyof typeof VALIDATION_CONSTRAINTS
): { isValid: boolean; error?: string; warning?: string } {
  const constraints = VALIDATION_CONSTRAINTS[fieldName]

  // Check if value is a valid number
  if (!Number.isFinite(value)) {
    return {
      isValid: false,
      error: `${constraints.description} must be a valid number`
    }
  }

  // Check if value is NaN
  if (Number.isNaN(value)) {
    return {
      isValid: false,
      error: `${constraints.description} must be a valid number`
    }
  }

  // Check minimum constraint
  if (value < constraints.min) {
    return {
      isValid: false,
      error: `${constraints.description} must be at least ${constraints.min}`
    }
  }

  // Check maximum constraint
  if (value > constraints.max) {
    return {
      isValid: false,
      error: `${constraints.description} must be at most ${constraints.max}`
    }
  }

  return { isValid: true }
}

/**
 * Validate all financial calculator inputs
 */
export function validateFinancialInputs(inputs: {
  systemSize: number
  annualProduction: number
  costPerKwh: number
  avgMonthlyBill: number
  escalationRate: number
  systemCost: number
  feedInTariff: number
  selfConsumptionRate: number
  stateGrant: number
  municipalGrant: number
  discountRate: number
  downPayment?: number
  loanTerm?: number
  interestRate?: number
  netSystemCost?: number
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const criticalWarnings: string[] = []

  // Validate basic inputs
  const fields = [
    'systemSize',
    'annualProduction',
    'costPerKwh',
    'avgMonthlyBill',
    'escalationRate',
    'systemCost',
    'feedInTariff',
    'selfConsumptionRate',
    'stateGrant',
    'municipalGrant',
    'discountRate'
  ] as const

  for (const field of fields) {
    const result = validateNumericInput(inputs[field], field)
    if (!result.isValid && result.error) {
      errors.push(result.error)
    }
    if (result.warning) {
      warnings.push(result.warning)
    }
  }

  // Validate optional financing fields
  if (inputs.downPayment !== undefined) {
    const result = validateNumericInput(inputs.downPayment, 'downPayment')
    if (!result.isValid && result.error) {
      errors.push(result.error)
    }
  }

  if (inputs.loanTerm !== undefined) {
    const result = validateNumericInput(inputs.loanTerm, 'loanTerm')
    if (!result.isValid && result.error) {
      errors.push(result.error)
    }
  }

  if (inputs.interestRate !== undefined) {
    const result = validateNumericInput(inputs.interestRate, 'interestRate')
    if (!result.isValid && result.error) {
      errors.push(result.error)
    }
  }

  // Cross-field validations
  if (errors.length === 0) {
    // Check if down payment exceeds net system cost
    if (inputs.downPayment !== undefined && inputs.netSystemCost !== undefined) {
      if (inputs.downPayment > inputs.netSystemCost) {
        errors.push('Down payment cannot exceed net system cost')
      }
    }

    // Check if grants exceed system cost
    const totalGrants = inputs.stateGrant + inputs.municipalGrant
    if (totalGrants > inputs.systemCost) {
      warnings.push('Total grants exceed system cost - this seems unusual')
    }

    // Check if annual production is realistic for system size
    const productionPerKw = inputs.annualProduction / inputs.systemSize
    if (productionPerKw < 500) {
      warnings.push(
        `Annual production (${Math.round(productionPerKw)} kWh/kW) is lower than typical German systems (850-1,050 kWh/kW). Verify your production estimate.`
      )
    }
    if (productionPerKw > 1500) {
      warnings.push(
        `Annual production (${Math.round(productionPerKw)} kWh/kW) is higher than typical German systems (850-1,050 kWh/kW). This is optimistic.`
      )
    }

    // Check if system cost is reasonable
    const costPerWatt = inputs.systemCost / (inputs.systemSize * 1000)
    if (costPerWatt < 0.5) {
      warnings.push(
        `System cost (€${costPerWatt.toFixed(2)}/W) is very low. Typical German residential systems cost €1.10-€1.60/W.`
      )
    }
    if (costPerWatt > 3.0) {
      warnings.push(
        `System cost (€${costPerWatt.toFixed(2)}/W) is very high. Typical German residential systems cost €1.10-€1.60/W.`
      )
    }

    // Check if electricity rate is reasonable for Germany
    if (inputs.costPerKwh < 0.25) {
      warnings.push(
        `Electricity rate (€${inputs.costPerKwh.toFixed(2)}/kWh) is lower than typical German rates (€0.35-€0.40/kWh).`
      )
    }
    if (inputs.costPerKwh > 0.50) {
      warnings.push(
        `Electricity rate (€${inputs.costPerKwh.toFixed(2)}/kWh) is higher than typical German rates (€0.35-€0.40/kWh).`
      )
    }

    // Check if feed-in tariff is reasonable (EEG 2025: 5.62-8.54 ct/kWh for partial feed-in)
    if (inputs.feedInTariff < 0.05) {
      warnings.push(
        `Feed-in tariff (${(inputs.feedInTariff * 100).toFixed(2)} ct/kWh) is lower than German EEG 2025 rates (5.62-8.54 ct/kWh for partial feed-in).`
      )
    }
    if (inputs.feedInTariff > 0.13) {
      warnings.push(
        `Feed-in tariff (${(inputs.feedInTariff * 100).toFixed(2)} ct/kWh) is higher than German EEG 2025 rates. For partial feed-in (Überschusseinspeisung), rates are 5.62-8.54 ct/kWh. Full feed-in rates are up to ~13.07 ct/kWh.`
      )
    }

    // Warn if self-consumption rate is unusual
    if (inputs.selfConsumptionRate < 15) {
      warnings.push(
        'Self-consumption rate below 15% is unusual. Typical German households achieve 25-40% without batteries.'
      )
    }
    if (inputs.selfConsumptionRate > 70 && inputs.selfConsumptionRate < 100) {
      warnings.push(
        'Self-consumption rate above 70% typically requires a battery storage system.'
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    criticalWarnings
  }
}

/**
 * Sanitize and parse numeric input from form fields
 */
export function sanitizeNumericInput(
  value: string | number,
  defaultValue: number
): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : defaultValue
  }

  const parsed = parseFloat(value)
  return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : defaultValue
}

/**
 * Safe division that prevents division by zero
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  defaultValue: number = 0
): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return defaultValue
  }
  if (denominator === 0) {
    return defaultValue
  }
  const result = numerator / denominator
  return Number.isFinite(result) ? result : defaultValue
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

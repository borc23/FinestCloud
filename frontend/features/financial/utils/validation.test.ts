/**
 * Unit tests for financial validation utilities
 */

import {
  validateNumericInput,
  validateFinancialInputs,
  sanitizeNumericInput,
  safeDivide,
  clamp,
  VALIDATION_CONSTRAINTS,
} from "./validation";

describe("validateNumericInput", () => {
  it("should accept valid values within range", () => {
    const result = validateNumericInput(10, "systemSize");
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject values below minimum", () => {
    const result = validateNumericInput(0.05, "systemSize");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("at least");
  });

  it("should reject values above maximum", () => {
    const result = validateNumericInput(2000, "systemSize");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("at most");
  });

  it("should reject NaN values", () => {
    const result = validateNumericInput(NaN, "systemSize");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("valid number");
  });

  it("should reject Infinity", () => {
    const result = validateNumericInput(Infinity, "systemSize");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("valid number");
  });
});

describe("validateFinancialInputs", () => {
  const validInputs = {
    systemSize: 10,
    annualProduction: 8500,
    costPerKwh: 0.37,
    avgMonthlyBill: 130,
    escalationRate: 4,
    systemCost: 14000,
    feedInTariff: 0.1623,
    selfConsumptionRate: 30,
    stateGrant: 0,
    municipalGrant: 0,
    discountRate: 4,
    netSystemCost: 11340,
  };

  it("should pass validation for valid inputs", () => {
    const result = validateFinancialInputs(validInputs);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject negative system size", () => {
    const result = validateFinancialInputs({
      ...validInputs,
      systemSize: -5,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject self-consumption rate over 100%", () => {
    const result = validateFinancialInputs({
      ...validInputs,
      selfConsumptionRate: 150,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject down payment exceeding net system cost", () => {
    const result = validateFinancialInputs({
      ...validInputs,
      downPayment: 20000,
      netSystemCost: 11340,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Down payment cannot exceed net system cost",
    );
  });

  it("should warn about unrealistic production rates", () => {
    const result = validateFinancialInputs({
      ...validInputs,
      annualProduction: 3000, // Very low for 10kW system
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("lower than typical");
  });

  it("should warn about high system costs", () => {
    const result = validateFinancialInputs({
      ...validInputs,
      systemCost: 40000, // €4/W is very high
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("very high"))).toBe(true);
  });

  it("should warn about low electricity rates", () => {
    const result = validateFinancialInputs({
      ...validInputs,
      costPerKwh: 0.15, // Below typical German rate
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("lower than typical"))).toBe(
      true,
    );
  });
});

describe("sanitizeNumericInput", () => {
  it("should return valid numbers unchanged", () => {
    expect(sanitizeNumericInput(42, 0)).toBe(42);
    expect(sanitizeNumericInput("42", 0)).toBe(42);
  });

  it("should return default for NaN", () => {
    expect(sanitizeNumericInput("not a number", 10)).toBe(10);
  });

  it("should return default for empty string", () => {
    expect(sanitizeNumericInput("", 5)).toBe(5);
  });

  it("should return default for Infinity", () => {
    expect(sanitizeNumericInput(Infinity, 0)).toBe(0);
  });

  it("should handle negative numbers", () => {
    expect(sanitizeNumericInput(-42, 0)).toBe(-42);
  });

  it("should handle decimal numbers", () => {
    expect(sanitizeNumericInput("3.14", 0)).toBe(3.14);
  });
});

describe("safeDivide", () => {
  it("should perform normal division for valid inputs", () => {
    expect(safeDivide(10, 2, 0)).toBe(5);
  });

  it("should return default when dividing by zero", () => {
    expect(safeDivide(10, 0, 99)).toBe(99);
  });

  it("should return default for NaN numerator", () => {
    expect(safeDivide(NaN, 2, 0)).toBe(0);
  });

  it("should return default for NaN denominator", () => {
    expect(safeDivide(10, NaN, 0)).toBe(0);
  });

  it("should return default for Infinity result", () => {
    expect(safeDivide(Infinity, 2, 0)).toBe(0);
  });

  it("should handle negative numbers correctly", () => {
    expect(safeDivide(-10, 2, 0)).toBe(-5);
    expect(safeDivide(10, -2, 0)).toBe(-5);
  });
});

describe("clamp", () => {
  it("should return value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("should return min when value is below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("should return max when value is above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("should handle edge cases", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("VALIDATION_CONSTRAINTS", () => {
  it("should have reasonable min/max for system size", () => {
    expect(VALIDATION_CONSTRAINTS.systemSize.min).toBe(0.1);
    expect(VALIDATION_CONSTRAINTS.systemSize.max).toBe(1000);
  });

  it("should have reasonable range for self-consumption rate", () => {
    expect(VALIDATION_CONSTRAINTS.selfConsumptionRate.min).toBe(0);
    expect(VALIDATION_CONSTRAINTS.selfConsumptionRate.max).toBe(100);
  });

  it("should have all required fields", () => {
    const requiredFields = [
      "systemSize",
      "annualProduction",
      "costPerKwh",
      "selfConsumptionRate",
      "feedInTariff",
      "discountRate",
    ];

    requiredFields.forEach((field) => {
      expect(VALIDATION_CONSTRAINTS).toHaveProperty(field);
      expect(
        VALIDATION_CONSTRAINTS[field as keyof typeof VALIDATION_CONSTRAINTS],
      ).toHaveProperty("min");
      expect(
        VALIDATION_CONSTRAINTS[field as keyof typeof VALIDATION_CONSTRAINTS],
      ).toHaveProperty("max");
      expect(
        VALIDATION_CONSTRAINTS[field as keyof typeof VALIDATION_CONSTRAINTS],
      ).toHaveProperty("description");
    });
  });
});

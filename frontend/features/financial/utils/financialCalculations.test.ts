/**
 * Unit tests for regional financial defaults
 */

import {
  calculateVatSavings,
  estimateSystemCost,
  regionalDefaults,
} from "./financialCalculations";
import { calculateGermanFeedInTariff } from "./germanFeedInTariff";

describe("regionalDefaults", () => {
  it("should fall back to German defaults without a price", () => {
    const defaults = regionalDefaults(10);
    expect(defaults.costPerKwh).toBe(0.37);
    expect(defaults.systemCost).toBe(14000);
    expect(defaults.feedInTariff).toBe(calculateGermanFeedInTariff(10));
  });

  it("should use the country's price, cost and feed-in tariff", () => {
    const defaults = regionalDefaults(10, {
      country: "FR",
      costPerKwh: 0.2561,
      period: "2025-S2",
    });
    expect(defaults.costPerKwh).toBe(0.2561);
    expect(defaults.systemCost).toBe(20000);
    expect(defaults.feedInTariff).toBe(0.04);
  });

  it("should use default costs for unconfigured countries", () => {
    const defaults = regionalDefaults(10, {
      country: "XX",
      costPerKwh: null,
      period: null,
    });
    expect(defaults.costPerKwh).toBe(0.37);
    expect(defaults.feedInTariff).toBe(0.06);
  });
});

describe("estimateSystemCost", () => {
  it("should cost less per watt for larger systems", () => {
    expect(estimateSystemCost(4) / 4).toBeGreaterThan(
      estimateSystemCost(30) / 30,
    );
  });
});

describe("calculateVatSavings", () => {
  it("should only apply the German 0% VAT rate", () => {
    expect(calculateVatSavings(10, 10000, "DE")).toBe(1900);
    expect(calculateVatSavings(10, 10000, "FR")).toBe(0);
    expect(calculateVatSavings(40, 10000, "DE")).toBe(0);
  });
});

/**
 * Unit tests for per-panel production estimates
 */

import { estimateProductionFromPanels } from "./solarCalculations";
import type { RoofPanelsData } from "@/features/solar-analysis/types/dashboard";

const roof = (sunshine: (number | undefined)[]) =>
  ({
    panels: sunshine.map((annualSunshineKwh) => ({
      coords: [],
      lat: 0,
      lng: 0,
      annualSunshineKwh,
    })),
    module_specs: { power_w: 400 },
  }) as unknown as RoofPanelsData;

describe("estimateProductionFromPanels", () => {
  it("should scale the average panel yield to the panel count", () => {
    // Average 1,000 kWh/kW × 0.4 kW × 0.85 = 340 kWh per panel
    expect(estimateProductionFromPanels([roof([900, 1100])], 3)).toBe(1020);
  });

  it("should skip panels without sunshine values", () => {
    expect(estimateProductionFromPanels([roof([1000, undefined])], 1)).toBe(
      340,
    );
  });

  it("should return undefined when no panel has sunshine", () => {
    expect(
      estimateProductionFromPanels([roof([undefined])], 1),
    ).toBeUndefined();
  });
});

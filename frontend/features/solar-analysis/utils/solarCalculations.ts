import type { RoofPanelsData } from "@/features/solar-analysis/types/dashboard";

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

// DC to AC system losses (inverter, wiring, soiling), Google Solar API default
const DC_TO_AC_DERATE = 0.85;

/**
 * Annual production (kWh) from per-panel sunshine. Google's annual flux is in
 * kWh/kW/year, so each panel yields flux × its kW rating × system losses.
 * The average panel yield is scaled to the live panel count, so manually
 * added or removed panels are included.
 * @returns undefined when no panel has a sunshine value
 */
export function estimateProductionFromPanels(
  roofs: RoofPanelsData[],
  panelCount: number,
): number | undefined {
  const yields = roofs.flatMap((roof) =>
    roof.panels
      .filter((panel) => panel.annualSunshineKwh !== undefined)
      .map(
        (panel) =>
          (panel.annualSunshineKwh! * roof.module_specs.power_w) / 1000,
      ),
  );
  if (yields.length === 0) return undefined;

  const averageYield = yields.reduce((sum, y) => sum + y, 0) / yields.length;
  return Math.round(averageYield * DC_TO_AC_DERATE * panelCount);
}

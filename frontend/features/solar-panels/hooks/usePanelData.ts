import { useMemo } from "react";
import type {
  PanelData,
  PanelGenerationData,
} from "@/features/solar-analysis/types/dashboard";

const DEFAULT_PANEL_WATTAGE = 400;
const DEFAULT_PITCH = 20;
const DEFAULT_AZIMUTH = 180;

function calculateCircularMean(angles: number[], weights: number[]): number {
  if (angles.length === 0) return 0;

  let sumSin = 0;
  let sumCos = 0;
  let totalWeight = 0;

  for (let i = 0; i < angles.length; i++) {
    const angleRad = (angles[i] * Math.PI) / 180;
    const weight = weights[i];
    sumSin += Math.sin(angleRad) * weight;
    sumCos += Math.cos(angleRad) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  const resultantLength = Math.sqrt(sumSin * sumSin + sumCos * sumCos);
  const tolerance = 1e-10 * totalWeight; // Adjust based on precision needs

  if (resultantLength < tolerance) {
    // Vectors cancel out - fall back to due south
    return 180;
  }

  const meanRad = Math.atan2(sumSin, sumCos);
  let meanDeg = (meanRad * 180) / Math.PI;

  if (meanDeg < 0) {
    meanDeg += 360;
  }

  return meanDeg;
}

/**
 * Hook to aggregate panel data from multiple roofs
 * Calculates total panels, system size, and weighted averages for pitch/azimuth
 */
export function usePanelData(
  panelGenerationData: PanelGenerationData | null,
): PanelData | null {
  return useMemo(() => {
    if (
      !panelGenerationData ||
      !panelGenerationData.roofs ||
      !panelGenerationData.roofs.length
    ) {
      return null;
    }

    const totalPanels = panelGenerationData.roofs.reduce(
      (sum, roof) => sum + roof.panel_count,
      0,
    );

    const panelWattage =
      panelGenerationData.roofs[0]?.module_specs?.power_w ??
      DEFAULT_PANEL_WATTAGE;
    const systemSize = (totalPanels * panelWattage) / 1000;

    let totalPitchWeight = 0;

    panelGenerationData.roofs.forEach((roof) => {
      totalPitchWeight += (roof.pitch ?? DEFAULT_PITCH) * roof.panel_count;
    });

    const avgPitch =
      totalPanels > 0 ? totalPitchWeight / totalPanels : DEFAULT_PITCH;

    const azimuths = panelGenerationData.roofs.map(
      (roof) => roof.azimuth ?? DEFAULT_AZIMUTH,
    );
    const weights = panelGenerationData.roofs.map((roof) => roof.panel_count);
    const avgAzimuth = calculateCircularMean(azimuths, weights);

    return {
      totalPanels,
      systemSize,
      panelWattage,
      avgPitch,
      avgAzimuth,
    };
  }, [panelGenerationData]);
}

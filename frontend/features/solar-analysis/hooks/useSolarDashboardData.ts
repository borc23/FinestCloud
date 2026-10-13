import { useMemo } from "react";
import { usePanelData } from "@/features/solar-panels/hooks/usePanelData";
import { usePVWatts } from "@/features/solar-analysis/hooks/usePVWatts";
import { useElectricityPrice } from "@/features/financial/hooks/useElectricityPrice";
import { estimateProductionFromPanels } from "@/features/solar-analysis/utils/solarCalculations";
import { calculateRegionalFinancials } from "@/features/financial/utils/financialCalculations";
import type {
  PanelData,
  SolarResultsDashboardProps,
} from "@/features/solar-analysis/types/dashboard";

/**
 * Custom hook that prepares and aggregates all data needed for the solar dashboard
 */
export function useSolarDashboardData({
  panelGenerationData,
  mapCenter,
  currentPanelCount,
}: SolarResultsDashboardProps) {
  const generatedPanelData = usePanelData(panelGenerationData);

  // Override generated totals with the live panel count (after manual edits)
  const panelData: PanelData | null = useMemo(
    () =>
      generatedPanelData && {
        ...generatedPanelData,
        totalPanels: currentPanelCount ?? generatedPanelData.totalPanels,
        systemSize: currentPanelCount
          ? (currentPanelCount * generatedPanelData.panelWattage) / 1000
          : generatedPanelData.systemSize,
      },
    [generatedPanelData, currentPanelCount],
  );

  // Fetch PVWatts data
  const { data: pvwattsData, isLoading } = usePVWatts({
    latitude: mapCenter?.lat,
    longitude: mapCenter?.lng,
    panelCount: panelData?.totalPanels || 0,
    panelWattage: panelData?.panelWattage || 400,
    tilt: panelData?.avgPitch,
    azimuth: panelData?.avgAzimuth,
  });

  const electricityPrice = useElectricityPrice(mapCenter?.lat, mapCenter?.lng);

  // Per-panel sunshine (includes shading); PVWatts where there is no Solar API data
  const annualProduction =
    (panelData &&
      estimateProductionFromPanels(
        panelGenerationData.roofs,
        panelData.totalPanels,
      )) ||
    pvwattsData?.annual_production ||
    undefined;

  const financials = useMemo(
    () =>
      panelData && annualProduction
        ? calculateRegionalFinancials(
            annualProduction,
            panelData.systemSize,
            electricityPrice,
          )
        : null,
    [panelData, annualProduction, electricityPrice],
  );

  return {
    panelData,
    location: mapCenter,
    pvwattsData,
    isLoading,
    annualProduction,
    electricityPrice,
    financials,
  };
}

import { useCallback } from "react";
import { generateSolarReport } from "@/features/reports/utils/pdfGenerator";
import { generateMonthlyEstimate } from "@/features/solar-analysis/utils/solarCalculations";
import { useOrganization } from "@/features/organization/hooks/useOrganization";
import type { ReportData } from "@/features/reports/types/report";
import type { FinancialResults } from "@/features/financial/types/financial";
import type { PVWattsResponse } from "@/features/solar-analysis/types/pvwatts";
import type {
  Location,
  PanelData,
} from "@/features/solar-analysis/types/dashboard";

interface UseSolarReportGeneratorProps {
  panelData: PanelData;
  annualProduction?: number;
  location?: Location;
  pvwatts?: PVWattsResponse | null;
  financials: FinancialResults | null;
}

/**
 * Custom hook for generating and downloading solar installation PDF reports
 */
export function useSolarReportGenerator({
  panelData,
  annualProduction,
  location,
  pvwatts,
  financials,
}: UseSolarReportGeneratorProps) {
  const { organization } = useOrganization();

  const handleGeneratePDF = useCallback(() => {
    if (!annualProduction || !financials) {
      alert("Please wait for production data to load");
      return;
    }

    const reportData: ReportData = {
      site: location && {
        address: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        location: location,
      },
      systemSpecs: {
        panelCount: panelData.totalPanels,
        systemSize: panelData.systemSize,
        panelWattage: panelData.panelWattage,
        annualProduction: annualProduction,
        avgPitch: panelData.avgPitch,
        avgAzimuth: panelData.avgAzimuth,
      },
      energyProduction: {
        // PVWatts' monthly profile, scaled to the per-panel annual estimate
        monthlyYield: pvwatts
          ? pvwatts.monthly_production.map((kwh) =>
              Math.round((kwh * annualProduction) / pvwatts.annual_production),
            )
          : generateMonthlyEstimate(annualProduction),
        annualYield: annualProduction,
        capacityFactor: pvwatts?.capacity_factor,
        // PVWatts reports kWh/m²/day
        solarIrradiance: pvwatts
          ? Math.round(pvwatts.annual_solar_radiation * 365)
          : undefined,
        degradationRate: 0.5,
      },
      financials: financials,
      monitoring: {
        monitoringSystem: "Web Portal & Mobile App",
        appAccess: true,
        maintenanceSchedule: {
          frequency: "Annual",
          tasks: [
            "Visual inspection of panels and mounting system",
            "Clean panels if necessary (rain usually sufficient)",
            "Check inverter display for error messages",
            "Verify monitoring system is reporting correctly",
            "Inspect electrical connections and wiring",
            "Check for shading from new tree growth",
            "Review energy production vs. expectations",
          ],
        },
        warranty: {
          panels: 25,
          inverter: 10,
          installation: 5,
        },
      },
      // Use organization branding if available
      companyName: organization?.name || "Solar Solutions",
      companyLogo: organization?.logo_url || undefined,
      companyEmail: organization?.company_email || undefined,
      companyPhone: organization?.company_phone || undefined,
      companyWebsite: organization?.company_website || undefined,
      organizationPrimaryColor: organization?.primary_color || undefined,
      projectDate: new Date(),
    };

    const doc = generateSolarReport(reportData);
    doc.save(`solar-proposal-${panelData.systemSize.toFixed(1)}kW.pdf`);
  }, [
    annualProduction,
    panelData,
    location,
    pvwatts,
    financials,
    organization,
  ]);

  return { handleGeneratePDF };
}

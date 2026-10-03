import { useCallback } from "react";
import { generateSolarReport } from "@/features/reports/utils/pdfGenerator";
import {
  calculateFinancials,
  estimateSystemCost,
  FINANCIAL_DEFAULTS,
} from "@/features/financial/utils/financialCalculations";
import { generateMonthlyEstimate } from "@/features/solar-analysis/utils/solarCalculations";
import { calculateGermanFeedInTariff } from "@/features/financial/utils/germanFeedInTariff";
import { useOrganization } from "@/features/organization/hooks/useOrganization";
import type { ReportData } from "@/features/reports/types/report";
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
}

/**
 * Custom hook for generating and downloading solar installation PDF reports
 */
export function useSolarReportGenerator({
  panelData,
  annualProduction,
  location,
  pvwatts,
}: UseSolarReportGeneratorProps) {
  const { organization } = useOrganization();

  const handleGeneratePDF = useCallback(() => {
    if (!annualProduction) {
      alert("Please wait for production data to load");
      return;
    }

    const financials = calculateFinancials({
      annualProduction,
      systemSize: panelData.systemSize,
      utilityRates: {
        costPerKwh: FINANCIAL_DEFAULTS.costPerKwh,
        feedInTariff: calculateGermanFeedInTariff(panelData.systemSize),
        escalationRate: FINANCIAL_DEFAULTS.escalationRate,
      },
      systemCost: estimateSystemCost(panelData.systemSize),
      selfConsumptionRate: FINANCIAL_DEFAULTS.selfConsumptionRate,
    });

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
        monthlyYield:
          pvwatts?.monthly_production ??
          generateMonthlyEstimate(annualProduction),
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
  }, [annualProduction, panelData, location, pvwatts, organization]);

  return { handleGeneratePDF };
}

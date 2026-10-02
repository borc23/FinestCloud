import { useCallback } from "react";
import {
  generateSolarReport,
  downloadPDF,
} from "@/features/reports/utils/pdfGenerator";
import {
  calculateFinancials,
  estimateSystemCost,
} from "@/features/financial/utils/financialCalculations";
import {
  generateMonthlyEstimate,
  generate25YearProjection,
} from "@/features/solar-analysis/utils/solarCalculations";
import { calculateGermanFeedInTariff } from "@/features/financial/utils/germanFeedInTariff";
import { useOrganization } from "@/features/organization/hooks/useOrganization";
import type { ReportData } from "@/features/reports/types/report";

interface PanelData {
  totalPanels: number;
  systemSize: number;
  panelWattage: number;
  avgPitch: number;
  avgAzimuth: number;
}

interface Location {
  lat: number;
  lng: number;
}

interface UseSolarReportGeneratorProps {
  panelData: PanelData;
  annualProduction?: number;
  location?: Location;
  costEstimate?: number;
  capacityFactor?: number;
}

/**
 * Custom hook for generating and downloading solar installation PDF reports
 */
export function useSolarReportGenerator({
  panelData,
  annualProduction,
  location,
  costEstimate,
  capacityFactor,
}: UseSolarReportGeneratorProps) {
  const { organization } = useOrganization();

  const handleGeneratePDF = useCallback(() => {
    if (!annualProduction) {
      alert("Please wait for production data to load");
      return;
    }

    const systemCost = costEstimate || estimateSystemCost(panelData.systemSize);
    const feedInTariff = calculateGermanFeedInTariff(
      panelData.systemSize,
      true,
      false,
    );

    const financials = calculateFinancials({
      annualProduction,
      systemSize: panelData.systemSize,
      utilityRates: {
        costPerKwh: 0.37,
        feedInTariff: feedInTariff,
        escalationRate: 0.03,
      },
      systemCost: {
        totalCost: systemCost,
        pricePerWatt: systemCost / (panelData.systemSize * 1000),
      },
      selfConsumptionRate: 0.3,
    });

    const reportData: ReportData = {
      customer: {
        name: "Customer Name",
        address: "Customer Address",
        propertyType: "residential",
      },
      site: {
        address: location
          ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
          : "Installation Address",
        location: location,
        roofType: "Pitched",
        roofCondition: "good",
      },
      systemSpecs: {
        panelCount: panelData.totalPanels,
        systemSize: panelData.systemSize,
        panelWattage: panelData.panelWattage,
        annualProduction: annualProduction,
        avgPitch: panelData.avgPitch,
        avgAzimuth: panelData.avgAzimuth,
        location: location,
      },
      energyProduction: {
        monthlyYield: generateMonthlyEstimate(annualProduction),
        annualYield: annualProduction,
        performanceRatio: capacityFactor || 85,
        solarIrradiance: 1100,
        degradationRate: 0.5,
        estimatedOutput25Years: generate25YearProjection(annualProduction, 0.5),
      },
      financials: financials,
      electricityRate: 0.37,
      monthlyBill: financials.avgMonthlySavings,
      feedInTariff: feedInTariff,
      selfConsumptionRate: 0.3,
      systemCost: systemCost,
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
      companyAddress: organization?.company_address || undefined,
      organizationPrimaryColor: organization?.primary_color || undefined,
      organizationSecondaryColor: organization?.secondary_color || undefined,
      projectDate: new Date(),
      proposalValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    const doc = generateSolarReport(reportData);
    downloadPDF(doc, `solar-proposal-${panelData.systemSize.toFixed(1)}kW.pdf`);
  }, [
    annualProduction,
    panelData,
    location,
    costEstimate,
    capacityFactor,
    organization,
  ]);

  return { handleGeneratePDF };
}

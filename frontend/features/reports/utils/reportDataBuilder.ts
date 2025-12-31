// reportDataBuilder.ts
import type { ReportData } from '@/features/reports/types/report'
import type { Organization } from '@/features/organization/types/organization'
import { generateMonthlyEstimate, generate25YearProjection } from '@/features/solar-analysis/utils/solarCalculations'

interface BuildReportDataParams {
  location?: { lat: number; lng: number }
  panelData: {
    totalPanels: number
    systemSize: number
    panelWattage: number
    avgPitch: number
    avgAzimuth: number
  }
  annualProduction: number
  systemCost: number
  financials: any
  pvwattsData?: { capacity_factor: number }
  organization?: Organization | null
}

export function buildReportData(params: BuildReportDataParams): ReportData {
  const { location, panelData, annualProduction, systemCost, financials, pvwattsData, organization } = params

  return {
    customer: {
      name: 'Customer Name',
      address: 'Customer Address',
      propertyType: 'residential'
    },
    site: {
      address: location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Installation Address',
      location: location,
      roofType: 'Pitched',
      roofCondition: 'good'
    },
    systemSpecs: {
      panelCount: panelData.totalPanels,
      systemSize: panelData.systemSize,
      panelWattage: panelData.panelWattage,
      annualProduction: annualProduction,
      avgPitch: panelData.avgPitch,
      avgAzimuth: panelData.avgAzimuth,
      location: location
    },
    energyProduction: {
      monthlyYield: generateMonthlyEstimate(annualProduction),
      annualYield: annualProduction,
      performanceRatio: pvwattsData?.capacity_factor || 85,
      solarIrradiance: 1100,
      degradationRate: 0.5,
      estimatedOutput25Years: generate25YearProjection(annualProduction, 0.5)
    },
    financials: financials,
    electricityRate: 0.37,
    monthlyBill: financials.monthlySavings,
    feedInTariff: 0.082,
    selfConsumptionRate: 0.30,
    systemCost: systemCost,
    monitoring: {
      monitoringSystem: 'Web Portal & Mobile App',
      appAccess: true,
      maintenanceSchedule: {
        frequency: 'Annual',
        tasks: [
          'Visual inspection of panels and mounting system',
          'Clean panels if necessary (rain usually sufficient)',
          'Check inverter display for error messages',
          'Verify monitoring system is reporting correctly',
          'Inspect electrical connections and wiring',
          'Check for shading from new tree growth',
          'Review energy production vs. expectations'
        ]
      },
      warranty: {
        panels: 25,
        inverter: 10,
        installation: 5
      }
    },
    // Use organization branding if available
    companyName: organization?.name || 'Solar Solutions',
    companyLogo: organization?.logo_url || undefined,
    companyEmail: organization?.company_email || undefined,
    companyPhone: organization?.company_phone || undefined,
    companyWebsite: organization?.company_website || undefined,
    companyAddress: organization?.company_address || undefined,
    organizationPrimaryColor: organization?.primary_color || undefined,
    organizationSecondaryColor: organization?.secondary_color || undefined,
    projectDate: new Date(),
    proposalValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
}

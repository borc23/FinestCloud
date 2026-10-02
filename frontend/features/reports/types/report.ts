/**
 * Report Generation Types
 * Type definitions for PDF report generation
 */

import type { FinancialResults } from "@/features/financial/types/financial";

export interface SiteInfo {
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface SystemSpecifications {
  panelCount: number;
  systemSize: number; // kW
  panelWattage: number; // W
  annualProduction: number; // kWh/year
  avgPitch?: number; // degrees
  avgAzimuth?: number; // degrees
}

export interface EnergyProduction {
  monthlyYield: number[]; // 12 months in kWh
  annualYield: number; // kWh
  capacityFactor?: number; // %
  solarIrradiance?: number; // kWh/m²/year
  degradationRate: number; // % per year
}

export interface MonitoringMaintenance {
  monitoringSystem?: string;
  appAccess: boolean;
  maintenanceSchedule: {
    frequency: string; // e.g., "Annual", "Biannual"
    tasks: string[];
  };
  warranty: {
    panels: number; // years
    inverter: number; // years
    installation: number; // years
  };
}

export interface ReportData {
  site?: SiteInfo;
  systemSpecs: SystemSpecifications;
  energyProduction?: EnergyProduction;
  financials: FinancialResults;
  systemCost: number; // €
  monitoring?: MonitoringMaintenance;

  // Branding & metadata
  companyName?: string;
  companyLogo?: string; // base64 or URL
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  organizationPrimaryColor?: string; // hex color for branding
  projectDate?: Date;
}

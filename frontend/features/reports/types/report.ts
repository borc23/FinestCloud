/**
 * Report Generation Types
 * Type definitions for PDF report generation
 */

import type { FinancialResults } from "@/features/financial/types/financial";
import type { ElectricalDesign } from "@/features/electrical/types/electrical";

export interface CustomerInfo {
  name: string;
  address: string;
  email?: string;
  phone?: string;
  propertyType?: "residential" | "commercial" | "industrial";
}

export interface SiteInfo {
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  roofType?: string; // e.g., "Pitched", "Flat", "Mixed"
  roofMaterial?: string; // e.g., "Tile", "Metal", "Membrane"
  roofAge?: number; // years
  roofCondition?: "excellent" | "good" | "fair" | "poor";
}

export interface SystemSpecifications {
  panelCount: number;
  systemSize: number; // kW
  panelWattage: number; // W
  panelManufacturer?: string;
  panelModel?: string;
  panelEfficiency?: number; // %
  annualProduction: number; // kWh/year
  performanceRatio?: number; // %
  degradationRate?: number; // % per year
  avgPitch?: number; // degrees
  avgAzimuth?: number; // degrees
  location?: {
    lat: number;
    lng: number;
  };
}

export interface InverterSpecs {
  type: "string" | "microinverter" | "optimizer";
  manufacturer?: string;
  model?: string;
  quantity: number;
  efficiency: number; // %
  warranty?: number; // years
}

export interface MountingSpecs {
  type: "flush" | "tilt" | "ballasted" | "ground";
  material?: string;
  windRating?: string;
  snowLoad?: string;
}

export interface BatterySpecs {
  included: boolean;
  capacity?: number; // kWh
  manufacturer?: string;
  model?: string;
  warranty?: number; // years
}

export interface EnergyProduction {
  monthlyYield: number[]; // 12 months in kWh
  annualYield: number; // kWh
  capacityFactor?: number; // %
  solarIrradiance?: number; // kWh/m²/year
  degradationRate: number; // % per year
  estimatedOutput25Years: number[]; // yearly production for 25 years
}

export interface ElectricalSafety {
  wiringLayout?: string;
  protectionDevices?: string[];
  grounding: "TN-S" | "TN-C-S" | "TT" | "IT";
  surgeProtection: boolean;
  localCompliance: string[]; // e.g., ["IEC 62446", "VDE 0100"]
  inspectionRequired: boolean;
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

export interface LegalRegulatory {
  gridConnectionStatus: "pending" | "approved" | "not required";
  permits: string[];
  incentives: string[];
  certifications: string[]; // e.g., ["IEC 61215", "UL 1703"]
  insuranceRequired: boolean;
}

export interface ReportData {
  // 1. Customer & Site Information
  customer?: CustomerInfo;
  site?: SiteInfo;

  // 2. System Design Overview
  systemSpecs: SystemSpecifications;
  inverter?: InverterSpecs;
  mounting?: MountingSpecs;
  battery?: BatterySpecs;

  // 3. Energy Production Estimate
  energyProduction?: EnergyProduction;

  // 4. Financial Analysis
  financials: FinancialResults;
  electricityRate: number; // €/kWh
  monthlyBill: number; // €
  feedInTariff: number; // €/kWh
  selfConsumptionRate: number; // %
  systemCost: number; // €

  // 5. Environmental Impact (calculated from financials)

  // 6. Electrical Feedback & Safety
  electricalDesign?: ElectricalDesign;
  electricalSafety?: ElectricalSafety;

  // 7. Monitoring & Maintenance
  monitoring?: MonitoringMaintenance;

  // 8. Visuals & Diagrams (base64 images)
  images?: {
    systemLayout?: string;
    roofPlan?: string;
    energyChart?: string;
    financialChart?: string;
  };

  // 9. Legal & Regulatory
  legal?: LegalRegulatory;

  // Report Metadata
  companyName?: string;
  companyLogo?: string; // base64 or URL
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  organizationPrimaryColor?: string; // hex color for branding
  organizationSecondaryColor?: string; // hex color for branding
  preparerName?: string;
  projectDate?: Date;
  proposalValidUntil?: Date;
  notes?: string;
}

export interface ReportOptions {
  includeCustomerInfo?: boolean;
  includeSiteInfo?: boolean;
  includeSystemSpecs?: boolean;
  includeEnergyProduction?: boolean;
  includeFinancials?: boolean;
  includeEnvironmental?: boolean;
  includeElectrical?: boolean;
  includeMonitoring?: boolean;
  includeLegal?: boolean;
  includeMonthlyBreakdown?: boolean;
  includeVisuals?: boolean;
  language?: "en" | "de";
  fileName?: string;
  template?: "professional" | "detailed" | "simple";
}

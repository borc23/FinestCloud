/**
 * Report Generation Types
 * Type definitions for PDF report generation
 */

import type { FinancialResults } from './financial'

export interface SystemSpecifications {
  panelCount: number
  systemSize: number // kW
  panelWattage: number // W
  annualProduction: number // kWh/year
  avgPitch?: number // degrees
  avgAzimuth?: number // degrees
  location?: {
    lat: number
    lng: number
  }
}

export interface ReportData {
  // System info
  systemSpecs: SystemSpecifications

  // Financial data
  financials: FinancialResults

  // User inputs
  electricityRate: number // €/kWh
  monthlyBill: number // €
  feedInTariff: number // €/kWh
  selfConsumptionRate: number // %
  systemCost: number // €

  // Optional customization
  companyName?: string
  companyLogo?: string // base64 or URL
  customerName?: string
  projectDate?: Date
  notes?: string
}

export interface ReportOptions {
  includeFinancials?: boolean
  includeMonthlyBreakdown?: boolean
  includeSystemSpecs?: boolean
  includeEnvironmental?: boolean
  language?: 'en' | 'de'
  fileName?: string
}

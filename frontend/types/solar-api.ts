/**
 * Google Solar API Type Definitions
 * Types for shade analysis and solar potential data from Google Solar API
 */

// Request types
export interface SolarApiRequest {
  location: {
    latitude: number
    longitude: number
  }
  requiredQuality?: 'LOW' | 'MEDIUM' | 'HIGH'
  exactQualityRequired?: boolean
}

// Building insights response
export interface BuildingInsights {
  name: string
  center: LatLng
  boundingBox: LatLngBox
  imageryDate: Date
  imageryProcessedDate: Date
  postalCode: string
  administrativeArea: string
  statisticalArea: string
  regionCode: string
  solarPotential: SolarPotential
  imageryQuality: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface LatLng {
  latitude: number
  longitude: number
}

export interface LatLngBox {
  sw: LatLng
  ne: LatLng
}

// Solar potential data
export interface SolarPotential {
  maxArrayPanelsCount: number
  maxArrayAreaMeters2: number
  maxSunshineHoursPerYear: number
  carbonOffsetFactorKgPerMwh: number
  wholeRoofStats: SizeAndSunshineStats
  buildingStats: SizeAndSunshineStats
  roofSegmentStats: RoofSegmentSizeAndSunshineStats[]
  solarPanels: SolarPanel[]
  solarPanelConfigs: SolarPanelConfig[]
  financialAnalyses: FinancialAnalysis[]
}

export interface SizeAndSunshineStats {
  areaMeters2: number
  sunshineQuantiles: number[]
  groundAreaMeters2: number
}

export interface RoofSegmentSizeAndSunshineStats {
  pitchDegrees: number
  azimuthDegrees: number
  stats: SizeAndSunshineStats
  center: LatLng
  boundingBox: LatLngBox
  planeHeightAtCenterMeters: number
}

export interface SolarPanel {
  center: LatLng
  orientation: 'LANDSCAPE' | 'PORTRAIT'
  yearlyEnergyDcKwh: number
  segmentIndex: number
}

export interface SolarPanelConfig {
  panelsCount: number
  yearlyEnergyDcKwh: number
  roofSegmentSummaries: RoofSegmentSummary[]
}

export interface RoofSegmentSummary {
  pitchDegrees: number
  azimuthDegrees: number
  panelsCount: number
  yearlyEnergyDcKwh: number
  segmentIndex: number
}

export interface FinancialAnalysis {
  monthlyBill: Money
  defaultBill: boolean
  averageKwhPerMonth: number
  panelConfigIndex: number
  financialDetails: FinancialDetails
  leasingSavings: LeasingSavings
  cashPurchaseSavings: CashPurchaseSavings
  financedPurchaseSavings: FinancedPurchaseSavings
}

export interface Money {
  currencyCode: string
  units: number
  nanos: number
}

export interface FinancialDetails {
  initialAcKwhPerYear: number
  remainingLifetimeUtilityBill: Money
  federalIncentive: Money
  stateIncentive: Money
  utilityIncentive: Money
  lifetimeSrecTotal: Money
  costOfElectricityWithoutSolar: Money
  netMeteringAllowed: boolean
  solarPercentage: number
  percentageExportedToGrid: number
}

export interface LeasingSavings {
  leasesAllowed: boolean
  leasesSupported: boolean
  annualLeasingCost: Money
  savings: Savings
}

export interface CashPurchaseSavings {
  outOfPocketCost: Money
  upfrontCost: Money
  rebateValue: Money
  paybackYears: number
  savings: Savings
}

export interface FinancedPurchaseSavings {
  annualLoanPayment: Money
  rebateValue: Money
  loanInterestRate: number
  savings: Savings
}

export interface Savings {
  savingsYear1: Money
  savingsYear20: Money
  presentValueOfSavingsYear20: Money
  financiallyViable: boolean
  savingsLifetime: Money
  presentValueOfSavingsLifetime: Money
}

// Data layers response
export interface DataLayersResponse {
  imageryDate: Date
  imageryProcessedDate: Date
  dsmUrl: string
  rgbUrl: string
  maskUrl: string
  annualFluxUrl: string
  monthlyFluxUrl: string
  hourlyShadeUrls: string[]
  imageryQuality: 'HIGH' | 'MEDIUM' | 'LOW'
}

// Shade analysis types
export interface ShadeAnalysis {
  buildingInsights: BuildingInsights
  dataLayers?: DataLayersResponse
  shadePercentage: number
  annualShadeHours: number
  maxSunshineHours: number
  shadeLossFactor: number // 0-1, multiply by production
  roofSegmentShade: RoofSegmentShade[]
}

export interface RoofSegmentShade {
  segmentIndex: number
  pitchDegrees: number
  azimuthDegrees: number
  shadePercentage: number
  sunshineHoursPerYear: number
  shadeLossFactor: number
  areaMeters2: number
}

// Panel shade data
export interface PanelShadeData {
  panelIndex: number
  center: LatLng
  segmentIndex: number
  shadePercentage: number
  shadeLossFactor: number
  yearlyEnergyDcKwh: number
  adjustedYearlyEnergyDcKwh: number
}

// Service response types
export interface SolarShadeResponse {
  success: boolean
  data?: ShadeAnalysis
  error?: string
}

export interface ShadeImpactSummary {
  totalPanels: number
  averageShadePercentage: number
  totalShadeLossFactor: number
  estimatedAnnualLoss: number // kWh
  estimatedFinancialLoss: number // €
  recommendation: string
}

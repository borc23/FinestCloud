/**
 * ResultDashboard Types
 * Type definitions for Panel generation analytics
 */

import type { Panel, Coordinate, ModuleSpecs } from './panel'

export interface RoofPanelsData {
  roof_id: number
  panels: Panel[]
  panel_count: number
  module_type: string
  module_specs: ModuleSpecs
  coords: Coordinate[]
  pitch: number
  azimuth: number
}

export interface PanelGenerationData {
  roofs: RoofPanelsData[]
  max_panels: number
  module: string
}

export interface Location {
  lat: number
  lng: number
}

export interface SimpleDataProps {
  panelCount: number
  systemSize: number
  annualProduction?: number
  costEstimate?: number
  latitude?: number
  longitude?: number
  panelWattage?: number
  tilt?: number
  azimuth?: number
}

export interface ComplexDataProps {
  panelGenerationData: PanelGenerationData
  mapCenter?: Location
  costEstimate?: number
}

export type SolarResultsDashboardProps = SimpleDataProps | ComplexDataProps

export interface DashboardSummaryProps {
  panelCount: number
  systemSize: number
  annualProduction?: number
}

export interface MetricItemProps {
  label: string
  value: string | number
  isLoading?: boolean
}

// Type Guards
export function isComplexData(props: SolarResultsDashboardProps): props is ComplexDataProps {
  return 'panelGenerationData' in props
}
/**
 * PVWatts API Types
 * Type definitions for NREL PVWatts solar production calculations
 */

export interface PVWattsRequest {
  latitude: number
  longitude: number
  panel_count: number
  panel_wattage: number
  tilt?: number
  azimuth?: number
}

export interface PVWattsSystemRequest {
  latitude: number
  longitude: number
  system_capacity: number
  tilt?: number
  azimuth?: number
}

export interface WeatherStationInfo {
  city: string
  state: string
  distance: number
}

export interface PVWattsResponse {
  monthly_production: number[]
  annual_production: number
  capacity_factor: number
  annual_solar_radiation: number
  system_capacity_kw: number
  station_info: WeatherStationInfo
}

export interface MonthlyProductionData {
  month: string
  production: number
  productionKwh: number
}

export interface PVWattsCalculationParams {
  latitude: number
  longitude: number
  panelCount: number
  panelWattage: number
  tilt?: number
  azimuth?: number
}

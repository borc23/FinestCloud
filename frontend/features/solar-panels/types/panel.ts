/**
 * Panel Generation Types
 * Shared type definitions for solar panel generation and processing
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Panel {
  coords: Coordinate[];
  lat: number;
  lng: number;
  annualSunshineKwh?: number; // Annual sunshine flux in kWh/m²/year from GeoTIFF
}

export interface ModuleSpecs {
  power_w: number;
  width_cm: number;
  height_cm: number;
  efficiency: number;
  id: string;
  name: string;
  color: string;
  path: string;
  description: string;
}

export interface RoofPanelData {
  roof_id: number;
  panels: Panel[];
  panel_count: number;
  module_type: string;
  module_specs: ModuleSpecs;
  coords: Coordinate[];
  pitch: number;
  azimuth: number;
}

export interface PanelGenerationResponse {
  roofs: RoofPanelData[];
  max_panels: number;
  module: string;
}

interface SolarPanelStats {
  yearlyEnergyDcKwh?: number;
}

export interface SolarPotential {
  solarPanels?: SolarPanelStats;
}

export interface SolarDataSegment {
  polygonIndex: number;
  coords: Coordinate[];
  center: Coordinate;
  solarData: {
    solarPotential?: SolarPotential;
  } | null; // null when the Solar API has no coverage
}

export interface AngleConfirmData {
  angles: number[];
  edgePadding: number;
  panelData?: PanelGenerationResponse;
  _requestBody?: unknown;
}

export interface PanelGenerationRequest {
  roofPolygons: Array<{ coords: Coordinate[] }>;
  objectPolygons?: Array<{ coords: Coordinate[] }>;
  angles?: number[];
  solarData?: Array<{
    solarData?: {
      solarPotential?: {
        roofSegmentStats?: Array<{
          azimuthDegrees?: number;
        }>;
      };
    };
  }>;
  mapBounds?: unknown;
  spacing?: number;
  edgePadding?: number;
  panelOrientation?: string;
}

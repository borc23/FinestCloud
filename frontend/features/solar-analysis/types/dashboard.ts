/**
 * Dashboard Types
 * Type definitions for Panel generation analytics
 */

import type {
  Panel,
  Coordinate,
  ModuleSpecs,
} from "@/features/solar-panels/types/panel";

export interface RoofPanelsData {
  roof_id: number;
  panels: Panel[];
  panel_count: number;
  module_type: string;
  module_specs: ModuleSpecs;
  coords: Coordinate[];
  pitch: number;
  azimuth: number;
}

export interface PanelGenerationData {
  roofs: RoofPanelsData[];
  max_panels: number;
  module: string;
}

export interface Location {
  lat: number;
  lng: number;
}

/** Panel totals aggregated across all roofs */
export interface PanelData {
  totalPanels: number;
  systemSize: number; // kW
  panelWattage: number; // W
  avgPitch: number; // degrees
  avgAzimuth: number; // degrees
}

export interface SolarResultsDashboardProps {
  panelGenerationData: PanelGenerationData;
  mapCenter?: Location;
  isEditMode?: boolean;
  currentPanelCount?: number;
  onMinimizeChange?: (minimized: boolean) => void;
  onSaveProject?: () => void;
  isAuthenticated?: boolean;
  minimizeRef?: React.MutableRefObject<(() => void) | null>;
}

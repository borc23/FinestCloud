/**
 * Database Types
 * TypeScript definitions for Supabase database schema
 */

import type { Coordinate } from './panel'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          default_latitude: number | null
          default_longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          default_latitude?: number | null
          default_longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          default_latitude?: number | null
          default_longitude?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          project_name: string
          status: 'draft' | 'completed'
          map_center_lat: number
          map_center_lng: number
          map_zoom: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_name: string
          status?: 'draft' | 'completed'
          map_center_lat: number
          map_center_lng: number
          map_zoom?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_name?: string
          status?: 'draft' | 'completed'
          map_center_lat?: number
          map_center_lng?: number
          map_zoom?: number
          created_at?: string
          updated_at?: string
        }
      }
      roof_analysis: {
        Row: {
          id: string
          project_id: string
          roof_index: number
          roof_polygon: Json
          azimuth: number
          pitch: number
          panel_count: number
          panel_wattage: number
          estimated_output: number | null
          shade_stats: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          roof_index: number
          roof_polygon: Json
          azimuth: number
          pitch: number
          panel_count?: number
          panel_wattage?: number
          estimated_output?: number | null
          shade_stats?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          roof_index?: number
          roof_polygon?: Json
          azimuth?: number
          pitch?: number
          panel_count?: number
          panel_wattage?: number
          estimated_output?: number | null
          shade_stats?: Json | null
          created_at?: string
        }
      }
      object_polygons: {
        Row: {
          id: string
          project_id: string
          polygon_coords: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          polygon_coords: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          polygon_coords?: Json
          created_at?: string
        }
      }
      panel_configurations: {
        Row: {
          id: string
          roof_analysis_id: string
          panel_positions: Json
          module_type: string
          module_specs: Json
          created_at: string
        }
        Insert: {
          id?: string
          roof_analysis_id: string
          panel_positions: Json
          module_type: string
          module_specs: Json
          created_at?: string
        }
        Update: {
          id?: string
          roof_analysis_id?: string
          panel_positions?: Json
          module_type?: string
          module_specs?: Json
          created_at?: string
        }
      }
    }
  }
}

// Typed helper interfaces for application use
export interface Profile {
  id: string
  email: string
  displayName: string | null
  defaultLatitude: number | null
  defaultLongitude: number | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  userId: string
  projectName: string
  status: 'draft' | 'completed'
  mapCenterLat: number
  mapCenterLng: number
  mapZoom: number
  createdAt: string
  updatedAt: string
}

export interface RoofAnalysis {
  id: string
  projectId: string
  roofIndex: number
  roofPolygon: Coordinate[]
  azimuth: number
  pitch: number
  panelCount: number
  panelWattage: number
  estimatedOutput: number | null
  shadeStats: ShadeStats | null
  createdAt: string
}

export interface ShadeStats {
  excellent: number
  good: number
  moderate: number
  significant: number
  high: number
  total: number
  averageShade: number
}

export interface ObjectPolygon {
  id: string
  projectId: string
  polygonCoords: Coordinate[]
  createdAt: string
}

export interface PanelConfiguration {
  id: string
  roofAnalysisId: string
  panelPositions: Coordinate[][]
  moduleType: string
  moduleSpecs: {
    power: number
    width?: number
    height?: number
    efficiency?: number
  }
  createdAt: string
}

// Project with related data (for full project load)
export interface ProjectWithData {
  project: Project
  roofAnalyses: RoofAnalysis[]
  objectPolygons: ObjectPolygon[]
  panelConfigurations: PanelConfiguration[]
}

// Helper type for creating new projects
export interface CreateProjectData {
  projectName: string
  mapCenter: {
    lat: number
    lng: number
  }
  mapZoom: number
  roofs: Array<{
    roofIndex: number
    polygon: Coordinate[]
    azimuth: number
    pitch: number
    panelCount: number
    panelWattage: number
    estimatedOutput?: number
    shadeStats?: ShadeStats
    panelPositions?: Coordinate[][]
    moduleType?: string
    moduleSpecs?: {
      power: number
      width?: number
      height?: number
      efficiency?: number
    }
  }>
  objects?: Array<{
    coords: Coordinate[]
  }>
  status?: 'draft' | 'completed'
}

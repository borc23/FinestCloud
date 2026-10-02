/**
 * Database Types
 * TypeScript definitions for Supabase database schema
 */

import type { Coordinate } from "@/features/solar-panels/types/panel";
import type {
  ActivityLogRow,
  InvitationRow,
  OrganizationRow,
} from "@/features/organization/types/organization";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          default_latitude: number | null;
          default_longitude: number | null;
          show_tutorial: boolean;
          organization_id: string | null;
          role: "owner" | "admin" | "designer" | "viewer";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          default_latitude?: number | null;
          default_longitude?: number | null;
          show_tutorial?: boolean;
          organization_id?: string | null;
          role?: "owner" | "admin" | "designer" | "viewer";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          default_latitude?: number | null;
          default_longitude?: number | null;
          show_tutorial?: boolean;
          organization_id?: string | null;
          role?: "owner" | "admin" | "designer" | "viewer";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          project_name: string;
          status: "draft" | "completed";
          map_center_lat: number;
          map_center_lng: number;
          map_zoom: number;
          annual_flux_url: string | null;
          organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_name: string;
          status?: "draft" | "completed";
          map_center_lat: number;
          map_center_lng: number;
          map_zoom?: number;
          annual_flux_url?: string | null;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_name?: string;
          status?: "draft" | "completed";
          map_center_lat?: number;
          map_center_lng?: number;
          map_zoom?: number;
          annual_flux_url?: string | null;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roof_analysis: {
        Row: {
          id: string;
          project_id: string;
          roof_index: number;
          roof_polygon: Json;
          azimuth: number;
          pitch: number;
          panel_count: number;
          panel_wattage: number;
          estimated_output: number | null;
          shade_stats: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          roof_index: number;
          roof_polygon: Json;
          azimuth: number;
          pitch: number;
          panel_count?: number;
          panel_wattage?: number;
          estimated_output?: number | null;
          shade_stats?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          roof_index?: number;
          roof_polygon?: Json;
          azimuth?: number;
          pitch?: number;
          panel_count?: number;
          panel_wattage?: number;
          estimated_output?: number | null;
          shade_stats?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      object_polygons: {
        Row: {
          id: string;
          project_id: string;
          polygon_coords: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          polygon_coords: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          polygon_coords?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      panel_configurations: {
        Row: {
          id: string;
          roof_analysis_id: string;
          panel_positions: Json;
          module_type: string;
          module_specs: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          roof_analysis_id: string;
          panel_positions: Json;
          module_type: string;
          module_specs: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          roof_analysis_id?: string;
          panel_positions?: Json;
          module_type?: string;
          module_specs?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: OrganizationRow;
        Insert: Partial<OrganizationRow> &
          Pick<OrganizationRow, "name" | "subdomain">;
        Update: Partial<OrganizationRow>;
        Relationships: [];
      };
      invitations: {
        Row: InvitationRow;
        Insert: Partial<InvitationRow> &
          Pick<
            InvitationRow,
            | "organization_id"
            | "email"
            | "role"
            | "invited_by"
            | "token"
            | "expires_at"
          >;
        Update: Partial<InvitationRow>;
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: ActivityLogRow;
        Insert: Partial<ActivityLogRow> &
          Pick<ActivityLogRow, "organization_id" | "action">;
        Update: Partial<ActivityLogRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Typed helper interfaces for application use
export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  defaultLatitude: number | null;
  defaultLongitude: number | null;
  showTutorial: boolean;
  organizationId: string | null;
  role: "owner" | "admin" | "designer" | "viewer";
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  projectName: string;
  status: "draft" | "completed";
  mapCenterLat: number;
  mapCenterLng: number;
  mapZoom: number;
  annualFluxUrl: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoofAnalysis {
  id: string;
  projectId: string;
  roofIndex: number;
  roofPolygon: Coordinate[];
  azimuth: number;
  pitch: number;
  panelCount: number;
  panelWattage: number;
  estimatedOutput: number | null;
  shadeStats: ShadeStats | null;
  createdAt: string;
}

export interface ShadeStats {
  excellent: number;
  good: number;
  moderate: number;
  significant: number;
  high: number;
  total: number;
  averageShade: number;
}

export interface ObjectPolygon {
  id: string;
  projectId: string;
  polygonCoords: Coordinate[];
  createdAt: string;
}

export interface PanelConfiguration {
  id: string;
  roofAnalysisId: string;
  panelPositions: Array<{
    coords: Coordinate[];
    annualSunshineKwh?: number;
  }>;
  moduleType: string;
  moduleSpecs: {
    power: number;
    width?: number;
    height?: number;
    efficiency?: number;
  };
  createdAt: string;
}

// Project with related data (for full project load)
export interface ProjectWithData {
  project: Project;
  roofAnalyses: RoofAnalysis[];
  objectPolygons: ObjectPolygon[];
  panelConfigurations: PanelConfiguration[];
}

// Helper type for creating new projects
export interface CreateProjectData {
  projectName: string;
  mapCenter: {
    lat: number;
    lng: number;
  };
  mapZoom: number;
  annualFluxUrl?: string | null;
  roofs: Array<{
    roofIndex: number;
    polygon: Coordinate[];
    azimuth: number;
    pitch: number;
    panelCount: number;
    panelWattage: number;
    estimatedOutput?: number;
    shadeStats?: ShadeStats;
    panelPositions?: Coordinate[][];
    moduleType?: string;
    moduleSpecs?: {
      power: number;
      width?: number;
      height?: number;
      efficiency?: number;
    };
  }>;
  objects?: Array<{
    coords: Coordinate[];
  }>;
  status?: "draft" | "completed";
}

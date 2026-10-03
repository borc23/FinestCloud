/**
 * Google Solar API Type Definitions
 * Types for shade analysis and solar potential data from Google Solar API
 */

export interface DataLayersRequest {
  location: {
    latitude: number;
    longitude: number;
  };
  radiusMeters?: number;
  view?:
    | "FULL_LAYERS"
    | "DSM_LAYER"
    | "IMAGERY_LAYERS"
    | "IMAGERY_AND_ANNUAL_FLUX_LAYERS"
    | "IMAGERY_AND_ALL_FLUX_LAYERS";
  requiredQuality?: "LOW" | "MEDIUM" | "HIGH";
  pixelSizeMeters?: number;
}

// Data layers response
export interface DataLayersResponse {
  imageryDate: Date;
  imageryProcessedDate: Date;
  dsmUrl: string;
  rgbUrl: string;
  maskUrl: string;
  annualFluxUrl: string;
  monthlyFluxUrl: string;
  hourlyShadeUrls: string[];
  imageryQuality: "HIGH" | "MEDIUM" | "LOW";
}

// Service response types
export interface DataLayersApiResponse {
  success: boolean;
  data?: DataLayersResponse;
  error?: string;
}

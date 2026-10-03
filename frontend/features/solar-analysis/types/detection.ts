export interface DetectionBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface CoordinateModel {
  lat?: number;
  lng?: number;
  pitch?: number;
  azimuth?: number;
  padding?: number;
}

export interface RoofModel {
  coords: CoordinateModel[];
}

export interface DetectionResponse {
  success: boolean;
  roofs: RoofModel[];
  objects: RoofModel[];
  error?: string;
}

/** Captured map view; the backend fetches its satellite image itself */
export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
  width: number;
  height: number;
}

export interface DetectionRequest {
  view: MapView;
  bounds: DetectionBounds;
  conf?: number;
  epsilon?: number;
}

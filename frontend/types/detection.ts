export interface DetectionBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface CoordinateModel {
  lat?: number
  lng?: number
  x?: number
  y?: number
}

export interface RoofModel {
  coords: CoordinateModel[]
}

export interface DetectionResponse {
  success: boolean
  roofs: RoofModel[]
  objects: RoofModel[]
  error?: string
}

export interface StaticMapParams {
  center: string
  zoom: number
  size: string
  maptype: string
  format: string
  style: string
}

export interface DetectionRequest {
  image: StaticMapParams
  bounds: DetectionBounds
  conf?: number
  epsilon?: number
}
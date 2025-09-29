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

export interface DetectionRequest {
  image: string
  bounds: DetectionBounds
  conf?: number
  epsilon?: number
}
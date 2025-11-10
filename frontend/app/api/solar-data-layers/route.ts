/**
 * Google Solar API - Data Layers Endpoint
 * Fetches GeoTIFF data layers (annual flux, DSM, RGB, etc.) for a specific location
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  DataLayersResponse,
  DataLayersApiResponse,
  DataLayersRequest
} from '@/features/solar-analysis/types/solar-api'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
const GOOGLE_SOLAR_DATA_LAYERS_URL = 'https://solar.googleapis.com/v1/dataLayers:get'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body: DataLayersRequest = await request.json()
    const {
      location,
      radiusMeters = 50,
      requiredQuality = 'HIGH',
      view = 'IMAGERY_AND_ANNUAL_FLUX_LAYERS',
      pixelSizeMeters = 0.5
    } = body

    // Validate input
    if (!location?.latitude || !location?.longitude) {
      return NextResponse.json(
        { success: false, error: 'Location with latitude and longitude is required' },
        { status: 400 }
      )
    }

    // Check for API key
    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Build query parameters
    const params = new URLSearchParams({
      'location.latitude': location.latitude.toString(),
      'location.longitude': location.longitude.toString(),
      'radiusMeters': radiusMeters.toString(),
      'view': view,
      'requiredQuality': requiredQuality,
      'pixelSizeMeters': pixelSizeMeters.toString(),
      'key': GOOGLE_MAPS_API_KEY
    })

    const url = `${GOOGLE_SOLAR_DATA_LAYERS_URL}?${params.toString()}`

    // Call Google Solar API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Solar API data layers error:', error)
      return NextResponse.json(
        { success: false, error: `Google Solar API error: ${response.status}` },
        { status: response.status }
      )
    }

    const dataLayers: DataLayersResponse = await response.json()

    const result: DataLayersApiResponse = {
      success: true,
      data: dataLayers,
    }

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('Error fetching solar data layers:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

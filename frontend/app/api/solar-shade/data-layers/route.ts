/**
 * Google Solar API - Data Layers Endpoint
 * Fetches detailed shade maps and solar flux data for pixel-level precision
 */

import { NextRequest, NextResponse } from 'next/server'
import type { DataLayersResponse } from '@/features/solar-analysis/types/solar-api'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
const GOOGLE_SOLAR_DATA_LAYERS_URL = 'https://solar.googleapis.com/v1/dataLayers:get'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude, requiredQuality = 'HIGH', radius = 50 } = body

    // Validate input
    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
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

    // Call Google Solar API Data Layers endpoint
    const url = `${GOOGLE_SOLAR_DATA_LAYERS_URL}?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=${requiredQuality}&radiusMeters=${radius}&view=FULL_LAYERS&key=${GOOGLE_MAPS_API_KEY}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Solar API Data Layers error:', error)
      return NextResponse.json(
        { success: false, error: `Google Solar API error: ${response.status}` },
        { status: response.status }
      )
    }

    const dataLayers: DataLayersResponse = await response.json()

    return NextResponse.json(
      {
        success: true,
        data: dataLayers,
      },
      { status: 200 }
    )

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

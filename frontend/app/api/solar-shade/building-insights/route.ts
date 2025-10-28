/**
 * Google Solar API - Building Insights Endpoint
 * Fetches shade analysis and solar potential data for a specific building
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  BuildingInsights,
  ShadeAnalysis,
  RoofSegmentShade,
  SolarShadeResponse
} from '@/types/solar-api'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
const GOOGLE_SOLAR_API_URL = 'https://solar.googleapis.com/v1/buildingInsights:findClosest'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude, requiredQuality = 'HIGH' } = body

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

    // Call Google Solar API
    const url = `${GOOGLE_SOLAR_API_URL}?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=${requiredQuality}&key=${GOOGLE_MAPS_API_KEY}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Solar API error:', error)
      return NextResponse.json(
        { success: false, error: `Google Solar API error: ${response.status}` },
        { status: response.status }
      )
    }

    const buildingInsights: BuildingInsights = await response.json()

    // Process shade analysis from building insights
    const shadeAnalysis = processShadeAnalysis(buildingInsights)

    const result: SolarShadeResponse = {
      success: true,
      data: shadeAnalysis,
    }

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('Error fetching solar shade data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * Process building insights into shade analysis
 */
function processShadeAnalysis(buildingInsights: BuildingInsights): ShadeAnalysis {
  const { solarPotential } = buildingInsights
  const maxSunshineHours = solarPotential.maxSunshineHoursPerYear

  // Process roof segment shade data
  const roofSegmentShade: RoofSegmentShade[] = solarPotential.roofSegmentStats.map((segment, index) => {
    // Calculate average sunshine hours for this segment
    const sunshineQuantiles = segment.stats.sunshineQuantiles
    const avgSunshineHours = sunshineQuantiles.reduce((a, b) => a + b, 0) / sunshineQuantiles.length

    // Calculate shade percentage
    const shadePercentage = ((maxSunshineHours - avgSunshineHours) / maxSunshineHours) * 100

    // Calculate shade loss factor (0-1, where 1 = no shade)
    const shadeLossFactor = avgSunshineHours / maxSunshineHours

    return {
      segmentIndex: index,
      pitchDegrees: segment.pitchDegrees,
      azimuthDegrees: segment.azimuthDegrees,
      shadePercentage: Math.round(shadePercentage * 10) / 10,
      sunshineHoursPerYear: Math.round(avgSunshineHours),
      shadeLossFactor: Math.round(shadeLossFactor * 1000) / 1000,
      areaMeters2: segment.stats.areaMeters2,
    }
  })

  // Calculate overall building shade
  const totalArea = roofSegmentShade.reduce((sum, seg) => sum + seg.areaMeters2, 0)
  const weightedShade = roofSegmentShade.reduce(
    (sum, seg) => sum + (seg.shadePercentage * seg.areaMeters2),
    0
  ) / totalArea

  const weightedShadeLoss = roofSegmentShade.reduce(
    (sum, seg) => sum + (seg.shadeLossFactor * seg.areaMeters2),
    0
  ) / totalArea

  // Calculate total shade hours
  const avgSunshineHours = maxSunshineHours * weightedShadeLoss
  const annualShadeHours = maxSunshineHours - avgSunshineHours

  return {
    buildingInsights,
    shadePercentage: Math.round(weightedShade * 10) / 10,
    annualShadeHours: Math.round(annualShadeHours),
    maxSunshineHours: Math.round(maxSunshineHours),
    shadeLossFactor: Math.round(weightedShadeLoss * 1000) / 1000,
    roofSegmentShade,
  }
}

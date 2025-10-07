import { NextRequest, NextResponse } from 'next/server'
import { proxyToPythonBackend, handleOptionsRequest } from '../../../lib/apiProxy'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL

export async function POST(request: NextRequest) {
  return proxyToPythonBackend(request, {
    method: 'POST',
    backendUrl: `${PYTHON_BACKEND_URL}/api/generate_panels`,
    forwardCookies: true,
    logRequests: true,
    transformRequest: (body) => ({
      roofs: body.roofPolygons.map((roofPoly: any, index: number) => {
        const pitch = body.angles?.[index] !== undefined ? body.angles[index] : 0
        const azimuth = body.solarData?.[index]?.solarData?.solarPotential?.roofSegmentStats?.[0]?.azimuthDegrees || 180
        return {
          coords: roofPoly.coords.map((coord: any) => ({
            lat: coord.lat,
            lng: coord.lng
          })),
          pitch,
          azimuth
        }
      }),
      objects: (body.objectPolygons || []).map((objPoly: any) => ({
        coords: objPoly.coords.map((coord: any) => ({
          lat: coord.lat,
          lng: coord.lng
        }))
      })),
      mapBounds: body.mapBounds,
      module: body.module || 'standard',
      spacing: body.spacing || 0.5,
      max_panels: body.max_panels || null,
      padding: body.edgePadding !== undefined ? body.edgePadding : 20,
      panelOrientation: body.panelOrientation
    })
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const latitude = searchParams.get('latitude')
  const longitude = searchParams.get('longitude')

  if (!latitude || !longitude) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameters',
        details: 'latitude and longitude are required'
      },
      { status: 400 }
    )
  }

  return proxyToPythonBackend(request, {
    method: 'GET',
    backendUrl: `${PYTHON_BACKEND_URL}/api/solar_api_proxy?latitude=${latitude}&longitude=${longitude}`
  })
}

export async function OPTIONS(request: NextRequest) {
  return handleOptionsRequest(['GET', 'POST', 'OPTIONS'])
}

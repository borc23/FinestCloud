import { NextRequest, NextResponse } from 'next/server'
import { proxyToPythonBackend, handleOptionsRequest, checkBackendHealth } from '@/shared/lib/apiProxy'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

export async function POST(request: NextRequest) {
  // Validate API key is configured
  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: 'Server configuration error',
        details: 'Google Maps API key is not configured'
      },
      { status: 500 }
    )
  }

  // Check backend health first
  const isHealthy = await checkBackendHealth(PYTHON_BACKEND_URL!)
  if (!isHealthy) {
    return NextResponse.json(
      {
        success: false,
        error: 'Python backend is not running',
        details: 'Make sure your Python FastAPI server is running on port 8000'
      },
      { status: 503 }
    )
  }

  return proxyToPythonBackend(request, {
    method: 'POST',
    backendUrl: `${PYTHON_BACKEND_URL}/api/detect`,
    transformRequest: (body) => {
      // Generate static map URL on the server side
      const { image: mapParams, bounds, conf, epsilon } = body

      const params = new URLSearchParams({
        center: mapParams.center,
        size: mapParams.size,
        maptype: mapParams.maptype,
        zoom: mapParams.zoom.toString(),
        format: mapParams.format,
        style: mapParams.style,
        key: GOOGLE_MAPS_API_KEY!
      })

      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`

      return {
        image: staticMapUrl,
        bounds,
        conf,
        epsilon
      }
    }
  })
}
import { NextRequest, NextResponse } from 'next/server'
import { proxyToPythonBackend, handleOptionsRequest, checkBackendHealth } from '@/shared/lib/apiProxy'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

export async function POST(request: NextRequest) {
  // Validate backend URL is configured
  if (!PYTHON_BACKEND_URL) {
    return NextResponse.json(
      {
        success: false,
        error: 'Server configuration error',
        details: 'PYTHON_BACKEND_URL environment variable is not set. Please configure it in your Vercel environment variables.'
      },
      { status: 500 }
    )
  }

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
  const isHealthy = await checkBackendHealth(PYTHON_BACKEND_URL)
  if (!isHealthy) {
    return NextResponse.json(
      {
        success: false,
        error: 'Python backend is not running',
        details: `Cannot connect to backend at ${PYTHON_BACKEND_URL}. Please check your Render backend service is running.`
      },
      { status: 503 }
    )
  }

  return proxyToPythonBackend(request, {
    method: 'POST',
    backendUrl: `${PYTHON_BACKEND_URL}/api/detect`,
    transformRequest: (body: any) => {
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
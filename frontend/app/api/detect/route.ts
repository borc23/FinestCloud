import { NextRequest, NextResponse } from 'next/server'
import { proxyToPythonBackend, handleOptionsRequest, checkBackendHealth } from '@/shared/lib/apiProxy'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

export async function POST(request: NextRequest) {
  console.log('[Detect API] Starting detection request')
  console.log('[Detect API] PYTHON_BACKEND_URL:', PYTHON_BACKEND_URL)
  console.log('[Detect API] GOOGLE_MAPS_API_KEY configured:', !!GOOGLE_MAPS_API_KEY)

  // Validate backend URL is configured
  if (!PYTHON_BACKEND_URL) {
    console.error('[Detect API] PYTHON_BACKEND_URL not configured')
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
    console.error('[Detect API] GOOGLE_MAPS_API_KEY not configured')
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
  console.log('[Detect API] Checking backend health...')
  const isHealthy = await checkBackendHealth(PYTHON_BACKEND_URL)
  console.log('[Detect API] Backend health check result:', isHealthy)

  if (!isHealthy) {
    console.error('[Detect API] Backend health check failed')
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
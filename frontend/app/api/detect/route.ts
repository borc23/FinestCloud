import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = 'http://127.0.0.1:8000'
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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

    // Generate static map URL on the server side
    const { image: mapParams, bounds, conf, epsilon } = body

    const params = new URLSearchParams({
      center: mapParams.center,
      size: mapParams.size,
      maptype: mapParams.maptype,
      zoom: mapParams.zoom.toString(),
      format: mapParams.format,
      style: mapParams.style,
      key: GOOGLE_MAPS_API_KEY
    })

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`

    // Create request body for Python backend with the generated URL
    const backendRequestBody = {
      image: staticMapUrl,
      bounds,
      conf,
      epsilon
    }

    // Test if backend is reachable first
    try {
      const healthCheck = await fetch(`${PYTHON_BACKEND_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!healthCheck.ok) {
        throw new Error(`Health check failed: ${healthCheck.status}`)
      }
    } catch (healthError) {
      console.error('Backend health check failed:', healthError)
      return NextResponse.json(
        {
          success: false,
          error: 'Python backend is not running',
          details: 'Make sure your Python FastAPI server is running on port 8000'
        },
        { status: 503 }
      )
    }

    // Forward the request to your Python FastAPI backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendRequestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Python backend error:', response.status, errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Backend error: ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to backend service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('POST /api/generate_panels called')
    console.log('Request body:', JSON.stringify(body, null, 2))
    console.log('Angles array:', body.angles)

    // Transform frontend data to backend format
    const backendRequest = {
      roofs: body.roofPolygons.map((roofPoly: any, index: number) => {
        const pitch = body.angles?.[index] !== undefined ? body.angles[index] : 0
        const azimuth = body.solarData?.[index]?.solarData?.solarPotential?.roofSegmentStats?.[0]?.azimuthDegrees || 180
        console.log(`Roof ${index}: pitch=${pitch}, azimuth=${azimuth}`)
        return {
          coords: roofPoly.coords,
          pitch,
          azimuth
        }
      }),
      mapBounds: body.mapBounds,
      mapDimensions: body.mapDimensions,
      resolution: body.resolution,
      module: body.module || 'standard',
      spacing: body.spacing || 0.5,
      max_panels: body.max_panels || null
    }

    console.log('Transformed backend request:', JSON.stringify(backendRequest, null, 2))

    // Forward to Python backend
    const backendUrl = `${PYTHON_BACKEND_URL}/api/generate_panels`
    console.log('Forwarding to:', backendUrl)

    // Get session cookie from request if it exists
    const sessionCookie = request.cookies.get('session')?.value

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Forward session cookie to backend
    if (sessionCookie) {
      headers['Cookie'] = `session=${sessionCookie}`
    }

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(backendRequest),
      credentials: 'include',
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
    console.log('Backend response:', JSON.stringify(data, null, 2))

    // Create response and forward any Set-Cookie headers from backend
    const nextResponse = NextResponse.json(data)

    // Forward session cookies from backend to frontend
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader)
    }

    return nextResponse

  } catch (error) {
    console.error('Panel generation proxy error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Forward the request to Python FastAPI backend
    const backendUrl = `${PYTHON_BACKEND_URL}/api/solar_api_proxy?latitude=${latitude}&longitude=${longitude}`

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('Solar API proxy error:', error)
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

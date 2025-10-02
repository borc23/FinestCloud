import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL

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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

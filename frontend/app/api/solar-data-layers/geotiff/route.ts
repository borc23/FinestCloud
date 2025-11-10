/**
 * GeoTIFF Proxy Endpoint
 * Proxies GeoTIFF file downloads from Google Solar API with authentication
 */

import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    // Validate input
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Check for API key
    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Add API key to the URL if not already present
    const urlObj = new URL(url)
    if (!urlObj.searchParams.has('key')) {
      urlObj.searchParams.set('key', GOOGLE_MAPS_API_KEY)
    }

    // Fetch the GeoTIFF file
    const response = await fetch(urlObj.toString(), {
      method: 'GET',
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Solar API GeoTIFF error:', error)
      return NextResponse.json(
        { error: `Failed to fetch GeoTIFF: ${response.status}` },
        { status: response.status }
      )
    }

    // Get the GeoTIFF data as array buffer
    const buffer = await response.arrayBuffer()

    // Return the GeoTIFF file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/tiff',
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=604800', // Cache for 7 days
      }
    })

  } catch (error) {
    console.error('Error proxying GeoTIFF:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

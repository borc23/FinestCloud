/**
 * GeoTIFF Proxy Endpoint
 * Proxies GeoTIFF file downloads from Google Solar API with authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { guardApiCall } from "@/shared/lib/apiGuard";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Mark this route as dynamic since it uses searchParams
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await guardApiCall(request);
  if (denied) return denied;

  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    // Validate input
    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 },
      );
    }

    // Check for API key
    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: "Google Maps API key not configured" },
        { status: 500 },
      );
    }

    // Only proxy Google Solar GeoTIFF downloads: any other host would receive our API key
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (
      urlObj.protocol !== "https:" ||
      urlObj.hostname !== "solar.googleapis.com" ||
      urlObj.pathname !== "/v1/geoTiff:get"
    ) {
      return NextResponse.json(
        { error: "URL must be a Google Solar API GeoTIFF URL" },
        { status: 400 },
      );
    }
    urlObj.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    // Fetch the GeoTIFF file
    const response = await fetch(urlObj.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Google Solar API GeoTIFF error:", error);
      return NextResponse.json(
        { error: `Failed to fetch GeoTIFF: ${response.status}` },
        { status: response.status },
      );
    }

    // Get the GeoTIFF data as array buffer
    const buffer = await response.arrayBuffer();

    // Return the GeoTIFF file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/tiff",
        "Content-Length": buffer.byteLength.toString(),
        // Browser-only: a shared cache would serve it past the auth and quota check
        "Cache-Control": "private, max-age=604800", // 7 days
      },
    });
  } catch (error) {
    console.error("Error proxying GeoTIFF:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

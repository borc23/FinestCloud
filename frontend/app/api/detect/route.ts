import { NextRequest } from "next/server";
import { errorResponse, proxyToPythonBackend } from "@/shared/lib/apiProxy";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("[Detect API] GOOGLE_MAPS_API_KEY not configured");
    return errorResponse(
      "Server configuration error",
      500,
      "Google Maps API key is not configured",
    );
  }

  // Build the static map URL server side so the key never reaches the browser
  return proxyToPythonBackend(
    request,
    "/api/detect",
    ({ image, bounds, conf, epsilon }) => {
      const params = new URLSearchParams({
        center: image.center,
        size: image.size,
        maptype: image.maptype,
        zoom: image.zoom.toString(),
        format: image.format,
        style: image.style,
        key: GOOGLE_MAPS_API_KEY,
      });
      return {
        image: `https://maps.googleapis.com/maps/api/staticmap?${params}`,
        bounds,
        conf,
        epsilon,
      };
    },
  );
}

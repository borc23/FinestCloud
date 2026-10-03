import { NextRequest } from "next/server";
import { errorResponse, proxyToPythonBackend } from "@/shared/lib/apiProxy";
import type {
  PanelGenerationRequest,
  Coordinate,
} from "@/features/solar-panels/types/panel";

// Mark this route as dynamic since GET handler uses searchParams
export const dynamic = "force-dynamic";

const toCoords = ({ coords }: { coords: Coordinate[] }) => ({
  coords: coords.map(({ lat, lng }) => ({ lat, lng })),
});

export async function POST(request: NextRequest) {
  return proxyToPythonBackend(
    request,
    "/api/generate_panels",
    (body: PanelGenerationRequest & { panel_specs?: unknown }) => ({
      roofs: body.roofPolygons.map((roof, index) => ({
        ...toCoords(roof),
        pitch: body.angles?.[index] ?? 0,
        azimuth:
          body.solarData?.[index]?.solarData?.solarPotential
            ?.roofSegmentStats?.[0]?.azimuthDegrees ?? 180,
      })),
      objects: (body.objectPolygons ?? []).map(toCoords),
      map_bounds: body.mapBounds,
      spacing: body.spacing ?? 0.5,
      padding: body.edgePadding ?? 20,
      panel_orientation: body.panelOrientation,
      panel_specs: body.panel_specs ?? null,
    }),
  );
}

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("latitude");
  const longitude = request.nextUrl.searchParams.get("longitude");

  if (!latitude || !longitude) {
    return errorResponse(
      "Missing required parameters",
      400,
      "latitude and longitude are required",
    );
  }

  const query = new URLSearchParams({ latitude, longitude });
  return proxyToPythonBackend(request, `/api/solar_api_proxy?${query}`);
}

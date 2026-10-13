import { NextRequest } from "next/server";
import { proxyToPythonBackend } from "@/shared/lib/apiProxy";
import { guardApiCall } from "@/shared/lib/apiGuard";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

// The backend builds the Static Maps URL (with its own key) from the map view
export async function POST(request: NextRequest) {
  const denied = await guardApiCall(request);
  if (denied) return denied;

  return proxyToPythonBackend(request, "/api/detect");
}

import { NextRequest } from "next/server";
import { proxyToPythonBackend } from "@/shared/lib/apiProxy";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return proxyToPythonBackend(request, "/api/pvwatts/calculate");
}

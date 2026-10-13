import { NextResponse } from "next/server";
import { isBackendUp } from "@/shared/lib/apiProxy";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

/**
 * Public on purpose: pinging the backend's health check wakes it from sleep
 * (free hosting tiers spin down when idle), so the page calls this on load and
 * the backend is warm by the time a visitor runs an analysis. It costs nothing
 * and reveals nothing beyond up/down.
 */
export async function GET() {
  return NextResponse.json({ ready: await isBackendUp(8000) });
}

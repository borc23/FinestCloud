import type { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/shared/lib/apiProxy";
import { createRouteClient } from "@/shared/lib/supabase/server";

/**
 * Gate for API routes: returns an error response unless the request comes from
 * a signed-in user (guests included) with daily quota left, or null to let it
 * through. Metered routes spend quota on paid upstream APIs (Google Solar /
 * Static Maps, NREL); the count lives in Postgres (consume_api_call) because
 * serverless instances share no memory.
 */
export async function guardApiCall(
  request: NextRequest,
  { metered = true } = {},
): Promise<NextResponse | null> {
  const supabase = createRouteClient(request);

  // getUser() verifies the token with Supabase Auth; getSession() would trust the cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Sign in required", 401);
  if (!metered) return null;

  const { data: allowed, error } = await supabase.rpc("consume_api_call");
  if (error) {
    // Fail closed: without the quota check, paid calls would be unlimited
    console.error("Quota check failed:", error.message);
    return errorResponse("Service temporarily unavailable", 503);
  }
  return allowed
    ? null
    : errorResponse(
        "Daily usage limit reached, please try again tomorrow",
        429,
      );
}

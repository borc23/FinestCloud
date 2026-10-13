import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/features/auth/types/database";

/**
 * Supabase client acting as the user whose session cookies came with the
 * request. Pass the response when the call can change the session (e.g.
 * exchanging an auth code) so the new cookies are written to it.
 */
export function createRouteClient(
  request: NextRequest,
  response?: NextResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing required Supabase environment variables");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      // Otherwise read-only: the middleware already refreshed the session
      setAll: (cookies) =>
        cookies.forEach(
          ({ name, value, options }) =>
            response?.cookies.set(name, value, options),
        ),
    },
  });
}

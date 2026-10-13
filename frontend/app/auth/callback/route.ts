import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/shared/lib/supabase/server";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

/**
 * Sign-up confirmation emails link here (emailRedirectTo in ProfilePanel).
 * Supabase has already confirmed the email; this swaps the one-time code for a
 * session so the new user arrives signed in. If the link is opened in another
 * browser the exchange fails, and the user simply signs in with their password.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const { error } = await createRouteClient(
      request,
      response,
    ).auth.exchangeCodeForSession(code);
    if (error) console.error("Auth code exchange failed:", error.message);
  }
  return response;
}

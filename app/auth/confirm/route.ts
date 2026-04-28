import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Email-confirmation handler using the token_hash flow.
 *
 * Why this exists alongside /auth/callback:
 *   The default Supabase confirmation URL goes through Supabase's verify
 *   endpoint and returns a PKCE `?code=`. That code can only be exchanged
 *   by the same browser that initiated signup (it needs the code verifier
 *   cookie). On mobile, the email link often opens in a different browser
 *   context (Gmail in-app browser, Mail app, Safari View Controller) and
 *   the verifier isn't there — so the exchange fails and the user is
 *   stranded on /login.
 *
 *   The token_hash flow is cookie-only: verifyOtp validates the token
 *   server-side and sets the session via Set-Cookie. Works regardless of
 *   which browser opened the link.
 *
 * Required: update the Supabase email template's confirmation URL to:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/auth/callback";
  const inviteToken = searchParams.get("invite");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const redirectBase =
    forwardedHost && process.env.NODE_ENV !== "development"
      ? `https://${forwardedHost}`
      : origin;

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${redirectBase}/login?error=auth`);
  }

  const cookieStore = await cookies();
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("[auth/confirm] verifyOtp error:", error);
    return NextResponse.redirect(`${redirectBase}/login?error=auth`);
  }

  // Session cookies are now set. Hand off to /auth/callback so its
  // provisioning logic (Person/Household creation, onboarding routing) runs.
  const handoff = new URL(next, redirectBase);
  if (inviteToken) handoff.searchParams.set("invite", inviteToken);

  const response = NextResponse.redirect(handoff);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });
  return response;
}

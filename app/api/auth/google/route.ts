import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const inviteToken = searchParams.get("invite");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const redirectBase =
    forwardedHost && process.env.NODE_ENV !== "development"
      ? `https://${forwardedHost}`
      : origin;

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

  const redirectTo = inviteToken
    ? `${redirectBase}/auth/callback?invite=${inviteToken}`
    : `${redirectBase}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    console.error("[api/auth/google] OAuth URL error:", error);
    return NextResponse.redirect(`${redirectBase}/login?error=auth`);
  }

  // Redirect to Google OAuth — set PKCE verifier cookie with explicit known-good attributes.
  // Bypass Supabase's options entirely (they may have bad maxAge/secure values).
  console.log("[api/auth/google] setting cookies:", pendingCookies.map(c => ({ name: c.name, options: c.options })));
  const response = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value }) => {
    response.cookies.set(name, value, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes — enough to complete OAuth flow
    });
  });

  return response;
}

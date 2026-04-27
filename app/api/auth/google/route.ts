import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const inviteToken = searchParams.get("invite");

  const forwardedHost = request.headers.get("x-forwarded-host");
  console.log("[api/auth/google] request.url origin:", origin, "x-forwarded-host:", forwardedHost);

  const redirectBase =
    forwardedHost && process.env.NODE_ENV !== "development"
      ? `https://${forwardedHost}`
      : origin;

  // The host the browser sees — used as explicit cookie domain so Set-Cookie isn't
  // attributed to Railway's internal hostname.
  const publicHost = forwardedHost ?? new URL(redirectBase).hostname;

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

  // Redirect to Google OAuth — set PKCE verifier with explicit domain so it's
  // attributed to the public host (www.withgoodmeasure.com), not Railway's internal hostname.
  console.log("[api/auth/google] publicHost:", publicHost, "setting cookies:", pendingCookies.map(c => c.name));
  const response = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value }) => {
    response.cookies.set(name, value, {
      path: "/",
      domain: publicHost,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 10,
    });
  });

  return response;
}

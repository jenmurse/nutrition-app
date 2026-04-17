import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // If Supabase redirected to the site root (or any non-callback route) with
  // ?code= in the URL, forward it to /auth/callback so the session is established.
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("code", code);
    const invite = request.nextUrl.searchParams.get("invite");
    if (invite) callbackUrl.searchParams.set("invite", invite);
    return NextResponse.redirect(callbackUrl);
  }

  // Create response with forwarded request headers (we'll add user ID later)
  const requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }),
      },
    }
  );

  // Refresh session — required for Server Components to read auth state
  const { data: { user } } = await supabase.auth.getUser();

  const isPublicRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/preview") ||
    request.nextUrl.pathname.startsWith("/landing") ||
    request.nextUrl.pathname.startsWith("/api/households/invite/info") ||
    request.nextUrl.pathname.startsWith("/api/mcp/");

  if (!user && !isPublicRoute) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/landing")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Pass verified user ID to API routes via request header — avoids redundant getUser() call.
  // We must recreate the response after the auth check so the mutated requestHeaders are
  // captured (NextResponse.next() snapshots headers at construction time, not by reference).
  // Copy Set-Cookie headers from the original response to preserve Supabase session refresh.
  if (user) {
    requestHeaders.set("x-supabase-user-id", user.id);
    const newResponse = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.getSetCookie().forEach((cookie) => {
      newResponse.headers.append("Set-Cookie", cookie);
    });
    return newResponse;
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, images, and MCP API routes (MCP uses Bearer token auth, not session)
    "/((?!_next/static|_next/image|favicon.ico|api/mcp/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)",
  ],
};

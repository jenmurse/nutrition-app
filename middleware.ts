import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/api/households/invite/info");

  if (!user && !isAuthRoute) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)",
  ],
};

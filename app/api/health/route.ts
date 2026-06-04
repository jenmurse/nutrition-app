import { NextResponse } from "next/server";

// Lightweight reachability check used by the offline indicator.
// Intentionally no auth + no DB hit so it returns in single-digit ms.
// The Cache-Control header tells the SW (and any CDN) to never cache it,
// so a stale 200 can't fool the client into thinking we're online.
export async function GET() {
  return new NextResponse("ok", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

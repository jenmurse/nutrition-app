import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Warm-up endpoint for keeping the Railway app + Prisma connection alive.
 *
 * Unlike /api/health (which only proves the Node server responds), this
 * hits the database with a trivial query so the Prisma client and Postgres
 * connection both stay warm. Intended to be called every few minutes by
 * a Railway cron or external uptime ping.
 *
 * No auth — endpoint is harmless and read-only.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse("warm", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    console.error("warm-up failed", err);
    return new NextResponse("db unreachable", { status: 503 });
  }
}

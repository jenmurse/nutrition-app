import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_API_KEY || "";

export async function GET(request: Request, { params }: { params: Promise<{ fdcId: string }> }) {
  try {
    const { fdcId } = await params;
    if (!fdcId) return NextResponse.json({ error: "fdcId required" }, { status: 400 });

    // Check cache (no expiry — USDA data is stable)
    try {
      const cached = await prisma.usdaFoodCache.findUnique({ where: { fdcId } });
      if (cached) {
        console.log(`USDA food cache hit for fdcId ${fdcId}`);
        return NextResponse.json(cached.response);
      }
    } catch (cacheErr) {
      console.error("USDA food cache read error:", cacheErr);
    }

    const url = `${USDA_BASE}/food/${encodeURIComponent(fdcId)}?api_key=${API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      var res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) return NextResponse.json({ error: "USDA fetch failed" }, { status: 502 });
    const data = await res.json();

    // Cache the response
    try {
      await prisma.usdaFoodCache.create({ data: { fdcId, response: data } });
    } catch (cacheErr) {
      console.error("USDA food cache write error:", cacheErr);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: "USDA API timeout - try again" }, { status: 504 });
    }
    return NextResponse.json({ error: "USDA fetch error" }, { status: 500 });
  }
}

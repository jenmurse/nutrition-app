import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_API_KEY || "";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query");
    if (!query) return NextResponse.json({ error: "query param required" }, { status: 400 });

    const normalizedQuery = query.trim().toLowerCase();

    // Check cache
    try {
      const cached = await prisma.usdaSearchCache.findUnique({ where: { query: normalizedQuery } });
      if (cached) {
        const age = Date.now() - cached.createdAt.getTime();
        if (age < CACHE_TTL_MS) {
          console.log(`USDA search cache hit for "${normalizedQuery}"`);
          return NextResponse.json(cached.response);
        }
        await prisma.usdaSearchCache.delete({ where: { query: normalizedQuery } });
      }
    } catch (cacheErr) {
      console.error("USDA search cache read error:", cacheErr);
    }

    const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=25&api_key=${API_KEY}`;
    console.log("USDA Request URL:", url.replace(API_KEY, "***REDACTED***"));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      var res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "unknown error" }));
      console.error("USDA API error:", res.status, errorData);
      return NextResponse.json({ error: "USDA lookup failed", details: errorData }, { status: 502 });
    }
    const data = await res.json();

    // Filter out branded foods to get more accurate generic nutrition data
    if (data.foods && Array.isArray(data.foods)) {
      data.foods = data.foods.filter((food: any) => food.dataType !== "Branded");
      console.log(`Filtered to ${data.foods.length} non-branded foods`);
    }

    // Cache the filtered response
    try {
      await prisma.usdaSearchCache.upsert({
        where: { query: normalizedQuery },
        create: { query: normalizedQuery, response: data },
        update: { response: data, createdAt: new Date() },
      });
    } catch (cacheErr) {
      console.error("USDA search cache write error:", cacheErr);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: "USDA API timeout - try again or search for a shorter term" }, { status: 504 });
    }
    return NextResponse.json({ error: "USDA lookup error", details: String(error) }, { status: 500 });
  }
}

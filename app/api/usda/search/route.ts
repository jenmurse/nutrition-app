import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_API_KEY || "";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Non-branded data types — better for generic ingredient nutrition
const GENERIC_DATA_TYPES = "Foundation,SR%20Legacy,Survey%20(FNDDS)";

async function fetchUSDA(query: string, signal: AbortSignal): Promise<any[]> {
  // Primary: search only within generic (non-branded) USDA data types
  const primaryUrl = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=${GENERIC_DATA_TYPES}&pageSize=25&api_key=${API_KEY}`;
  const res = await fetch(primaryUrl, { signal });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "unknown error" }));
    throw Object.assign(new Error(`USDA API error ${res.status}`), { status: res.status, details: err });
  }
  const data = await res.json();
  const foods: any[] = Array.isArray(data.foods) ? data.foods : [];
  if (foods.length > 0) return foods;

  // Fallback 1: reverse word order (helps with USDA's inverted descriptions like "Soda, baking")
  const reversed = query.trim().split(/\s+/).reverse().join(" ");
  if (reversed !== query.trim()) {
    const revUrl = `${USDA_BASE}/foods/search?query=${encodeURIComponent(reversed)}&dataType=${GENERIC_DATA_TYPES}&pageSize=25&api_key=${API_KEY}`;
    const revRes = await fetch(revUrl, { signal });
    if (revRes.ok) {
      const revData = await revRes.json();
      const revFoods: any[] = Array.isArray(revData.foods) ? revData.foods : [];
      if (revFoods.length > 0) return revFoods;
    }
  }

  // Fallback 2: search individual keywords and merge unique results
  const words = query.trim().split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 1) {
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const word of words) {
      const wordUrl = `${USDA_BASE}/foods/search?query=${encodeURIComponent(word)}&dataType=${GENERIC_DATA_TYPES}&pageSize=15&api_key=${API_KEY}`;
      const wordRes = await fetch(wordUrl, { signal });
      if (!wordRes.ok) continue;
      const wordData = await wordRes.json();
      const wordFoods: any[] = Array.isArray(wordData.foods) ? wordData.foods : [];
      for (const food of wordFoods) {
        if (!seen.has(food.fdcId)) {
          seen.add(food.fdcId);
          merged.push(food);
        }
      }
    }
    if (merged.length > 0) return merged.slice(0, 25);
  }

  return [];
}

export async function GET(request: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "USDA API key not configured. Add USDA_API_KEY to your environment variables." },
        { status: 503 }
      );
    }

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let foods: any[];
    try {
      foods = await fetchUSDA(query.trim(), controller.signal);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        return NextResponse.json({ error: "USDA API timeout — try a shorter search term" }, { status: 504 });
      }
      console.error("USDA fetch error:", err);
      return NextResponse.json({ error: "USDA lookup failed", details: err.details }, { status: 502 });
    }
    clearTimeout(timeoutId);

    console.log(`USDA search "${normalizedQuery}" → ${foods.length} results`);

    const response = { foods };

    // Cache result
    try {
      await prisma.usdaSearchCache.upsert({
        where: { query: normalizedQuery },
        create: { query: normalizedQuery, response },
        update: { response, createdAt: new Date() },
      });
    } catch (cacheErr) {
      console.error("USDA search cache write error:", cacheErr);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error(error);
    if (error.name === "AbortError") {
      return NextResponse.json({ error: "USDA API timeout — try a shorter search term" }, { status: 504 });
    }
    return NextResponse.json({ error: "USDA lookup error", details: String(error) }, { status: 500 });
  }
}

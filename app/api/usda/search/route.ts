import { NextResponse } from "next/server";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_API_KEY || "";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query");
    if (!query) return NextResponse.json({ error: "query param required" }, { status: 400 });

    const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=25&api_key=${API_KEY}`;
    console.log("USDA Request URL:", url.replace(API_KEY, "***REDACTED***"));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
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
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: "USDA API timeout - try again or search for a shorter term" }, { status: 504 });
    }
    return NextResponse.json({ error: "USDA lookup error", details: String(error) }, { status: 500 });
  }
}

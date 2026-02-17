import { NextResponse } from "next/server";

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_API_KEY || "";

export async function GET(request: Request, { params }: { params: Promise<{ fdcId: string }> }) {
  try {
    const { fdcId } = await params;
    if (!fdcId) return NextResponse.json({ error: "fdcId required" }, { status: 400 });

    // Request with nutrients and food portions
    const url = `${USDA_BASE}/food/${encodeURIComponent(fdcId)}?api_key=${API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    try {
      var res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) return NextResponse.json({ error: "USDA fetch failed" }, { status: 502 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(error);
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: "USDA API timeout - try again" }, { status: 504 });
    }
    return NextResponse.json({ error: "USDA fetch error" }, { status: 500 });
  }
}

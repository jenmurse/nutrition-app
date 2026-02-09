import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET() {
  try {
    const nutrients = await prisma.nutrient.findMany({ orderBy: { orderIndex: "asc" } });
    return NextResponse.json(nutrients);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch nutrients" }, { status: 500 });
  }
}

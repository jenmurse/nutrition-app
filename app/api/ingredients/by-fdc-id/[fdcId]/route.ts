import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fdcId: string }> }
) {
  try {
    const { fdcId } = await params;
    if (!fdcId) return NextResponse.json({ found: false });

    const ingredient = await prisma.ingredient.findFirst({
      where: { fdcId },
      include: { nutrientValues: { include: { nutrient: true } } },
    });

    if (!ingredient) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, ingredient });
  } catch (error) {
    console.error("Error looking up ingredient by fdcId:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

// No auth required — global ingredients are shared across all users.

export async function GET(request: Request) {
  try {
    const fdcId = new URL(request.url).searchParams.get("fdcId");

    if (fdcId) {
      const global = await prisma.globalIngredient.findUnique({
        where: { fdcId },
        include: {
          nutrients: {
            include: { nutrient: true },
          },
        },
      });
      return NextResponse.json(global ?? null);
    }

    // Browse all — slim list for library UI
    const globals = await prisma.globalIngredient.findMany({
      orderBy: { name: "asc" },
      select: { id: true, fdcId: true, name: true, defaultUnit: true, createdAt: true },
    });
    return NextResponse.json(globals);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch global ingredients" }, { status: 500 });
  }
}

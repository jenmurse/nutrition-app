import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const recipeId = Number(id);
    if (isNaN(recipeId)) return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });

    // Verify recipe belongs to this household
    const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, householdId: auth.householdId }, select: { id: true } });
    if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

    await prisma.recipeFavorite.upsert({
      where: { recipeId_personId: { recipeId, personId: auth.personId } },
      create: { recipeId, personId: auth.personId },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const recipeId = Number(id);
    if (isNaN(recipeId)) return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });

    await prisma.recipeFavorite.deleteMany({
      where: { recipeId, personId: auth.personId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}

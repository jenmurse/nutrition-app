import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (auth, _req: Request, { params }: Ctx) => {
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
}, "Failed to add favorite");

export const DELETE = withAuth(async (auth, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  const recipeId = Number(id);
  if (isNaN(recipeId)) return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });

  await prisma.recipeFavorite.deleteMany({
    where: { recipeId, personId: auth.personId },
  });

  return NextResponse.json({ ok: true });
}, "Failed to remove favorite");

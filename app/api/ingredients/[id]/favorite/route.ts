import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (auth, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  const ingredientId = Number(id);
  if (isNaN(ingredientId)) return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });

  // Verify ingredient belongs to this household
  const ingredient = await prisma.ingredient.findFirst({ where: { id: ingredientId, householdId: auth.householdId }, select: { id: true } });
  if (!ingredient) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });

  await prisma.ingredientFavorite.upsert({
    where: { ingredientId_personId: { ingredientId, personId: auth.personId } },
    create: { ingredientId, personId: auth.personId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}, "Failed to add favorite");

export const DELETE = withAuth(async (auth, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  const ingredientId = Number(id);
  if (isNaN(ingredientId)) return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });

  await prisma.ingredientFavorite.deleteMany({
    where: { ingredientId, personId: auth.personId },
  });

  return NextResponse.json({ ok: true });
}, "Failed to remove favorite");

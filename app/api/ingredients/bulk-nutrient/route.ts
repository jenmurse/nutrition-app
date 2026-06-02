import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * POST /api/ingredients/bulk-nutrient
 * Bulk write/clear a single nutrient value across many ingredients.
 *
 * Body: { nutrientId: number, updates: [{ ingredientId: number, value: number | null }] }
 *   value = number → upsert the IngredientNutrient row to that value
 *   value = null   → delete the IngredientNutrient row (back to unknown state)
 *
 * All ingredients must belong to the caller's household.
 */
export const POST = withAuth(async (auth, request: Request) => {
  const body = await request.json();
  const { nutrientId, updates } = body as {
    nutrientId?: number;
    updates?: Array<{ ingredientId: number; value: number | null }>;
  };

  if (!nutrientId || !Array.isArray(updates)) {
    return NextResponse.json(
      { error: "nutrientId and updates[] are required" },
      { status: 400 }
    );
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: true, written: 0, cleared: 0 });
  }

  // Verify the nutrient exists
  const nutrient = await prisma.nutrient.findUnique({ where: { id: nutrientId } });
  if (!nutrient) return NextResponse.json({ error: "Nutrient not found" }, { status: 404 });

  // Verify all ingredients belong to this household
  const ids = [...new Set(updates.map((u) => Number(u.ingredientId)).filter((n) => Number.isFinite(n)))];
  const owned = await prisma.ingredient.findMany({
    where: { id: { in: ids }, householdId: auth.householdId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((i) => i.id));
  if (ownedSet.size !== ids.length) {
    return NextResponse.json(
      { error: "One or more ingredients not found in this household" },
      { status: 404 }
    );
  }

  let written = 0;
  let cleared = 0;

  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      const ingredientId = Number(u.ingredientId);
      if (!Number.isFinite(ingredientId)) continue;
      if (u.value === null || u.value === undefined) {
        await tx.ingredientNutrient.deleteMany({
          where: { ingredientId, nutrientId },
        });
        cleared++;
      } else {
        const v = Number(u.value);
        if (!Number.isFinite(v) || v < 0) continue;
        await tx.ingredientNutrient.upsert({
          where: { ingredientId_nutrientId: { ingredientId, nutrientId } },
          update: { value: v },
          create: { ingredientId, nutrientId, value: v },
        });
        written++;
      }
    }
  });

  return NextResponse.json({ ok: true, written, cleared });
}, "Failed to bulk-update nutrient");

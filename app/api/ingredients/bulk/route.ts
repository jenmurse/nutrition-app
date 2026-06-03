import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * DELETE /api/ingredients/bulk
 * Body: { ids: number[] }
 *
 * Deletes all Ingredient rows matching the given IDs IF they belong to the
 * caller's household. Returns a count of what was actually deleted.
 *
 * Cascade rules from the schema handle dependent rows (IngredientNutrient,
 * IngredientFavorite, etc.). Recipes and MealLogs referencing these
 * ingredients keep their FKs set to NULL (Recipe ingredients) or fail to
 * resolve at read time — same behavior as the single-delete endpoint.
 */
export const DELETE = withAuth(async (auth, request: Request) => {
  const body = await request.json();
  const { ids } = body as { ids?: unknown };

  if (!Array.isArray(ids) || ids.some((n) => !Number.isFinite(Number(n)))) {
    return NextResponse.json(
      { error: "ids must be an array of numbers" },
      { status: 400 }
    );
  }

  const numericIds = ids.map((n) => Number(n));
  if (numericIds.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // Scope the delete to ingredients owned by this household.
  const result = await prisma.ingredient.deleteMany({
    where: {
      id: { in: numericIds },
      householdId: auth.householdId,
    },
  });

  return NextResponse.json({ deleted: result.count });
}, "Failed to bulk-delete ingredients");

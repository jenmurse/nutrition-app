import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/day-templates/[id]/apply
 * Apply the template to a specific (planId, date).
 * Body: { planId: number, date: string (YYYY-MM-DD), mode: 'replace' | 'append' }
 *
 * Replace: delete all existing MealLogs on (planId, date) first, then create from template
 * Append: keep existing, just add the template's items on top
 *
 * Items whose referenced recipe or ingredient has been deleted are silently skipped.
 * Response includes a `skipped` count.
 */
export const POST = withAuth(async (auth, request: Request, { params }: Ctx) => {
  const { id } = await params;
  const templateId = Number(id);
  const body = await request.json();
  const { planId, date, mode } = body as {
    planId: number;
    date: string;
    mode: "replace" | "append";
  };

  if (!planId || !date || !mode) {
    return NextResponse.json(
      { error: "planId, date, and mode are required" },
      { status: 400 }
    );
  }
  if (mode !== "replace" && mode !== "append") {
    return NextResponse.json(
      { error: "mode must be 'replace' or 'append'" },
      { status: 400 }
    );
  }

  const template = await prisma.dayTemplate.findUnique({
    where: { id: templateId },
    include: { items: true },
  });
  if (!template || template.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const normalizedDate = date.includes("T") ? date : `${date}T00:00:00Z`;
  const dateObj = new Date(normalizedDate);
  const dayStart = new Date(dateObj);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dateObj);
  dayEnd.setUTCHours(23, 59, 59, 999);

  // Filter out items whose recipe/ingredient has been deleted
  const validRecipeIds = template.items
    .map((i) => i.recipeId)
    .filter((id): id is number => id != null);
  const validIngredientIds = template.items
    .map((i) => i.ingredientId)
    .filter((id): id is number => id != null);

  const [foundRecipes, foundIngredients] = await Promise.all([
    validRecipeIds.length > 0
      ? prisma.recipe.findMany({
          where: { id: { in: validRecipeIds } },
          select: { id: true },
        })
      : Promise.resolve([]),
    validIngredientIds.length > 0
      ? prisma.ingredient.findMany({
          where: { id: { in: validIngredientIds } },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);
  const recipeSet = new Set(foundRecipes.map((r) => r.id));
  const ingredientSet = new Set(foundIngredients.map((i) => i.id));

  const applicable = template.items.filter((item) => {
    if (item.recipeId != null) return recipeSet.has(item.recipeId);
    if (item.ingredientId != null) return ingredientSet.has(item.ingredientId);
    return false;
  });
  const skipped = template.items.length - applicable.length;

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      await tx.mealLog.deleteMany({
        where: { mealPlanId: planId, date: { gte: dayStart, lte: dayEnd } },
      });
    }

    // Determine starting position
    let startPos = 0;
    if (mode === "append") {
      const last = await tx.mealLog.findFirst({
        where: { mealPlanId: planId, date: { gte: dayStart, lte: dayEnd } },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      startPos = last ? last.position + 1 : 0;
    }

    if (applicable.length > 0) {
      await tx.mealLog.createMany({
        data: applicable.map((item, idx) => ({
          mealPlanId: planId,
          date: dateObj,
          mealType: item.mealType,
          position: startPos + idx,
          recipeId: item.recipeId,
          servings: item.servings,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
        })),
      });
    }
  });

  return NextResponse.json({
    ok: true,
    applied: applicable.length,
    skipped,
    templateName: template.name,
  });
}, "Failed to apply template");

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
    // Eating-out items have no recipe/ingredient reference — always applicable.
    if (item.externalLabel != null) return true;
    return false;
  });
  const skipped = template.items.length - applicable.length;

  let merged = 0;
  let created = 0;

  await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      await tx.mealLog.deleteMany({
        where: { mealPlanId: planId, date: { gte: dayStart, lte: dayEnd } },
      });
      // Replace mode: create everything fresh
      if (applicable.length > 0) {
        await tx.mealLog.createMany({
          data: applicable.map((item, idx) => ({
            mealPlanId: planId,
            date: dateObj,
            mealType: item.mealType,
            position: idx,
            recipeId: item.recipeId,
            servings: item.servings,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            externalLabel: item.externalLabel,
            notes: item.notes,
          })),
        });
        created = applicable.length;
      }
      return;
    }

    // Append mode: smart merge.
    // For each template item, if an existing meal on this day matches by
    // (recipeId + mealType) for recipes, or (ingredientId + mealType + unit)
    // for ingredients, sum the servings/quantity into the existing log
    // instead of creating a duplicate.
    const existing = await tx.mealLog.findMany({
      where: { mealPlanId: planId, date: { gte: dayStart, lte: dayEnd } },
      orderBy: { position: "asc" },
    });

    let nextPos = existing.length > 0
      ? Math.max(...existing.map((e) => e.position)) + 1
      : 0;

    for (const item of applicable) {
      let match: typeof existing[number] | undefined;
      if (item.recipeId != null) {
        match = existing.find(
          (e) => e.recipeId === item.recipeId && e.mealType === item.mealType
        );
      } else if (item.ingredientId != null) {
        match = existing.find(
          (e) =>
            e.ingredientId === item.ingredientId &&
            e.mealType === item.mealType &&
            (e.unit ?? null) === (item.unit ?? null)
        );
      } else if (item.externalLabel != null) {
        // Eating-out: dedupe by (mealType + externalLabel) so the same
        // placeholder doesn't pile up on append-apply.
        match = existing.find(
          (e) =>
            e.recipeId == null && e.ingredientId == null &&
            e.mealType === item.mealType &&
            (e.externalLabel ?? "") === (item.externalLabel ?? "")
        );
      }

      if (match) {
        // Sum into existing log
        if (item.recipeId != null) {
          await tx.mealLog.update({
            where: { id: match.id },
            data: { servings: (match.servings ?? 1) + (item.servings ?? 1) },
          });
          merged++;
        } else if (item.ingredientId != null) {
          await tx.mealLog.update({
            where: { id: match.id },
            data: { quantity: (match.quantity ?? 1) + (item.quantity ?? 1) },
          });
          merged++;
        } else {
          // Eating-out placeholders don't combine — they're already deduped.
          merged++;
        }
      } else {
        // Create new log at the end
        await tx.mealLog.create({
          data: {
            mealPlanId: planId,
            date: dateObj,
            mealType: item.mealType,
            position: nextPos++,
            recipeId: item.recipeId,
            servings: item.servings,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            externalLabel: item.externalLabel,
            notes: item.notes,
          },
        });
        created++;
      }
    }
  });

  return NextResponse.json({
    ok: true,
    applied: applicable.length,
    created,
    merged,
    skipped,
    templateName: template.name,
  });
}, "Failed to apply template");

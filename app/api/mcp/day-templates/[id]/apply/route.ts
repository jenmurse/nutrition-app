import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMcpAuth } from '@/lib/mcp-auth';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/mcp/day-templates/[id]/apply
 * Body: { planId, date (YYYY-MM-DD), mode: 'replace' | 'append' }
 *
 * Mirrors the app endpoint. Items whose recipe/ingredient has been deleted
 * are skipped silently; the count is returned in `skipped`.
 *
 * Append mode smart-merges: matching (recipeId + mealType) or
 * (ingredientId + mealType + unit) sums servings/quantity into the
 * existing log rather than creating a duplicate.
 */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const templateId = Number(id);
  const body = await request.json();
  const { planId, date, mode } = body as {
    planId: number; date: string; mode: 'replace' | 'append';
  };

  if (!planId || !date || !mode) {
    return NextResponse.json({ error: 'planId, date, and mode are required' }, { status: 400 });
  }
  if (mode !== 'replace' && mode !== 'append') {
    return NextResponse.json({ error: "mode must be 'replace' or 'append'" }, { status: 400 });
  }

  const template = await prisma.dayTemplate.findUnique({
    where: { id: templateId },
    include: { items: true },
  });
  if (!template || template.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const plan = await prisma.mealPlan.findUnique({ where: { id: Number(planId) } });
  if (!plan || plan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const normalizedDate = date.includes('T') ? date : `${date}T00:00:00Z`;
  const dateObj = new Date(normalizedDate);
  const dayStart = new Date(dateObj); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dateObj); dayEnd.setUTCHours(23, 59, 59, 999);

  const validRecipeIds = template.items.map((i) => i.recipeId).filter((x): x is number => x != null);
  const validIngredientIds = template.items.map((i) => i.ingredientId).filter((x): x is number => x != null);

  const [foundRecipes, foundIngredients] = await Promise.all([
    validRecipeIds.length > 0
      ? prisma.recipe.findMany({ where: { id: { in: validRecipeIds } }, select: { id: true } })
      : Promise.resolve([]),
    validIngredientIds.length > 0
      ? prisma.ingredient.findMany({ where: { id: { in: validIngredientIds } }, select: { id: true } })
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

  let merged = 0;
  let created = 0;

  await prisma.$transaction(async (tx) => {
    if (mode === 'replace') {
      await tx.mealLog.deleteMany({
        where: { mealPlanId: Number(planId), date: { gte: dayStart, lte: dayEnd } },
      });
      if (applicable.length > 0) {
        await tx.mealLog.createMany({
          data: applicable.map((item, idx) => ({
            mealPlanId: Number(planId),
            date: dateObj,
            mealType: item.mealType,
            position: idx,
            recipeId: item.recipeId,
            servings: item.servings,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
          })),
        });
        created = applicable.length;
      }
      return;
    }

    const existing = await tx.mealLog.findMany({
      where: { mealPlanId: Number(planId), date: { gte: dayStart, lte: dayEnd } },
      orderBy: { position: 'asc' },
    });
    let nextPos = existing.length > 0 ? Math.max(...existing.map((e) => e.position)) + 1 : 0;

    for (const item of applicable) {
      let match: typeof existing[number] | undefined;
      if (item.recipeId != null) {
        match = existing.find((e) => e.recipeId === item.recipeId && e.mealType === item.mealType);
      } else if (item.ingredientId != null) {
        match = existing.find(
          (e) => e.ingredientId === item.ingredientId
            && e.mealType === item.mealType
            && (e.unit ?? null) === (item.unit ?? null)
        );
      }

      if (match) {
        if (item.recipeId != null) {
          await tx.mealLog.update({
            where: { id: match.id },
            data: { servings: (match.servings ?? 1) + (item.servings ?? 1) },
          });
        } else {
          await tx.mealLog.update({
            where: { id: match.id },
            data: { quantity: (match.quantity ?? 1) + (item.quantity ?? 1) },
          });
        }
        merged++;
      } else {
        await tx.mealLog.create({
          data: {
            mealPlanId: Number(planId),
            date: dateObj,
            mealType: item.mealType,
            position: nextPos++,
            recipeId: item.recipeId,
            servings: item.servings,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
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
}

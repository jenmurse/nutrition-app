import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMcpAuth } from '@/lib/mcp-auth';

type Ctx = { params: Promise<{ id: string; mealId: string }> };

/**
 * PATCH /api/mcp/meal-plans/[id]/meals/[mealId]
 * Update a meal log. Accepts any subset of:
 *   - mealType, servings, quantity, unit, notes
 *   - recipeId / ingredientId — swap the meal's referent.
 *     Setting recipeId clears the ingredient fields; setting ingredientId clears recipe fields.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, mealId } = await params;
  const mealPlanId = parseInt(id);
  const mealLogId = parseInt(mealId);

  const body = await request.json();
  const { mealType, servings, quantity, unit, notes, recipeId, ingredientId } = body as {
    mealType?: string;
    servings?: number;
    quantity?: number;
    unit?: string;
    notes?: string;
    recipeId?: number | null;
    ingredientId?: number | null;
  };

  const mealPlan = await prisma.mealPlan.findUnique({ where: { id: mealPlanId } });
  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }
  const mealLog = await prisma.mealLog.findUnique({ where: { id: mealLogId } });
  if (!mealLog || mealLog.mealPlanId !== mealPlanId) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }

  const data: any = {};

  if (recipeId != null && ingredientId != null) {
    return NextResponse.json({ error: 'Provide recipeId OR ingredientId, not both' }, { status: 400 });
  }

  if (recipeId != null) {
    const recipe = await prisma.recipe.findUnique({ where: { id: Number(recipeId) } });
    if (!recipe || recipe.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    data.recipeId = Number(recipeId);
    data.ingredientId = null;
    data.quantity = null;
    data.unit = null;
    if (data.servings == null && mealLog.servings == null) data.servings = 1;
  }

  if (ingredientId != null) {
    const ingredient = await prisma.ingredient.findUnique({ where: { id: Number(ingredientId) } });
    if (!ingredient || ingredient.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }
    if (quantity == null || !unit) {
      return NextResponse.json(
        { error: 'quantity and unit are required when swapping to an ingredient' },
        { status: 400 }
      );
    }
    data.ingredientId = Number(ingredientId);
    data.recipeId = null;
    data.servings = null;
  }

  if (mealType !== undefined) data.mealType = mealType;
  if (servings !== undefined) data.servings = servings;
  if (quantity !== undefined) data.quantity = quantity;
  if (unit !== undefined) data.unit = unit;
  if (notes !== undefined) data.notes = notes;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const updated = await prisma.mealLog.update({
    where: { id: mealLogId },
    data,
    include: { recipe: { select: { id: true, name: true } }, ingredient: { select: { id: true, name: true } } },
  });
  return NextResponse.json(updated);
}

/**
 * DELETE /api/mcp/meal-plans/[id]/meals/[mealId]
 * Remove a meal log.
 */
export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, mealId } = await params;
  const mealPlanId = parseInt(id);
  const mealLogId = parseInt(mealId);

  const mealPlan = await prisma.mealPlan.findUnique({ where: { id: mealPlanId } });
  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }
  const mealLog = await prisma.mealLog.findUnique({ where: { id: mealLogId } });
  if (!mealLog || mealLog.mealPlanId !== mealPlanId) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }

  await prisma.mealLog.delete({ where: { id: mealLogId } });
  return NextResponse.json({ ok: true });
}

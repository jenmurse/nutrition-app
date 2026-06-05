import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/apiUtils';

/**
 * PATCH /api/meal-plans/[id]/meals/[mealId]
 * Update a meal log. Accepts any subset of:
 *   - date: string (ISO or YYYY-MM-DD) — also re-positions at end of target day
 *   - mealType: string — change slot
 *   - servings: number — for recipe meals
 *   - quantity: number — for ingredient meals
 *   - unit: string — for ingredient meals
 *   - notes: string
 */

type Ctx = { params: Promise<{ id: string; mealId: string }> | { id: string; mealId: string } };

export const PATCH = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
  const { id, mealId } = params instanceof Promise ? await params : params;
  const mealPlanId = parseInt(id);
  const mealLogId = parseInt(mealId);

  const body = await request.json();
  const {
    date: rawDate,
    mealType,
    servings,
    quantity,
    unit,
    notes,
    externalLabel,
  } = body as {
    date?: string;
    mealType?: string;
    servings?: number;
    quantity?: number;
    unit?: string;
    notes?: string;
    externalLabel?: string;
  };

  const mealPlan = await prisma.mealPlan.findUnique({ where: { id: mealPlanId } });
  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }

  const mealLog = await prisma.mealLog.findUnique({ where: { id: mealLogId } });
  if (!mealLog || mealLog.mealPlanId !== mealPlanId) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }

  const data: {
    date?: Date;
    position?: number;
    mealType?: string;
    servings?: number;
    quantity?: number;
    unit?: string;
    notes?: string;
    externalLabel?: string;
  } = {};

  if (rawDate) {
    const normalizedDate = rawDate.includes('T') ? rawDate : rawDate + 'T00:00:00Z';
    const targetDate = new Date(normalizedDate);
    data.date = targetDate;
    // Append at the end of the target day when moving days
    const lastEntry = await prisma.mealLog.findFirst({
      where: { mealPlanId, date: targetDate },
      orderBy: { position: 'desc' },
    });
    data.position = lastEntry ? lastEntry.position + 1 : 0;
  }
  if (mealType !== undefined) data.mealType = mealType;
  if (servings !== undefined) data.servings = servings;
  if (quantity !== undefined) data.quantity = quantity;
  if (unit !== undefined) data.unit = unit;
  if (notes !== undefined) data.notes = notes;
  if (externalLabel !== undefined) data.externalLabel = externalLabel;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const updated = await prisma.mealLog.update({
    where: { id: mealLogId },
    data,
    include: { recipe: true, ingredient: true },
  });

  return NextResponse.json(updated, { status: 200 });
}, 'Failed to update meal');

/**
 * DELETE /api/meal-plans/[id]/meals/[mealId]
 * Remove a recipe from a meal plan
 */
export const DELETE = withAuth(async (auth, _request: NextRequest, { params }: Ctx) => {
  const { id, mealId } = params instanceof Promise ? await params : params;
  const mealPlanId = parseInt(id);
  const mealLogId = parseInt(mealId);

  // Verify meal plan exists and belongs to household
  const mealPlan = await prisma.mealPlan.findUnique({
    where: { id: mealPlanId },
  });

  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json(
      { error: 'Meal plan not found' },
      { status: 404 }
    );
  }

  // Verify meal exists and belongs to this meal plan
  const mealLog = await prisma.mealLog.findUnique({
    where: { id: mealLogId },
  });

  if (!mealLog) {
    return NextResponse.json(
      { error: 'Meal not found' },
      { status: 404 }
    );
  }

  if (mealLog.mealPlanId !== mealPlanId) {
    return NextResponse.json(
      { error: 'Meal does not belong to this meal plan' },
      { status: 403 }
    );
  }

  // Delete meal
  await prisma.mealLog.delete({
    where: { id: mealLogId },
  });

  return NextResponse.json(
    { message: 'Meal deleted successfully' },
    { status: 200 }
  );
}, 'Failed to delete meal');

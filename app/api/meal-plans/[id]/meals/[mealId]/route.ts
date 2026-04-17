import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/apiUtils';

/**
 * PATCH /api/meal-plans/[id]/meals/[mealId]
 * Move a meal to a different date (cross-day drag-and-drop)
 * Body: { date: string } — ISO or YYYY-MM-DD
 */

type Ctx = { params: Promise<{ id: string; mealId: string }> | { id: string; mealId: string } };

export const PATCH = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
  const { id, mealId } = params instanceof Promise ? await params : params;
  const mealPlanId = parseInt(id);
  const mealLogId = parseInt(mealId);

  const body = await request.json();
  const { date: rawDate } = body as { date: string };
  if (!rawDate) return NextResponse.json({ error: 'date is required' }, { status: 400 });

  const normalizedDate = rawDate.includes('T') ? rawDate : rawDate + 'T00:00:00Z';
  const targetDate = new Date(normalizedDate);

  const mealPlan = await prisma.mealPlan.findUnique({ where: { id: mealPlanId } });
  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }

  const mealLog = await prisma.mealLog.findUnique({ where: { id: mealLogId } });
  if (!mealLog || mealLog.mealPlanId !== mealPlanId) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }

  // Append at the end of the target day
  const lastEntry = await prisma.mealLog.findFirst({
    where: { mealPlanId, date: targetDate },
    orderBy: { position: 'desc' },
  });
  const nextPosition = lastEntry ? lastEntry.position + 1 : 0;

  const updated = await prisma.mealLog.update({
    where: { id: mealLogId },
    data: { date: targetDate, position: nextPosition },
    include: { recipe: true, ingredient: true },
  });

  return NextResponse.json(updated, { status: 200 });
}, 'Failed to move meal');

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

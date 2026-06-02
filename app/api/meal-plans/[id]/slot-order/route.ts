import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/apiUtils';

/**
 * PATCH /api/meal-plans/[id]/slot-order
 * Persist the user's preferred ordering of matrix slot rows for this plan.
 * Body: { slotOrder: string[] }   (subset of valid slot types, no duplicates required)
 *
 * Stored as a CSV string on MealPlan.slotOrder. Empty array clears the preference.
 */

type Ctx = { params: Promise<{ id: string }> | { id: string } };

const VALID_SLOTS = new Set([
  'breakfast', 'lunch', 'dinner',
  'snack', 'side', 'dessert', 'beverage',
]);

export const PATCH = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
  const { id } = params instanceof Promise ? await params : params;
  const mealPlanId = parseInt(id);

  const body = await request.json();
  const { slotOrder } = body as { slotOrder?: unknown };

  if (!Array.isArray(slotOrder) || !slotOrder.every((s) => typeof s === 'string' && VALID_SLOTS.has(s))) {
    return NextResponse.json(
      { error: 'slotOrder must be an array of valid slot type strings' },
      { status: 400 }
    );
  }

  const mealPlan = await prisma.mealPlan.findUnique({ where: { id: mealPlanId } });
  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }

  const updated = await prisma.mealPlan.update({
    where: { id: mealPlanId },
    data: { slotOrder: (slotOrder as string[]).join(',') },
    select: { id: true, slotOrder: true },
  });

  return NextResponse.json(updated);
}, 'Failed to update slot order');

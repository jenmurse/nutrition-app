import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedHousehold } from '@/lib/auth';

/**
 * DELETE /api/meal-plans/[id]/meals/[mealId]
 * Remove a recipe from a meal plan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mealId: string }> | { id: string; mealId: string } }
) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal' },
      { status: 500 }
    );
  }
}

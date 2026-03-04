import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWeeklyNutritionSummary } from '@/lib/nutritionCalculations';

/**
 * GET /api/meal-plans/[id]
 * Get full meal plan with daily calculations and all meals
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        mealLogs: {
          include: {
            recipe: true,
            ingredient: true,
          },
          orderBy: [{ date: 'asc' }, { position: 'asc' }, { id: 'asc' }],
        },
        nutritionGoals: {
          include: { nutrient: true },
        },
      },
    });

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Get weekly nutrition summary
    const weeklySummary = await getWeeklyNutritionSummary(mealPlanId);

    return NextResponse.json(
      {
        ...mealPlan,
        weeklySummary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal plan' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/meal-plans/[id]
 * Update meal plan goals
 * Body: { goals: { nutrientId: { lowGoal?: number, highGoal?: number } } }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);
    const body = await request.json();
    const { goals } = body;

    // Verify meal plan exists
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Update nutrition goals
    if (goals) {
      for (const nutrientId of Object.keys(goals)) {
        const goal = goals[nutrientId];
        await prisma.nutritionGoal.upsert({
          where: {
            mealPlanId_nutrientId: {
              mealPlanId,
              nutrientId: parseInt(nutrientId),
            },
          },
          update: {
            lowGoal: goal.lowGoal || null,
            highGoal: goal.highGoal || null,
          },
          create: {
            mealPlanId,
            nutrientId: parseInt(nutrientId),
            lowGoal: goal.lowGoal || null,
            highGoal: goal.highGoal || null,
          },
        });
      }
    }

    const updatedMealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        nutritionGoals: {
          include: { nutrient: true },
        },
      },
    });

    return NextResponse.json(updatedMealPlan, { status: 200 });
  } catch (error) {
    console.error('Error updating meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to update meal plan' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meal-plans/[id]
 * Delete meal plan and all associated meals
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Delete meal plan (cascade will delete associated meals and goals)
    await prisma.mealPlan.delete({
      where: { id: mealPlanId },
    });

    return NextResponse.json(
      { message: 'Meal plan deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete meal plan' },
      { status: 500 }
    );
  }
}

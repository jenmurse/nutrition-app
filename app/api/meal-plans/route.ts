import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWeeklyNutritionSummary } from '@/lib/nutritionCalculations';
import { getAuthenticatedHousehold } from '@/lib/auth';

/**
 * GET /api/meal-plans
 * List all meal plans
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const personIdParam = searchParams.get('personId');
    const personId = personIdParam ? parseInt(personIdParam, 10) : undefined;

    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        householdId: auth.householdId,
        ...(personId !== undefined ? { personId } : {}),
      },
      orderBy: { weekStartDate: 'desc' },
      include: {
        _count: {
          select: { mealLogs: true },
        },
        person: true,
      },
    });

    return NextResponse.json(mealPlans, { status: 200 });
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal plans' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meal-plans
 * Create a new meal plan with nutrient goals
 * Body: { weekStartDate: ISO string, goals: { nutrientId: { lowGoal?: number, highGoal?: number } } }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { weekStartDate, goals, personId } = body;

    if (!weekStartDate) {
      return NextResponse.json(
        { error: 'weekStartDate is required' },
        { status: 400 }
      );
    }

    // Create meal plan
    // Parse date as local time by appending time if not present
    const dateStr = weekStartDate.includes('T') ? weekStartDate : weekStartDate + 'T00:00:00';
    const mealPlan = await prisma.mealPlan.create({
      data: {
        weekStartDate: new Date(dateStr),
        personId: personId ?? null,
        householdId: auth.householdId,
      },
    });

    // Create nutrition goals if provided
    if (goals) {
      for (const nutrientId of Object.keys(goals)) {
        const goal = goals[nutrientId];
        await prisma.nutritionGoal.create({
          data: {
            mealPlanId: mealPlan.id,
            nutrientId: parseInt(nutrientId),
            lowGoal: goal.lowGoal || null,
            highGoal: goal.highGoal || null,
          },
        });
      }
    } else {
      // Create default goals for all nutrients (no limits)
      const nutrients = await prisma.nutrient.findMany();
      for (const nutrient of nutrients) {
        await prisma.nutritionGoal.create({
          data: {
            mealPlanId: mealPlan.id,
            nutrientId: nutrient.id,
            lowGoal: null,
            highGoal: null,
          },
        });
      }
    }

    const createdMealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlan.id },
      include: {
        nutritionGoals: {
          include: { nutrient: true },
        },
      },
    });

    return NextResponse.json(createdMealPlan, { status: 201 });
  } catch (error) {
    console.error('Error creating meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to create meal plan' },
      { status: 500 }
    );
  }
}

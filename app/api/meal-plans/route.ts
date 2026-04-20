import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/apiUtils';

/**
 * GET /api/meal-plans
 * List all meal plans
 */
export const GET = withAuth(async (auth, request: NextRequest) => {
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
}, 'Failed to fetch meal plans');

/**
 * POST /api/meal-plans
 * Create a new meal plan with nutrient goals
 * Body: { weekStartDate: ISO string, goals: { nutrientId: { lowGoal?: number, highGoal?: number } } }
 */
export const POST = withAuth(async (auth, request: NextRequest) => {
  const body = await request.json();
  const { weekStartDate, goals, personId } = body;

  if (!weekStartDate) {
    return NextResponse.json({ error: 'weekStartDate is required' }, { status: 400 });
  }

  const dateStr = weekStartDate.includes('T') ? weekStartDate : weekStartDate + 'T00:00:00Z';
  // Always snap to the Sunday on or before the given date
  const rawDate = new Date(dateStr);
  rawDate.setUTCDate(rawDate.getUTCDate() - rawDate.getUTCDay());
  const mealPlan = await prisma.mealPlan.create({
    data: {
      weekStartDate: rawDate,
      personId: personId ?? null,
      householdId: auth.householdId,
    },
  });

  if (goals) {
    await prisma.nutritionGoal.createMany({
      data: Object.keys(goals).map((nutrientId) => ({
        mealPlanId: mealPlan.id,
        nutrientId: parseInt(nutrientId),
        lowGoal: goals[nutrientId].lowGoal || null,
        highGoal: goals[nutrientId].highGoal || null,
      })),
    });
  } else {
    const nutrients = await prisma.nutrient.findMany({ select: { id: true } });
    await prisma.nutritionGoal.createMany({
      data: nutrients.map((n) => ({
        mealPlanId: mealPlan.id,
        nutrientId: n.id,
        lowGoal: null,
        highGoal: null,
      })),
    });
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
}, 'Failed to create meal plan');

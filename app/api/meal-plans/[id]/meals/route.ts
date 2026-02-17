import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/meal-plans/[id]/meals
 * Add a recipe to a meal (date + meal type)
 * Body: { recipeId: number, date: ISO string, mealType: "breakfast" | "lunch" | "dinner" | "snack", notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);
    const body = await request.json();
    const { recipeId, date, mealType, notes, servings } = body;

    if (!recipeId || !date || !mealType) {
      return NextResponse.json(
        { error: 'recipeId, date, and mealType are required' },
        { status: 400 }
      );
    }

    const normalizedServings = Number(servings ?? 1);
    if (!Number.isFinite(normalizedServings) || normalizedServings <= 0) {
      return NextResponse.json(
        { error: 'servings must be a positive number' },
        { status: 400 }
      );
    }

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

    // Verify recipe exists
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Check if recipe is complete
    if (!recipe.isComplete) {
      return NextResponse.json(
        { error: 'Recipe is incomplete. Please complete the recipe before adding it to a meal plan.' },
        { status: 400 }
      );
    }

    // Validate meal type
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(mealType)) {
      return NextResponse.json(
        {
          error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Create meal log
    const mealLog = await prisma.mealLog.create({
      data: {
        mealPlanId,
        recipeId,
        date: new Date(date),
        mealType,
        servings: normalizedServings,
        notes: notes || null,
      },
      include: {
        recipe: true,
      },
    });

    return NextResponse.json(mealLog, { status: 201 });
  } catch (error) {
    console.error('Error adding meal to meal plan:', error);
    return NextResponse.json(
      { error: 'Failed to add meal to meal plan' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/meal-plans/[id]/meals
 * Add a recipe or ingredient to a meal (date + meal type)
 * Body (Recipe-based): { recipeId: number, date: ISO string, mealType: string, servings?: number, notes?: string }
 * Body (Ingredient-based): { ingredientId: number, quantity: number, unit: string, date: ISO string, mealType: string, notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);
    const body = await request.json();
    const { recipeId, ingredientId, quantity, unit, date, mealType, notes, servings } = body;

    // Validate required fields
    if (!date || !mealType) {
      return NextResponse.json(
        { error: 'date and mealType are required' },
        { status: 400 }
      );
    }

    // Must provide either recipeId OR (ingredientId + quantity + unit)
    const isRecipeBased = recipeId;
    const isIngredientBased = ingredientId && quantity != null && unit;

    if (!isRecipeBased && !isIngredientBased) {
      return NextResponse.json(
        { error: 'Either recipeId OR (ingredientId, quantity, unit) must be provided' },
        { status: 400 }
      );
    }

    if (isRecipeBased && isIngredientBased) {
      return NextResponse.json(
        { error: 'Cannot provide both recipeId and ingredientId' },
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

    // Validate meal type
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'beverage'];
    if (!validMealTypes.includes(mealType)) {
      return NextResponse.json(
        {
          error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    let mealLogData: any;

    if (isRecipeBased) {
      // Recipe-based meal validation
      const normalizedServings = Number(servings ?? 1);
      if (!Number.isFinite(normalizedServings) || normalizedServings <= 0) {
        return NextResponse.json(
          { error: 'servings must be a positive number' },
          { status: 400 }
        );
      }

      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
      });

      if (!recipe) {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }

      if (!recipe.isComplete) {
        return NextResponse.json(
          { error: 'Recipe is incomplete. Please complete the recipe before adding it to a meal plan.' },
          { status: 400 }
        );
      }

      mealLogData = {
        mealPlanId,
        recipeId,
        date: new Date(date),
        mealType,
        servings: normalizedServings,
        notes: notes || null,
      };
    } else {
      // Ingredient-based meal validation
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
      });

      if (!ingredient) {
        return NextResponse.json(
          { error: 'Ingredient not found' },
          { status: 404 }
        );
      }

      const normalizedQuantity = Number(quantity);
      if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
        return NextResponse.json(
          { error: 'quantity must be a positive number' },
          { status: 400 }
        );
      }

      mealLogData = {
        mealPlanId,
        ingredientId,
        quantity: normalizedQuantity,
        unit,
        date: new Date(date),
        mealType,
        notes: notes || null,
      };
    }

    // Create meal log
    const mealLog = await prisma.mealLog.create({
      data: mealLogData,
      include: {
        recipe: true,
        ingredient: true,
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

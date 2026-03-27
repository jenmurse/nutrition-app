import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWeeklyNutritionSummary } from '@/lib/nutritionCalculations';
import { getAuthenticatedHousehold } from '@/lib/auth';

/**
 * GET /api/meal-plans/[id]
 * Get full meal plan with daily calculations and all meals
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        person: true,
        mealLogs: {
          include: {
            recipe: true,
            ingredient: true, // includes customUnitName/Grams/Amount
          },
          orderBy: [{ date: 'asc' }, { position: 'asc' }, { id: 'asc' }],
        },
        nutritionGoals: {
          include: { nutrient: true },
        },
      },
    });

    if (!mealPlan || mealPlan.householdId !== auth.householdId) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      );
    }

    // Get weekly nutrition summary — pass prefetched goals to skip redundant DB query
    const weeklySummary = await getWeeklyNutritionSummary(mealPlanId, {
      weekStartDate: mealPlan.weekStartDate,
      nutritionGoals: mealPlan.nutritionGoals,
    });

    // Compute calories-per-serving for each recipe and ingredient in this meal plan
    const calorieNutrient = await prisma.nutrient.findFirst({ where: { name: 'calories' } });

    const recipeIds = [...new Set(mealPlan.mealLogs.filter(m => m.recipeId).map(m => m.recipeId!))];
    let recipeCaloriesMap: Record<number, number> = {};
    if (recipeIds.length > 0 && calorieNutrient) {
      const recipes = await prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
        select: {
          id: true,
          servingSize: true,
          ingredients: {
            select: {
              conversionGrams: true,
              ingredient: {
                select: {
                  nutrientValues: {
                    where: { nutrientId: calorieNutrient.id },
                    select: { value: true },
                  },
                },
              },
            },
          },
        },
      });
      for (const recipe of recipes) {
        let totalCal = 0;
        for (const ri of recipe.ingredients) {
          const grams = ri.conversionGrams || 0;
          for (const nv of ri.ingredient.nutrientValues) {
            totalCal += (nv.value / 100) * grams;
          }
        }
        recipeCaloriesMap[recipe.id] = Math.round(totalCal / (recipe.servingSize || 1));
      }
    }

    // Compute calories per meal log for ingredient-based meals
    const ingredientMealLogs = mealPlan.mealLogs.filter(m => m.ingredientId && m.quantity != null);
    let mealLogCaloriesMap: Record<number, number> = {};
    if (ingredientMealLogs.length > 0 && calorieNutrient) {
      const ingredientIds = [...new Set(ingredientMealLogs.map(m => m.ingredientId!))];
      const ingredients = await prisma.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: {
          id: true,
          customUnitName: true,
          customUnitAmount: true,
          customUnitGrams: true,
          nutrientValues: {
            where: { nutrientId: calorieNutrient.id },
            select: { value: true },
          },
        },
      });
      const ingById = Object.fromEntries(ingredients.map(i => [i.id, i]));
      for (const log of ingredientMealLogs) {
        const ing = ingById[log.ingredientId!];
        if (!ing) continue;
        const calPer100g = ing.nutrientValues[0]?.value ?? 0;
        let grams = log.quantity ?? 0;
        if (log.unit === ing.customUnitName && ing.customUnitGrams) {
          grams = ((log.quantity ?? 0) / (ing.customUnitAmount || 1)) * ing.customUnitGrams;
        }
        mealLogCaloriesMap[log.id] = Math.round((calPer100g / 100) * grams);
      }
    }

    return NextResponse.json(
      {
        ...mealPlan,
        weeklySummary,
        recipeCaloriesMap,
        mealLogCaloriesMap,
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
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);
    const body = await request.json();
    const { goals } = body;

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
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
    });

    if (!mealPlan || mealPlan.householdId !== auth.householdId) {
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

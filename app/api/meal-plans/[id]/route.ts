import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWeeklyNutritionSummary } from '@/lib/nutritionCalculations';
import { withAuth } from '@/lib/apiUtils';
import { USDA_BASE_GRAMS } from '@/lib/constants';

/**
 * GET /api/meal-plans/[id]
 * Get full meal plan with daily calculations and all meals
 */

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export const GET = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
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

  // Get weekly nutrition summary — pass prefetched goals and personId to skip redundant DB query
  // and ensure global goals are filtered to the correct person (not all household members).
  const weeklySummary = await getWeeklyNutritionSummary(mealPlanId, {
    weekStartDate: mealPlan.weekStartDate,
    nutritionGoals: mealPlan.nutritionGoals,
    personId: mealPlan.personId,
  });

  // Compute per-serving nutrient values for each recipe in this meal plan
  const allNutrients = await prisma.nutrient.findMany();
  const nutrientById = Object.fromEntries(allNutrients.map(n => [n.id, n]));
  const calorieNutrient = allNutrients.find(n => n.name === 'calories') ?? null;

  const recipeIds = [...new Set(mealPlan.mealLogs.filter(m => m.recipeId).map(m => m.recipeId!))];
  let recipeCaloriesMap: Record<number, number> = {};
  let recipeNutrientsMap: Record<number, Record<string, number>> = {};
  if (recipeIds.length > 0) {
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
                  select: { nutrientId: true, value: true },
                },
              },
            },
          },
        },
      },
    });
    for (const recipe of recipes) {
      const totals: Record<number, number> = {};
      for (const ri of recipe.ingredients) {
        const grams = ri.conversionGrams || 0;
        for (const nv of ri.ingredient.nutrientValues) {
          totals[nv.nutrientId] = (totals[nv.nutrientId] || 0) + (nv.value / USDA_BASE_GRAMS) * grams;
        }
      }
      const servings = recipe.servingSize || 1;
      // Build displayName-keyed map for frontend
      const perServing: Record<string, number> = {};
      for (const [nid, total] of Object.entries(totals)) {
        const nutrient = nutrientById[Number(nid)];
        if (nutrient) {
          perServing[nutrient.displayName] = Math.round(total / servings);
        }
      }
      recipeNutrientsMap[recipe.id] = perServing;
      if (calorieNutrient && totals[calorieNutrient.id] != null) {
        recipeCaloriesMap[recipe.id] = Math.round(totals[calorieNutrient.id] / servings);
      }
    }
  }

  // Compute per-meal-log nutrient values for ingredient-based meals
  const ingredientMealLogs = mealPlan.mealLogs.filter(m => m.ingredientId && m.quantity != null);
  let mealLogCaloriesMap: Record<number, number> = {};
  let mealLogNutrientsMap: Record<number, Record<string, number>> = {};
  if (ingredientMealLogs.length > 0) {
    const ingredientIds = [...new Set(ingredientMealLogs.map(m => m.ingredientId!))];
    const ingredients = await prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: {
        id: true,
        customUnitName: true,
        customUnitAmount: true,
        customUnitGrams: true,
        nutrientValues: {
          select: { nutrientId: true, value: true },
        },
      },
    });
    const ingById = Object.fromEntries(ingredients.map(i => [i.id, i]));
    for (const log of ingredientMealLogs) {
      const ing = ingById[log.ingredientId!];
      if (!ing) continue;
      let grams = log.quantity ?? 0;
      if (log.unit === ing.customUnitName && ing.customUnitGrams) {
        grams = ((log.quantity ?? 0) / (ing.customUnitAmount || 1)) * ing.customUnitGrams;
      }
      const perMeal: Record<string, number> = {};
      for (const nv of ing.nutrientValues) {
        const nutrient = nutrientById[nv.nutrientId];
        if (nutrient) {
          perMeal[nutrient.displayName] = Math.round((nv.value / USDA_BASE_GRAMS) * grams);
        }
      }
      mealLogNutrientsMap[log.id] = perMeal;
      const calPer100g = ing.nutrientValues.find(nv => calorieNutrient && nv.nutrientId === calorieNutrient.id)?.value ?? 0;
      mealLogCaloriesMap[log.id] = Math.round((calPer100g / USDA_BASE_GRAMS) * grams);
    }
  }

  return NextResponse.json(
    {
      ...mealPlan,
      weeklySummary,
      recipeCaloriesMap,
      mealLogCaloriesMap,
      recipeNutrientsMap,
      mealLogNutrientsMap,
    },
    { status: 200 }
  );
}, 'Failed to fetch meal plan');

/**
 * PUT /api/meal-plans/[id]
 * Update meal plan goals
 * Body: { goals: { nutrientId: { lowGoal?: number, highGoal?: number } } }
 */
export const PUT = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
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
}, 'Failed to update meal plan');

/**
 * DELETE /api/meal-plans/[id]
 * Delete meal plan and all associated meals
 */
export const DELETE = withAuth(async (auth, _request: NextRequest, { params }: Ctx) => {
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
}, 'Failed to delete meal plan');

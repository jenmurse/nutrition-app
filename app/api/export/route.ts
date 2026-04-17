import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import { prisma } from '@/lib/db';

export const GET = withAuth(async (auth) => {
  const [household, persons, ingredients, recipes, mealPlans, globalGoals] = await Promise.all([
    prisma.household.findUnique({ where: { id: auth.householdId } }),

    prisma.person.findMany({
      where: { householdMembers: { some: { householdId: auth.householdId, active: true } } },
      select: { id: true, name: true, color: true },
    }),

    prisma.ingredient.findMany({
      where: { householdId: auth.householdId },
      include: { nutrientValues: { select: { nutrientId: true, value: true } } },
      orderBy: { id: 'asc' },
    }),

    prisma.recipe.findMany({
      where: { householdId: auth.householdId },
      include: {
        ingredients: {
          select: { ingredientId: true, quantity: true, unit: true, conversionGrams: true, notes: true },
        },
      },
      orderBy: { id: 'asc' },
    }),

    prisma.mealPlan.findMany({
      where: { householdId: auth.householdId },
      include: {
        mealLogs: {
          select: {
            date: true, mealType: true, recipeId: true, ingredientId: true,
            quantity: true, unit: true, servings: true, notes: true, position: true,
          },
          orderBy: { position: 'asc' },
        },
        nutritionGoals: {
          select: { nutrientId: true, lowGoal: true, highGoal: true },
        },
      },
      orderBy: { id: 'asc' },
    }),

    prisma.globalNutritionGoal.findMany({
      where: { householdId: auth.householdId },
      select: { nutrientId: true, personId: true, lowGoal: true, highGoal: true },
    }),
  ]);

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    householdName: household?.name ?? '',
    persons,
    ingredients: ingredients.map(({ householdId: _hid, nutrientValues, ...ing }) => ({
      ...ing,
      nutrients: nutrientValues,
    })),
    recipes: recipes.map(({ householdId: _hid, ...recipe }) => recipe),
    mealPlans: mealPlans.map(({ householdId: _hid, ...mp }) => mp),
    globalNutritionGoals: globalGoals,
  };

  return NextResponse.json(exportData);
});

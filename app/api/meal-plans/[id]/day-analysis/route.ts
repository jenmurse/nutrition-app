import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/apiUtils';
import { USDA_BASE_GRAMS } from '@/lib/constants';
import {
  applyNutrientGoals,
} from '@/lib/nutritionCalculations';
import {
  getOverBudgetAlerts,
  getTopContributors,
  scoreFillGapCandidates,
  type MealContribution,
} from '@/lib/smartMealAnalysis';

/**
 * GET /api/meal-plans/[id]/day-analysis?date=YYYY-MM-DD
 *
 * Returns:
 *   mealContributions  – each meal log with its nutrient breakdown
 *   overBudget         – nutrients that exceed their high goal
 *   topContributors    – per over-budget nutrient: which meals drive it most
 *   swapCandidates     – alternative recipes from the DB for each top offending meal
 *   fillGapCandidates  – ranked recipes to help fill remaining calorie budget
 *   calorieNutrientId  – nutrientId for Energy/Calories (for client convenience)
 */

type Ctx = { params: Promise<{ id: string }> | { id: string } };

export const GET = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
  const { id } = params instanceof Promise ? await params : params;
  const mealPlanId = parseInt(id);

  const dateStr = request.nextUrl.searchParams.get('date');
  if (!dateStr) {
    return NextResponse.json({ error: 'date query param required (YYYY-MM-DD)' }, { status: 400 });
  }

  const dateStart = new Date(`${dateStr}T00:00:00Z`);
  const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

  // -----------------------------------------------------------------------
  // 1. Batch fetch everything we need in parallel (3 queries)
  // -----------------------------------------------------------------------
  const [mealLogs, goalsData, allRecipesWithIngredients] = await Promise.all([
    // Day's meals with ingredient nutrients (for ingredient-based meals)
    prisma.mealLog.findMany({
      where: {
        mealPlanId,
        date: { gte: dateStart, lt: dateEnd },
      },
      include: {
        recipe: true,
        ingredient: {
          include: {
            nutrientValues: { select: { nutrientId: true, value: true } },
          },
        },
      },
      orderBy: [{ mealType: 'asc' }, { id: 'asc' }],
    }),

    // Goals + nutrients in one query group
    Promise.all([
      prisma.mealPlan.findUnique({
        where: { id: mealPlanId },
        include: { nutritionGoals: { select: { nutrientId: true, lowGoal: true, highGoal: true } } },
      }),
      prisma.globalNutritionGoal.findMany(), // filtered to person below
      prisma.nutrient.findMany({ orderBy: { orderIndex: 'asc' } }),
    ]),

    // ALL complete recipes with their ingredients + nutrients in ONE query
    // This replaces the N+1 loop that called calculateRecipeNutrition per recipe
    prisma.recipe.findMany({
      where: { householdId: auth.householdId, isComplete: true },
      select: {
        id: true,
        name: true,
        servingSize: true,
        servingUnit: true,
        tags: true,
        ingredients: {
          select: {
            conversionGrams: true,
            ingredient: {
              select: {
                nutrientValues: { select: { nutrientId: true, value: true } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const [mealPlan, allGlobalGoals, allNutrients] = goalsData;

  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }

  // Filter global goals to the meal plan's person so multi-person households
  // don't bleed goals across people (same fix as getWeeklyNutritionSummary).
  const globalGoals = allGlobalGoals.filter((g) => g.personId === (mealPlan.personId ?? null));

  // -----------------------------------------------------------------------
  // 2. Build goals map
  // -----------------------------------------------------------------------
  const globalGoalsMap = new Map(globalGoals.map((g) => [g.nutrientId, g]));
  const planGoalsMap = new Map(mealPlan.nutritionGoals.map((g) => [g.nutrientId, g]));

  const goalsMap: Record<number, { lowGoal?: number; highGoal?: number }> = {};
  for (const n of allNutrients) {
    const planGoal = planGoalsMap.get(n.id);
    const globalGoal = globalGoalsMap.get(n.id);
    const lowGoal = planGoal?.lowGoal ?? globalGoal?.lowGoal ?? undefined;
    const highGoal = planGoal?.highGoal ?? globalGoal?.highGoal ?? undefined;
    if (lowGoal !== undefined || highGoal !== undefined) {
      goalsMap[n.id] = { lowGoal, highGoal };
    }
  }

  // -----------------------------------------------------------------------
  // 3. Pre-compute nutrition for ALL recipes in memory (no more N+1)
  // -----------------------------------------------------------------------
  const recipeNutritionMap = new Map<number, { total: Record<number, number>; perServing: Record<number, number> }>();

  for (const recipe of allRecipesWithIngredients) {
    const total: Record<number, number> = {};
    for (const n of allNutrients) total[n.id] = 0;

    for (const ri of recipe.ingredients) {
      const grams = ri.conversionGrams || 0;
      for (const nv of ri.ingredient.nutrientValues) {
        total[nv.nutrientId] = (total[nv.nutrientId] || 0) + (nv.value / USDA_BASE_GRAMS) * grams;
      }
    }

    const perServing: Record<number, number> = {};
    const servSize = recipe.servingSize || 1;
    for (const [nId, val] of Object.entries(total)) {
      perServing[Number(nId)] = Math.round((val / servSize) * 10) / 10;
      total[Number(nId)] = Math.round(val * 10) / 10;
    }

    recipeNutritionMap.set(recipe.id, { total, perServing });
  }

  // -----------------------------------------------------------------------
  // 4. Compute per-meal nutrient contributions
  // -----------------------------------------------------------------------
  const nutrientTotals: Record<number, number> = {};
  for (const n of allNutrients) nutrientTotals[n.id] = 0;

  const mealContributions: MealContribution[] = [];

  for (const mealLog of mealLogs) {
    const meal = mealLog as any;
    const nutrients: Record<number, number> = {};

    if (meal.recipeId && meal.recipe) {
      const recipeNutrition = recipeNutritionMap.get(meal.recipeId);
      if (recipeNutrition) {
        const servings = Number(meal.servings ?? 1);
        const multiplier = servings / (meal.recipe.servingSize || 1);
        for (const [nId, val] of Object.entries(recipeNutrition.total)) {
          nutrients[Number(nId)] = Math.round(val * multiplier * 10) / 10;
        }
      }
    } else if (meal.ingredientId && meal.ingredient && meal.quantity != null && meal.unit) {
      let gramsAmount = meal.quantity;
      const ing = meal.ingredient;
      if (meal.unit === ing.customUnitName && ing.customUnitGrams) {
        gramsAmount = (meal.quantity / (ing.customUnitAmount || 1)) * ing.customUnitGrams;
      }
      for (const nv of ing.nutrientValues) {
        nutrients[nv.nutrientId] = Math.round((nv.value / USDA_BASE_GRAMS) * gramsAmount * 10) / 10;
      }
    }

    for (const [nId, val] of Object.entries(nutrients)) {
      nutrientTotals[Number(nId)] = (nutrientTotals[Number(nId)] ?? 0) + val;
    }

    mealContributions.push({
      mealLogId: meal.id,
      name: meal.recipe?.name ?? meal.ingredient?.name ?? 'Unknown',
      mealType: meal.mealType,
      nutrients,
    });
  }

  // -----------------------------------------------------------------------
  // 5. Build nutrient snapshot with status
  // -----------------------------------------------------------------------
  const dailyNutrientValues = allNutrients.map((n) => ({
    nutrientId: n.id,
    nutrientName: n.name,
    displayName: n.displayName,
    unit: n.unit,
    value: Math.round(nutrientTotals[n.id] * 10) / 10,
  }));

  const nutrientsWithStatus = applyNutrientGoals(dailyNutrientValues, goalsMap);
  const overBudget = getOverBudgetAlerts(nutrientsWithStatus);

  // -----------------------------------------------------------------------
  // 6. Top contributors per over-budget nutrient
  // -----------------------------------------------------------------------
  const topContributors: Record<number, ReturnType<typeof getTopContributors>> = {};
  for (const alert of overBudget) {
    topContributors[alert.nutrientId] = getTopContributors(mealContributions, alert.nutrientId);
  }

  // -----------------------------------------------------------------------
  // 7. Recipe pool for swaps (already computed in memory — no extra queries)
  // -----------------------------------------------------------------------
  const CALORIE_NAMES = ['energy', 'calories'];
  const calorieNutrient = allNutrients.find((n) =>
    CALORIE_NAMES.some((c) => n.displayName.toLowerCase().includes(c))
  );
  const calorieNutrientId = calorieNutrient?.id ?? null;

  const recipePool: Array<{
    id: number;
    name: string;
    type: 'recipe';
    servingSize: number;
    tags: string[];
    nutrients: Record<number, number>;
  }> = [];

  for (const recipe of allRecipesWithIngredients) {
    const nutrition = recipeNutritionMap.get(recipe.id);
    if (!nutrition) continue;
    const tags = recipe.tags ? recipe.tags.split(',').map((t: string) => t.trim().toLowerCase()) : [];
    recipePool.push({
      id: recipe.id,
      name: recipe.name,
      type: 'recipe',
      servingSize: recipe.servingSize,
      tags,
      nutrients: nutrition.perServing,
    });
  }

  // -----------------------------------------------------------------------
  // 8. Swap candidates for over-budget nutrients
  // -----------------------------------------------------------------------
  const swapCandidates: Record<
    number,
    Array<{
      recipeId: number;
      name: string;
      savingAmounts: Record<number, number>;
      calorieDiff: number;
    }>
  > = {};

  for (const alert of overBudget.slice(0, 3)) {
    const contributors = topContributors[alert.nutrientId];
    if (!contributors?.length) continue;

    for (const meal of contributors.slice(0, 3)) {
      if (swapCandidates[meal.mealLogId]) continue;

      const currentMealNutrients = mealContributions.find(
        (m) => m.mealLogId === meal.mealLogId
      )?.nutrients ?? {};
      const currentCals = calorieNutrientId ? (currentMealNutrients[calorieNutrientId] ?? 0) : 0;
      const currentProblemValue = currentMealNutrients[alert.nutrientId] ?? 0;

      const mealLog = mealLogs.find(m => m.id === meal.mealLogId);
      const mealType = mealLog?.mealType?.toLowerCase() ?? '';
      // Match by meal type only — recipe-level tags are too narrow for a small household DB.
      const sourceTags = mealType ? [mealType] : [];
      const hasCategory = sourceTags.length > 0;

      const swaps = recipePool
        .filter((r) => {
          const rProblem = r.nutrients[alert.nutrientId] ?? 0;
          if (rProblem >= currentProblemValue) return false;
          if (r.id === (mealLog?.recipeId ?? -1)) return false;
          // Require category overlap — but tagless recipes are universal candidates
          if (hasCategory && r.tags.length > 0 && !r.tags.some(t => sourceTags.includes(t))) return false;

          // Allow swaps that don't severely break other goals (5% tolerance).
          // Without tolerance, nearly all candidates get rejected when nutrients
          // are close to their goal boundaries.
          for (const [nIdStr, goal] of Object.entries(goalsMap)) {
            const nId = Number(nIdStr);
            const currentTotal = nutrientTotals[nId] ?? 0;
            const currentMealContrib = currentMealNutrients[nId] ?? 0;
            const swapContrib = r.nutrients[nId] ?? 0;
            const newTotal = currentTotal - currentMealContrib + swapContrib;
            if (goal.highGoal && newTotal > goal.highGoal * 1.05 && currentTotal <= goal.highGoal) return false;
            if (goal.lowGoal && newTotal < goal.lowGoal * 0.95 && currentTotal >= goal.lowGoal) return false;
          }
          return true;
        })
        .map((r) => {
          const rCals = calorieNutrientId ? (r.nutrients[calorieNutrientId] ?? 0) : 0;
          const savingAmounts: Record<number, number> = {};
          for (const alert2 of overBudget) {
            const saving = (currentMealNutrients[alert2.nutrientId] ?? 0) - (r.nutrients[alert2.nutrientId] ?? 0);
            if (saving > 0) savingAmounts[alert2.nutrientId] = Math.round(saving * 10) / 10;
          }
          return { recipeId: r.id, name: r.name, savingAmounts, calorieDiff: Math.round(rCals - currentCals) };
        })
        .sort((a, b) => (b.savingAmounts[alert.nutrientId] ?? 0) - (a.savingAmounts[alert.nutrientId] ?? 0))
        .slice(0, 4);

      if (swaps.length > 0) {
        swapCandidates[meal.mealLogId] = swaps;
      }
    }
  }

  // -----------------------------------------------------------------------
  // 9. Under-budget detection
  // -----------------------------------------------------------------------
  const underBudget: Array<{
    nutrientId: number;
    displayName: string;
    unit: string;
    current: number;
    lowGoal: number;
    shortBy: number;
    shortByPct: number;
  }> = [];

  for (const n of nutrientsWithStatus) {
    if (n.status === 'warning' && n.lowGoal != null && n.value < n.lowGoal) {
      const shortBy = n.lowGoal - n.value;
      underBudget.push({
        nutrientId: n.nutrientId,
        displayName: n.displayName,
        unit: n.unit,
        current: n.value,
        lowGoal: n.lowGoal,
        shortBy: Math.round(shortBy * 10) / 10,
        shortByPct: Math.round((shortBy / n.lowGoal) * 100),
      });
    }
  }

  const underBudgetSwaps: Record<
    number,
    Array<{
      mealLogId: number;
      mealName: string;
      swaps: Array<{
        recipeId: number;
        name: string;
        gainAmount: number;
        calorieDiff: number;
      }>;
    }>
  > = {};

  for (const deficit of underBudget) {
    const results: typeof underBudgetSwaps[number] = [];

    for (const mc of mealContributions.slice(0, 5)) {
      const currentMealNuts = mc.nutrients;
      const currentDeficitValue = currentMealNuts[deficit.nutrientId] ?? 0;
      const currentCals = calorieNutrientId ? (currentMealNuts[calorieNutrientId] ?? 0) : 0;
      const mealLog = mealLogs.find(m => m.id === mc.mealLogId);
      const mealType = mealLog?.mealType?.toLowerCase() ?? '';
      // Match by meal type only — recipe-level tags are too narrow for a small household DB.
      const sourceTags = mealType ? [mealType] : [];
      const hasCategory = sourceTags.length > 0;

      const swaps = recipePool
        .filter((r) => {
          const rDeficit = r.nutrients[deficit.nutrientId] ?? 0;
          if (rDeficit <= currentDeficitValue) return false;
          if (r.id === (mealLog?.recipeId ?? -1)) return false;
          // Require category overlap — but tagless recipes are universal candidates
          if (hasCategory && r.tags.length > 0 && !r.tags.some(t => sourceTags.includes(t))) return false;

          // Allow swaps that don't severely break other goals (5% tolerance).
          for (const [nIdStr, goal] of Object.entries(goalsMap)) {
            const nId = Number(nIdStr);
            const curTotal = nutrientTotals[nId] ?? 0;
            const curContrib = currentMealNuts[nId] ?? 0;
            const swapContrib = r.nutrients[nId] ?? 0;
            const newTotal = curTotal - curContrib + swapContrib;
            if (goal.highGoal && newTotal > goal.highGoal * 1.05 && curTotal <= goal.highGoal) return false;
            if (goal.lowGoal && nId !== deficit.nutrientId && newTotal < goal.lowGoal * 0.95 && curTotal >= goal.lowGoal) return false;
          }
          return true;
        })
        .map((r) => {
          const rCals = calorieNutrientId ? (r.nutrients[calorieNutrientId] ?? 0) : 0;
          const gain = (r.nutrients[deficit.nutrientId] ?? 0) - currentDeficitValue;
          return { recipeId: r.id, name: r.name, gainAmount: Math.round(gain * 10) / 10, calorieDiff: Math.round(rCals - currentCals) };
        })
        .sort((a, b) => b.gainAmount - a.gainAmount)
        .slice(0, 3);

      if (swaps.length > 0) {
        results.push({ mealLogId: mc.mealLogId, mealName: mc.name, swaps });
      }
    }

    if (results.length > 0) {
      underBudgetSwaps[deficit.nutrientId] = results.slice(0, 3);
    }
  }

  // -----------------------------------------------------------------------
  // 10. Fill-gap candidates (calorie-based)
  // -----------------------------------------------------------------------
  let fillGapCandidates: ReturnType<typeof scoreFillGapCandidates> = [];

  if (calorieNutrientId) {
    const calGoal = goalsMap[calorieNutrientId]?.highGoal;
    const calConsumed = nutrientTotals[calorieNutrientId] ?? 0;
    const remaining = calGoal != null ? calGoal - calConsumed : null;

    if (remaining != null && remaining > 50) {
      const candidates = recipePool.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        nutrients: r.nutrients,
      }));

      fillGapCandidates = scoreFillGapCandidates(
        candidates,
        { calories: remaining, protein: null },
        calorieNutrientId
      );
    }
  }

  return NextResponse.json({
    date: dateStr,
    mealContributions,
    overBudget,
    underBudget,
    topContributors,
    swapCandidates,
    underBudgetSwaps,
    fillGapCandidates,
    calorieNutrientId,
  });
}, 'Failed to compute day analysis');

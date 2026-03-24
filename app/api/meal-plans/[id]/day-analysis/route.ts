import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedHousehold } from '@/lib/auth';
import {
  calculateRecipeNutrition,
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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = params instanceof Promise ? await params : params;
    const mealPlanId = parseInt(id);

    // Verify meal plan belongs to household
    const mealPlanCheck = await prisma.mealPlan.findUnique({ where: { id: mealPlanId } });
    if (!mealPlanCheck || mealPlanCheck.householdId !== auth.householdId) {
      return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
    }

    const dateStr = request.nextUrl.searchParams.get('date');

    if (!dateStr) {
      return NextResponse.json({ error: 'date query param required (YYYY-MM-DD)' }, { status: 400 });
    }

    const date = new Date(`${dateStr}T00:00:00`);
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dateEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    // -----------------------------------------------------------------------
    // 1. Load the day's meals
    // -----------------------------------------------------------------------
    const mealLogs = await prisma.mealLog.findMany({
      where: {
        mealPlanId,
        date: { gte: dateStart, lt: dateEnd },
      },
      include: {
        recipe: true,
        ingredient: {
          include: {
            nutrientValues: { include: { nutrient: true } },
          },
        },
      },
      orderBy: [{ mealType: 'asc' }, { id: 'asc' }],
    });

    // -----------------------------------------------------------------------
    // 2. Load goals
    // -----------------------------------------------------------------------
    const [mealPlan, globalGoals, allNutrients] = await Promise.all([
      prisma.mealPlan.findUnique({
        where: { id: mealPlanId },
        include: { nutritionGoals: { include: { nutrient: true } } },
      }),
      prisma.globalNutritionGoal.findMany(),
      prisma.nutrient.findMany({ orderBy: { orderIndex: 'asc' } }),
    ]);

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
    }

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
    // 3. Compute per-meal nutrient contributions
    // -----------------------------------------------------------------------
    const nutrientTotals: Record<number, number> = {};
    for (const n of allNutrients) nutrientTotals[n.id] = 0;

    const mealContributions: MealContribution[] = [];

    for (const mealLog of mealLogs) {
      const meal = mealLog as any; // Prisma nested-include type inference
      const nutrients: Record<number, number> = {};

      if (meal.recipeId && meal.recipe) {
        const recipeNutrition = await calculateRecipeNutrition(meal.recipeId);
        const servings = Number(meal.servings ?? 1);
        const multiplier = servings / (recipeNutrition.servingSize || 1);
        for (const n of recipeNutrition.totalNutrients) {
          nutrients[n.nutrientId] = Math.round(n.value * multiplier * 10) / 10;
        }
      } else if (meal.ingredientId && meal.ingredient && meal.quantity != null && meal.unit) {
        // Inline ingredient nutrition to avoid code duplication
        let gramsAmount = meal.quantity;
        const ing = meal.ingredient;
        if (meal.unit === ing.customUnitName && ing.customUnitGrams) {
          gramsAmount = (meal.quantity / (ing.customUnitAmount || 1)) * ing.customUnitGrams;
        }
        for (const nv of ing.nutrientValues) {
          nutrients[nv.nutrientId] = Math.round((nv.value / 100) * gramsAmount * 10) / 10;
        }
      }

      // Accumulate totals
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
    // 4. Build nutrient snapshot with status
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
    // 5. Top contributors per over-budget nutrient
    // -----------------------------------------------------------------------
    const topContributors: Record<
      number,
      ReturnType<typeof getTopContributors>
    > = {};
    for (const alert of overBudget) {
      topContributors[alert.nutrientId] = getTopContributors(
        mealContributions,
        alert.nutrientId
      );
    }

    // -----------------------------------------------------------------------
    // 6. Swap candidates — find recipes that are lower in the problem nutrient
    // -----------------------------------------------------------------------
    // For each over-budget nutrient, take the top contributing meal and suggest
    // alternatives that have fewer of that nutrient and similar calories.
    const CALORIE_NAMES = ['energy', 'calories'];
    const calorieNutrient = allNutrients.find((n) =>
      CALORIE_NAMES.some((c) => n.displayName.toLowerCase().includes(c))
    );
    const calorieNutrientId = calorieNutrient?.id ?? null;

    // Get a pool of all recipes with their per-serving nutrition
    const recipesRaw = await prisma.recipe.findMany({
      where: { isComplete: true },
      orderBy: { name: 'asc' },
    });

    const recipePool: Array<{
      id: number;
      name: string;
      type: 'recipe';
      servingSize: number;
      tags: string[];
      nutrients: Record<number, number>;
    }> = [];

    for (const recipe of recipesRaw) {
      try {
        const rn = await calculateRecipeNutrition(recipe.id);
        const perServing: Record<number, number> = {};
        for (const n of rn.perServingNutrients) {
          perServing[n.nutrientId] = n.value;
        }
        const tags = (recipe as any).tags ? (recipe as any).tags.split(',').map((t: string) => t.trim().toLowerCase()) : [];
        recipePool.push({ id: recipe.id, name: recipe.name, type: 'recipe', servingSize: recipe.servingSize, tags, nutrients: perServing });
      } catch {
        // Skip recipes with calculation errors
      }
    }

    // Build swap suggestions
    const swapCandidates: Record<
      number /* mealLogId */,
      Array<{
        recipeId: number;
        name: string;
        savingAmounts: Record<number /* nutrientId */, number>;
        calorieDiff: number;
      }>
    > = {};

    for (const alert of overBudget.slice(0, 3)) {
      // limit to worst 3 nutrients
      const contributors = topContributors[alert.nutrientId];
      if (!contributors?.length) continue;

      // Generate swaps for ALL contributors, not just the top one
      for (const meal of contributors.slice(0, 3)) {
        if (swapCandidates[meal.mealLogId]) continue; // already generated for this meal

        const currentMealNutrients = mealContributions.find(
          (m) => m.mealLogId === meal.mealLogId
        )?.nutrients ?? {};
        const currentCals = calorieNutrientId ? (currentMealNutrients[calorieNutrientId] ?? 0) : 0;
        const currentProblemValue = currentMealNutrients[alert.nutrientId] ?? 0;

        // Get the meal type for this meal so we can prioritize same-category swaps
        const mealLog = mealLogs.find(m => m.id === meal.mealLogId);
        const mealType = mealLog?.mealType?.toLowerCase() ?? '';

        const swaps = recipePool
          .filter((r) => {
            const rProblem = r.nutrients[alert.nutrientId] ?? 0;
            if (rProblem >= currentProblemValue) return false;
            if (r.id === (mealLog?.recipeId ?? -1)) return false;

            // Check that swapping wouldn't create new goal violations
            for (const [nIdStr, goal] of Object.entries(goalsMap)) {
              const nId = Number(nIdStr);
              const currentTotal = nutrientTotals[nId] ?? 0;
              const currentMealContrib = currentMealNutrients[nId] ?? 0;
              const swapContrib = r.nutrients[nId] ?? 0;
              const newTotal = currentTotal - currentMealContrib + swapContrib;

              // Would create a NEW overage
              if (goal.highGoal && newTotal > goal.highGoal && currentTotal <= goal.highGoal) {
                return false;
              }
              // Would create a NEW underage
              if (goal.lowGoal && newTotal < goal.lowGoal && currentTotal >= goal.lowGoal) {
                return false;
              }
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
            // Check if recipe tags match the meal type
            const matchesMealType = mealType && r.tags.includes(mealType);
            return {
              recipeId: r.id,
              name: r.name,
              savingAmounts,
              calorieDiff: Math.round(rCals - currentCals),
              matchesMealType,
            };
          })
          // Sort: same category first, then by savings amount
          .sort((a, b) => {
            if (a.matchesMealType && !b.matchesMealType) return -1;
            if (!a.matchesMealType && b.matchesMealType) return 1;
            return (b.savingAmounts[alert.nutrientId] ?? 0) - (a.savingAmounts[alert.nutrientId] ?? 0);
          })
          .slice(0, 4);

        if (swaps.length > 0) {
          swapCandidates[meal.mealLogId] = swaps;
        }
      }
    }

    // -----------------------------------------------------------------------
    // 6b. Under-budget detection — nutrients below their low goal
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

    // For under-budget nutrients, find which meals could be swapped for
    // alternatives with MORE of the deficient nutrient
    const underBudgetSwaps: Record<
      number /* nutrientId */,
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

      // For each meal, find swaps that have MORE of the deficient nutrient
      for (const mc of mealContributions.slice(0, 5)) {
        const currentMealNuts = mc.nutrients;
        const currentDeficitValue = currentMealNuts[deficit.nutrientId] ?? 0;
        const currentCals = calorieNutrientId ? (currentMealNuts[calorieNutrientId] ?? 0) : 0;
        const mealLog = mealLogs.find(m => m.id === mc.mealLogId);
        const mealType = mealLog?.mealType?.toLowerCase() ?? '';

        const swaps = recipePool
          .filter((r) => {
            const rDeficit = r.nutrients[deficit.nutrientId] ?? 0;
            if (rDeficit <= currentDeficitValue) return false;
            if (r.id === (mealLog?.recipeId ?? -1)) return false;

            // Don't create new violations
            for (const [nIdStr, goal] of Object.entries(goalsMap)) {
              const nId = Number(nIdStr);
              const curTotal = nutrientTotals[nId] ?? 0;
              const curContrib = currentMealNuts[nId] ?? 0;
              const swapContrib = r.nutrients[nId] ?? 0;
              const newTotal = curTotal - curContrib + swapContrib;
              if (goal.highGoal && newTotal > goal.highGoal && curTotal <= goal.highGoal) return false;
              if (goal.lowGoal && nId !== deficit.nutrientId && newTotal < goal.lowGoal && curTotal >= goal.lowGoal) return false;
            }
            return true;
          })
          .map((r) => {
            const rCals = calorieNutrientId ? (r.nutrients[calorieNutrientId] ?? 0) : 0;
            const gain = (r.nutrients[deficit.nutrientId] ?? 0) - currentDeficitValue;
            const matchesMealType = mealType && r.tags.includes(mealType);
            return { recipeId: r.id, name: r.name, gainAmount: Math.round(gain * 10) / 10, calorieDiff: Math.round(rCals - currentCals), matchesMealType };
          })
          .sort((a, b) => {
            if (a.matchesMealType && !b.matchesMealType) return -1;
            if (!a.matchesMealType && b.matchesMealType) return 1;
            return b.gainAmount - a.gainAmount;
          })
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
    // 7. Fill-gap candidates (calorie-based)
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
  } catch (error) {
    console.error('Error computing day analysis:', error);
    return NextResponse.json({ error: 'Failed to compute day analysis' }, { status: 500 });
  }
}

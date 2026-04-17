import { prisma } from './db';
import { USDA_BASE_GRAMS } from './constants';

export interface NutrientValue {
  nutrientId: number;
  nutrientName: string;
  displayName: string;
  unit: string;
  value: number; // actual value
  lowGoal?: number;
  highGoal?: number;
  status?: 'ok' | 'warning' | 'error'; // 'ok' = in range, 'warning' = below low goal, 'error' = above high goal
}

export interface RecipeNutrition {
  recipeId: number;
  recipeName: string;
  servingSize: number;
  servingUnit: string;
  totalNutrients: NutrientValue[];
  perServingNutrients: NutrientValue[];
}

export interface DailyNutrition {
  date: Date;
  dayOfWeek: string;
  totalNutrients: NutrientValue[];
}

// Internal types for pre-fetched data
type NutrientRow = { id: number; name: string; displayName: string; unit: string; orderIndex: number };

type RecipeForNutrition = {
  id: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  ingredients: {
    conversionGrams: number | null;
    ingredient: {
      nutrientValues: { nutrientId: number; value: number }[];
    };
  }[];
};

type IngredientForNutrition = {
  customUnitName: string | null;
  customUnitAmount: number | null;
  customUnitGrams: number | null;
  nutrientValues: { nutrientId: number; value: number }[];
};

// Pure in-memory computation — no DB calls
function _computeRecipeNutritionFromData(
  recipe: RecipeForNutrition,
  allNutrients: NutrientRow[]
): RecipeNutrition {
  const totalNutrients: Record<number, number> = {};
  for (const n of allNutrients) totalNutrients[n.id] = 0;

  for (const ri of recipe.ingredients) {
    const grams = ri.conversionGrams || 0;
    for (const nv of ri.ingredient.nutrientValues) {
      totalNutrients[nv.nutrientId] = (totalNutrients[nv.nutrientId] || 0) + (nv.value / USDA_BASE_GRAMS) * grams;
    }
  }

  const totalNutrientValues: NutrientValue[] = allNutrients.map((n) => ({
    nutrientId: n.id,
    nutrientName: n.name,
    displayName: n.displayName,
    unit: n.unit,
    value: Math.round(totalNutrients[n.id] * 10) / 10,
  }));

  const perServingNutrients: NutrientValue[] = totalNutrientValues.map((n) => ({
    ...n,
    value: Math.round((n.value / recipe.servingSize) * 10) / 10,
  }));

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    servingSize: recipe.servingSize,
    servingUnit: recipe.servingUnit,
    totalNutrients: totalNutrientValues,
    perServingNutrients,
  };
}

// Pure in-memory ingredient nutrition computation — no DB calls
function _computeIngredientNutrition(
  ingredient: IngredientForNutrition,
  quantity: number,
  unit: string
): Record<number, number> {
  let grams = quantity;
  if (unit === ingredient.customUnitName && ingredient.customUnitGrams) {
    grams = (quantity / (ingredient.customUnitAmount || 1)) * ingredient.customUnitGrams;
  }
  const totals: Record<number, number> = {};
  for (const nv of ingredient.nutrientValues) {
    totals[nv.nutrientId] = (nv.value / USDA_BASE_GRAMS) * grams;
  }
  return totals;
}

/**
 * Calculate total nutrition for a recipe.
 * Parallelizes the recipe fetch and nutrient list fetch.
 */
export async function calculateRecipeNutrition(recipeId: number): Promise<RecipeNutrition> {
  const [recipe, allNutrients] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: {
            ingredient: {
              include: {
                nutrientValues: { select: { nutrientId: true, value: true } },
              },
            },
          },
        },
      },
    }),
    prisma.nutrient.findMany({ orderBy: { orderIndex: 'asc' } }),
  ]);

  if (!recipe) throw new Error(`Recipe with id ${recipeId} not found`);
  return _computeRecipeNutritionFromData(recipe, allNutrients);
}

/**
 * Calculate daily nutrition totals for a specific date in a meal plan.
 * Batches all DB fetches to avoid N+1 queries.
 */
export async function calculateDailyNutrition(
  mealPlanId: number,
  date: Date
): Promise<DailyNutrition> {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [mealLogs, allNutrients] = await Promise.all([
    prisma.mealLog.findMany({
      where: {
        mealPlanId,
        date: { gte: dayStart, lt: dayEnd },
      },
      select: {
        recipeId: true,
        ingredientId: true,
        quantity: true,
        unit: true,
        servings: true,
      },
    }),
    prisma.nutrient.findMany({ orderBy: { orderIndex: 'asc' } }),
  ]);

  // Batch fetch all recipes and ingredients needed for this day
  const recipeIds = [...new Set(mealLogs.flatMap((m) => (m.recipeId ? [m.recipeId] : [])))];
  const ingredientIds = [...new Set(mealLogs.flatMap((m) => (m.ingredientId ? [m.ingredientId] : [])))];

  const [recipes, ingredients] = await Promise.all([
    recipeIds.length > 0
      ? prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
          select: {
            id: true,
            name: true,
            servingSize: true,
            servingUnit: true,
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
        })
      : Promise.resolve([]),
    ingredientIds.length > 0
      ? prisma.ingredient.findMany({
          where: { id: { in: ingredientIds } },
          select: {
            id: true,
            customUnitName: true,
            customUnitAmount: true,
            customUnitGrams: true,
            nutrientValues: { select: { nutrientId: true, value: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  const totalNutrients: Record<number, number> = {};
  for (const n of allNutrients) totalNutrients[n.id] = 0;

  for (const mealLog of mealLogs) {
    if (mealLog.recipeId) {
      const recipe = recipeMap.get(mealLog.recipeId);
      if (recipe) {
        const nutrition = _computeRecipeNutritionFromData(recipe, allNutrients);
        const servings = Number(mealLog.servings ?? 1);
        const multiplier = servings / (recipe.servingSize || 1);
        for (const n of nutrition.totalNutrients) {
          totalNutrients[n.nutrientId] += n.value * multiplier;
        }
      }
    } else if (mealLog.ingredientId && mealLog.quantity != null && mealLog.unit) {
      const ingredient = ingredientMap.get(mealLog.ingredientId);
      if (ingredient) {
        const mealNutrients = _computeIngredientNutrition(ingredient, mealLog.quantity, mealLog.unit);
        for (const [id, value] of Object.entries(mealNutrients)) {
          totalNutrients[Number(id)] += value;
        }
      }
    }
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    date,
    dayOfWeek: days[date.getDay()],
    totalNutrients: allNutrients.map((n) => ({
      nutrientId: n.id,
      nutrientName: n.name,
      displayName: n.displayName,
      unit: n.unit,
      value: Math.round(totalNutrients[n.id] * 10) / 10,
    })),
  };
}

/**
 * Apply nutrient goals to nutrition values and assign status colors
 */
export function applyNutrientGoals(
  nutrients: NutrientValue[],
  goals: Record<number, { lowGoal?: number; highGoal?: number }>
): NutrientValue[] {
  return nutrients.map((nutrient) => {
    const goal = goals[nutrient.nutrientId];
    if (!goal) return nutrient;
    if (goal.lowGoal === undefined && goal.highGoal === undefined) return nutrient;

    let status: 'ok' | 'warning' | 'error' = 'ok';

    if (goal.lowGoal !== null && goal.lowGoal !== undefined) {
      if (nutrient.value < goal.lowGoal) status = 'warning';
    }

    if (goal.highGoal !== null && goal.highGoal !== undefined) {
      if (nutrient.value > goal.highGoal) status = 'error';
    }

    if (
      goal.lowGoal !== null && goal.lowGoal !== undefined &&
      goal.highGoal !== null && goal.highGoal !== undefined
    ) {
      if (nutrient.value >= goal.lowGoal && nutrient.value <= goal.highGoal) status = 'ok';
    }

    return { ...nutrient, lowGoal: goal.lowGoal, highGoal: goal.highGoal, status };
  });
}

type PrefetchedGoal = { nutrientId: number; lowGoal: number | null; highGoal: number | null };

/**
 * Get weekly nutrition summary for a meal plan.
 * Fetches all 7 days of meal logs in one query, batches recipe/ingredient loads,
 * then computes all days synchronously — no per-day DB round-trips.
 *
 * Pass `prefetched` to skip the internal mealPlan lookup (when the caller already has it).
 */
export async function getWeeklyNutritionSummary(
  mealPlanId: number,
  prefetched?: { weekStartDate: Date | string; nutritionGoals: PrefetchedGoal[]; personId?: number | null }
) {
  // Fetch mealPlan (if not prefetched), allNutrients, and globalGoals in parallel
  const [mealPlanData, allNutrients, allGlobalGoals] = await Promise.all([
    prefetched
      ? Promise.resolve(null)
      : prisma.mealPlan.findUnique({
          where: { id: mealPlanId },
          include: {
            nutritionGoals: { select: { nutrientId: true, lowGoal: true, highGoal: true } },
          },
        }),
    prisma.nutrient.findMany({ orderBy: { orderIndex: 'asc' } }),
    prisma.globalNutritionGoal.findMany(),
  ]);

  // Filter global goals to only the person who owns this meal plan,
  // so multi-person households don't bleed goals across people.
  const personId = prefetched?.personId !== undefined ? prefetched.personId : mealPlanData?.personId;
  const globalGoals = allGlobalGoals.filter((g) => g.personId === (personId ?? null));

  const weekStartRaw = prefetched?.weekStartDate ?? mealPlanData?.weekStartDate;
  if (!weekStartRaw) throw new Error(`Meal plan with id ${mealPlanId} not found`);

  const planNutritionGoals: PrefetchedGoal[] =
    prefetched?.nutritionGoals ?? mealPlanData?.nutritionGoals ?? [];

  const globalGoalsMap = new Map(globalGoals.map((g) => [g.nutrientId, g]));
  const mealPlanGoalsMap = new Map(planNutritionGoals.map((g) => [g.nutrientId, g]));

  const goalsMap: Record<number, { lowGoal?: number; highGoal?: number }> = {};
  for (const nutrient of allNutrients) {
    const planGoal = mealPlanGoalsMap.get(nutrient.id);
    const globalGoal = globalGoalsMap.get(nutrient.id);
    const lowGoal = planGoal?.lowGoal ?? globalGoal?.lowGoal ?? undefined;
    const highGoal = planGoal?.highGoal ?? globalGoal?.highGoal ?? undefined;
    if (lowGoal !== undefined || highGoal !== undefined) {
      goalsMap[nutrient.id] = { lowGoal, highGoal };
    }
  }

  const weekStart =
    weekStartRaw instanceof Date
      ? new Date(weekStartRaw)
      : new Date((weekStartRaw as string) + 'T00:00:00Z');
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch ALL meal logs for the entire week in ONE query
  const allMealLogs = await prisma.mealLog.findMany({
    where: {
      mealPlanId,
      date: { gte: weekStart, lt: weekEnd },
    },
    select: {
      date: true,
      recipeId: true,
      ingredientId: true,
      quantity: true,
      unit: true,
      servings: true,
    },
  });

  // Collect unique IDs needed across all 7 days
  const recipeIds = [...new Set(allMealLogs.flatMap((m) => (m.recipeId ? [m.recipeId] : [])))];
  const ingredientIds = [
    ...new Set(allMealLogs.flatMap((m) => (m.ingredientId ? [m.ingredientId] : []))),
  ];

  // Batch fetch all recipes and ingredients in parallel
  const [recipes, ingredients] = await Promise.all([
    recipeIds.length > 0
      ? prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
          select: {
            id: true,
            name: true,
            servingSize: true,
            servingUnit: true,
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
        })
      : Promise.resolve([]),
    ingredientIds.length > 0
      ? prisma.ingredient.findMany({
          where: { id: { in: ingredientIds } },
          select: {
            id: true,
            customUnitName: true,
            customUnitAmount: true,
            customUnitGrams: true,
            nutrientValues: { select: { nutrientId: true, value: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

  // Calculate all 7 days synchronously (data already in memory)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const dailyNutritions: DailyNutrition[] = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const date = dayStart;

    const dayLogs = allMealLogs.filter((m) => {
      const d = new Date(m.date);
      return d >= dayStart && d < dayEnd;
    });

    const totalNutrients: Record<number, number> = {};
    for (const n of allNutrients) totalNutrients[n.id] = 0;

    for (const mealLog of dayLogs) {
      if (mealLog.recipeId) {
        const recipe = recipeMap.get(mealLog.recipeId);
        if (recipe) {
          const nutrition = _computeRecipeNutritionFromData(recipe, allNutrients);
          const servings = Number(mealLog.servings ?? 1);
          const multiplier = servings / (recipe.servingSize || 1);
          for (const n of nutrition.totalNutrients) {
            totalNutrients[n.nutrientId] += n.value * multiplier;
          }
        }
      } else if (mealLog.ingredientId && mealLog.quantity != null && mealLog.unit) {
        const ingredient = ingredientMap.get(mealLog.ingredientId);
        if (ingredient) {
          const mealNutrients = _computeIngredientNutrition(ingredient, mealLog.quantity, mealLog.unit);
          for (const [id, value] of Object.entries(mealNutrients)) {
            totalNutrients[Number(id)] += value;
          }
        }
      }
    }

    const totalNutrientValues: NutrientValue[] = allNutrients.map((n) => ({
      nutrientId: n.id,
      nutrientName: n.name,
      displayName: n.displayName,
      unit: n.unit,
      value: Math.round(totalNutrients[n.id] * 10) / 10,
    }));

    return {
      date,
      dayOfWeek: dayNames[date.getDay()],
      totalNutrients: applyNutrientGoals(totalNutrientValues, goalsMap),
    };
  });

  return {
    mealPlanId,
    weekStartDate: weekStart,
    dailyNutritions,
  };
}

/**
 * Get all recipes and their basic nutrition info.
 * Fetches all recipes with nutrients in one query — no N+1.
 */
export async function getRecipesWithNutrition() {
  const [recipes, allNutrients] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { name: 'asc' },
      include: {
        ingredients: {
          include: {
            ingredient: {
              include: {
                nutrientValues: { select: { nutrientId: true, value: true } },
              },
            },
          },
        },
      },
    }),
    prisma.nutrient.findMany({ orderBy: { orderIndex: 'asc' } }),
  ]);

  return recipes.map((recipe) => {
    const nutrition = _computeRecipeNutritionFromData(recipe, allNutrients);
    return {
      id: recipe.id,
      name: recipe.name,
      servingSize: recipe.servingSize,
      servingUnit: recipe.servingUnit,
      nutrition: nutrition.totalNutrients,
    };
  });
}

// ─── Lightweight per-serving totals ──────────────────────────────────────────
// Works with the already-joined Prisma shape used by the recipes API routes
// (ingredient.nutrientValues includes the full nutrient row).
// Returns one entry per distinct nutrient, value already divided by servingSize.

export interface RecipeServingTotal {
  nutrientId: number;
  displayName: string;
  value: number;
  unit: string;
}

type JoinedIngredient = {
  conversionGrams: number | null;
  ingredient?: {
    nutrientValues: {
      value: number;
      nutrient: { id: number; displayName: string; unit: string };
    }[];
  } | null;
};

export function computeRecipeServingTotals(
  ingredients: JoinedIngredient[],
  servingSize: number | null
): RecipeServingTotal[] {
  const totals: Record<number, RecipeServingTotal> = {};

  for (const ri of ingredients) {
    if (!ri.ingredient) continue;
    const grams = ri.conversionGrams ?? 0;
    for (const iv of ri.ingredient.nutrientValues) {
      const nid = iv.nutrient.id;
      const contribution = (iv.value * grams) / USDA_BASE_GRAMS;
      if (!totals[nid]) {
        totals[nid] = { nutrientId: nid, displayName: iv.nutrient.displayName, value: 0, unit: iv.nutrient.unit };
      }
      totals[nid].value += contribution;
    }
  }

  const size = servingSize || 1;
  for (const nid in totals) totals[nid].value /= size;

  return Object.values(totals);
}

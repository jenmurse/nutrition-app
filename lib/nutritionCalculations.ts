import { prisma } from './db';

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

/**
 * Calculate total nutrition for a recipe
 * Returns both total nutrition and per-serving nutrition
 */
export async function calculateRecipeNutrition(
  recipeId: number
): Promise<RecipeNutrition> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: {
              nutrientValues: {
                include: {
                  nutrient: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!recipe) {
    throw new Error(`Recipe with id ${recipeId} not found`);
  }

  // Initialize nutrition totals (per 100g first, then we'll scale)
  const allNutrients = await prisma.nutrient.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  const totalNutrients: Record<number, number> = {};
  const nutrientInfo: Record<number, Nutrient> = {};

  // Initialize all nutrients to 0
  for (const nutrient of allNutrients) {
    totalNutrients[nutrient.id] = 0;
    nutrientInfo[nutrient.id] = nutrient;
  }

  // Sum up nutrition from all ingredients in recipe
  for (const recipeIngredient of recipe.ingredients) {
    // Get gram equivalent for this ingredient
    const gramsAmount = recipeIngredient.conversionGrams || 0;

    // For each nutrient in this ingredient
    for (const ingredientNutrient of recipeIngredient.ingredient.nutrientValues) {
      const nutrientId = ingredientNutrient.nutrientId;
      // value is per 100g, so: (value / 100) * gramsAmount
      const contributedValue = (ingredientNutrient.value / 100) * gramsAmount;
      totalNutrients[nutrientId] += contributedValue;
    }
  }

  // Convert to NutrientValue objects
  const totalNutrientValues: NutrientValue[] = allNutrients.map((nutrient) => ({
    nutrientId: nutrient.id,
    nutrientName: nutrient.name,
    displayName: nutrient.displayName,
    unit: nutrient.unit,
    value: Math.round(totalNutrients[nutrient.id] * 10) / 10, // Round to 1 decimal
  }));

  // Calculate per-serving nutrition
  const perServingNutrients: NutrientValue[] = totalNutrientValues.map(
    (nutrient) => ({
      ...nutrient,
      value: Math.round((nutrient.value / recipe.servingSize) * 10) / 10,
    })
  );

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    servingSize: recipe.servingSize,
    servingUnit: recipe.servingUnit,
    totalNutrients: totalNutrientValues,
    perServingNutrients,
  };
}

/**
 * Calculate daily nutrition totals for a specific date in a meal plan
 */
export async function calculateDailyNutrition(
  mealPlanId: number,
  date: Date
): Promise<DailyNutrition> {
  // Get all meals for this date
  const mealLogs = await prisma.mealLog.findMany({
    where: {
      mealPlanId,
      date: {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
    },
    include: {
      recipe: true,
    },
  });

  // Initialize nutrition totals
  const allNutrients = await prisma.nutrient.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  const totalNutrients: Record<number, number> = {};
  for (const nutrient of allNutrients) {
    totalNutrients[nutrient.id] = 0;
  }

  // Sum nutrition from all recipes in the day
  for (const mealLog of mealLogs) {
    const recipeNutrition = await calculateRecipeNutrition(mealLog.recipeId);
    const servings = Number((mealLog as { servings?: number }).servings ?? 1);
    const recipeServings = recipeNutrition.servingSize || 1;
    const servingMultiplier = servings / recipeServings;

    for (const nutrient of recipeNutrition.totalNutrients) {
      totalNutrients[nutrient.nutrientId] += nutrient.value * servingMultiplier;
    }
  }

  // Convert to NutrientValue objects
  const dailyNutrientValues: NutrientValue[] = allNutrients.map((nutrient) => ({
    nutrientId: nutrient.id,
    nutrientName: nutrient.name,
    displayName: nutrient.displayName,
    unit: nutrient.unit,
    value: Math.round(totalNutrients[nutrient.id] * 10) / 10,
  }));

  // Get day of week
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const dayOfWeek = days[date.getDay()];

  return {
    date,
    dayOfWeek,
    totalNutrients: dailyNutrientValues,
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
    if (goal.lowGoal === undefined && goal.highGoal === undefined) {
      return nutrient;
    }

    let status: 'ok' | 'warning' | 'error' = 'ok';

    if (goal.lowGoal !== null && goal.lowGoal !== undefined) {
      if (nutrient.value < goal.lowGoal) {
        status = 'warning'; // Below minimum
      }
    }

    if (goal.highGoal !== null && goal.highGoal !== undefined) {
      if (nutrient.value > goal.highGoal) {
        status = 'error'; // Above maximum
      }
    }

    // Check if we need to override with ok status
    if (
      goal.lowGoal !== null &&
      goal.lowGoal !== undefined &&
      goal.highGoal !== null &&
      goal.highGoal !== undefined
    ) {
      if (nutrient.value >= goal.lowGoal && nutrient.value <= goal.highGoal) {
        status = 'ok';
      }
    }

    return {
      ...nutrient,
      lowGoal: goal.lowGoal,
      highGoal: goal.highGoal,
      status,
    };
  });
}

/**
 * Get weekly nutrition summary for a meal plan
 */
export async function getWeeklyNutritionSummary(mealPlanId: number) {
  const mealPlan = await prisma.mealPlan.findUnique({
    where: { id: mealPlanId },
    include: {
      nutritionGoals: {
        include: {
          nutrient: true,
        },
      },
    },
  });

  if (!mealPlan) {
    throw new Error(`Meal plan with id ${mealPlanId} not found`);
  }

  const allNutrients = await prisma.nutrient.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  const globalGoals = await prisma.globalNutritionGoal.findMany();
  const globalGoalsMap = new Map(
    globalGoals.map((goal) => [goal.nutrientId, goal])
  );

  const mealPlanGoalsMap = new Map(
    mealPlan.nutritionGoals.map((goal) => [goal.nutrientId, goal])
  );

  // Create goals map with meal-plan goals taking priority over global defaults.
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

  // Calculate nutrition for each day in the week
  const dailyNutritions: DailyNutrition[] = [];
  for (let i = 0; i < 7; i++) {
    // Parse the date string as local time to avoid timezone issues
    const weekStart = mealPlan.weekStartDate instanceof Date 
      ? mealPlan.weekStartDate 
      : new Date(mealPlan.weekStartDate + 'T00:00:00');
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dailyNutrition = await calculateDailyNutrition(mealPlanId, date);

    // Apply goals
    dailyNutrition.totalNutrients = applyNutrientGoals(
      dailyNutrition.totalNutrients,
      goalsMap
    );

    dailyNutritions.push(dailyNutrition);
  }

  return {
    mealPlanId,
    weekStartDate: mealPlan.weekStartDate,
    dailyNutritions,
  };
}

/**
 * Get all recipes and their basic nutrition info for UI dropdowns
 */
export async function getRecipesWithNutrition() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { name: 'asc' },
  });

  const recipesWithNutrition = await Promise.all(
    recipes.map(async (recipe) => {
      const nutrition = await calculateRecipeNutrition(recipe.id);
      return {
        id: recipe.id,
        name: recipe.name,
        servingSize: recipe.servingSize,
        servingUnit: recipe.servingUnit,
        nutrition: nutrition.totalNutrients,
      };
    })
  );

  return recipesWithNutrition;
}

// Type for Prisma Nutrient model
type Nutrient = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
  orderIndex: number;
};

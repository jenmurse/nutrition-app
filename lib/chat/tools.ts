/**
 * Chat tools — read-only for Gate 1.
 *
 * The tool list is stable (frozen across turns), so it sits inside the
 * cached system+tools prefix. Tool execution runs in-process via Prisma —
 * no HTTP hop, no extra latency.
 *
 * Write tools (propose_add_meal, propose_swap_meal, etc.) come in Gate 2.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_recipe",
    description:
      "Get full detail for a single recipe — ingredients with grams, instructions, per-serving nutrition for all tracked nutrients. " +
      "Use this when the user asks about a specific recipe's makeup or you need precise nutrition beyond the four macros in the context.",
    input_schema: {
      type: "object",
      properties: {
        recipe_id: {
          type: "number",
          description: "The recipe id from the recipe library in your context.",
        },
      },
      required: ["recipe_id"],
    },
  },
  {
    name: "get_meal_plan_week",
    description:
      "Get full nutrition aggregation for a meal plan week — per-day totals for every tracked nutrient, " +
      "with how each compares to the user's goals. " +
      "Use this when answering questions about the week's totals, averages, or goal coverage.",
    input_schema: {
      type: "object",
      properties: {
        plan_id: {
          type: "number",
          description: "The meal plan id from the current_week section of your context.",
        },
      },
      required: ["plan_id"],
    },
  },
  {
    name: "search_ingredients",
    description:
      "Search the household pantry by name (case-insensitive substring match). Returns matching ingredients " +
      "with their per-100g nutrition. Use this when the user asks about a specific ingredient or you need pantry detail.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Substring to match against ingredient names.",
        },
      },
      required: ["query"],
    },
  },
];

/** Compute grams given quantity, unit, and an ingredient's unit definition. */
function gramsForUnit(
  quantity: number,
  unit: string,
  defaultUnit: string,
  customUnitGrams: number | null,
  cached: number | null,
): number | null {
  if (cached !== null && cached > 0) return cached;
  if (unit === "g") return quantity;
  if (unit === "other" && defaultUnit === "other" && customUnitGrams) {
    return quantity * customUnitGrams;
  }
  return null;
}

export async function runChatTool(
  name: string,
  input: unknown,
  ctx: { personId: number; householdId: number },
): Promise<unknown> {
  const i = input as Record<string, unknown>;
  try {
    switch (name) {
      case "get_recipe":
        return await getRecipe(i.recipe_id as number, ctx.householdId);
      case "get_meal_plan_week":
        return await getMealPlanWeek(i.plan_id as number, ctx.personId);
      case "search_ingredients":
        return await searchIngredients(i.query as string, ctx.householdId);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}

async function getRecipe(recipeId: number, householdId: number) {
  const r = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId },
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: {
              nutrientValues: { include: { nutrient: true } },
            },
          },
        },
      },
    },
  });
  if (!r) return { error: `Recipe ${recipeId} not found` };

  const nutrientTotals: Record<string, { value: number; unit: string }> = {};
  const ingredientLines: string[] = [];
  for (const ri of r.ingredients) {
    const ing = ri.ingredient;
    const grams = gramsForUnit(
      ri.quantity,
      ri.unit,
      ing.defaultUnit,
      ing.customUnitGrams,
      ri.conversionGrams,
    );
    const unitDisplay =
      ri.unit === "other" && ing.customUnitName ? ing.customUnitName : ri.unit;
    ingredientLines.push(
      `${ri.quantity} ${unitDisplay} ${ing.name}${ri.notes ? ` (${ri.notes})` : ""}`,
    );
    if (grams !== null) {
      for (const nv of ing.nutrientValues) {
        const key = nv.nutrient.name;
        if (!nutrientTotals[key]) nutrientTotals[key] = { value: 0, unit: nv.nutrient.unit };
        nutrientTotals[key].value += (nv.value * grams) / 100;
      }
    }
  }
  const div = r.servingSize || 1;
  const perServing: Record<string, string> = {};
  for (const [key, { value, unit }] of Object.entries(nutrientTotals)) {
    perServing[key] = `${(value / div).toFixed(1)}${unit}`;
  }

  return {
    id: r.id,
    name: r.name,
    tags: r.tags,
    serving_size: r.servingSize,
    serving_unit: r.servingUnit,
    ingredients: ingredientLines,
    per_serving_nutrition: perServing,
    instructions: r.instructions || undefined,
  };
}

async function getMealPlanWeek(planId: number, personId: number) {
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, personId },
    include: {
      mealLogs: {
        include: {
          recipe: {
            include: {
              ingredients: {
                include: {
                  ingredient: {
                    include: { nutrientValues: { include: { nutrient: true } } },
                  },
                },
              },
            },
          },
          ingredient: { include: { nutrientValues: { include: { nutrient: true } } } },
        },
      },
    },
  });
  if (!plan) return { error: `Plan ${planId} not found` };

  const byDate = new Map<string, Record<string, { value: number; unit: string }>>();
  for (const log of plan.mealLogs) {
    const date = log.date.toISOString().slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, {});
    const dayTotals = byDate.get(date)!;

    if (log.recipe) {
      const div = log.recipe.servingSize || 1;
      for (const ri of log.recipe.ingredients) {
        const ing = ri.ingredient;
        const grams = gramsForUnit(
          ri.quantity,
          ri.unit,
          ing.defaultUnit,
          ing.customUnitGrams,
          ri.conversionGrams,
        );
        if (grams === null) continue;
        for (const nv of ing.nutrientValues) {
          const key = nv.nutrient.name;
          if (!dayTotals[key]) dayTotals[key] = { value: 0, unit: nv.nutrient.unit };
          dayTotals[key].value += (nv.value * grams * log.servings) / 100 / div;
        }
      }
    }

    if (log.ingredient && log.quantity !== null && log.unit) {
      const grams = gramsForUnit(
        log.quantity,
        log.unit,
        log.ingredient.defaultUnit,
        log.ingredient.customUnitGrams,
        null,
      );
      if (grams !== null) {
        for (const nv of log.ingredient.nutrientValues) {
          const key = nv.nutrient.name;
          if (!dayTotals[key]) dayTotals[key] = { value: 0, unit: nv.nutrient.unit };
          dayTotals[key].value += (nv.value * grams) / 100;
        }
      }
    }
  }

  const goals = await prisma.globalNutritionGoal.findMany({
    where: { personId },
    include: { nutrient: true },
  });
  const goalsByName: Record<string, { low: number | null; high: number | null; unit: string }> = {};
  for (const g of goals) {
    goalsByName[g.nutrient.name] = {
      low: g.lowGoal,
      high: g.highGoal,
      unit: g.nutrient.unit,
    };
  }

  const days = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, totals]) => {
      const formatted: Record<string, string> = {};
      const flags: string[] = [];
      for (const [key, { value, unit }] of Object.entries(totals)) {
        formatted[key] = `${value.toFixed(1)}${unit}`;
        const goal = goalsByName[key];
        if (goal) {
          if (goal.high !== null && value > goal.high) {
            flags.push(`${key} over (${value.toFixed(0)}${unit}/${goal.high}${unit} cap)`);
          } else if (goal.low !== null && value < goal.low) {
            flags.push(`${key} under (${value.toFixed(0)}${unit}/${goal.low}${unit} target)`);
          }
        }
      }
      return { date, totals: formatted, flags };
    });

  return {
    plan_id: plan.id,
    week_start: plan.weekStartDate.toISOString().slice(0, 10),
    days,
    goals: goalsByName,
  };
}

async function searchIngredients(query: string, householdId: number) {
  const q = query.trim().toLowerCase();
  if (!q) return { error: "Empty query" };

  const ings = await prisma.ingredient.findMany({
    where: {
      householdId,
      name: { contains: q, mode: "insensitive" },
    },
    include: {
      nutrientValues: { include: { nutrient: true } },
    },
    take: 20,
    orderBy: { name: "asc" },
  });

  return ings.map((ing) => {
    const per100g: Record<string, string> = {};
    for (const nv of ing.nutrientValues) {
      per100g[nv.nutrient.name] = `${nv.value}${nv.nutrient.unit}`;
    }
    return {
      id: ing.id,
      name: ing.name,
      category: ing.category,
      default_unit: ing.defaultUnit,
      per_100g_nutrition: per100g,
    };
  });
}

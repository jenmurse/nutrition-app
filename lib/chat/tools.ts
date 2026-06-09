/**
 * Chat tools — Gate 1 read tools + Gate 2 propose_* write tools.
 *
 * The tool list is frozen across turns (stable prefix for caching).
 * Write tools are named propose_* so the model can ONLY propose changes —
 * it has no execute_* tool to call. The APPLY tap on a confirm-card is the
 * only thing that fires a real write, client-side via existing API routes.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import type { MealProposal, BulkMealProposal, MacroDelta } from "./proposals";

// `strict: true` + `additionalProperties: false` together enable grammar-constrained
// sampling — Anthropic guarantees the model's tool inputs match these JSON schemas
// exactly (right types, no extra keys, required fields always present). Eliminates
// defensive validation and reduces "malformed proposal" classes of bugs.
// Cast through Tool[] because the SDK type may not surface `strict` yet.
export const CHAT_TOOLS: Anthropic.Tool[] = ([
  {
    name: "get_recipe",
    strict: true,
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
      additionalProperties: false,
    },
  },
  {
    name: "get_meal_plan_week",
    strict: true,
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
      additionalProperties: false,
    },
  },
  {
    name: "search_ingredients",
    strict: true,
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
      additionalProperties: false,
    },
  },

  // ── Gate 3: bulk write tools ─────────────────────────────────────────────
  {
    name: "propose_fill_week",
    strict: true,
    description:
      "Propose adding multiple meals across a week in one confirm-card. " +
      "Use this when the user asks to fill their week, plan several days, or add meals across multiple days at once. " +
      "Only include meals that match the user's explicit request — don't fill every slot unless asked. " +
      "Each item must reference an existing recipe_id from the recipe library in context.",
    input_schema: {
      type: "object",
      properties: {
        plan_id: { type: "number", description: "The meal plan id to add to." },
        person_id: { type: "number", description: "The person_id whose plan this is." },
        meals: {
          type: "array",
          description: "The meals to propose. Each item is one meal on one day.",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"] },
              recipe_id: { type: "number", description: "Recipe from the library." },
              servings: { type: "number", description: "Serving count. Default 1." },
            },
            required: ["date", "meal_type", "recipe_id"],
            additionalProperties: false,
          },
        },
      },
      required: ["plan_id", "person_id", "meals"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_apply_template",
    strict: true,
    description:
      "Propose applying a saved day template to a specific day. " +
      "Template ids and names are in the context. " +
      "mode 'replace' clears the day first; mode 'append' merges with existing meals.",
    input_schema: {
      type: "object",
      properties: {
        template_id: { type: "number", description: "The day template id from context." },
        plan_id: { type: "number", description: "The meal plan id to apply to." },
        date: { type: "string", description: "YYYY-MM-DD — the target day." },
        mode: { type: "string", enum: ["replace", "append"] },
      },
      required: ["template_id", "plan_id", "date", "mode"],
      additionalProperties: false,
    },
  },

  // ── Plan existence check ─────────────────────────────────────────────────
  {
    name: "check_plan_exists",
    strict: true,
    description:
      "Check whether a meal plan exists for a given person and week. " +
      "Call this first when the user asks to add/modify meals for a future week, before clarifying questions. " +
      "If no plan exists, report it and stop. If a plan exists, then ask for the details you need.",
    input_schema: {
      type: "object",
      properties: {
        person_id: { type: "number", description: "The person_id to check for." },
        date: { type: "string", description: "Any date within the target week (YYYY-MM-DD)." },
      },
      required: ["person_id", "date"],
      additionalProperties: false,
    },
  },

  // ── Gate 2: propose-only write tools ─────────────────────────────────────
  // Named propose_* so the model can ONLY propose. No execute_* exists.
  {
    name: "propose_add_meal",
    strict: true,
    description:
      "Propose adding a meal to someone's plan. " +
      "plan_id is OPTIONAL — if omitted, the tool looks up the correct plan for the given date automatically. " +
      "If no plan exists for that week the tool returns an error immediately (no need to ask clarifying questions first). " +
      "For a recipe-based meal provide recipe_id; for an ingredient provide ingredient_id + servings; " +
      "for an eating-out placeholder provide external_label (can be empty string).",
    input_schema: {
      type: "object",
      properties: {
        plan_id: { type: "number", description: "The meal plan id (optional — tool will look it up by date if not provided)." },
        person_id: { type: "number", description: "The person_id whose plan this is." },
        date: { type: "string", description: "YYYY-MM-DD — the specific day." },
        meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"] },
        recipe_id: { type: "number", description: "Recipe to add (mutually exclusive with ingredient_id / external_label)." },
        ingredient_id: { type: "number", description: "Ingredient to add (mutually exclusive with recipe_id / external_label)." },
        external_label: { type: "string", description: "Eating-out label. Use empty string for unlabelled eating-out." },
        servings: { type: "number", description: "Servings or quantity. Default 1." },
        unit: { type: "string", description: "Unit for ingredient-based meals (e.g. 'g', 'other'). Required if ingredient_id provided." },
      },
      required: ["plan_id", "person_id", "date", "meal_type"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_swap_meal",
    strict: true,
    description:
      "Propose replacing an existing meal with a different one. " +
      "Use get_meal_plan_week to find the meal_log_id of the meal to replace. " +
      "Provide exactly one of recipe_id, ingredient_id, or external_label as the replacement.",
    input_schema: {
      type: "object",
      properties: {
        meal_log_id: { type: "number", description: "The existing meal log to replace." },
        recipe_id: { type: "number", description: "New recipe (mutually exclusive with ingredient_id / external_label)." },
        ingredient_id: { type: "number", description: "New ingredient (mutually exclusive with recipe_id / external_label)." },
        external_label: { type: "string", description: "Eating-out label for the replacement." },
        servings: { type: "number", description: "Servings for the new meal. Default: same as current." },
      },
      required: ["meal_log_id"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_remove_meal",
    strict: true,
    description:
      "Propose removing a meal from the plan. " +
      "Use get_meal_plan_week to find the meal_log_id.",
    input_schema: {
      type: "object",
      properties: {
        meal_log_id: { type: "number", description: "The meal log to remove." },
      },
      required: ["meal_log_id"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_update_servings",
    strict: true,
    description:
      "Propose changing the serving count for an existing meal. " +
      "Use get_meal_plan_week to find the meal_log_id.",
    input_schema: {
      type: "object",
      properties: {
        meal_log_id: { type: "number", description: "The meal log to update." },
        servings: { type: "number", description: "New serving count." },
      },
      required: ["meal_log_id", "servings"],
      additionalProperties: false,
    },
  },
] as unknown as Anthropic.Tool[]);

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

/**
 * Returns true when the tool name is a propose_* write tool.
 * The server uses this to emit the proposal as a structured stream event
 * rather than folding it into the text response.
 */
export function isProposeTool(name: string): boolean {
  return name.startsWith("propose_");
}

export function isBulkProposeTool(name: string): boolean {
  return name === "propose_fill_week" || name === "propose_apply_template";
}

export async function runChatTool(
  name: string,
  input: unknown,
  ctx: { personId: number; householdId: number },
): Promise<unknown> {
  const i = input as Record<string, unknown>;
  try {
    switch (name) {
      case "propose_fill_week":
        return await proposeFillWeek(i, ctx);
      case "propose_apply_template":
        return await proposeApplyTemplate(i, ctx);
      case "check_plan_exists":
        return await checkPlanExists(i.date as string, i.person_id as number, ctx.householdId);
      case "get_recipe":
        return await getRecipe(i.recipe_id as number, ctx.householdId);
      case "get_meal_plan_week":
        return await getMealPlanWeek(i.plan_id as number, ctx.householdId);
      case "search_ingredients":
        return await searchIngredients(i.query as string, ctx.householdId);
      // Gate 2 propose_* tools
      case "propose_add_meal":
        return await proposeAddMeal(i, ctx);
      case "propose_swap_meal":
        return await proposeSwapMeal(i, ctx);
      case "propose_remove_meal":
        return await proposeRemoveMeal(i, ctx);
      case "propose_update_servings":
        return await proposeUpdateServings(i, ctx);
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

async function getMealPlanWeek(planId: number, householdId: number) {
  // Verify plan belongs to a household member, then load.
  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, householdId },
    include: {
      person: { select: { id: true, name: true } },
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

  // Goals are per-person; pull from the plan's owner so we compare
  // each day's totals against the right person's targets.
  const goals = await prisma.globalNutritionGoal.findMany({
    where: { personId: plan.personId ?? undefined },
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

  // Per-day meal log list with IDs — needed for propose_swap/remove/update_servings.
  const mealsByDate = new Map<string, Array<{
    meal_log_id: number;
    meal_type: string;
    name: string;
    servings: number;
    recipe_id: number | null;
    ingredient_id: number | null;
    external_label: string | null;
  }>>();
  for (const log of plan.mealLogs) {
    const date = log.date.toISOString().slice(0, 10);
    if (!mealsByDate.has(date)) mealsByDate.set(date, []);
    const name =
      log.recipe?.name ??
      log.ingredient?.name ??
      (log.externalLabel ? `Eating out — ${log.externalLabel}` : "Eating out");
    mealsByDate.get(date)!.push({
      meal_log_id: log.id,
      meal_type: log.mealType,
      name,
      servings: log.servings,
      recipe_id: log.recipeId ?? null,
      ingredient_id: log.ingredientId ?? null,
      external_label: log.externalLabel ?? null,
    });
  }

  const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const daysWithMeals = days.map((d) => {
    // Include the weekday name so the model can reliably match
    // "Wednesday's lunch" to the correct date without mental date math.
    const dt = new Date(d.date + "T00:00:00Z");
    const weekday = WEEKDAYS[dt.getUTCDay()];
    return {
      ...d,
      weekday,
      date_label: `${weekday} ${d.date}`, // e.g. "Wednesday 2026-06-10"
      meals: mealsByDate.get(d.date) ?? [],
    };
  });

  return {
    plan_id: plan.id,
    person: plan.person ? { id: plan.person.id, name: plan.person.name } : null,
    week_start: plan.weekStartDate.toISOString().slice(0, 10),
    days: daysWithMeals,
    goals: goalsByName,
  };
}

// ── Plan existence check ─────────────────────────────────────────────────────

async function checkPlanExists(date: string, personId: number, householdId: number) {
  const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const parsed = new Date(date + "T00:00:00Z");
  if (isNaN(parsed.getTime())) return { error: `Invalid date: ${date}` };

  // Validate person belongs to household
  const member = await prisma.householdMember.findFirst({
    where: { householdId, personId, active: true },
    include: { person: { select: { name: true } } },
  });
  if (!member) return { error: `Person ${personId} not found in your household.` };

  // Find week start (Sunday)
  const dayOfWeek = parsed.getUTCDay();
  const weekStart = new Date(parsed);
  weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek);

  const plan = await prisma.mealPlan.findFirst({
    where: { personId, weekStartDate: weekStart },
    select: { id: true, weekStartDate: true },
  });

  const weekday = WEEKDAYS[parsed.getUTCDay()];
  const weekLabel = weekStart.toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
  const weekEndLabel = new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });

  if (!plan) {
    return {
      exists: false,
      person_name: member.person.name,
      week_of: `${weekLabel}–${weekEndLabel}`,
      week_start: weekStart.toISOString().slice(0, 10),
      message: `No meal plan exists for ${member.person.name} for the week of ${weekLabel}–${weekEndLabel}. They need to create one in the app first (Planner → + NEW PLAN), then you can add meals.`,
    };
  }

  return {
    exists: true,
    plan_id: plan.id,
    person_id: personId,
    person_name: member.person.name,
    week_of: `${weekLabel}–${weekEndLabel}`,
    week_start: weekStart.toISOString().slice(0, 10),
    target_date: date,
    target_weekday: weekday,
  };
}

// ── Gate 2: Proposal execution ───────────────────────────────────────────────

/** Compute key macros (cal/protein/fiber/sodium) for a recipe at N servings. */
async function getRecipeMacros(
  recipeId: number,
  servings: number,
  householdId: number,
): Promise<MacroDelta> {
  const r = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId },
    include: {
      ingredients: {
        include: {
          ingredient: { include: { nutrientValues: { include: { nutrient: true } } } },
        },
      },
    },
  });
  if (!r) return {};
  const div = r.servingSize || 1;
  const KEYS = ["calories", "protein", "fiber", "sodium"] as const;
  const totals: Partial<Record<(typeof KEYS)[number], number>> = {};
  for (const ri of r.ingredients) {
    const ing = ri.ingredient;
    const grams = gramsForUnit(ri.quantity, ri.unit, ing.defaultUnit, ing.customUnitGrams, ri.conversionGrams);
    if (!grams) continue;
    for (const nv of ing.nutrientValues) {
      const key = nv.nutrient.name as (typeof KEYS)[number];
      if (!KEYS.includes(key)) continue;
      totals[key] = (totals[key] ?? 0) + (nv.value * grams) / 100;
    }
  }
  return {
    calories: totals.calories ? Math.round((totals.calories / div) * servings) : undefined,
    protein: totals.protein ? Math.round((totals.protein / div) * servings) : undefined,
    fiber: totals.fiber ? Math.round((totals.fiber / div) * servings) : undefined,
    sodium: totals.sodium ? Math.round((totals.sodium / div) * servings) : undefined,
  };
}

function diffMacros(after: MacroDelta, before: MacroDelta): MacroDelta {
  const delta: MacroDelta = {};
  const keys: (keyof MacroDelta)[] = ["calories", "protein", "fiber", "sodium"];
  for (const k of keys) {
    if (after[k] !== undefined || before[k] !== undefined) {
      delta[k] = (after[k] ?? 0) - (before[k] ?? 0);
    }
  }
  return delta;
}

async function resolveMealLog(mealLogId: number, householdId: number) {
  const log = await prisma.mealLog.findFirst({
    where: { id: mealLogId },
    include: {
      recipe: { select: { id: true, name: true, servingSize: true, householdId: true } },
      ingredient: { select: { id: true, name: true, householdId: true } },
      mealPlan: { select: { id: true, personId: true, householdId: true } },
    },
  });
  if (!log || log.mealPlan.householdId !== householdId) return null;
  return log;
}

async function resolvePerson(personId: number | null | undefined, householdId: number) {
  if (!personId) return null;
  const member = await prisma.householdMember.findFirst({
    where: { householdId, personId, active: true },
    include: { person: { select: { id: true, name: true } } },
  });
  return member?.person ?? null;
}

async function proposeAddMeal(
  i: Record<string, unknown>,
  ctx: { personId: number; householdId: number },
): Promise<MealProposal | { error: string }> {
  const inputPlanId = i.plan_id as number | undefined;
  const personId = i.person_id as number;
  const date = i.date as string;
  const mealType = i.meal_type as string;
  const recipeId = i.recipe_id as number | undefined;
  const ingredientId = i.ingredient_id as number | undefined;
  const externalLabel = i.external_label as string | undefined;
  const servings = (i.servings as number) || 1;
  const unit = i.unit as string | undefined;

  // If no plan_id provided, find the plan that covers this date for this person.
  // Fail fast before asking clarifying questions.
  let resolvedPlanId = inputPlanId;
  if (!resolvedPlanId) {
    const dateParsed = new Date(date + "T00:00:00Z");
    if (isNaN(dateParsed.getTime())) return { error: `Invalid date: ${date}` };
    // Find the week-start (Sunday) for this date
    const dayOfWeek = dateParsed.getUTCDay(); // 0=Sun
    const weekStart = new Date(dateParsed);
    weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek);
    const existingPlan = await prisma.mealPlan.findFirst({
      where: { personId, weekStartDate: weekStart },
      select: { id: true },
    });
    if (!existingPlan) {
      const weekLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      return {
        error: `No meal plan exists for the week of ${weekLabel}. The user needs to create a plan for that week in the app first (Planner → + NEW PLAN), then you can add meals to it.`,
      };
    }
    resolvedPlanId = existingPlan.id;
  }

  const plan = await prisma.mealPlan.findFirst({
    where: { id: resolvedPlanId, householdId: ctx.householdId },
    select: { id: true, personId: true },
  });
  if (!plan) return { error: `Plan ${resolvedPlanId} not found in your household.` };
  const planId = resolvedPlanId!;

  const person = await resolvePerson(personId || plan.personId, ctx.householdId);
  if (!person) return { error: `Person not found.` };

  let toName = "Eating out";
  let macros: MacroDelta = {};

  if (recipeId) {
    const r = await prisma.recipe.findFirst({
      where: { id: recipeId, householdId: ctx.householdId },
      select: { name: true },
    });
    if (!r) return { error: `Recipe ${recipeId} not found.` };
    toName = r.name;
    macros = await getRecipeMacros(recipeId, servings, ctx.householdId);
  } else if (ingredientId) {
    const ing = await prisma.ingredient.findFirst({
      where: { id: ingredientId, householdId: ctx.householdId },
      select: { name: true },
    });
    if (!ing) return { error: `Ingredient ${ingredientId} not found.` };
    toName = ing.name;
  } else if (externalLabel !== undefined) {
    toName = externalLabel ? `Eating out — ${externalLabel}` : "Eating out";
  } else {
    return { error: "Provide one of: recipe_id, ingredient_id, or external_label." };
  }

  const body: Record<string, unknown> = { date, mealType, servings };
  if (recipeId) body.recipeId = recipeId;
  if (ingredientId) { body.ingredientId = ingredientId; body.unit = unit ?? "g"; body.quantity = servings; }
  if (externalLabel !== undefined) body.externalLabel = externalLabel;

  return {
    type: "add",
    personId: person.id,
    personName: person.name,
    planId,
    date,
    mealType,
    to: { recipeId, ingredientId, externalLabel, name: toName, servings },
    macroDeltas: macros,
    execute: {
      method: "POST",
      url: `/api/meal-plans/${planId}/meals`,
      body,
    },
  };
}

async function proposeSwapMeal(
  i: Record<string, unknown>,
  ctx: { personId: number; householdId: number },
): Promise<MealProposal | { error: string }> {
  const mealLogId = i.meal_log_id as number;
  const recipeId = i.recipe_id as number | undefined;
  const ingredientId = i.ingredient_id as number | undefined;
  const externalLabel = i.external_label as string | undefined;

  const log = await resolveMealLog(mealLogId, ctx.householdId);
  if (!log) return { error: `Meal log ${mealLogId} not found.` };

  const person = await resolvePerson(log.mealPlan.personId, ctx.householdId);
  const fromName =
    log.recipe?.name ?? log.ingredient?.name ??
    (log.externalLabel ? `Eating out — ${log.externalLabel}` : "Eating out");
  const fromServings = log.servings;
  const newServings = (i.servings as number) || fromServings;

  let toName = "Eating out";
  let afterMacros: MacroDelta = {};
  let beforeMacros: MacroDelta = {};

  if (log.recipeId) beforeMacros = await getRecipeMacros(log.recipeId, fromServings, ctx.householdId);

  if (recipeId) {
    const r = await prisma.recipe.findFirst({
      where: { id: recipeId, householdId: ctx.householdId },
      select: { name: true },
    });
    if (!r) return { error: `Recipe ${recipeId} not found.` };
    toName = r.name;
    afterMacros = await getRecipeMacros(recipeId, newServings, ctx.householdId);
  } else if (ingredientId) {
    const ing = await prisma.ingredient.findFirst({
      where: { id: ingredientId, householdId: ctx.householdId },
      select: { name: true },
    });
    if (!ing) return { error: `Ingredient ${ingredientId} not found.` };
    toName = ing.name;
  } else if (externalLabel !== undefined) {
    toName = externalLabel ? `Eating out — ${externalLabel}` : "Eating out";
  } else {
    return { error: "Provide one of: recipe_id, ingredient_id, or external_label for the replacement." };
  }

  const body: Record<string, unknown> = { servings: newServings };
  if (recipeId) { body.recipeId = recipeId; body.ingredientId = null; body.externalLabel = null; }
  if (ingredientId) { body.ingredientId = ingredientId; body.recipeId = null; body.externalLabel = null; }
  if (externalLabel !== undefined) { body.externalLabel = externalLabel; body.recipeId = null; body.ingredientId = null; }

  return {
    type: "swap",
    personId: person?.id ?? log.mealPlan.personId ?? ctx.personId,
    personName: person?.name ?? "Unknown",
    planId: log.mealPlan.id,
    date: log.date.toISOString().slice(0, 10),
    mealType: log.mealType,
    from: { mealLogId, name: fromName, servings: fromServings },
    to: { recipeId, ingredientId, externalLabel, name: toName, servings: newServings },
    macroDeltas: diffMacros(afterMacros, beforeMacros),
    execute: {
      method: "PATCH",
      url: `/api/meal-plans/${log.mealPlan.id}/meals/${mealLogId}`,
      body,
    },
  };
}

async function proposeRemoveMeal(
  i: Record<string, unknown>,
  ctx: { personId: number; householdId: number },
): Promise<MealProposal | { error: string }> {
  const mealLogId = i.meal_log_id as number;
  const log = await resolveMealLog(mealLogId, ctx.householdId);
  if (!log) return { error: `Meal log ${mealLogId} not found.` };

  const person = await resolvePerson(log.mealPlan.personId, ctx.householdId);
  const name =
    log.recipe?.name ?? log.ingredient?.name ??
    (log.externalLabel ? `Eating out — ${log.externalLabel}` : "Eating out");
  let macros: MacroDelta = {};
  if (log.recipeId) macros = await getRecipeMacros(log.recipeId, log.servings, ctx.householdId);

  // Negate — removing means losing these macros
  const deltas: MacroDelta = {};
  for (const k of Object.keys(macros) as (keyof MacroDelta)[]) {
    if (macros[k] !== undefined) deltas[k] = -(macros[k]!);
  }

  return {
    type: "remove",
    personId: person?.id ?? log.mealPlan.personId ?? ctx.personId,
    personName: person?.name ?? "Unknown",
    planId: log.mealPlan.id,
    date: log.date.toISOString().slice(0, 10),
    mealType: log.mealType,
    from: { mealLogId, name, servings: log.servings },
    macroDeltas: deltas,
    execute: {
      method: "DELETE",
      url: `/api/meal-plans/${log.mealPlan.id}/meals/${mealLogId}`,
    },
  };
}

async function proposeUpdateServings(
  i: Record<string, unknown>,
  ctx: { personId: number; householdId: number },
): Promise<MealProposal | { error: string }> {
  const mealLogId = i.meal_log_id as number;
  const newServings = i.servings as number;
  const log = await resolveMealLog(mealLogId, ctx.householdId);
  if (!log) return { error: `Meal log ${mealLogId} not found.` };

  const person = await resolvePerson(log.mealPlan.personId, ctx.householdId);
  const name =
    log.recipe?.name ?? log.ingredient?.name ??
    (log.externalLabel ? `Eating out — ${log.externalLabel}` : "Eating out");

  let beforeMacros: MacroDelta = {};
  let afterMacros: MacroDelta = {};
  if (log.recipeId) {
    beforeMacros = await getRecipeMacros(log.recipeId, log.servings, ctx.householdId);
    afterMacros = await getRecipeMacros(log.recipeId, newServings, ctx.householdId);
  }

  return {
    type: "update_servings",
    personId: person?.id ?? log.mealPlan.personId ?? ctx.personId,
    personName: person?.name ?? "Unknown",
    planId: log.mealPlan.id,
    date: log.date.toISOString().slice(0, 10),
    mealType: log.mealType,
    from: { mealLogId, name, servings: log.servings },
    to: { name, servings: newServings },
    macroDeltas: diffMacros(afterMacros, beforeMacros),
    execute: {
      method: "PATCH",
      url: `/api/meal-plans/${log.mealPlan.id}/meals/${mealLogId}`,
      body: { servings: newServings },
    },
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

// ── Gate 3: Bulk proposal execution ──────────────────────────────────────────

const WEEKDAYS_BULK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

async function proposeFillWeek(
  i: Record<string, unknown>,
  ctx: { personId: number; householdId: number },
): Promise<BulkMealProposal | { error: string }> {
  const planId = i.plan_id as number;
  const personId = i.person_id as number;
  const meals = i.meals as Array<{ date: string; meal_type: string; recipe_id: number; servings?: number }>;

  if (!meals?.length) return { error: "No meals provided." };

  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, householdId: ctx.householdId },
    select: { id: true, personId: true },
  });
  if (!plan) return { error: `Plan ${planId} not found.` };

  const person = await resolvePerson(personId || plan.personId, ctx.householdId);
  if (!person) return { error: "Person not found." };

  const recipeIds = [...new Set(meals.map((m) => m.recipe_id))];
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds }, householdId: ctx.householdId },
    select: { id: true, name: true, servingSize: true,
      ingredients: { select: { quantity: true, unit: true, conversionGrams: true,
        ingredient: { select: { defaultUnit: true, customUnitGrams: true,
          nutrientValues: { select: { value: true, nutrient: { select: { name: true } } } } } } } } },
  });
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));

  const items: BulkMealProposal["items"] = [];
  const executeAll: BulkMealProposal["executeAll"] = [];

  for (const m of meals) {
    const recipe = recipeMap.get(m.recipe_id);
    if (!recipe) return { error: `Recipe ${m.recipe_id} not found.` };
    const servings = m.servings ?? 1;
    const macros = await getRecipeMacros(m.recipe_id, servings, ctx.householdId);
    const dt = new Date(m.date + "T00:00:00Z");
    items.push({
      date: m.date,
      weekday: WEEKDAYS_BULK[dt.getUTCDay()],
      mealType: m.meal_type,
      name: recipe.name,
      servings,
      // BulkItem.macros uses abbreviated keys; getRecipeMacros returns full names.
      macros: {
        cal: macros.calories,
        protein: macros.protein,
        fiber: macros.fiber,
        sodium: macros.sodium,
      },
    });
    executeAll.push({
      method: "POST",
      url: `/api/meal-plans/${planId}/meals`,
      body: { date: m.date, mealType: m.meal_type, recipeId: m.recipe_id, servings },
    });
  }

  // Average daily summary for the items proposed
  const caloriesArr = items.map((it) => it.macros?.cal ?? 0).filter((v) => v > 0);
  const proteinArr = items.map((it) => it.macros?.protein ?? 0).filter((v) => v > 0);
  const sodiumArr = items.map((it) => it.macros?.sodium ?? 0).filter((v) => v > 0);

  return {
    type: "fill_week",
    personId: person.id,
    personName: person.name,
    weekLabel: items.length > 0
      ? items[0].weekday === items[items.length - 1].weekday
        ? items[0].weekday                                             // same day: "Thursday"
        : `${items[0].weekday} – ${items[items.length - 1].weekday}`  // range: "Monday – Friday"
      : undefined,
    items,
    summaryMacros: {
      avgCalPerDay: caloriesArr.length ? Math.round(caloriesArr.reduce((a, b) => a + b, 0) / caloriesArr.length) : undefined,
      avgProteinPerDay: proteinArr.length ? Math.round(proteinArr.reduce((a, b) => a + b, 0) / proteinArr.length) : undefined,
      maxSodium: sodiumArr.length ? Math.max(...sodiumArr) : undefined,
    },
    executeAll,
  };
}

async function proposeApplyTemplate(
  i: Record<string, unknown>,
  ctx: { personId: number; householdId: number },
): Promise<BulkMealProposal | { error: string }> {
  const templateId = i.template_id as number;
  const planId = i.plan_id as number;
  const date = i.date as string;
  const mode = (i.mode as "replace" | "append") ?? "append";

  const template = await prisma.dayTemplate.findFirst({
    where: { id: templateId, householdId: ctx.householdId },
    include: {
      person: { select: { name: true } },
      items: {
        include: { recipe: { select: { name: true } }, ingredient: { select: { name: true } } },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!template) return { error: `Template ${templateId} not found.` };

  const plan = await prisma.mealPlan.findFirst({
    where: { id: planId, householdId: ctx.householdId },
    select: { id: true, personId: true },
  });
  if (!plan) return { error: `Plan ${planId} not found.` };

  const person = await resolvePerson(plan.personId, ctx.householdId);
  const dt = new Date(date + "T00:00:00Z");
  const weekday = WEEKDAYS_BULK[dt.getUTCDay()];

  // Compute per-item macros so the confirm-card shows real numbers AND so
  // we can build summary totals. Without this the model hallucinates sodium
  // and other totals in its prose because it has no ground truth.
  const itemsWithMacros = await Promise.all(
    template.items.map(async (item) => {
      const servings = item.servings ?? item.quantity ?? 1;
      const macros = item.recipeId
        ? await getRecipeMacros(item.recipeId, servings, ctx.householdId)
        : {};
      return {
        date,
        weekday,
        mealType: item.mealType,
        name: item.recipe?.name ?? item.ingredient?.name ??
          (item.externalLabel ? `Eating out — ${item.externalLabel}` : "Eating out"),
        servings,
        macros: {
          cal: macros.calories,
          protein: macros.protein,
          fiber: macros.fiber,
          sodium: macros.sodium,
        },
      };
    })
  );

  // Compute the day's projected total. If mode='replace' this IS the total;
  // if mode='append' we have to add the existing meals for this date.
  const targetDateUTC = new Date(date + "T00:00:00Z");
  let existingTotals = { calories: 0, protein: 0, fiber: 0, sodium: 0 };
  if (mode === "append") {
    const existing = await prisma.mealLog.findMany({
      where: { mealPlanId: planId, date: targetDateUTC },
      select: { recipeId: true, servings: true },
    });
    for (const log of existing) {
      if (!log.recipeId) continue;
      const m = await getRecipeMacros(log.recipeId, log.servings, ctx.householdId);
      existingTotals.calories += m.calories ?? 0;
      existingTotals.protein  += m.protein  ?? 0;
      existingTotals.fiber    += m.fiber    ?? 0;
      existingTotals.sodium   += m.sodium   ?? 0;
    }
  }

  // For replace mode in actual production: the merge logic at /api/day-templates/[id]/apply
  // dedupes by (mealType, recipeId), so identical entries don't double. But for the model's
  // claim, the simplest accurate projection is: template totals + (append ? existing : 0).
  // For the very common case "replace" the model's projection equals the template totals.
  let projCal = 0, projPro = 0, projFib = 0, projNa = 0;
  for (const it of itemsWithMacros) {
    projCal += it.macros.cal ?? 0;
    projPro += it.macros.protein ?? 0;
    projFib += it.macros.fiber ?? 0;
    projNa  += it.macros.sodium ?? 0;
  }
  const projectedDayTotals = {
    calories: Math.round(projCal + existingTotals.calories),
    protein:  Math.round(projPro + existingTotals.protein),
    fiber:    Math.round(projFib + existingTotals.fiber),
    sodium:   Math.round(projNa  + existingTotals.sodium),
  };

  return {
    type: "apply_template",
    personId: person?.id ?? ctx.personId,
    personName: person?.name ?? "Unknown",
    templateName: template.name,
    targetDate: date,
    targetWeekday: weekday,
    mode,
    items: itemsWithMacros,
    // Surfaced in the tool_result for the model — these are the REAL numbers
    // to quote in prose. Tells the model exactly what totals to expect after apply.
    projectedDayTotals,
    summaryMacros: {
      avgCalPerDay: projectedDayTotals.calories || undefined,
      avgProteinPerDay: projectedDayTotals.protein || undefined,
      maxSodium: projectedDayTotals.sodium || undefined,
    },
    execute: {
      method: "POST",
      url: `/api/day-templates/${templateId}/apply`,
      body: { planId, date, mode },
    },
  };
}

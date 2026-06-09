/**
 * Lightweight chat context — built fresh per turn.
 *
 * Pattern: send the model just enough to route on (recipe names + key macros,
 * pantry summary by category, goals, current week). Full recipe / pantry-item
 * detail is fetched on-demand via tool calls. This keeps per-turn input tokens
 * small enough to be affordable at scale and small enough to cache cleanly.
 *
 * The shape returned here is stable across turns within a session — same person,
 * same recipe list, same pantry shape. That stability is what makes the
 * cache_control breakpoint in lib/chat/anthropic.ts pay off.
 */

import { prisma } from "@/lib/db";

interface RecipeSlim {
  id: number;
  name: string;
  tags: string;
  servingSize: number;
  cal?: number;
  protein?: number;
  fiber?: number;
  sodium?: number;
}

interface DaySlim {
  date: string;
  meals: Array<{
    mealType: string;
    name: string;
    servings: number;
  }>;
}

export interface ChatContext {
  person: {
    id: number;
    name: string;
    goalsText: string;
  };
  household: {
    people: { id: number; name: string }[];
  };
  recipes: RecipeSlim[];
  pantry: {
    totalCount: number;
    byCategory: Record<string, number>;
  };
  currentWeek: {
    planId: number;
    weekStartDate: string;
    days: DaySlim[];
  } | null;
}

/** Monday-start of the current week (UTC). */
function currentWeekStartUTC(): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

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

export async function buildContext(personId: number, householdId: number): Promise<ChatContext> {
  const [person, household, recipes, pantryAgg, week] = await Promise.all([
    loadPerson(personId),
    loadHousehold(householdId),
    loadRecipes(householdId),
    loadPantrySummary(householdId),
    loadCurrentWeek(personId),
  ]);
  return { person, household, recipes, pantry: pantryAgg, currentWeek: week };
}

async function loadPerson(personId: number) {
  const p = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      globalNutritionGoals: { include: { nutrient: true } },
    },
  });
  if (!p) throw new Error(`Person ${personId} not found`);

  const goalLines = p.globalNutritionGoals
    .filter((g) => g.lowGoal !== null || g.highGoal !== null)
    .map((g) => {
      const parts: string[] = [];
      if (g.lowGoal !== null) parts.push(`≥${g.lowGoal}`);
      if (g.highGoal !== null) parts.push(`≤${g.highGoal}`);
      return `${g.nutrient.displayName}: ${parts.join(" and ")}${g.nutrient.unit}/day`;
    });

  return {
    id: p.id,
    name: p.name,
    goalsText: goalLines.length ? goalLines.join("; ") : "No goals set",
  };
}

async function loadHousehold(householdId: number) {
  const members = await prisma.householdMember.findMany({
    where: { householdId, active: true },
    include: { person: true },
  });
  return {
    people: members.map((m) => ({ id: m.person.id, name: m.person.name })),
  };
}

async function loadRecipes(householdId: number): Promise<RecipeSlim[]> {
  const recipes = await prisma.recipe.findMany({
    where: { householdId },
    select: {
      id: true,
      name: true,
      tags: true,
      servingSize: true,
      ingredients: {
        select: {
          quantity: true,
          unit: true,
          conversionGrams: true,
          ingredient: {
            select: {
              defaultUnit: true,
              customUnitGrams: true,
              nutrientValues: {
                select: {
                  value: true,
                  nutrient: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const KEYS = ["calories", "protein", "fiber", "sodium"] as const;
  return recipes.map((r) => {
    const totals: Partial<Record<(typeof KEYS)[number], number>> = {};
    for (const ri of r.ingredients) {
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
        const key = nv.nutrient.name as (typeof KEYS)[number];
        if (!KEYS.includes(key)) continue;
        totals[key] = (totals[key] ?? 0) + (nv.value * grams) / 100;
      }
    }
    const div = r.servingSize || 1;
    return {
      id: r.id,
      name: r.name,
      tags: r.tags,
      servingSize: r.servingSize,
      cal: totals.calories ? Math.round(totals.calories / div) : undefined,
      protein: totals.protein ? Math.round(totals.protein / div) : undefined,
      fiber: totals.fiber ? Math.round(totals.fiber / div) : undefined,
      sodium: totals.sodium ? Math.round(totals.sodium / div) : undefined,
    };
  });
}

async function loadPantrySummary(householdId: number) {
  const rows = await prisma.ingredient.groupBy({
    by: ["category"],
    where: { householdId },
    _count: true,
  });
  const total = await prisma.ingredient.count({ where: { householdId } });
  const byCategory: Record<string, number> = {};
  for (const r of rows) byCategory[r.category || "Uncategorized"] = r._count;
  return { totalCount: total, byCategory };
}

async function loadCurrentWeek(personId: number): Promise<ChatContext["currentWeek"]> {
  const weekStart = currentWeekStartUTC();
  const plan = await prisma.mealPlan.findFirst({
    where: { personId, weekStartDate: weekStart },
    include: {
      mealLogs: {
        include: {
          recipe: { select: { id: true, name: true } },
          ingredient: { select: { id: true, name: true } },
        },
        orderBy: { date: "asc" },
      },
    },
  });
  if (!plan) return null;

  const byDate = new Map<string, DaySlim>();
  for (const log of plan.mealLogs) {
    const dateKey = log.date.toISOString().slice(0, 10);
    if (!byDate.has(dateKey)) byDate.set(dateKey, { date: dateKey, meals: [] });
    const name =
      log.recipe?.name ??
      log.ingredient?.name ??
      (log.externalLabel ? `Eating out — ${log.externalLabel}` : "Eating out");
    // Use servings for recipe-based logs, quantity for ingredient-based.
    const portion = log.recipe ? log.servings : (log.quantity ?? log.servings);
    byDate.get(dateKey)!.meals.push({
      mealType: log.mealType,
      name,
      servings: portion,
    });
  }

  return {
    planId: plan.id,
    weekStartDate: plan.weekStartDate.toISOString().slice(0, 10),
    days: Array.from(byDate.values()),
  };
}

export function formatContextForPrompt(ctx: ChatContext): string {
  const lines: string[] = [];

  lines.push(`# Current user`);
  lines.push(`Name: ${ctx.person.name} (person_id ${ctx.person.id})`);
  lines.push(`Goals: ${ctx.person.goalsText}`);
  lines.push("");

  if (ctx.household.people.length > 1) {
    lines.push(`# Household members`);
    for (const p of ctx.household.people) {
      lines.push(`- ${p.name} (person_id ${p.id})`);
    }
    lines.push("");
  }

  lines.push(`# Recipe library (${ctx.recipes.length} recipes)`);
  lines.push(`Format: id · name · tags · per-serving cal/protein/fiber/sodium`);
  for (const r of ctx.recipes) {
    const macros = [
      r.cal !== undefined ? `${r.cal}cal` : null,
      r.protein !== undefined ? `${r.protein}g pro` : null,
      r.fiber !== undefined ? `${r.fiber}g fib` : null,
      r.sodium !== undefined ? `${r.sodium}mg Na` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const tagText = r.tags ? ` · ${r.tags}` : "";
    lines.push(`- ${r.id} · ${r.name}${tagText}${macros ? ` · ${macros}` : ""}`);
  }
  lines.push("");

  lines.push(`# Pantry (${ctx.pantry.totalCount} ingredients)`);
  const cats = Object.entries(ctx.pantry.byCategory).sort((a, b) => b[1] - a[1]);
  for (const [cat, n] of cats) lines.push(`- ${cat}: ${n}`);
  lines.push("");
  lines.push(`Call search_ingredients to look up a specific pantry item by name.`);
  lines.push("");

  if (ctx.currentWeek) {
    lines.push(`# Current week (plan ${ctx.currentWeek.planId}, starts ${ctx.currentWeek.weekStartDate})`);
    if (ctx.currentWeek.days.length === 0) {
      lines.push(`(No meals planned yet this week)`);
    } else {
      for (const d of ctx.currentWeek.days) {
        const meals = d.meals
          .map((m) => `${m.mealType}: ${m.name}${m.servings !== 1 ? ` ×${m.servings}` : ""}`)
          .join("; ");
        lines.push(`- ${d.date}: ${meals}`);
      }
    }
    lines.push("");
    lines.push(`Call get_meal_plan_week with plan_id ${ctx.currentWeek.planId} for full nutrition totals.`);
  } else {
    lines.push(`# Current week`);
    lines.push(`No plan exists for this week yet.`);
  }

  return lines.join("\n");
}

/**
 * Lightweight chat context — built fresh per turn.
 *
 * Pattern: send the model just enough to route on (recipe names + key macros,
 * pantry summary by category, all household members' goals + current week).
 * Full recipe / pantry-item detail is fetched on-demand via tool calls.
 *
 * Multi-person model: the household is flat. Every member's goals + current
 * week is in the context block, so the model can answer about anyone — even
 * if the user is on their own profile and asking about another household
 * member. The "currently viewing" person is sent in a separate (uncached)
 * block so person switches don't invalidate the cached prefix.
 */

import { prisma } from "@/lib/db";

interface RecipeSlim {
  id: number;
  name: string;
  tags: string;
  servingSize: number;
  // All 9 tracked nutrients per serving, so the model can select recipes
  // against ANY goal (sat fat, added sugar, carbs...) without calling
  // get_recipe for each candidate. Previously only 4 were here, which forced
  // a get_recipe per recipe whenever the user's goal involved a missing one.
  cal?: number;
  fat?: number;
  satFat?: number;
  sodium?: number;
  carbs?: number;
  sugar?: number;
  addedSugar?: number;
  protein?: number;
  fiber?: number;
}

interface DaySlim {
  date: string;
  meals: Array<{
    mealType: string;
    name: string;
    servings: number;
  }>;
}

interface PersonContextSlice {
  id: number;
  name: string;
  goalsText: string;
  currentWeek: {
    planId: number;
    weekStartDate: string;
    days: DaySlim[];
  } | null;
}

export interface ChatContext {
  loggedInPersonId: number;
  viewingPersonId: number;
  household: {
    people: PersonContextSlice[];
  };
  recipes: RecipeSlim[];
  pantry: {
    totalCount: number;
    byCategory: Record<string, number>;
  };
  templates: Array<{
    id: number;
    name: string;
    personName: string | null;
    itemCount: number;
  }>;
}

/** Sunday-start of the current week, midnight UTC. Matches app/home convention. */
function currentWeekStartUTC(): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
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

export async function buildContext(
  loggedInPersonId: number,
  viewingPersonId: number,
  householdId: number,
): Promise<ChatContext> {
  const [members, recipes, pantryAgg, templates] = await Promise.all([
    loadHouseholdMembersWithData(householdId),
    loadRecipes(householdId),
    loadPantrySummary(householdId),
    loadTemplates(householdId),
  ]);
  return {
    loggedInPersonId,
    viewingPersonId,
    household: { people: members },
    recipes,
    pantry: pantryAgg,
    templates,
  };
}

async function loadTemplates(householdId: number) {
  const rows = await prisma.dayTemplate.findMany({
    where: { householdId },
    orderBy: [{ sortIndex: "asc" }, { createdAt: "desc" }],
    include: {
      person: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    personName: t.person?.name ?? null,
    itemCount: t._count.items,
  }));
}

async function loadHouseholdMembersWithData(householdId: number): Promise<PersonContextSlice[]> {
  // Fetch all household members + their goals + their current week's plan in one round.
  const weekStart = currentWeekStartUTC();
  const members = await prisma.householdMember.findMany({
    where: { householdId, active: true },
    include: {
      person: {
        include: {
          globalNutritionGoals: { include: { nutrient: true } },
          mealPlans: {
            where: { weekStartDate: weekStart },
            include: {
              mealLogs: {
                include: {
                  recipe: { select: { name: true } },
                  ingredient: { select: { name: true } },
                },
                orderBy: { date: "asc" },
              },
            },
          },
        },
      },
    },
  });

  return members.map((m) => {
    const p = m.person;
    const goalLines = p.globalNutritionGoals
      .filter((g) => g.lowGoal !== null || g.highGoal !== null)
      .map((g) => {
        const parts: string[] = [];
        if (g.lowGoal !== null) parts.push(`≥${g.lowGoal}`);
        if (g.highGoal !== null) parts.push(`≤${g.highGoal}`);
        return `${g.nutrient.displayName}: ${parts.join(" and ")}${g.nutrient.unit}/day`;
      });

    const plan = p.mealPlans[0] ?? null;
    let currentWeek: PersonContextSlice["currentWeek"] = null;
    if (plan) {
      const byDate = new Map<string, DaySlim>();
      for (const log of plan.mealLogs) {
        const dateKey = log.date.toISOString().slice(0, 10);
        if (!byDate.has(dateKey)) byDate.set(dateKey, { date: dateKey, meals: [] });
        const name =
          log.recipe?.name ??
          log.ingredient?.name ??
          (log.externalLabel ? `Eating out — ${log.externalLabel}` : "Eating out");
        const portion = log.recipe ? log.servings : (log.quantity ?? log.servings);
        byDate.get(dateKey)!.meals.push({
          mealType: log.mealType,
          name,
          servings: portion,
        });
      }
      currentWeek = {
        planId: plan.id,
        weekStartDate: plan.weekStartDate.toISOString().slice(0, 10),
        days: Array.from(byDate.values()),
      };
    }

    return {
      id: p.id,
      name: p.name,
      goalsText: goalLines.length ? goalLines.join("; ") : "No goals set",
      currentWeek,
    };
  });
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

  const KEYS = ["calories", "fat", "satFat", "sodium", "carbs", "sugar", "addedSugar", "protein", "fiber"] as const;
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
    const per = (v: number | undefined) => (v ? Math.round(v / div) : undefined);
    return {
      id: r.id,
      name: r.name,
      tags: r.tags,
      servingSize: r.servingSize,
      cal: per(totals.calories),
      fat: per(totals.fat),
      satFat: per(totals.satFat),
      sodium: per(totals.sodium),
      carbs: per(totals.carbs),
      sugar: per(totals.sugar),
      addedSugar: per(totals.addedSugar),
      protein: per(totals.protein),
      fiber: per(totals.fiber),
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

/**
 * Cached portion of the system prompt — only data that's stable across many
 * turns sits here. The cache breakpoint is pinned right after this block, so
 * **anything that changes mid-session invalidates the cache and forces a full
 * rewrite (2x input cost at 1h TTL).**
 *
 * Included (rarely changes mid-session):
 *  - Household members: id, name, goals
 *  - For each person: plan_id + weekStartDate (so the model can call get_meal_plan_week)
 *  - Recipe library
 *  - Pantry summary
 *  - Day templates
 *
 * Excluded — see `formatVolatileContextForPrompt` below:
 *  - Each person's day-by-day meal contents (changes every time the planner is edited)
 */
export function formatStableContextForPrompt(ctx: ChatContext): string {
  const lines: string[] = [];

  lines.push(`# Household members (${ctx.household.people.length})`);
  lines.push(`Format: person_id · name · goals`);
  for (const p of ctx.household.people) {
    lines.push(`- ${p.id} · ${p.name} · ${p.goalsText}`);
  }
  lines.push("");

  lines.push(`# Current-week plan ids`);
  lines.push(`Format: person_name · plan_id · week_start. Call get_meal_plan_week(plan_id) for details.`);
  for (const p of ctx.household.people) {
    if (p.currentWeek) {
      lines.push(`- ${p.name}: plan ${p.currentWeek.planId} (starts ${p.currentWeek.weekStartDate})`);
    } else {
      lines.push(`- ${p.name}: no plan for this week`);
    }
  }
  lines.push("");

  lines.push(`# Recipe library (${ctx.recipes.length} recipes — shared across household)`);
  lines.push(`Format: id · name · tags · per-serving cal/protein/fiber/sodium/fat/satFat/carbs/sugar/addedSugar`);
  lines.push(`All 9 nutrients are here — select recipes against any goal without calling get_recipe.`);
  for (const r of ctx.recipes) {
    const macros = [
      r.cal !== undefined ? `${r.cal}cal` : null,
      r.protein !== undefined ? `${r.protein}g pro` : null,
      r.fiber !== undefined ? `${r.fiber}g fib` : null,
      r.sodium !== undefined ? `${r.sodium}mg Na` : null,
      r.fat !== undefined ? `${r.fat}g fat` : null,
      r.satFat !== undefined ? `${r.satFat}g satfat` : null,
      r.carbs !== undefined ? `${r.carbs}g carb` : null,
      r.sugar !== undefined ? `${r.sugar}g sug` : null,
      r.addedSugar !== undefined ? `${r.addedSugar}g addsug` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const tagText = r.tags ? ` · ${r.tags}` : "";
    lines.push(`- ${r.id} · ${r.name}${tagText}${macros ? ` · ${macros}` : ""}`);
  }
  lines.push("");

  lines.push(`# Pantry (${ctx.pantry.totalCount} ingredients — shared across household)`);
  const cats = Object.entries(ctx.pantry.byCategory).sort((a, b) => b[1] - a[1]);
  for (const [cat, n] of cats) lines.push(`- ${cat}: ${n}`);
  lines.push("");
  lines.push(`Call search_ingredients to look up a specific pantry item by name.`);
  lines.push(`Call get_recipe for full ingredient list + complete per-serving nutrition.`);
  lines.push(`Call get_meal_plan_week to see per-day nutrition totals + goal comparisons for any household member's plan.`);
  lines.push("");

  if (ctx.templates.length > 0) {
    lines.push(`# Day templates (${ctx.templates.length})`);
    lines.push(`Format: id · name · attributed to · meal count`);
    for (const t of ctx.templates) {
      lines.push(`- ${t.id} · ${t.name} · ${t.personName ?? "household"} · ${t.itemCount} meals`);
    }
  } else {
    lines.push(`# Day templates`);
    lines.push(`No templates saved yet.`);
  }

  return lines.join("\n");
}

/**
 * Volatile portion — every household member's current-week meal contents.
 * Kept OUT of the cached prefix because the planner is the most-edited data
 * in the app; baking it into the cache would invalidate after every meal
 * add/swap/remove and force a 2x-cost rewrite on the next chat turn.
 *
 * The cost per turn is small (a few hundred tokens of meal names) but pays
 * off in cache stability for the much larger recipe/pantry block.
 */
export function formatWeeklyPlansForPrompt(ctx: ChatContext): string {
  const lines: string[] = [];
  lines.push(`# Current week — planned meals`);
  for (const p of ctx.household.people) {
    if (!p.currentWeek) continue;
    lines.push(`## ${p.name} (plan ${p.currentWeek.planId})`);
    if (p.currentWeek.days.length === 0) {
      lines.push(`(No meals planned)`);
    } else {
      for (const d of p.currentWeek.days) {
        const meals = d.meals
          .map((m) => `${m.mealType}: ${m.name}${m.servings !== 1 ? ` ×${m.servings}` : ""}`)
          .join("; ");
        lines.push(`- ${d.date}: ${meals}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Per-turn indicator — kept OUT of the cached prefix so person switches
 * don't invalidate the cache. Tells the model who's typing (the speaker)
 * and whose profile they're viewing right now (the default subject for
 * "you"/"my"/"I" pronouns).
 */
export function formatViewIndicator(ctx: ChatContext): string {
  const speaker = ctx.household.people.find((p) => p.id === ctx.loggedInPersonId);
  const subject = ctx.household.people.find((p) => p.id === ctx.viewingPersonId);
  const speakerName = speaker?.name ?? `person ${ctx.loggedInPersonId}`;
  const subjectName = subject?.name ?? `person ${ctx.viewingPersonId}`;

  if (ctx.loggedInPersonId === ctx.viewingPersonId) {
    return `# Current view\nThe user is ${speakerName} (person_id ${ctx.loggedInPersonId}), viewing their own profile. When they say "I", "me", "my", they mean ${speakerName}.`;
  }
  return `# Current view\nThe user typing is ${speakerName} (person_id ${ctx.loggedInPersonId}). They are currently viewing ${subjectName}'s profile (person_id ${ctx.viewingPersonId}). When they say "I", "me", "my", treat ${subjectName} as the default subject — that's the profile in front of them. They are still ${speakerName} as the speaker. The user can ask about, and request changes to, any household member by name regardless of which profile is selected.`;
}

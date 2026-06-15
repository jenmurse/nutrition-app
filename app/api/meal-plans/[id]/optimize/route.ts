import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/apiUtils';
import { USDA_BASE_GRAMS } from '@/lib/constants';
import {
  optimizeDay,
  type OptCandidate,
  type OptCurrentMeal,
  type OptimizerScope,
  type GoalThresholds,
} from '@/lib/mealOptimizer';

/**
 * POST /api/meal-plans/[id]/optimize
 *
 * Body:
 *   {
 *     date: "YYYY-MM-DD",
 *     targets: number[]            // 1–3 nutrient ids, ordered (first = primary)
 *     scope?: { swap, remove, add }
 *     locks?: number[]             // mealLogIds the user pinned
 *     candidatePool?: "favorites" | "library"
 *   }
 *
 * Returns the optimizer output (baseline + up to 3 variations) enriched with
 * nutrient display metadata so the client can render without another fetch.
 *
 * Mirrors the data layer of day-analysis: one batched fetch, in-memory recipe
 * nutrition precompute (no N+1), then the pure engine in lib/mealOptimizer.ts.
 */

type Ctx = { params: Promise<{ id: string }> | { id: string } };

const AUTO_LOCK_NONE = 'no-candidates' as const;

export const POST = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
  const { id } = params instanceof Promise ? await params : params;
  const mealPlanId = parseInt(id);

  let body: {
    date?: string;
    targets?: number[];
    scope?: Partial<OptimizerScope>;
    locks?: number[];
    candidatePool?: 'favorites' | 'library';
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dateStr = body.date;
  if (!dateStr) {
    return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });
  }
  const targets = (body.targets ?? []).filter((n) => Number.isFinite(n)).slice(0, 3);
  if (targets.length === 0) {
    return NextResponse.json({ error: 'at least one target nutrient required' }, { status: 400 });
  }

  const scope: OptimizerScope = {
    swap: true, // always on
    remove: body.scope?.remove ?? true,
    add: body.scope?.add ?? false,
  };
  const lockedIds = new Set((body.locks ?? []).filter((n) => Number.isFinite(n)));
  const favoritesFirst = (body.candidatePool ?? 'favorites') === 'favorites';

  const dateStart = new Date(`${dateStr}T00:00:00Z`);
  const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

  // ── 1. Batched fetch (mirrors day-analysis) ──
  const [mealLogs, goalsData, allRecipes, favoriteRows] = await Promise.all([
    prisma.mealLog.findMany({
      where: { mealPlanId, date: { gte: dateStart, lt: dateEnd } },
      include: {
        recipe: true,
        ingredient: { include: { nutrientValues: { select: { nutrientId: true, value: true } } } },
      },
      orderBy: [{ mealType: 'asc' }, { id: 'asc' }],
    }),
    Promise.all([
      prisma.mealPlan.findUnique({
        where: { id: mealPlanId },
        include: { nutritionGoals: { select: { nutrientId: true, lowGoal: true, highGoal: true } } },
      }),
      prisma.globalNutritionGoal.findMany(),
      prisma.nutrient.findMany({ orderBy: { orderIndex: 'asc' } }),
    ]),
    prisma.recipe.findMany({
      where: { householdId: auth.householdId, isComplete: true },
      select: {
        id: true,
        name: true,
        servingSize: true,
        tags: true,
        ingredients: {
          select: {
            conversionGrams: true,
            ingredient: { select: { nutrientValues: { select: { nutrientId: true, value: true } } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.recipeFavorite.findMany({
      where: { personId: auth.personId ?? -1 },
      select: { recipeId: true },
    }),
  ]);

  const [mealPlan, allGlobalGoals, allNutrients] = goalsData;
  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }

  // ── 2. Goals map (plan → global cascade, person-scoped) ──
  const globalGoals = allGlobalGoals.filter((g) => g.personId === (mealPlan.personId ?? null));
  const globalGoalsMap = new Map(globalGoals.map((g) => [g.nutrientId, g]));
  const planGoalsMap = new Map(mealPlan.nutritionGoals.map((g) => [g.nutrientId, g]));
  const goals: Record<number, GoalThresholds> = {};
  for (const n of allNutrients) {
    const planGoal = planGoalsMap.get(n.id);
    const globalGoal = globalGoalsMap.get(n.id);
    const lowGoal = planGoal?.lowGoal ?? globalGoal?.lowGoal ?? undefined;
    const highGoal = planGoal?.highGoal ?? globalGoal?.highGoal ?? undefined;
    if (lowGoal !== undefined || highGoal !== undefined) {
      goals[n.id] = { lowGoal: lowGoal ?? undefined, highGoal: highGoal ?? undefined };
    }
  }

  // ── 3. Precompute per-recipe nutrition (per serving). null = missing data. ──
  // A recipe's nutrient is null if NONE of its ingredients report that nutrient
  // (null-poisoning happens at the day level; here we only know per-recipe data).
  const favoriteSet = new Set(favoriteRows.map((f) => f.recipeId));
  const recipeNutrition = new Map<number, { perServing: Record<number, number | null>; tags: string[] }>();

  for (const recipe of allRecipes) {
    const total: Record<number, number> = {};
    const seen: Record<number, boolean> = {};
    for (const ri of recipe.ingredients) {
      const grams = ri.conversionGrams || 0;
      for (const nv of ri.ingredient.nutrientValues) {
        total[nv.nutrientId] = (total[nv.nutrientId] || 0) + (nv.value / USDA_BASE_GRAMS) * grams;
        seen[nv.nutrientId] = true;
      }
    }
    const servSize = recipe.servingSize || 1;
    const perServing: Record<number, number | null> = {};
    for (const n of allNutrients) {
      perServing[n.id] = seen[n.id] ? Math.round((total[n.id] / servSize) * 10) / 10 : null;
    }
    const tags = recipe.tags ? recipe.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    recipeNutrition.set(recipe.id, { perServing, tags });
  }

  // ── 4. Build candidate pool by lane (meal-type) ──
  // A candidate is eligible for a lane if its tags include that meal type, or it
  // is tagless (universal) — matching day-analysis's permissive matching for a
  // small household library. Favorites-first ordering; library expands the pool.
  const LANES = ['breakfast', 'lunch', 'dinner', 'snack', 'side', 'dessert', 'beverage'];
  const FAV_FALLBACK_THRESHOLD = 3; // expand to whole library if a lane has fewer favorites
  const candidatesByLane: Record<string, OptCandidate[]> = {};
  for (const lane of LANES) {
    const all: OptCandidate[] = [];
    for (const recipe of allRecipes) {
      const nutrition = recipeNutrition.get(recipe.id)!;
      const matches = nutrition.tags.length === 0 || nutrition.tags.includes(lane);
      if (!matches) continue;
      all.push({
        recipeId: recipe.id,
        name: recipe.name,
        mealType: lane,
        isFavorite: favoriteSet.has(recipe.id),
        nutrients: nutrition.perServing,
      });
    }
    // Favorites-first: restrict to favorites unless a lane has too few, then
    // fall back to the whole library for that lane. Library mode uses everything.
    let list = all;
    if (favoritesFirst) {
      const favs = all.filter((c) => c.isFavorite);
      list = favs.length >= FAV_FALLBACK_THRESHOLD ? favs : all;
      list.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
    }
    candidatesByLane[lane] = list;
  }

  // ── 5. Build current-day meals for the engine ──
  const meals: OptCurrentMeal[] = mealLogs.map((meal) => {
    const m = meal as typeof meal & {
      recipe: { name: string; servingSize: number } | null;
      ingredient: { name: string; nutrientValues: { nutrientId: number; value: number }[] } | null;
    };

    // Contribution as currently served.
    const nutrients: Record<number, number | null> = {};
    let lockReason: OptCurrentMeal['lockReason'] | undefined;

    if (m.recipeId && m.recipe) {
      const rn = recipeNutrition.get(m.recipeId);
      const servings = Number(m.servings ?? 1);
      if (rn) {
        for (const n of allNutrients) {
          const ps = rn.perServing[n.id];
          nutrients[n.id] = ps == null ? null : Math.round(ps * servings * 10) / 10;
        }
      }
    } else if (m.ingredientId && m.ingredient && m.quantity != null && m.unit) {
      lockReason = 'ingredient';
      const grams = m.quantity;
      const seen = new Set(m.ingredient.nutrientValues.map((nv) => nv.nutrientId));
      for (const nv of m.ingredient.nutrientValues) {
        nutrients[nv.nutrientId] = Math.round((nv.value / USDA_BASE_GRAMS) * grams * 10) / 10;
      }
      for (const n of allNutrients) if (!seen.has(n.id)) nutrients[n.id] = nutrients[n.id] ?? null;
    } else {
      // eating-out / empty: no nutrition.
      lockReason = 'external';
      for (const n of allNutrients) nutrients[n.id] = 0;
    }

    const userLocked = lockedIds.has(meal.id);
    const isRecipe = m.recipeId != null && m.recipe != null;
    // Auto-lock: non-recipe meals, or recipe meals with no same-type swap candidates.
    const laneHasCandidates = isRecipe
      ? (candidatesByLane[meal.mealType] ?? []).some((c) => c.recipeId !== m.recipeId)
      : false;
    if (isRecipe && !laneHasCandidates && !userLocked) lockReason = AUTO_LOCK_NONE;

    const locked = userLocked || !isRecipe || (isRecipe && !laneHasCandidates);

    return {
      mealLogId: meal.id,
      mealType: meal.mealType,
      recipeId: m.recipeId ?? null,
      name: m.recipe?.name ?? m.ingredient?.name ?? m.externalLabel ?? 'Eating out',
      nutrients,
      locked,
      lockReason: userLocked ? 'user' : lockReason,
    };
  });

  // ── 6. Run the engine ──
  const result = optimizeDay({ targets, goals, meals, candidatesByLane, scope });

  // ── 7. Enrich with nutrient metadata for the client ──
  const nutrientMeta: Record<number, { name: string; displayName: string; unit: string; lowGoal: number | null; highGoal: number | null }> = {};
  for (const n of allNutrients) {
    nutrientMeta[n.id] = {
      name: n.name,
      displayName: n.displayName,
      unit: n.unit,
      lowGoal: goals[n.id]?.lowGoal ?? null,
      highGoal: goals[n.id]?.highGoal ?? null,
    };
  }

  return NextResponse.json({
    date: dateStr,
    targets,
    scope,
    nutrientMeta,
    ...result,
  });
}, 'Failed to optimize day');

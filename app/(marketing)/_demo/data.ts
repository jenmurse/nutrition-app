// ─────────────────────────────────────────────────────────────────────────
// Landing-page demo fixture — SINGLE SOURCE OF TRUTH.
//
// Every scenario visual on the marketing page derives from this file, so the
// story stays internally consistent: one household, one shared recipe library,
// one week, one off-target day. Edit a number here and it flows through the
// day column, the optimizer's real output, and every total automatically.
//
// Nutrient ids mirror the production seed (prisma/seed.ts), keyed by orderIndex
// + 1: calories=1, fat=2, satFat=3, sodium=4, carbs=5, sugar=6, addedSugar=7,
// protein=8, fiber=9. We only populate the ones the demo displays/optimizes.
// ─────────────────────────────────────────────────────────────────────────

import type {
  NutrientVector,
  OptCandidate,
  OptCurrentMeal,
} from "@/lib/mealOptimizer";

export type NutrientMeta = {
  id: number;
  name: string;
  displayName: string;
  unit: string;
  lowGoal: number | null;
  highGoal: number | null;
};

// Nutrient ids used across the demo.
export const N = { calories: 1, sodium: 4, protein: 8, fiber: 9 } as const;

// The person whose day we optimize. Goals define the green/red semantics:
//   band  = lowGoal + highGoal   (land between)
//   cap   = highGoal only        (stay under)
//   min   = lowGoal only         (reach at least)
export const PERSON = { name: "Jen" };

export const NUTRIENTS: NutrientMeta[] = [
  { id: N.calories, name: "calories", displayName: "Calories", unit: "kcal", lowGoal: 1300, highGoal: 2100 },
  { id: N.protein,  name: "protein",  displayName: "Protein",  unit: "g",    lowGoal: 100,  highGoal: null },
  { id: N.sodium,   name: "sodium",   displayName: "Sodium",   unit: "mg",   lowGoal: null, highGoal: 2300 },
  { id: N.fiber,    name: "fiber",    displayName: "Fiber",    unit: "g",    lowGoal: 18,   highGoal: null },
];

// Convenience lookups.
export const NUTRIENT_BY_ID: Record<number, NutrientMeta> = Object.fromEntries(
  NUTRIENTS.map((n) => [n.id, n])
);
export const GOALS: Record<number, { lowGoal?: number; highGoal?: number }> = Object.fromEntries(
  NUTRIENTS.map((n) => [
    n.id,
    { lowGoal: n.lowGoal ?? undefined, highGoal: n.highGoal ?? undefined },
  ])
);

// ── Shared recipe library ────────────────────────────────────────────────
// Per-serving nutrition. mealType is the optimizer "lane". favorite drives the
// favorites-first candidate ordering the real optimizer uses.
export type DemoRecipe = {
  id: number;
  name: string;
  mealType: string;
  favorite: boolean;
  nutrients: NutrientVector;
};

const v = (calories: number, sodium: number, protein: number, fiber: number): NutrientVector => ({
  [N.calories]: calories,
  [N.sodium]: sodium,
  [N.protein]: protein,
  [N.fiber]: fiber,
});

export const RECIPES: DemoRecipe[] = [
  // Breakfast
  { id: 1, name: "Turmeric waffles",              mealType: "breakfast", favorite: false, nutrients: v(380, 520, 9, 4) },
  { id: 2, name: "Greek yogurt & berries",        mealType: "breakfast", favorite: true,  nutrients: v(280, 90, 22, 5) },
  { id: 3, name: "Overnight oats, peanut butter", mealType: "breakfast", favorite: true,  nutrients: v(410, 95, 16, 8) },
  // Lunch
  { id: 4, name: "Tuna salad",                    mealType: "lunch",     favorite: false, nutrients: v(430, 950, 30, 6) },
  { id: 5, name: "Chicken quinoa bowl",           mealType: "lunch",     favorite: true,  nutrients: v(520, 540, 42, 9) },
  { id: 6, name: "Lentil grain bowl",             mealType: "lunch",     favorite: true,  nutrients: v(480, 310, 22, 14) },
  // Dinner
  { id: 7, name: "Black bean & lentil chili",     mealType: "dinner",    favorite: false, nutrients: v(560, 1180, 24, 18) },
  { id: 8, name: "Sheet-pan salmon & greens",     mealType: "dinner",    favorite: true,  nutrients: v(540, 430, 44, 7) },
  { id: 9, name: "One-pan fish & chickpeas",      mealType: "dinner",    favorite: true,  nutrients: v(510, 480, 40, 10) },
  // Side
  { id: 10, name: "Sesame miso lentils",          mealType: "side",      favorite: true,  nutrients: v(180, 260, 11, 7) },
  { id: 11, name: "Roasted broccoli",             mealType: "side",      favorite: false, nutrients: v(90, 120, 4, 5) },
  // Snack
  { id: 12, name: "Cottage cheese & berries",     mealType: "snack",     favorite: true,  nutrients: v(160, 320, 18, 3) },
  { id: 13, name: "Apple & almond butter",        mealType: "snack",     favorite: true,  nutrients: v(210, 5, 6, 6) },
  { id: 14, name: "Black bean avocado brownies",  mealType: "snack",     favorite: false, nutrients: v(160, 90, 6, 5) },
  // Dessert
  { id: 15, name: "Tahini chocolate chip cookies", mealType: "dessert",  favorite: false, nutrients: v(180, 60, 4, 2) },
  { id: 16, name: "Chickpea chocolate chip blondies", mealType: "dessert", favorite: true, nutrients: v(170, 80, 8, 4) },
  { id: 17, name: "Greek yogurt bark",            mealType: "dessert",   favorite: true,  nutrients: v(140, 55, 12, 1) },
];

export const RECIPE_BY_ID: Record<number, DemoRecipe> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r])
);

// ── The off-target day (Tuesday) ─────────────────────────────────────────
// Protein short, sodium over — the day Scenario 02 fixes.
export const DAY_LABEL = "Tue, Mar 18";

const dayRecipeIds = [1, 4, 7, 14, 15]; // waffles · tuna salad · chili · brownies · cookies
export const DAY_MEALS: OptCurrentMeal[] = dayRecipeIds.map((rid, i) => {
  const r = RECIPE_BY_ID[rid];
  return {
    mealLogId: 101 + i,
    mealType: r.mealType,
    recipeId: r.id,
    name: r.name,
    nutrients: r.nutrients,
    locked: false,
  };
});

// What we optimize for: protein up, sodium down.
export const TARGETS: number[] = [N.protein, N.sodium];

// Candidate pool grouped by lane, favorites-first (mirrors the real optimizer).
export const CANDIDATES_BY_LANE: Record<string, OptCandidate[]> = (() => {
  const byLane: Record<string, OptCandidate[]> = {};
  for (const r of RECIPES) {
    (byLane[r.mealType] ??= []).push({
      recipeId: r.id,
      name: r.name,
      mealType: r.mealType,
      isFavorite: r.favorite,
      nutrients: r.nutrients,
    });
  }
  for (const lane of Object.keys(byLane)) {
    byLane[lane].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }
  return byLane;
})();

// ── Helpers shared by the screens ────────────────────────────────────────
export function sumDay(recipeIds: number[]): NutrientVector {
  const total: NutrientVector = {};
  for (const id of [N.calories, N.protein, N.sodium, N.fiber]) total[id] = 0;
  for (const rid of recipeIds) {
    const r = RECIPE_BY_ID[rid];
    if (!r) continue;
    for (const id of [N.calories, N.protein, N.sodium, N.fiber]) {
      total[id] = (total[id] ?? 0) + (r.nutrients[id] ?? 0);
    }
  }
  return total;
}

/** Goal check matching the planner / optimizer semantics. */
export function meetsGoal(value: number | null, meta: NutrientMeta | undefined): boolean {
  if (value == null || !meta) return false;
  if (meta.lowGoal != null && value < meta.lowGoal) return false;
  if (meta.highGoal != null && value > meta.highGoal) return false;
  return true;
}

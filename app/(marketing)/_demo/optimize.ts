// ─────────────────────────────────────────────────────────────────────────
// Runs the REAL optimizer engine (lib/mealOptimizer) on the demo day.
//
// optimizeDay() is pure and deterministic, so this executes at module load and
// the three variations shown on the landing page are genuine engine output —
// not hand-drawn. Change the fixture in data.ts and the cards re-derive.
// ─────────────────────────────────────────────────────────────────────────

import { optimizeDay, type OptimizeVariation } from "@/lib/mealOptimizer";
import {
  CANDIDATES_BY_LANE,
  DAY_MEALS,
  GOALS,
  N,
  NUTRIENT_BY_ID,
  RECIPE_BY_ID,
  TARGETS,
  meetsGoal,
  sumDay,
} from "./data";

export const DEMO_RESULT = optimizeDay({
  targets: TARGETS,
  goals: GOALS,
  meals: DAY_MEALS,
  candidatesByLane: CANDIDATES_BY_LANE,
  scope: { swap: true, remove: false, add: false },
});

// Variation labels mirror DayOptimizer's VARIATION_LABEL map.
const primaryName = NUTRIENT_BY_ID[TARGETS[0]]?.displayName.toLowerCase() ?? "";
export function variationLabel(v: OptimizeVariation): string {
  if (v.key === "primary") return `Best for ${primaryName}`;
  if (v.key === "closest") return "Closest to today";
  return "Best balance";
}

export function changeSummary(v: OptimizeVariation): string {
  return (
    [
      v.swaps ? `${v.swaps} swap${v.swaps > 1 ? "s" : ""}` : "",
      v.removes ? `${v.removes} removed` : "",
      v.adds ? `${v.adds} added` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "No changes"
  );
}

const ARROW: Record<"cap" | "min" | "band", string> = { cap: "↓", min: "↑", band: "↕" };
function direction(id: number): "cap" | "min" | "band" {
  const g = GOALS[id];
  if (g?.lowGoal != null && g?.highGoal != null) return "band";
  if (g?.highGoal != null) return "cap";
  return "min";
}

// "Optimizing for" chips: Protein ↑ · Sodium ↓
export const OPTIMIZING_FOR = TARGETS.map(
  (id) => `${NUTRIENT_BY_ID[id]?.displayName} ${ARROW[direction(id)]}`
);

// ── Day-column metrics (states A & D) ────────────────────────────────────
const DISPLAY_IDS = [N.calories, N.protein, N.sodium, N.fiber];

export type DayMetric = {
  id: number;
  displayName: string;
  unit: string;
  value: number;
  ok: boolean;
};

function metricsFor(totals: Record<number, number | null>): DayMetric[] {
  return DISPLAY_IDS.map((id) => {
    const meta = NUTRIENT_BY_ID[id];
    const value = Math.round(totals[id] ?? 0);
    return { id, displayName: meta.displayName, unit: meta.unit, value, ok: meetsGoal(value, meta) };
  });
}

// A muted per-meal subline, e.g. "380 kcal · 9g protein".
function mealMeta(n: Record<number, number | null>): string {
  return `${Math.round(n[N.calories] ?? 0)} kcal · ${Math.round(n[N.protein] ?? 0)}g protein`;
}

// Baseline day (state A).
export const BASELINE_MEALS = DAY_MEALS.map((m) => ({
  mealType: m.mealType,
  name: m.name,
  meta: mealMeta(m.nutrients),
}));
export const BASELINE_METRICS = metricsFor(
  sumDay(DAY_MEALS.map((m) => m.recipeId!).filter((x) => x != null))
);

// Applied day (state D) — the first variation ("Best balance") realized.
const applied = DEMO_RESULT.variations[0];
const appliedRecipeIds = applied
  ? applied.meals.filter((m) => m.recipeId != null && m.state !== "removed").map((m) => m.recipeId!)
  : [];
export const APPLIED_MEALS = applied
  ? applied.meals
      .filter((m) => m.state !== "removed")
      .map((m) => {
        const r = m.recipeId != null ? RECIPE_BY_ID[m.recipeId] : null;
        return { mealType: m.mealType, name: m.name, meta: r ? mealMeta(r.nutrients) : "" };
      })
  : BASELINE_MEALS;
export const APPLIED_METRICS = metricsFor(sumDay(appliedRecipeIds));

// ── Full daily totals (all tracked nutrients) for the day view ───────────
// The app shows every nutrient in a day's totals, not just the optimized ones.
// The four with goals come from the engine (colored by status); the rest are
// static display values shown neutral (no goal to hit/miss).
export type FullMetric = {
  name: string;
  unit: string;
  value: number;
  status: "ok" | "off" | "neutral";
};

function byName(ms: DayMetric[]): Record<string, DayMetric> {
  return Object.fromEntries(ms.map((m) => [m.displayName, m]));
}

// Static display-only nutrients (off-target day, applied day). Plausible values
// in the app's units; rendered neutral since they aren't the day's goals here.
const EXTRAS_OFF = {
  Fat: 78,
  "Saturated Fat": 15,
  Carbs: 158,
  Sugar: 36,
  "Added Sugar": 17,
};
const EXTRAS_APPLIED = {
  Fat: 70,
  "Saturated Fat": 13,
  Carbs: 138,
  Sugar: 29,
  "Added Sugar": 11,
};

function fullDay(four: DayMetric[], extras: Record<string, number>): FullMetric[] {
  const b = byName(four);
  const goal = (n: string): FullMetric => {
    const m = b[n];
    return { name: n, unit: m.unit, value: m.value, status: m.ok ? "ok" : "off" };
  };
  const ext = (n: string): FullMetric => ({ name: n, unit: "g", value: extras[n], status: "neutral" });
  // App order: Calories, Fat, Sat Fat, Sodium, Carbs, Sugar, Added Sugar, Protein, Fiber
  return [
    goal("Calories"),
    ext("Fat"),
    ext("Saturated Fat"),
    goal("Sodium"),
    ext("Carbs"),
    ext("Sugar"),
    ext("Added Sugar"),
    goal("Protein"),
    goal("Fiber"),
  ];
}

export const FULL_BASELINE_METRICS = fullDay(BASELINE_METRICS, EXTRAS_OFF);
export const FULL_APPLIED_METRICS = fullDay(APPLIED_METRICS, EXTRAS_APPLIED);

// Nutrient meta map for the results screen (display name + unit + goals).
export const NUTRIENT_META = NUTRIENT_BY_ID;
export { meetsGoal, RECIPE_BY_ID };

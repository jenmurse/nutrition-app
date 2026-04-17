/**
 * Smart meal analysis utilities.
 *
 * All functions in this file are pure (no DB/API calls) so they can run
 * client-side. Each function is designed with a clear input/output contract
 * so the implementation can later be swapped for an LLM call while the
 * calling code stays the same.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface NutrientSnapshot {
  nutrientId: number;
  displayName: string;
  unit: string;
  value: number;
  lowGoal?: number;
  highGoal?: number;
  status?: 'ok' | 'warning' | 'error';
}

/** A single meal/ingredient entry within a day, with its per-nutrient values. */
export interface MealContribution {
  mealLogId: number;
  name: string;
  mealType: string;
  /** Map of nutrientId → contributed value */
  nutrients: Record<number, number>;
}

/** A possible swap alternative for a recipe or ingredient. */
export interface SwapCandidate {
  type: 'recipe' | 'ingredient';
  id: number;
  name: string;
  /** How much of the problem nutrient the swap saves (positive = less of it). */
  savingAmount: number;
  /** Approximate calorie difference vs current item (negative = fewer calories). */
  calorieDiff: number;
}

// ---------------------------------------------------------------------------
// 1. Over-budget alerts
// ---------------------------------------------------------------------------

export interface OverBudgetAlert {
  nutrientId: number;
  displayName: string;
  unit: string;
  current: number;
  highGoal: number;
  overBy: number;
  /** How far over as a % of the goal (e.g. 20 = 20% over). */
  overByPct: number;
}

/**
 * Return nutrients that are above their high goal, sorted worst-first.
 */
export function getOverBudgetAlerts(nutrients: NutrientSnapshot[]): OverBudgetAlert[] {
  return nutrients
    .filter((n) => n.status === 'error' && n.highGoal != null)
    .map((n) => {
      const overBy = n.value - n.highGoal!;
      return {
        nutrientId: n.nutrientId,
        displayName: n.displayName,
        unit: n.unit,
        current: n.value,
        highGoal: n.highGoal!,
        overBy,
        overByPct: Math.round((overBy / n.highGoal!) * 100),
      };
    })
    .sort((a, b) => b.overByPct - a.overByPct);
}

// ---------------------------------------------------------------------------
// 2. Top contributors for a given nutrient
// ---------------------------------------------------------------------------

export interface ContributorResult {
  mealLogId: number;
  name: string;
  mealType: string;
  amount: number;
  /** Share of that nutrient's daily total (0–100). */
  pct: number;
}

/**
 * Given a list of meal contributions and a nutrient ID, return meals sorted
 * by how much they contribute to that nutrient.
 */
export function getTopContributors(
  meals: MealContribution[],
  nutrientId: number
): ContributorResult[] {
  const dayTotal = meals.reduce((sum, m) => sum + (m.nutrients[nutrientId] ?? 0), 0);
  if (dayTotal === 0) return [];

  return meals
    .map((m) => {
      const amount = m.nutrients[nutrientId] ?? 0;
      return {
        mealLogId: m.mealLogId,
        name: m.name,
        mealType: m.mealType,
        amount,
        pct: Math.round((amount / dayTotal) * 100),
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .filter((c) => c.amount > 0);
}

// ---------------------------------------------------------------------------
// 3. Weekly calorie summary + weight projection
// ---------------------------------------------------------------------------

/** Calorie nutrient is USDA nutrient 1008 (Energy). We look it up by name. */
const CALORIE_NUTRIENT_NAMES = ['Energy', 'Calories', 'energy', 'calories'];

function findCalorieNutrient(nutrients: NutrientSnapshot[]): NutrientSnapshot | undefined {
  return nutrients.find((n) =>
    CALORIE_NUTRIENT_NAMES.some((name) =>
      n.displayName.toLowerCase().includes(name.toLowerCase())
    )
  );
}

export interface DailyCalorieEntry {
  date: Date;
  dayOfWeek: string;
  totalNutrients: NutrientSnapshot[];
}

export interface WeeklyCalorieSummary {
  /** Sum of calories across all 7 days. */
  totalCalories: number;
  /** Daily calorie goal (highGoal of the calorie nutrient), or null if unset. */
  dailyGoalCalories: number | null;
  /** weeklyGoal = dailyGoal × 7, or null. */
  weeklyGoalCalories: number | null;
  /** Deficit = weeklyGoal – totalCalories.  Positive → under budget.
   *  Negative → over budget. */
  weeklyDeficit: number | null;
  /** Number of days that have at least one meal logged. */
  daysWithMeals: number;
  /** Per-day calorie breakdown. */
  dailyCalories: { dayOfWeek: string; date: Date; calories: number; goal: number | null }[];
}

/**
 * Compute a weekly calorie summary from the existing `dailyNutritions` data.
 * Pure function — no API calls needed.
 */
export function getWeeklyCalorieSummary(days: DailyCalorieEntry[]): WeeklyCalorieSummary {
  let totalCalories = 0;
  let dailyGoalCalories: number | null = null;
  let daysWithMeals = 0;

  const dailyCalories = days.map((day) => {
    const calNutrient = findCalorieNutrient(day.totalNutrients);
    const cals = calNutrient?.value ?? 0;
    if (cals > 0) daysWithMeals++;
    totalCalories += cals;

    // Grab the goal from the first day that has one set
    if (dailyGoalCalories === null && calNutrient?.highGoal != null) {
      dailyGoalCalories = calNutrient.highGoal;
    }

    return {
      dayOfWeek: day.dayOfWeek,
      date: day.date,
      calories: Math.round(cals),
      goal: calNutrient?.highGoal ?? null,
    };
  });

  const weeklyGoalCalories = dailyGoalCalories != null ? dailyGoalCalories * 7 : null;
  const weeklyDeficit =
    weeklyGoalCalories != null ? weeklyGoalCalories - Math.round(totalCalories) : null;

  return {
    totalCalories: Math.round(totalCalories),
    dailyGoalCalories,
    weeklyGoalCalories,
    weeklyDeficit,
    daysWithMeals,
    dailyCalories,
  };
}

// ---------------------------------------------------------------------------
// 4. Fill-the-gap scoring
// ---------------------------------------------------------------------------

export interface FillGapCandidate {
  type: 'recipe' | 'ingredient';
  id: number;
  name: string;
  /** Estimated calories this item adds (at 1 serving). */
  calories: number;
  /** Score 0–100; higher is a better fit for the remaining calorie/macro gap. */
  score: number;
  /** Human-readable reason, e.g. "Fills ~80% of your remaining calories". */
  reason: string;
}

export interface RemainingBudget {
  calories: number | null;
  protein: number | null;
}

/**
 * Score a list of candidate items against the remaining daily budget.
 * `candidates` should each have `{ id, name, type, nutrients: { [nutrientId]: value } }`.
 *
 * This is purely algorithmic — returns items sorted by how well they
 * fill the gap without putting you over.
 *
 * To swap for an LLM: pass these candidates + remaining budget to the model
 * and ask it to rank them with natural-language explanations.
 */
export function scoreFillGapCandidates(
  candidates: Array<{
    id: number;
    name: string;
    type: 'recipe' | 'ingredient';
    nutrients: Record<number, number>;
  }>,
  remaining: RemainingBudget,
  calorieNutrientId: number
): FillGapCandidate[] {
  if (remaining.calories == null || remaining.calories <= 0) return [];

  return candidates
    .map((c) => {
      const itemCals = c.nutrients[calorieNutrientId] ?? 0;
      if (itemCals <= 0) return null;

      // How close does this item's calories get to the gap?
      const fillRatio = itemCals / remaining.calories!;
      // Ideal fill is 0.7–1.0 of the gap; penalise going over or being too small
      let score: number;
      if (fillRatio > 1.0) {
        // Would put you over budget
        score = Math.max(0, 40 - (fillRatio - 1) * 100);
      } else if (fillRatio >= 0.5) {
        score = 60 + fillRatio * 40; // 80–100
      } else {
        score = fillRatio * 120; // 0–60 for < 50% fill
      }

      score = Math.round(Math.min(100, score));

      const pct = Math.round(fillRatio * 100);
      const reason =
        fillRatio > 1
          ? `Would slightly exceed your remaining ${Math.round(remaining.calories!)} kcal`
          : `Fills ~${pct}% of your remaining ${Math.round(remaining.calories!)} kcal`;

      return {
        type: c.type,
        id: c.id,
        name: c.name,
        calories: Math.round(itemCals),
        score,
        reason,
      } satisfies FillGapCandidate;
    })
    .filter((c): c is FillGapCandidate => c !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

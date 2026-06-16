// A week of planner data for the Off-target / Applied beats, so those beats can
// show the REAL planner grid (how a day actually looks) instead of a fabricated
// day view. The target day (Tue) uses the genuine off/applied data + engine
// totals; the rest is a plausible week of filler.

import {
  APPLIED_MEALS,
  BASELINE_MEALS,
  FULL_APPLIED_METRICS,
  FULL_BASELINE_METRICS,
  type FullMetric,
} from "./optimize";

export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"] as const;

export type PlannerDay = {
  dow: string;
  date: number;
  target?: boolean;
  meals: (string | null)[]; // parallel to MEAL_TYPES; null = empty slot
  totals: FullMetric[];
};

const NAMES = ["Calories", "Fat", "Saturated Fat", "Sodium", "Carbs", "Sugar", "Added Sugar", "Protein", "Fiber"];
const UNITS = ["kcal", "g", "g", "mg", "g", "g", "g", "g", "g"];
const GOAL = new Set(["Calories", "Sodium", "Protein", "Fiber"]);

// Build a day's totals. Goal nutrients render green (or red if listed in `off`);
// the rest render neutral, matching how the app colors only goal'd nutrients.
function totals(v: number[], off: string[] = []): FullMetric[] {
  return NAMES.map((n, i) => ({
    name: n,
    unit: UNITS[i],
    value: v[i],
    status: GOAL.has(n) ? (off.includes(n) ? "off" : "ok") : "neutral",
  }));
}

// Arrange a day's meals into the MEAL_TYPES row order (null = empty slot).
function mealsByType(meals: { mealType: string; name: string }[]): (string | null)[] {
  return MEAL_TYPES.map(
    (mt) => meals.find((m) => m.mealType.toLowerCase() === mt.toLowerCase())?.name ?? null
  );
}

export function week(mode: "off" | "applied"): PlannerDay[] {
  const targetMeals = mealsByType(mode === "off" ? BASELINE_MEALS : APPLIED_MEALS);

  return [
    {
      dow: "Sun", date: 16,
      meals: ["Weekend eggs & avocado", "Lunch salad w/ salmon", null, "Apple & almond butter", "Creami — chocolate cherry almond"],
      totals: totals([1490, 68, 14, 1620, 118, 24, 5, 96, 26]),
    },
    {
      dow: "Mon", date: 17,
      meals: ["Overnight oats, peanut butter", "Lunch salad w/ salmon", "Roasted tahini cauliflower & lentils", "Black bean avocado brownies", "Tahini chocolate chip cookies"],
      totals: totals([1610, 73, 15, 1880, 126, 30, 2, 118, 35]),
    },
    {
      dow: "Tue", date: 18, target: true,
      meals: targetMeals,
      totals: mode === "off" ? FULL_BASELINE_METRICS : FULL_APPLIED_METRICS,
    },
    {
      dow: "Wed", date: 19,
      meals: ["Overnight oats, peanut butter", "Lentil grain bowl", "Noodle bowl w/ shrimp", "Apple & almond butter", "Tahini chocolate chip cookies"],
      totals: totals([1560, 72, 13, 1770, 113, 26, 2, 120, 30]),
    },
    {
      dow: "Thu", date: 20,
      meals: ["Greek yogurt & berries", "Lunch salad w/ salmon", "Roasted tahini cauliflower & lentils", "Black bean avocado brownies", "Tahini chocolate chip cookies"],
      totals: totals([1500, 71, 12, 1760, 104, 25, 2, 113, 33]),
    },
    {
      dow: "Fri", date: 21,
      meals: ["Overnight oats, peanut butter", "Chicken quinoa bowl", "One-pan fish & chickpeas", null, "Tahini chocolate chip cookies"],
      totals: totals([1600, 72, 12, 1780, 104, 26, 2, 131, 31]),
    },
    {
      dow: "Sat", date: 22,
      meals: ["Morning shake", null, null, null, "Creami — chocolate cherry almond"],
      totals: totals([720, 18, 5, 420, 62, 18, 4, 38, 9], ["Calories", "Protein"]),
    },
  ];
}

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

const TEMPLATE_MEALS: (string | null)[] = [
  "Weekend eggs & avocado",
  "Lunch salad w/ salmon",
  "Sesame Miso Cannellini Beans",
  "Apple & almond butter",
  "Lemon bars",
];

function neutral(): FullMetric[] {
  return NAMES.map((n, i) => ({ name: n, unit: UNITS[i], value: 0, status: "neutral" as const }));
}

export function week03(mode: "clean" | "empty" | "applied"): PlannerDay[] {
  if (mode === "clean") {
    return [
      { dow: "Sun", date: 16, target: true, meals: TEMPLATE_MEALS, totals: totals([1840, 72, 14, 1480, 122, 26, 4, 118, 32]) },
      { dow: "Mon", date: 17, meals: ["Overnight oats, peanut butter", "Lunch salad w/ salmon", "Roasted tahini cauliflower & lentils", "Black bean avocado brownies", "Tahini chocolate chip cookies"], totals: totals([1610, 73, 15, 1880, 126, 30, 2, 118, 35]) },
      { dow: "Tue", date: 18, meals: ["Greek yogurt & berries", "Chicken quinoa bowl", "One-pan fish & chickpeas", null, "Tahini chocolate chip cookies"], totals: totals([1500, 65, 11, 1620, 108, 22, 2, 114, 29]) },
      { dow: "Wed", date: 19, meals: ["Overnight oats, peanut butter", "Lentil grain bowl", "Noodle bowl w/ shrimp", "Apple & almond butter", "Tahini chocolate chip cookies"], totals: totals([1560, 72, 13, 1770, 113, 26, 2, 120, 30]) },
      { dow: "Thu", date: 20, meals: ["Greek yogurt & berries", "Lunch salad w/ salmon", "Roasted tahini cauliflower & lentils", "Black bean avocado brownies", null], totals: totals([1500, 71, 12, 1760, 104, 25, 2, 113, 33]) },
      { dow: "Fri", date: 21, meals: ["Overnight oats, peanut butter", "Chicken quinoa bowl", "One-pan fish & chickpeas", null, "Tahini chocolate chip cookies"], totals: totals([1600, 72, 12, 1780, 104, 26, 2, 131, 31]) },
      { dow: "Sat", date: 22, meals: ["Morning shake", "Poke bowl", "Eating out", null, "Lemon bars"], totals: totals([720, 18, 5, 420, 62, 18, 4, 38, 9], ["Calories", "Protein"]) },
    ];
  }

  const base: PlannerDay[] = [
    { dow: "Sun", date: 23, meals: ["Morning shake", null, null, null, null], totals: totals([380, 8, 2, 210, 42, 12, 2, 22, 5], ["Calories", "Protein", "Fiber"]) },
    { dow: "Mon", date: 24, meals: ["Overnight oats, peanut butter", null, "Roasted tahini cauliflower & lentils", null, null], totals: totals([820, 38, 8, 960, 74, 14, 1, 62, 18], ["Calories", "Protein", "Fiber"]) },
    { dow: "Tue", date: 25, meals: [null, null, null, null, null], totals: neutral() },
    { dow: "Wed", date: 26, target: true, meals: [null, null, null, null, null], totals: neutral() },
    { dow: "Thu", date: 27, meals: [null, null, null, null, null], totals: neutral() },
    { dow: "Fri", date: 28, meals: ["Greek yogurt & berries", null, null, null, null], totals: totals([240, 4, 1, 180, 32, 14, 0, 18, 4], ["Calories", "Protein", "Fiber"]) },
    { dow: "Sat", date: 29, meals: [null, null, null, null, null], totals: neutral() },
  ];

  if (mode === "empty") return base;

  return base.map((d) =>
    d.target ? { ...d, meals: TEMPLATE_MEALS, totals: totals([1840, 72, 14, 1480, 122, 26, 4, 118, 32]) } : d
  );
}

export function week(mode: "off" | "applied"): PlannerDay[] {
  const targetMeals = mealsByType(mode === "off" ? BASELINE_MEALS : APPLIED_MEALS);

  return [
    {
      dow: "Sun", date: 16,
      meals: ["Weekend eggs & avocado", "Lunch salad w/ salmon", "Sesame Miso Cannellini Beans", "Apple & almond butter", "Lemon bars"],
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
      meals: ["Morning shake", "Poke bowl", "Eating out", null, "Lemon bars"],
      totals: totals([720, 18, 5, 420, 62, 18, 4, 38, 9], ["Calories", "Protein"]),
    },
  ];
}

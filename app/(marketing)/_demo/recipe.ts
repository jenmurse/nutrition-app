// Fixture for Scenario 01 (the recipe story): one recipe in three states —
// imported as published, edited (live nutrition recalculates), and saved as a
// new version. Edits mirror the scenario copy (miso 4→2 tsp, soy sauce →
// low-sodium, olive oil 2→1 tbsp; sodium 1,858→950 mg; calories drop with the oil).

export type RecipeIngredient = { amount: string; name: string; note?: string; changed?: boolean };
export type RecipeNutrient = { name: string; value: string; goal: string; unit: string; changed?: boolean };
export type RecipeState = { ingredients: RecipeIngredient[]; nutrients: RecipeNutrient[] };

export const RECIPE = {
  category: "Dinner",
  name: "Miso-Glazed Tofu",
  servings: 4,
};

const ING = (amount: string, name: string, note?: string, changed?: boolean): RecipeIngredient => ({
  amount,
  name,
  note,
  changed,
});

// name, per-serving value, goal, unit, changed?
const NUT = (name: string, value: string, goal: string, unit: string, changed?: boolean): RecipeNutrient => ({
  name,
  value,
  goal,
  unit,
  changed,
});

function ingredients(miso: string, soy: string, oil: string, misoChanged = false, soyChanged = false, oilChanged = false): RecipeIngredient[] {
  return [
    ING(oil, "Olive oil", undefined, oilChanged),
    ING(miso, "White miso paste", undefined, misoChanged),
    ING("14 oz", "Firm tofu", "cubed"),
    ING("3 cloves", "Garlic", "sliced"),
    ING("5 oz", "Baby spinach"),
    ING("1 tbsp", "Sesame seeds", "toasted"),
    ING("2 tsp", soy, undefined, soyChanged),
  ];
}

function nutrients(cal: string, fat: string, sodium: string, opts: { calCh?: boolean; fatCh?: boolean; sodCh?: boolean } = {}): RecipeNutrient[] {
  return [
    NUT("Calories", cal, "2,000", "kcal", opts.calCh),
    NUT("Fat", fat, "85", "g", opts.fatCh),
    NUT("Saturated Fat", "2", "16", "g"),
    NUT("Sodium", sodium, "1,800", "mg", opts.sodCh),
    NUT("Carbs", "16", "180", "g"),
    NUT("Sugar", "3", "40", "g"),
    NUT("Added Sugar", "0", "10", "g"),
    NUT("Protein", "22", "120", "g"),
    NUT("Fiber", "5", "35", "g"),
  ];
}

export const RECIPE_STATES: Record<"original" | "edited" | "saved", RecipeState> = {
  original: {
    ingredients: ingredients("4 tsp", "Soy sauce", "2 tbsp"),
    nutrients: nutrients("360", "20", "1,858"),
  },
  edited: {
    ingredients: ingredients("2 tsp", "Low-sodium soy sauce", "2 tbsp", true, true, false),
    nutrients: nutrients("360", "20", "950", { sodCh: true }),
  },
  saved: {
    ingredients: ingredients("2 tsp", "Low-sodium soy sauce", "1 tbsp", true, true, false),
    nutrients: nutrients("300", "13", "950", { sodCh: true }),
  },
};

export const RECIPE_SECTIONS = ["Ingredients", "Nutrition", "Instructions", "Optimization", "Meal Prep"];

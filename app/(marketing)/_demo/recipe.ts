// Fixture for Scenario 01 (the recipe story): one recipe in three states —
// imported as published, edited (live nutrition recalculates), and saved as a
// new version. Edits mirror the scenario copy (miso 4→2 tsp, no-salt beans,
// olive oil 2→1 tbsp; sodium 1,858→950 mg; calories drop with the oil).

export type RecipeIngredient = { amount: string; name: string; note?: string; changed?: boolean };
export type RecipeNutrient = { name: string; value: string; goal: string; unit: string; changed?: boolean };
export type RecipeState = { ingredients: RecipeIngredient[]; nutrients: RecipeNutrient[] };

export const RECIPE = {
  category: "Dinner",
  name: "Sesame Miso Cannellini Beans",
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

function ingredients(miso: string, beans: string, oil: string, misoChanged = false, beansChanged = false, oilChanged = false): RecipeIngredient[] {
  return [
    ING(oil, "Olive oil", undefined, oilChanged),
    ING(miso, "White miso paste", undefined, misoChanged),
    ING("1 can", beans, "drained", beansChanged),
    ING("3 cloves", "Garlic", "sliced"),
    ING("5 oz", "Baby spinach"),
    ING("1 tbsp", "Sesame seeds", "toasted"),
    ING("1 tbsp", "Rice vinegar"),
  ];
}

function nutrients(cal: string, fat: string, sodium: string, opts: { calCh?: boolean; fatCh?: boolean; sodCh?: boolean } = {}): RecipeNutrient[] {
  return [
    NUT("Calories", cal, "2,000", "kcal", opts.calCh),
    NUT("Fat", fat, "85", "g", opts.fatCh),
    NUT("Saturated Fat", "3", "16", "g"),
    NUT("Sodium", sodium, "1,800", "mg", opts.sodCh),
    NUT("Carbs", "38", "180", "g"),
    NUT("Sugar", "4", "40", "g"),
    NUT("Added Sugar", "0", "10", "g"),
    NUT("Protein", "14", "120", "g"),
    NUT("Fiber", "9", "35", "g"),
  ];
}

export const RECIPE_STATES: Record<"original" | "edited" | "saved", RecipeState> = {
  original: {
    ingredients: ingredients("4 tsp", "Cannellini beans", "2 tbsp"),
    nutrients: nutrients("420", "22", "1,858"),
  },
  edited: {
    ingredients: ingredients("2 tsp", "No-salt cannellini beans", "2 tbsp", true, true, false),
    nutrients: nutrients("420", "22", "950", { sodCh: true }),
  },
  saved: {
    ingredients: ingredients("2 tsp", "No-salt cannellini beans", "1 tbsp", true, true, false),
    nutrients: nutrients("360", "15", "950", { sodCh: true }),
  },
};

export const RECIPE_SECTIONS = ["Ingredients", "Nutrition", "Instructions", "Optimization", "Meal Prep"];

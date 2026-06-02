/**
 * USDA "added sugar" resolution.
 *
 * USDA returns "Sugars, added" only for some entries (mainly Branded
 * and some Foundation foods). Whole foods (raw produce, meats, oils,
 * grains, etc.) don't list it because the value is implicitly 0.
 *
 * Strategy:
 *   1. If the USDA response explicitly lists added sugar → use that value.
 *   2. Otherwise, if the food's category is in the whole-food whitelist → 0.
 *   3. Otherwise → null (unknown — user must enter manually).
 *
 * The recipe nutrition panel and daily totals strip apply a null-poisoning
 * rule: if any ingredient lacks an added-sugar value, the recipe/day total
 * is rendered as `—` (unknown).
 */

export const WHITELISTED_USDA_CATEGORIES = new Set<string>([
  // Whole / raw foods — added sugar is inherently 0.
  "Vegetables and Vegetable Products",
  "Fruits and Fruit Juices",
  "Spices and Herbs",
  "Beef Products",
  "Poultry Products",
  "Pork Products",
  "Lamb, Veal, and Game Products",
  "Finfish and Shellfish Products",
  "Fats and Oils",
  "Legumes and Legume Products",
  "Cereal Grains and Pasta",
  "Nut and Seed Products",
]);

/**
 * Extracts the added-sugar value from a USDA FDC food response.
 * Returns:
 *   - `number` when an explicit value is found, or when the category whitelist applies (0)
 *   - `null` when unknown (no explicit value, category not whitelisted)
 *
 * The argument is the raw response shape from /fdc/v1/food/:fdcId.
 */
export function resolveAddedSugarFromUsda(
  foodData: {
    foodNutrients?: Array<{ nutrient?: { name?: string }; amount?: number }>;
    foodCategory?: { description?: string } | null;
  } | null | undefined
): number | null {
  if (!foodData) return null;

  // 1. Explicit "Sugars, added" in the nutrient list?
  if (Array.isArray(foodData.foodNutrients)) {
    for (const fn of foodData.foodNutrients) {
      const name = (fn.nutrient?.name ?? "").toLowerCase();
      if (name.includes("sugars, added") || name === "added sugars" || name.includes("added sugar")) {
        if (typeof fn.amount === "number" && Number.isFinite(fn.amount)) {
          return Math.round(fn.amount * 10) / 10;
        }
      }
    }
  }

  // 2. Whole-food whitelist fallback
  const cat = foodData.foodCategory?.description;
  if (cat && WHITELISTED_USDA_CATEGORIES.has(cat)) return 0;

  // 3. Unknown
  return null;
}

/**
 * Helper: when iterating `foodNutrients` in form code, use this to decide
 * whether a nutrient name belongs to "addedSugar" (true) or plain "sugar" (false).
 * Returns null when the name is not a sugar nutrient at all.
 */
export function classifySugarNutrient(name: string): "addedSugar" | "sugar" | null {
  const lower = name.toLowerCase();
  if (!lower.includes("sugar")) return null;
  if (lower.includes("added")) return "addedSugar";
  return "sugar";
}

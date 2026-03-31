import convert from "convert-units";

/**
 * Convert-units expects specific unit keys; normalize some common inputs.
 */
function normalize(unit: string) {
  if (!unit) return unit;
  const u = unit.toLowerCase();
  if (u === "tbsp") return "Tbs"; // convert-units alias
  if (u === "fl oz" || u === "floz") return "fl-oz";
  return u;
}

/**
 * Converts cooking units to grams.
 * - mass units are converted directly to grams
 * - volume units are converted to milliliters and multiplied by density (g/ml)
 * - custom units use the customUnitGrams value from the ingredient
 */
export function convertToGrams(
  value: number,
  unit: string,
  density = 1,
  ingredient?: { customUnitName?: string | null; customUnitGrams?: number | null; customUnitAmount?: number | null }
): number {
  if (!unit || !value) return 0;
  
  // Handle custom units
  if (ingredient?.customUnitName && ingredient?.customUnitGrams) {
    if (unit.toLowerCase() === ingredient.customUnitName.toLowerCase()) {
      // Convert custom units to grams
      const customAmount = ingredient.customUnitAmount || 1;
      return (value / customAmount) * ingredient.customUnitGrams;
    }
  }

  const u = normalize(unit);
  try {
    // mass units
    if (["g", "kg", "oz", "lb"].includes(u)) {
      return convert(value).from(u as any).to("g");
    }

    // volume units -> convert to ml then multiply by density
    if (["ml", "l", "tsp", "Tbs", "tbsp", "cup", "fl-oz", "floz"].includes(u)) {
      const from = u === "tbsp" ? "Tbs" : u;
      const ml = convert(value).from(from as any).to("ml");
      return ml * density;
    }

    // fallback: if unknown assume grams
    return Number(value) || 0;
  } catch (e) {
    // best-effort fallbacks
    if (u.includes("cup")) return (value || 0) * 240 * density;
    if (u.includes("tsp")) return (value || 0) * 4.92892 * density;
    return Number(value) || 0;
  }
}

export function convertToMilliliters(value: number, unit: string): number {
  if (!unit || !value) return 0;
  const u = normalize(unit);
  try {
    if (["ml", "l", "tsp", "Tbs", "tbsp", "cup", "fl-oz", "floz"].includes(u)) {
      const from = u === "tbsp" ? "Tbs" : u;
      return convert(value).from(from as any).to("ml");
    }
    if (["g", "kg", "oz", "lb"].includes(u)) {
      // mass to ml not possible without density
      return 0;
    }
    return 0;
  } catch (e) {
    if (u.includes("cup")) return (value || 0) * 240;
    if (u.includes("tsp")) return (value || 0) * 4.92892;
    return 0;
  }
}

export function getDisplayConversion(value: number, unit: string, convertedValue: number, targetUnit = "g") {
  return `${value} ${unit} (${Math.round(convertedValue * 100) / 100}${targetUnit})`;
}

/**
 * Formats a unit display showing both the custom unit and gram equivalent.
 * Examples:
 *   formatUnitWithGrams({ defaultUnit: 'g' }) → 'g'
 *   formatUnitWithGrams({ defaultUnit: 'other', customUnitName: 'apple', customUnitAmount: 1, customUnitGrams: 182 }) → '1 apple (182g)'
 *   formatUnitWithGrams({ defaultUnit: 'cup', customUnitName: 'cup', customUnitAmount: 1, customUnitGrams: 240 }) → '1 cup (240g)'
 *   formatUnitWithGrams({ defaultUnit: 'other', customUnitName: 'scoop', customUnitAmount: 1, customUnitGrams: 30 }, 2) → '2 scoops (60g)'
 */
export function formatUnitWithGrams(
  ingredient: {
    defaultUnit: string;
    customUnitName?: string | null;
    customUnitAmount?: number | null;
    customUnitGrams?: number | null;
  },
  quantity?: number
): string {
  const { defaultUnit, customUnitName, customUnitAmount, customUnitGrams } = ingredient;

  if (!customUnitName || !customUnitGrams) {
    if (quantity != null) return `${quantity} ${defaultUnit}`;
    return defaultUnit;
  }

  const amt = customUnitAmount || 1;
  if (quantity != null) {
    const grams = Math.round((quantity / amt) * customUnitGrams * 100) / 100;
    return `${quantity} ${customUnitName} (${grams}g)`;
  }

  const grams = Math.round(customUnitGrams * 100) / 100;
  return `${amt} ${customUnitName} (${grams}g)`;
}

/**
 * Basic density lookup (g/ml) for common ingredients. Add entries as needed.
 */
export function getIngredientDensity(name?: string): number {
  if (!name) return 1;
  const n = name.toLowerCase();

  // Liquids
  if (n.includes("water")) return 1;
  if (n.includes("milk")) return 1.03;
  if (n.includes("sesame oil")) return 0.92;
  if (n.includes("olive") || n.includes("oil")) return 0.92;
  if (n.includes("honey")) return 1.42;

  // Dairy / cheese
  if (n.includes("butter")) return 0.96;
  if (n.includes("parmesan")) return 0.34; // grated: 1 tbsp ≈ 5g

  // Baking
  if (n.includes("flour")) return 0.53;       // 1 cup ≈ 125g
  if (n.includes("powdered sugar")) return 0.50; // 1 cup ≈ 120g
  if (n.includes("sugar")) return 0.85;          // granulated: 1 cup ≈ 200g

  // Grains
  if (n.includes("oat")) return 0.33;            // rolled oats: 1 cup ≈ 80g

  // Ground spices
  if (n.includes("cinnamon")) return 0.53;       // 1 tsp ≈ 2.6g
  if (n.includes("turmeric")) return 0.61;       // 1 tsp ≈ 3g
  if (n.includes("red pepper flake")) return 0.37; // 1 tsp ≈ 1.8g
  if (n.includes("thyme")) return 0.20;          // dried: 1 tsp ≈ 1g
  if (n.includes("rosemary")) return 0.20;       // dried: 1 tsp ≈ 1g
  if (n.includes("ginger")) return 0.41;         // ground/fresh grated: 1 tsp ≈ 2g

  // Fresh herbs (cup measurements — loosely packed)
  if (n.includes("cilantro")) return 0.17;       // 1 cup ≈ 40g
  if (n.includes("parsley")) return 0.17;
  if (n.includes("mint")) return 0.17;
  if (n.includes("chard")) return 0.25;          // chopped: 1 cup ≈ 60g
  if (n.includes("romaine")) return 0.20;        // shredded: 1 cup ≈ 47g

  // Vegetables (cup measurements)
  if (n.includes("corn")) return 0.71;           // kernels: 1 cup ≈ 170g

  return 1; // default
}

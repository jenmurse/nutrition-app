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
  ingredient?: { customUnitName?: string | null; customUnitGrams?: number | null; customUnitAmount?: number | null; customUnitMeasurement?: string | null }
): number {
  if (!unit || !value) return 0;
  
  // Handle custom units
  if (ingredient?.customUnitName && ingredient?.customUnitGrams) {
    if (unit.toLowerCase() === ingredient.customUnitName.toLowerCase()) {
      const customAmount = ingredient.customUnitAmount || 1;
      let customValueInGrams = ingredient.customUnitGrams;
      
      // If the custom unit is in mL, convert to grams using density
      if (ingredient.customUnitMeasurement === "ml") {
        customValueInGrams = ingredient.customUnitGrams * density;
      }
      
      return (value / customAmount) * customValueInGrams;
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
 * Basic density lookup (g/ml) for common ingredients. Add entries as needed.
 */
export function getIngredientDensity(name?: string): number {
  if (!name) return 1;
  const n = name.toLowerCase();
  if (n.includes("water")) return 1;
  if (n.includes("milk")) return 1.03;
  if (n.includes("olive") || n.includes("oil")) return 0.92;
  if (n.includes("honey")) return 1.42;
  if (n.includes("flour")) return 0.53; // approx (1 cup ~125g)
  if (n.includes("sugar")) return 0.85; // granulated sugar ~200g per cup -> 200/240=0.83
  if (n.includes("butter")) return 0.96;
  return 1; // default
}

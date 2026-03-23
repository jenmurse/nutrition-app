import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { matchIngredients, type ParsedIngredient, type ParsedRecipe } from "../../../../../lib/ingredientMatcher";

/**
 * Extract recipes from URLs using Schema.org JSON-LD structured data.
 * Most recipe blogs embed machine-readable recipe data — no AI needed.
 */

// ── Quantity & unit parsing (shared logic with Pestle importer) ──

function unicodeFractionToDecimal(token: string): number | null {
  const map: Record<string, number> = {
    "\u00bc": 0.25, "\u00bd": 0.5, "\u00be": 0.75,
    "\u2150": 1/7, "\u2151": 1/9, "\u2152": 1/10,
    "\u2153": 1/3, "\u2154": 2/3, "\u2155": 1/5,
    "\u2156": 2/5, "\u2157": 3/5, "\u2158": 4/5,
    "\u2159": 1/6, "\u215a": 5/6, "\u215b": 1/8,
    "\u215c": 3/8, "\u215d": 5/8, "\u215e": 7/8,
  };
  return map[token] ?? null;
}

function parseLeadingQuantity(text: string): { quantity: number; rest: string } {
  const trimmed = text.trim();
  if (!trimmed) return { quantity: 0, rest: "" };

  const parts = trimmed.split(/\s+/);
  let qty = 0;
  let consumed = 0;

  const first = parts[0];
  const firstFraction = unicodeFractionToDecimal(first);
  if (firstFraction !== null) {
    qty = firstFraction;
    consumed = 1;
  } else if (/^\d+(?:\.\d+)?$/.test(first)) {
    qty = Number(first);
    consumed = 1;

    const second = parts[1];
    if (second && /^\d+\/\d+$/.test(second)) {
      const [num, den] = second.split("/").map(Number);
      if (den) { qty += num / den; consumed = 2; }
    } else if (second) {
      const frac = unicodeFractionToDecimal(second);
      if (frac !== null) { qty += frac; consumed = 2; }
    }
  } else {
    const match = first.match(/^(\d+)([\u00bc\u00bd\u00be\u2150-\u215e])$/);
    if (match) {
      const frac = unicodeFractionToDecimal(match[2]);
      if (frac !== null) { qty = Number(match[1]) + frac; consumed = 1; }
    }
  }

  return { quantity: qty, rest: parts.slice(consumed).join(" ").trim() };
}

function parseUnitAndName(text: string): { unit: string; nameGuess: string } {
  const unitMap: Record<string, string> = {
    tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
    tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
    cup: "cup", cups: "cup",
    oz: "oz", ounce: "oz", ounces: "oz",
    lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
    g: "g", gram: "g", grams: "g", kg: "kg",
    ml: "ml", l: "l", liter: "l", liters: "l",
    pinch: "pinch", dust: "pinch", clove: "clove", cloves: "clove",
    can: "can", cans: "can",
    bunch: "bunch", head: "head", piece: "piece", pieces: "piece",
    slice: "slice", slices: "slice", sprig: "sprig", sprigs: "sprig",
  };

  const parts = text.trim().split(/\s+/);
  if (parts.length === 0) return { unit: "", nameGuess: "" };

  const first = parts[0].toLowerCase().replace(/[.,]$/, "");
  const normalized = unitMap[first];
  if (normalized) {
    return { unit: normalized, nameGuess: parts.slice(1).join(" ").trim() };
  }
  return { unit: "", nameGuess: text.trim() };
}

function cleanIngredientName(name: string): string {
  return name
    .replace(/\(\([^)]*\)\)/g, "")   // strip ((note X)) double-paren footnotes
    .replace(/\([^)]*note[^)]*\)/gi, "") // strip (note X) single-paren footnotes
    .replace(/\([^)]*\*[^)]*\)/g, "")   // strip (*) style markers
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseIngredientString(text: string): ParsedIngredient {
  // Clean HTML entities and tags
  const cleaned = text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .trim();

  const { quantity, rest } = parseLeadingQuantity(cleaned);
  const { unit, nameGuess: rawName } = parseUnitAndName(rest);
  const nameGuess = cleanIngredientName(rawName);

  return {
    originalText: cleaned,
    quantity: quantity || 0,
    unit,
    nameGuess: nameGuess || rawName.trim(),
    section: null,
  };
}

// ── ISO 8601 duration parsing (PT1H30M → 90) ──

function parseDuration(iso: string): number | null {
  if (!iso || typeof iso !== "string") return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  return (Number(match[1] || 0) * 60) + Number(match[2] || 0);
}

// ── JSON-LD extraction ──

function extractJsonLd(html: string): any[] {
  const results: any[] = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      results.push(parsed);
    } catch {
      // Skip malformed JSON-LD blocks
    }
  }
  return results;
}

function findRecipeInJsonLd(blocks: any[]): any | null {
  for (const block of blocks) {
    // Direct Recipe type
    if (block["@type"] === "Recipe") return block;
    if (Array.isArray(block["@type"]) && block["@type"].includes("Recipe")) return block;

    // @graph array (common in WordPress/Yoast)
    if (block["@graph"] && Array.isArray(block["@graph"])) {
      for (const item of block["@graph"]) {
        if (item["@type"] === "Recipe") return item;
        if (Array.isArray(item["@type"]) && item["@type"].includes("Recipe")) return item;
      }
    }

    // Array of objects at top level
    if (Array.isArray(block)) {
      for (const item of block) {
        if (item["@type"] === "Recipe") return item;
        if (Array.isArray(item["@type"]) && item["@type"].includes("Recipe")) return item;
      }
    }
  }
  return null;
}

function extractInstructions(recipeData: any): string {
  const raw = recipeData.recipeInstructions;
  if (!raw) return "";

  // Plain string
  if (typeof raw === "string") return raw.trim();

  // Array of strings
  if (Array.isArray(raw)) {
    return raw.map((step: any, i: number) => {
      if (typeof step === "string") return `${i + 1}. ${step.trim()}`;
      // HowToStep or HowToSection objects
      if (step.text) return `${i + 1}. ${step.text.trim()}`;
      if (step.itemListElement && Array.isArray(step.itemListElement)) {
        // HowToSection with sub-steps
        const sectionName = step.name ? `**${step.name}**\n` : "";
        const subSteps = step.itemListElement
          .map((sub: any, j: number) => `${j + 1}. ${(sub.text || sub).toString().trim()}`)
          .join("\n");
        return sectionName + subSteps;
      }
      return "";
    }).filter(Boolean).join("\n");
  }

  return "";
}

function parseServings(recipeYield: any): { size: number; unit: string } {
  if (!recipeYield) return { size: 1, unit: "servings" };

  const raw = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  if (typeof raw === "number") return { size: raw, unit: "servings" };

  const str = String(raw).trim();
  const numMatch = str.match(/^(\d+)/);
  const num = numMatch ? Number(numMatch[1]) : 1;

  // Try to extract unit from the string (e.g., "12 cookies", "4 servings")
  const unitMatch = str.match(/^\d+\s+(.+)/);
  const unit = unitMatch ? unitMatch[1].toLowerCase() : "servings";

  return { size: num, unit };
}

function extractTags(recipeData: any): string {
  const tags: string[] = [];
  const mealTags = ["breakfast", "lunch", "dinner", "snack", "side", "dessert", "beverage"];

  // Check recipeCategory
  const category = recipeData.recipeCategory;
  if (category) {
    const cats = Array.isArray(category) ? category : [category];
    for (const c of cats) {
      const lower = String(c).toLowerCase();
      for (const tag of mealTags) {
        if (lower.includes(tag) && !tags.includes(tag)) tags.push(tag);
      }
    }
  }

  // Check keywords
  const keywords = recipeData.keywords;
  if (keywords) {
    const kws = typeof keywords === "string" ? keywords.split(",") : Array.isArray(keywords) ? keywords : [];
    for (const kw of kws) {
      const lower = String(kw).trim().toLowerCase();
      for (const tag of mealTags) {
        if (lower.includes(tag) && !tags.includes(tag)) tags.push(tag);
      }
    }
  }

  return tags.join(",");
}

// ── Main route ──

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try { new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the page HTML
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NutritionApp/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${pageRes.status})` },
        { status: 400 }
      );
    }

    const html = await pageRes.text();

    // Extract JSON-LD and find Recipe
    const jsonLdBlocks = extractJsonLd(html);
    const recipeData = findRecipeInJsonLd(jsonLdBlocks);

    if (!recipeData) {
      return NextResponse.json(
        { error: "No recipe found on this page. The site may not use standard recipe markup." },
        { status: 400 }
      );
    }

    // Parse ingredients
    const ingredientStrings: string[] = recipeData.recipeIngredient || [];
    const ingredients: ParsedIngredient[] = ingredientStrings.map(parseIngredientString);

    // Parse servings
    const servings = parseServings(recipeData.recipeYield);

    // Extract image
    const rawImage = recipeData.image;
    const image: string | null = Array.isArray(rawImage)
      ? (typeof rawImage[0] === "string" ? rawImage[0] : rawImage[0]?.url ?? null)
      : typeof rawImage === "string"
        ? rawImage
        : rawImage?.url ?? null;

    // Build parsed recipe
    const parsed: ParsedRecipe = {
      name: recipeData.name || "Imported Recipe",
      servingSize: servings.size,
      servingUnit: servings.unit,
      instructions: extractInstructions(recipeData),
      sourceApp: "URL Import",
      ingredients,
      isComplete: false,
    };

    // Match ingredients against existing database
    const existingIngredients = await prisma.ingredient.findMany({
      select: { id: true, name: true },
    });
    const matched = matchIngredients(parsed, existingIngredients);

    // Add extra metadata
    const response: any = { ...matched };
    if (image) response.image = image;
    const prepTime = parseDuration(recipeData.prepTime);
    const cookTime = parseDuration(recipeData.cookTime);
    if (prepTime !== null) response.prepTime = prepTime;
    if (cookTime !== null) response.cookTime = cookTime;

    const tags = extractTags(recipeData);
    if (tags) response.tags = tags;

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("URL import error:", error);
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      return NextResponse.json({ error: "URL request timed out" }, { status: 408 });
    }
    return NextResponse.json({ error: "Failed to import recipe from URL" }, { status: 500 });
  }
}

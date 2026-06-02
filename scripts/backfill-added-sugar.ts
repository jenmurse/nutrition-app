/**
 * Backfill addedSugar values for household Ingredient and GlobalIngredient
 * rows from their USDA cache.
 *
 * For each row with an fdcId and no existing IngredientNutrient/
 * GlobalIngredientNutrient row for addedSugar, this:
 *   1. Looks up the USDA cache.
 *   2. Resolves a value using lib/usdaAddedSugar.resolveAddedSugarFromUsda
 *      (explicit "Sugars, added" → use that; else whole-food whitelist → 0;
 *       else null/skip).
 *   3. Writes the row.
 *
 * Flags:
 *   --report    Default mode. Print a report; write nothing.
 *   --write     Actually write the values.
 *   --fetch     Re-fetch missing USDA cache entries from the FDC API
 *               before resolving. Uses USDA_API_KEY from .env. Adds ~1s
 *               per fetch (rate-limited politely).
 *
 * Usage:
 *   npx tsx scripts/backfill-added-sugar.ts           # report only
 *   npx tsx scripts/backfill-added-sugar.ts --fetch   # report after fetching missing caches
 *   npx tsx scripts/backfill-added-sugar.ts --write   # write what cache already has
 *   npx tsx scripts/backfill-added-sugar.ts --fetch --write  # full backfill
 */

import { PrismaClient } from "@prisma/client";
import { resolveAddedSugarFromUsda } from "../lib/usdaAddedSugar";

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const DO_WRITE = args.has("--write");
const DO_FETCH = args.has("--fetch");
const DO_HEURISTIC = args.has("--heuristic");

// ── Heuristic name-matching for "obviously zero" whole foods ──────
// Conservative. A name must match one of WHOLE_FOOD_PATTERNS AND
// contain no SUSPICIOUS_TERMS for the heuristic to default to 0.

const WHOLE_FOOD_PATTERNS = [
  // Produce — vegetables
  /\b(artichoke|asparagus|beet|bok choy|broccoli|brussels sprout|cabbage|carrot|cauliflower|celery|chard|collard|cucumber|eggplant|endive|fennel|garlic|ginger|kale|leek|lettuce|mushroom|okra|onion|parsnip|pepper|potato|pumpkin|radish|rutabaga|scallion|shallot|spinach|squash|sweet potato|tomato|turnip|yam|zucchini|arugula|watercress|sprout|herb|cilantro|parsley|basil|mint|dill|chive|rosemary|thyme|sage|oregano|tarragon|bay leaf)s?\b/i,
  // Produce — fruits & berries
  /\b(apple|apricot|avocado|banana|berry|berries|blackberry|blueberry|boysenberry|cantaloupe|cherry|cherries|clementine|coconut|cranberry|date|fig|grape|grapefruit|guava|honeydew|kiwi|lemon|lime|lychee|mandarin|mango|melon|nectarine|olive|orange|papaya|passion fruit|peach|pear|persimmon|pineapple|plantain|plum|pomegranate|prune|quince|raspberry|raspberries|rhubarb|strawberry|strawberries|tangerine|tomatillo|watermelon)s?\b/i,
  // Meats — raw
  /\b(chicken|beef|pork|lamb|turkey|duck|bison|venison|veal|goose|quail|rabbit)\b/i,
  // Fish & seafood
  /\b(salmon|tuna|cod|halibut|trout|sardine|anchov(y|ies)|mackerel|herring|tilapia|swordfish|bass|snapper|sole|flounder|haddock|pollock|catfish|shrimp|prawn|scallop|lobster|crab|clam|mussel|oyster|octopus|squid|calamari)s?\b/i,
  // Grains, legumes, nuts, seeds (dry/raw)
  /\b(almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia|peanut|pine nut|sesame|chia|flax|hemp|sunflower|pumpkin seed)s?\b/i,
  /\b(oat|oats|rice|quinoa|barley|buckwheat|millet|bulgur|farro|rye|wheat berry|polenta|cornmeal|grits)\b/i,
  /\b(chickpea|garbanzo|lentil|black bean|pinto bean|kidney bean|navy bean|fava|edamame|soybean|split pea|adzuki|mung)s?\b/i,
  // Dairy & eggs (plain — no flavorings)
  /\b(egg|eggs|egg white|egg yolk)\b/i,
  // Oils & fats (plain)
  /\b(olive oil|coconut oil|avocado oil|canola oil|vegetable oil|sesame oil|sunflower oil|peanut oil|grapeseed oil|ghee|butter|lard|tallow)\b/i,
  // Spices, salts, plain seasonings
  /\b(salt|pepper|cumin|paprika|turmeric|cinnamon|nutmeg|clove|cardamom|coriander|fennel seed|mustard seed|allspice|caraway|sumac|za.?atar|cayenne|chili powder|curry powder|saffron|vanilla bean)\b/i,
  // Plain pantry — water, ice, vinegar (plain)
  /\b(water|ice|wine vinegar|cider vinegar|white vinegar|rice vinegar)\b/i,
];

const SUSPICIOUS_TERMS = [
  // Anything with added sweetener in the name
  /\b(sugar|syrup|honey|agave|molasses|nectar|sweetened|candied|glazed|caramel|maple|jam|jelly|preserve|marmalade|chutney)\b/i,
  // Sauces & condiments often have added sugar
  /\b(sauce|ketchup|barbecue|bbq|teriyaki|hoisin|sriracha|salsa|relish|chutney|dressing|marinade|mayo|aioli|pesto|tahini paste|ranch|balsamic)\b/i,
  // Baked / sweet snacks
  /\b(cookie|cake|candy|chocolate|brownie|donut|doughnut|muffin|pastry|biscuit|cracker|bread|bagel|cereal|granola|bar|pretzel|chip|gummy|jelly bean)\b/i,
  // Beverages
  /\b(juice|soda|kombucha|smoothie|shake|drink|beverage|cocktail|liqueur)\b/i,
  // Dairy that's often sweetened (be conservative)
  /\b(milk|yogurt|ice cream|frozen yogurt|gelato|sherbet|sorbet|pudding|custard|chocolate milk)\b/i,
  // Prepared / restaurant / fast food
  /\b(kfc|mcdonald|burger king|wendy|chipotle|popcorn chicken|nugget|tender|wing|fries)\b/i,
  // Sweetened seasonings / mixes
  /\b(cajun seasoning|italian seasoning|taco seasoning|fajita|rub|brine)\b/i,
  // Falafel, hummus etc — often have added flavorings
  /\b(falafel|hummus|baba ganoush)\b/i,
];

function heuristicAddedSugar(name: string): "zero" | "suspicious" | "no-match" {
  const matches = WHOLE_FOOD_PATTERNS.some((re) => re.test(name));
  if (!matches) return "no-match";
  const suspicious = SUSPICIOUS_TERMS.some((re) => re.test(name));
  if (suspicious) return "suspicious";
  return "zero";
}

const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_API_KEY || "";

async function fetchUsda(fdcId: string): Promise<unknown | null> {
  if (!API_KEY) {
    console.warn(`  ⚠️  USDA_API_KEY not set — can't fetch fdcId ${fdcId}`);
    return null;
  }
  try {
    const url = `${USDA_BASE}/food/${encodeURIComponent(fdcId)}?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠️  USDA returned ${res.status} for fdcId ${fdcId}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`  ⚠️  Fetch failed for fdcId ${fdcId}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

async function getCachedOrFetch(fdcId: string): Promise<{ response: unknown | null; fetched: boolean }> {
  const cached = await prisma.usdaFoodCache.findUnique({ where: { fdcId } });
  if (cached) return { response: cached.response, fetched: false };

  if (!DO_FETCH) return { response: null, fetched: false };

  // Re-fetch and cache.
  const response = await fetchUsda(fdcId);
  if (response) {
    try {
      await prisma.usdaFoodCache.create({ data: { fdcId, response: response as object } });
    } catch {
      // race / unique violation — ignore, we still have the response
    }
    // Politeness delay — USDA FDC is ~1000 req/hour; 250ms = 14k/hr max.
    await new Promise((r) => setTimeout(r, 250));
    return { response, fetched: true };
  }
  return { response: null, fetched: false };
}

async function main() {
  console.log(`Mode: ${DO_WRITE ? "WRITE" : "REPORT"}${DO_FETCH ? " + FETCH" : ""}\n`);

  const addedSugar = await prisma.nutrient.findUnique({ where: { name: "addedSugar" } });
  if (!addedSugar) {
    console.error("addedSugar Nutrient row not found — run scripts/add-added-sugar-nutrient.ts first.");
    process.exit(1);
  }

  type Outcome = "explicit" | "whitelist" | "unknown" | "noFdc" | "noCache" | "alreadySet";
  const counts: Record<Outcome, number> = {
    explicit: 0, whitelist: 0, unknown: 0, noFdc: 0, noCache: 0, alreadySet: 0,
  };
  const detail: Array<{ scope: "ing" | "global"; id: number; name: string; outcome: Outcome; value: number | null }> = [];

  // ── Household Ingredients ───────────────────────────────────────
  const ingredients = await prisma.ingredient.findMany({
    select: { id: true, name: true, fdcId: true },
  });
  console.log(`Scanning ${ingredients.length} household ingredients…`);

  for (const ing of ingredients) {
    const existing = await prisma.ingredientNutrient.findUnique({
      where: { ingredientId_nutrientId: { ingredientId: ing.id, nutrientId: addedSugar.id } },
    });
    if (existing) { counts.alreadySet++; continue; }
    if (!ing.fdcId) { counts.noFdc++; detail.push({ scope: "ing", id: ing.id, name: ing.name, outcome: "noFdc", value: null }); continue; }

    const { response, fetched } = await getCachedOrFetch(ing.fdcId);
    if (!response) { counts.noCache++; detail.push({ scope: "ing", id: ing.id, name: ing.name, outcome: "noCache", value: null }); continue; }

    const value = resolveAddedSugarFromUsda(response as Parameters<typeof resolveAddedSugarFromUsda>[0]);
    if (value === null) {
      counts.unknown++;
      detail.push({ scope: "ing", id: ing.id, name: ing.name, outcome: "unknown", value: null });
      continue;
    }

    // Determine source: explicit value or whitelist default
    const r = response as { foodNutrients?: Array<{ nutrient?: { name?: string } }> };
    const hasExplicit = (r.foodNutrients ?? []).some((fn) => {
      const name = (fn.nutrient?.name ?? "").toLowerCase();
      return name.includes("added") && name.includes("sugar");
    });
    const outcome: Outcome = hasExplicit ? "explicit" : "whitelist";
    counts[outcome]++;
    detail.push({ scope: "ing", id: ing.id, name: ing.name, outcome, value });

    if (DO_WRITE) {
      await prisma.ingredientNutrient.create({
        data: { ingredientId: ing.id, nutrientId: addedSugar.id, value },
      });
    }

    if (fetched) process.stdout.write(`.`);
  }
  if (DO_FETCH) console.log();

  // ── Global Ingredients (shared cache) ───────────────────────────
  const globalCounts: Record<Outcome, number> = {
    explicit: 0, whitelist: 0, unknown: 0, noFdc: 0, noCache: 0, alreadySet: 0,
  };
  const globals = await prisma.globalIngredient.findMany({ select: { id: true, name: true, fdcId: true } });
  console.log(`\nScanning ${globals.length} global ingredients…`);

  for (const gi of globals) {
    const existing = await prisma.globalIngredientNutrient.findUnique({
      where: { globalIngredientId_nutrientId: { globalIngredientId: gi.id, nutrientId: addedSugar.id } },
    });
    if (existing) { globalCounts.alreadySet++; continue; }
    if (!gi.fdcId) { globalCounts.noFdc++; continue; }

    const { response, fetched } = await getCachedOrFetch(gi.fdcId);
    if (!response) { globalCounts.noCache++; continue; }

    const value = resolveAddedSugarFromUsda(response as Parameters<typeof resolveAddedSugarFromUsda>[0]);
    if (value === null) { globalCounts.unknown++; continue; }

    const r = response as { foodNutrients?: Array<{ nutrient?: { name?: string } }> };
    const hasExplicit = (r.foodNutrients ?? []).some((fn) => {
      const name = (fn.nutrient?.name ?? "").toLowerCase();
      return name.includes("added") && name.includes("sugar");
    });
    const outcome: Outcome = hasExplicit ? "explicit" : "whitelist";
    globalCounts[outcome]++;

    if (DO_WRITE) {
      await prisma.globalIngredientNutrient.create({
        data: { globalIngredientId: gi.id, nutrientId: addedSugar.id, value },
      });
    }

    if (fetched) process.stdout.write(`.`);
  }
  if (DO_FETCH) console.log();

  // ── Report ──────────────────────────────────────────────────────
  const fmtRow = (k: string, v: number) => `  ${k.padEnd(14)} ${String(v).padStart(4)}`;
  console.log(`\n── Household Ingredients ─────────────`);
  console.log(fmtRow("already set", counts.alreadySet));
  console.log(fmtRow("explicit", counts.explicit), "← USDA listed 'Sugars, added'");
  console.log(fmtRow("whitelist", counts.whitelist), "← whole-food category, defaulted to 0");
  console.log(fmtRow("unknown", counts.unknown), "← cached but USDA had no value + not whole-food (needs manual entry)");
  console.log(fmtRow("no cache", counts.noCache), "← never fetched from USDA" + (DO_FETCH ? " (fetch also failed)" : " — run with --fetch"));
  console.log(fmtRow("no fdcId", counts.noFdc), "← custom ingredient, no USDA reference (needs manual entry)");

  console.log(`\n── Global Ingredients ────────────────`);
  console.log(fmtRow("already set", globalCounts.alreadySet));
  console.log(fmtRow("explicit", globalCounts.explicit));
  console.log(fmtRow("whitelist", globalCounts.whitelist));
  console.log(fmtRow("unknown", globalCounts.unknown));
  console.log(fmtRow("no cache", globalCounts.noCache));
  console.log(fmtRow("no fdcId", globalCounts.noFdc));

  // ── Heuristic pass on items still needing manual entry ──────────
  const manual = detail.filter((d) => d.outcome === "unknown" || d.outcome === "noFdc");
  let heuristicZeroed = 0;
  let suspiciousCount = 0;
  let noMatchCount = 0;
  const heuristicLists = { zero: [] as string[], suspicious: [] as string[], noMatch: [] as string[] };

  if (DO_HEURISTIC && manual.length > 0) {
    console.log(`\n── Heuristic pass on ${manual.length} unset items ──`);
    for (const m of manual) {
      const verdict = heuristicAddedSugar(m.name);
      if (verdict === "zero") {
        heuristicZeroed++;
        heuristicLists.zero.push(m.name);
        if (DO_WRITE && m.scope === "ing") {
          await prisma.ingredientNutrient.create({
            data: { ingredientId: m.id, nutrientId: addedSugar.id, value: 0 },
          });
        }
      } else if (verdict === "suspicious") {
        suspiciousCount++;
        heuristicLists.suspicious.push(m.name);
      } else {
        noMatchCount++;
        heuristicLists.noMatch.push(m.name);
      }
    }
    console.log(`  ✓ heuristic-zero: ${heuristicZeroed}${DO_WRITE ? " (written)" : " (would write)"}`);
    console.log(`  • suspicious:    ${suspiciousCount} (matched a whole-food pattern but also a sweetened/processed term)`);
    console.log(`  • no match:      ${noMatchCount} (name didn't match any whole-food pattern)`);

    console.log(`\nHeuristic-zero candidates:`);
    for (const n of heuristicLists.zero) console.log(`  ✓ ${n}`);
    console.log(`\nSuspicious (review manually):`);
    for (const n of heuristicLists.suspicious) console.log(`  ? ${n}`);
    console.log(`\nNo match (definitely needs manual):`);
    for (const n of heuristicLists.noMatch) console.log(`  • ${n}`);
  } else if (manual.length > 0) {
    console.log(`\n── Household items still needing manual addedSugar entry (${manual.length}) ──`);
    for (const m of manual) console.log(`  • ${m.name}${m.outcome === "noFdc" ? "  [custom, no USDA]" : "  [USDA had no value]"}`);
    console.log(`\n  (re-run with --heuristic to flag obvious whole foods)`);
  }

  if (!DO_WRITE) {
    console.log(`\n(report only — re-run with --write to apply)`);
  } else {
    console.log(`\n✓ Wrote ${counts.explicit + counts.whitelist} household + ${globalCounts.explicit + globalCounts.whitelist} global rows.`);
  }
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

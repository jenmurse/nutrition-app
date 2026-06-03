/**
 * One-time bootstrap of the GlobalIngredient table for pantry seeding.
 *
 * Takes a curated list of starter ingredients, queries USDA FoodData Central
 * for each, auto-picks the most generic Foundation/SR Legacy entry, and
 * populates GlobalIngredient + GlobalIngredientNutrient + UsdaFoodCache.
 *
 * Run order:
 *   1. npx tsx scripts/seed-global-ingredients.ts             # dry-run, prints picks
 *   2. (optional) edit STARTER_LIST to override picks with explicit fdcIds
 *   3. npx tsx scripts/seed-global-ingredients.ts --write     # actually writes
 *
 * Idempotent: skips items that already exist in GlobalIngredient (by fdcId).
 */

import { PrismaClient } from "@prisma/client";
import { resolveAddedSugarFromUsda } from "../lib/usdaAddedSugar";

const prisma = new PrismaClient();
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const API_KEY = process.env.USDA_API_KEY || "";
const DO_WRITE = process.argv.includes("--write");

if (!API_KEY) {
  console.error("USDA_API_KEY not set in environment");
  process.exit(1);
}

// ── Curated starter list ─────────────────────────────────────────────
//
// `name`     — user-facing name to save under (kept stable across USDA refreshes)
// `query`    — string sent to USDA search; can differ from name for better matches
// `category` — app-facing category (matches Ingredient.category convention)
// `fdcId`    — optional explicit override; skips search if set
// `unit`     — defaults to 'g' (per 100g basis)

type Item = {
  name: string;
  query: string;
  category: string;
  fdcId?: string;
  unit?: string;
};

const STARTER_LIST: Item[] = [
  // ── Proteins ──────────────────────────────────────────────────
  { name: "Chicken breast, raw", query: "chicken breast boneless skinless raw", category: "Meat & Seafood" },
  { name: "Chicken thigh, raw", query: "chicken thigh boneless skinless raw", category: "Meat & Seafood" },
  { name: "Eggs, whole, large", query: "egg whole raw fresh", category: "Dairy & Eggs", fdcId: "748967" },
  { name: "Ground beef, 85% lean", query: "ground beef 85 lean raw", category: "Meat & Seafood", fdcId: "174030" },
  { name: "Pork tenderloin, raw", query: "pork tenderloin lean raw", category: "Meat & Seafood" },
  { name: "Tuna, canned in water", query: "tuna canned light water drained", category: "Pantry & Canned" },
  { name: "Shrimp, raw", query: "shrimp raw", category: "Meat & Seafood" },
  { name: "Tofu, firm", query: "tofu firm raw", category: "Pantry & Canned" },
  { name: "Bacon, raw", query: "bacon pork cured raw", category: "Meat & Seafood", fdcId: "174037" },

  // ── Dairy ─────────────────────────────────────────────────────
  { name: "Butter, unsalted", query: "butter unsalted", category: "Dairy & Eggs" },
  { name: "Milk, 2%", query: "milk reduced fat 2% with vitamin A and D", category: "Dairy & Eggs" },
  { name: "Greek yogurt, plain, whole milk", query: "yogurt greek plain whole milk", category: "Dairy & Eggs" },
  { name: "Mozzarella cheese", query: "mozzarella cheese whole milk low moisture", category: "Dairy & Eggs" },
  { name: "Cottage cheese", query: "cottage cheese 2%", category: "Dairy & Eggs" },

  // ── Grains & starches ─────────────────────────────────────────
  { name: "Brown rice, long-grain, raw", query: "rice brown long grain raw", category: "Grains & Pasta" },
  { name: "White rice, long-grain, raw", query: "rice white long grain raw", category: "Grains & Pasta" },
  { name: "Quinoa, raw", query: "quinoa uncooked", category: "Grains & Pasta", fdcId: "168874" },
  { name: "Rolled oats, raw", query: "oats raw rolled", category: "Grains & Pasta" },
  { name: "Pasta, dry, spaghetti", query: "pasta dry spaghetti enriched", category: "Grains & Pasta" },
  { name: "All-purpose flour", query: "flour wheat all purpose enriched", category: "Baking" },

  // ── Bread & wraps ─────────────────────────────────────────────
  { name: "Bread, whole wheat", query: "bread whole wheat commercially prepared", category: "Bread & Wraps" },
  { name: "Tortilla, flour", query: "tortilla flour wheat ready to bake", category: "Bread & Wraps" },
  { name: "Tortilla, corn", query: "tortilla corn ready to bake", category: "Bread & Wraps" },

  // ── Legumes ───────────────────────────────────────────────────
  { name: "Black beans, dried", query: "beans black mature raw", category: "Legumes" },
  { name: "Chickpeas, dried", query: "chickpeas garbanzo mature raw", category: "Legumes", fdcId: "173757" },
  { name: "Lentils, brown, dried", query: "lentils mature raw", category: "Legumes", fdcId: "172420" },
  { name: "Kidney beans, dried", query: "beans kidney red mature raw", category: "Legumes" },
  { name: "Peanut butter", query: "peanut butter smooth", category: "Pantry & Canned" },
  { name: "Almond butter", query: "almond butter plain", category: "Pantry & Canned", fdcId: "170592" },

  // ── Aromatic vegetables ───────────────────────────────────────
  { name: "Yellow onion", query: "onion yellow raw", category: "Produce" },
  { name: "Garlic", query: "garlic raw", category: "Produce" },
  { name: "Carrot", query: "carrot raw", category: "Produce", fdcId: "170393" },
  { name: "Celery", query: "celery raw", category: "Produce" },
  { name: "Bell pepper, red", query: "peppers sweet red raw", category: "Produce" },
  { name: "Bell pepper, green", query: "peppers sweet green raw", category: "Produce" },

  // ── Vegetables ────────────────────────────────────────────────
  { name: "Spinach, raw", query: "spinach raw", category: "Produce", fdcId: "168462" },
  { name: "Broccoli, raw", query: "broccoli raw", category: "Produce" },
  { name: "Cauliflower, raw", query: "cauliflower raw", category: "Produce" },
  { name: "Kale, raw", query: "kale raw", category: "Produce" },
  { name: "Zucchini, raw", query: "squash summer zucchini raw", category: "Produce" },
  { name: "Mushrooms, white", query: "mushrooms white raw", category: "Produce" },
  { name: "Sweet potato", query: "sweet potato raw unprepared", category: "Produce", fdcId: "168482" },
  { name: "Russet potato", query: "potatoes russet raw flesh skin", category: "Produce" },
  { name: "Peas, frozen", query: "peas green frozen unprepared", category: "Frozen", fdcId: "170066" },
  { name: "Corn, frozen", query: "corn yellow frozen kernels unprepared", category: "Frozen", fdcId: "169978" },

  // ── Fruits ────────────────────────────────────────────────────
  { name: "Apple", query: "apples raw with skin", category: "Produce", fdcId: "171688" },
  { name: "Banana", query: "bananas raw", category: "Produce", fdcId: "173944" },
  { name: "Lemon", query: "lemons raw without peel", category: "Produce", fdcId: "167746" },
  { name: "Orange", query: "oranges raw all commercial varieties", category: "Produce", fdcId: "169097" },
  { name: "Avocado", query: "avocados raw all commercial varieties", category: "Produce" },
  { name: "Blueberries", query: "blueberries raw", category: "Produce" },
  { name: "Strawberries", query: "strawberries raw", category: "Produce" },
  { name: "Pear", query: "pears raw", category: "Produce" },

  // ── Oils & vinegars ───────────────────────────────────────────
  { name: "Olive oil, extra virgin", query: "oil olive salad cooking", category: "Oils & Fats" },
  { name: "Canola oil", query: "oil canola", category: "Oils & Fats" },
  { name: "Coconut oil", query: "oil coconut", category: "Oils & Fats" },
  { name: "Balsamic vinegar", query: "vinegar balsamic", category: "Pantry & Canned" },
  { name: "Apple cider vinegar", query: "vinegar cider", category: "Pantry & Canned" },
  { name: "Rice vinegar", query: "vinegar rice", category: "Pantry & Canned", fdcId: "175094" },

  // ── Pantry shelf ──────────────────────────────────────────────
  { name: "Soy sauce", query: "soy sauce tamari", category: "Pantry & Canned", fdcId: "174277" },
  { name: "Tomato paste", query: "tomato paste canned", category: "Pantry & Canned" },
  { name: "Canned diced tomatoes", query: "tomatoes red canned diced", category: "Pantry & Canned" },
  { name: "Chicken stock", query: "broth chicken canned low sodium", category: "Pantry & Canned" },
  { name: "Vegetable broth", query: "vegetable broth low sodium", category: "Pantry & Canned", fdcId: "173933" },
  { name: "Coconut milk, canned", query: "coconut milk canned", category: "Pantry & Canned", fdcId: "170173" },
  { name: "Dijon mustard", query: "mustard prepared yellow", category: "Pantry & Canned" },
  { name: "Mayonnaise", query: "mayonnaise plain with soybean oil", category: "Pantry & Canned", fdcId: "173542" },
  { name: "Tahini", query: "tahini sesame seed paste", category: "Pantry & Canned" },
  { name: "Ketchup", query: "ketchup tomato", category: "Pantry & Canned" },

  // ── Baking ────────────────────────────────────────────────────
  { name: "Sugar, granulated", query: "sugar granulated", category: "Baking" },
  { name: "Brown sugar", query: "sugar brown", category: "Baking" },
  { name: "Baking powder", query: "leavening agents baking powder", category: "Baking" },
  { name: "Baking soda", query: "leavening agents baking soda", category: "Baking" },
  { name: "Vanilla extract", query: "vanilla extract", category: "Baking" },
  { name: "Cornstarch", query: "cornstarch", category: "Baking" },
  { name: "Cocoa powder, unsweetened", query: "cocoa dry powder unsweetened", category: "Baking" },
  { name: "Chocolate chips, semi-sweet", query: "chocolate semisweet chips", category: "Baking" },

  // ── Nuts & seeds ──────────────────────────────────────────────
  { name: "Almonds, raw", query: "nuts almonds raw", category: "Nuts & Seeds" },
  { name: "Walnuts, raw", query: "nuts walnuts english raw", category: "Nuts & Seeds" },
  { name: "Peanuts, raw", query: "peanuts all types raw", category: "Nuts & Seeds" },
  { name: "Chia seeds", query: "seeds chia dried", category: "Nuts & Seeds" },

  // ── Spices ────────────────────────────────────────────────────
  { name: "Salt, table", query: "salt table iodized", category: "Spices & Seasonings" },
  { name: "Black pepper, ground", query: "spices pepper black", category: "Spices & Seasonings" },
  { name: "Onion powder", query: "spices onion powder", category: "Spices & Seasonings" },
  { name: "Paprika", query: "spices paprika", category: "Spices & Seasonings" },
  // No discrete "smoked paprika" SR entry; use plain paprika as nutritional proxy.
  { name: "Smoked paprika", query: "spices paprika smoked", category: "Spices & Seasonings", fdcId: "171329" },
  { name: "Cinnamon, ground", query: "spices cinnamon ground", category: "Spices & Seasonings" },
  { name: "Oregano, dried", query: "spices oregano dried", category: "Spices & Seasonings" },
  { name: "Basil, dried", query: "spices basil dried", category: "Spices & Seasonings" },
  { name: "Bay leaves", query: "spices bay leaf", category: "Spices & Seasonings", fdcId: "170917" },
  { name: "Chili powder", query: "spices chili powder", category: "Spices & Seasonings" },
];

// ─────────────────────────────────────────────────────────────────────

async function usdaSearch(query: string): Promise<Array<{ fdcId: number; description: string; dataType: string }>> {
  const url = `${USDA_BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=10`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ⚠️  USDA search returned ${res.status} for "${query}"`);
    return [];
  }
  const data = await res.json() as { foods?: Array<{ fdcId: number; description: string; dataType: string }> };
  return data.foods ?? [];
}

async function usdaFetch(fdcId: string): Promise<unknown | null> {
  const url = `${USDA_BASE}/food/${encodeURIComponent(fdcId)}?api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

function pickBest(results: Array<{ fdcId: number; description: string; dataType: string }>): { fdcId: number; description: string; dataType: string } | null {
  if (results.length === 0) return null;
  // Prefer Foundation, then SR Legacy. Within each, take the first (search-ranked).
  const foundation = results.find((r) => r.dataType === "Foundation");
  if (foundation) return foundation;
  const srLegacy = results.find((r) => r.dataType === "SR Legacy");
  if (srLegacy) return srLegacy;
  return results[0];
}

function extractValue(response: { foodNutrients?: Array<{ nutrient?: { id?: number; name?: string }; amount?: number }> }, nutrientName: string): number | null {
  if (!Array.isArray(response.foodNutrients)) return null;
  for (const fn of response.foodNutrients) {
    const name = (fn.nutrient?.name ?? "").toLowerCase();
    if (name.includes(nutrientName.toLowerCase())) {
      if (typeof fn.amount === "number" && Number.isFinite(fn.amount)) {
        return Math.round(fn.amount * 10) / 10;
      }
    }
  }
  return null;
}

// USDA nutrient name → our `Nutrient.name` slug
const NUTRIENT_MAP: Array<{ usdaName: string; ourName: string }> = [
  { usdaName: "energy", ourName: "calories" },
  { usdaName: "total lipid (fat)", ourName: "fat" },
  { usdaName: "fatty acids, total saturated", ourName: "satFat" },
  { usdaName: "sodium, na", ourName: "sodium" },
  { usdaName: "carbohydrate, by difference", ourName: "carbs" },
  // Sugar handling is split — explicit precedence
  { usdaName: "sugars, total including nlea", ourName: "sugar" },
  // addedSugar handled separately via resolveAddedSugarFromUsda
  { usdaName: "protein", ourName: "protein" },
  { usdaName: "fiber, total dietary", ourName: "fiber" },
];

async function main() {
  console.log(`\nMode: ${DO_WRITE ? "WRITE" : "DRY-RUN (preview picks)"}\n`);
  console.log(`Curated list: ${STARTER_LIST.length} items\n`);

  const nutrients = await prisma.nutrient.findMany();
  const nutrientByName = new Map(nutrients.map((n) => [n.name, n]));
  const addedSugarNutrient = nutrientByName.get("addedSugar");

  let created = 0;
  let alreadyExists = 0;
  let skipped = 0;
  const picks: Array<{ name: string; pick: string | null }> = [];

  for (const item of STARTER_LIST) {
    // Build candidate fdcIds — explicit first if provided, then top search results
    let candidates: Array<{ fdcId: string; desc: string }> = [];
    if (item.fdcId) candidates.push({ fdcId: item.fdcId, desc: "(explicit)" });

    if (candidates.length === 0 || candidates[0].fdcId === item.fdcId) {
      const results = await usdaSearch(item.query);
      // Sort: Foundation first, then SR Legacy
      const foundation = results.filter((r) => r.dataType === "Foundation");
      const srLegacy = results.filter((r) => r.dataType === "SR Legacy");
      for (const r of [...foundation, ...srLegacy]) {
        candidates.push({ fdcId: String(r.fdcId), desc: `[${r.dataType}] ${r.description} (fdcId ${r.fdcId})` });
      }
      await new Promise((res) => setTimeout(res, 200));
    }

    if (candidates.length === 0) {
      console.log(`  ⚠️  no USDA match for "${item.name}" (query: ${item.query})`);
      picks.push({ name: item.name, pick: null });
      skipped++;
      continue;
    }

    // Try each candidate until one fetches successfully
    let fdcIdStr: string | null = null;
    let pickDesc = "";
    let responseData: unknown = null;

    for (const cand of candidates) {
      const existing = await prisma.globalIngredient.findUnique({ where: { fdcId: cand.fdcId } });
      if (existing) {
        // Already in GI — skip whole item
        alreadyExists++;
        console.log(`  ✓ ${item.name}  →  already in GI as #${existing.id}`);
        fdcIdStr = "__exists__";
        break;
      }

      if (!DO_WRITE) {
        // Dry-run: just show top pick, don't try to fetch
        fdcIdStr = cand.fdcId;
        pickDesc = cand.desc;
        break;
      }

      // Try cache first, then fetch
      const cached = await prisma.usdaFoodCache.findUnique({ where: { fdcId: cand.fdcId } });
      if (cached) {
        responseData = cached.response;
      } else {
        const fetched = await usdaFetch(cand.fdcId);
        if (!fetched) {
          console.log(`    ⚠️  ${item.name}: fdcId ${cand.fdcId} fetch failed — trying next candidate`);
          await new Promise((res) => setTimeout(res, 200));
          continue;
        }
        responseData = fetched;
        await prisma.usdaFoodCache.create({ data: { fdcId: cand.fdcId, response: responseData as object } });
        await new Promise((res) => setTimeout(res, 200));
      }

      fdcIdStr = cand.fdcId;
      pickDesc = cand.desc;
      break;
    }

    if (fdcIdStr === "__exists__") continue;
    if (!fdcIdStr) {
      console.log(`  ⚠️  ${item.name}: all candidates failed to fetch`);
      picks.push({ name: item.name, pick: null });
      skipped++;
      continue;
    }

    picks.push({ name: item.name, pick: pickDesc });
    console.log(`  + ${item.name}  →  ${pickDesc}`);
    if (!DO_WRITE) continue;

    // Create GlobalIngredient
    const gi = await prisma.globalIngredient.create({
      data: {
        fdcId: fdcIdStr,
        name: item.name,
        defaultUnit: item.unit ?? "g",
      },
    });

    // Populate nutrients
    const nutrientRows: Array<{ globalIngredientId: number; nutrientId: number; value: number }> = [];
    for (const map of NUTRIENT_MAP) {
      const nutrient = nutrientByName.get(map.ourName);
      if (!nutrient) continue;
      const value = extractValue(responseData as Parameters<typeof extractValue>[0], map.usdaName);
      if (value !== null) {
        nutrientRows.push({ globalIngredientId: gi.id, nutrientId: nutrient.id, value });
      }
    }

    // Added Sugar via the resolver (explicit value OR whole-food whitelist → 0)
    if (addedSugarNutrient) {
      const addedSugar = resolveAddedSugarFromUsda(responseData as Parameters<typeof resolveAddedSugarFromUsda>[0]);
      if (addedSugar !== null) {
        nutrientRows.push({ globalIngredientId: gi.id, nutrientId: addedSugarNutrient.id, value: addedSugar });
      }
    }

    if (nutrientRows.length > 0) {
      await prisma.globalIngredientNutrient.createMany({ data: nutrientRows });
    }

    created++;
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`Summary:`);
  console.log(`  ✓ already in GI: ${alreadyExists}`);
  console.log(`  + created:       ${created}`);
  console.log(`  ⚠ skipped:       ${skipped}`);

  if (!DO_WRITE) {
    console.log(`\n(dry-run — re-run with --write to populate)`);
  }
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

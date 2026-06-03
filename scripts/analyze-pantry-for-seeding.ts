/**
 * Analyze the user's pantry to find candidate starter ingredients.
 *
 * Surfaces USDA-sourced ingredients (source='usda' or has fdcId) that:
 *   - Are present in GlobalIngredient (so seeding can copy from there)
 *   - Appear in the most recipes (= most-used staples)
 *
 * Groups by category for food-group coverage. Output is a sorted candidate
 * list per category — you pick which 25-35 you want to seed with.
 *
 *   npx tsx scripts/analyze-pantry-for-seeding.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Pull all USDA-sourced household ingredients with their recipe usage
  const ingredients = await prisma.ingredient.findMany({
    where: {
      source: "usda",
      fdcId: { not: null },
    },
    select: {
      id: true,
      name: true,
      category: true,
      fdcId: true,
      _count: { select: { recipeIngredients: true } },
    },
  });

  // Filter to ones that also exist in GlobalIngredient (so seeding works)
  const fdcIds = ingredients.map((i) => i.fdcId!).filter(Boolean);
  const globals = await prisma.globalIngredient.findMany({
    where: { fdcId: { in: fdcIds } },
    select: { id: true, fdcId: true, name: true },
  });
  const globalByFdcId = new Map(globals.map((g) => [g.fdcId, g]));

  const candidates = ingredients
    .filter((i) => i.fdcId && globalByFdcId.has(i.fdcId))
    .map((i) => ({
      name: i.name,
      category: i.category || "Uncategorized",
      fdcId: i.fdcId!,
      globalId: globalByFdcId.get(i.fdcId!)!.id,
      recipeCount: i._count.recipeIngredients,
    }))
    .sort((a, b) => b.recipeCount - a.recipeCount);

  console.log(`\n${candidates.length} USDA-sourced ingredients have a GlobalIngredient match.\n`);

  // Group by category
  const byCategory: Record<string, typeof candidates> = {};
  for (const c of candidates) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }

  const orderedCats = Object.keys(byCategory).sort((a, b) =>
    byCategory[b].length - byCategory[a].length
  );

  console.log(`──────────────────────────────────────`);
  console.log(`Category counts (USDA-sourced + cookable):\n`);
  for (const cat of orderedCats) {
    console.log(`  ${String(byCategory[cat].length).padStart(4)} — ${cat}`);
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`Top candidates by recipe usage, grouped by category:`);
  console.log(`(format: [usage] name → globalId / fdcId)\n`);

  for (const cat of orderedCats) {
    const rows = byCategory[cat];
    if (rows.length === 0) continue;
    console.log(`\n§ ${cat.toUpperCase()}`);
    for (const c of rows.slice(0, 12)) {
      const usage = String(c.recipeCount).padStart(3);
      console.log(`  [${usage}]  ${c.name}  →  g:${c.globalId} f:${c.fdcId}`);
    }
    if (rows.length > 12) console.log(`  …and ${rows.length - 12} more`);
  }

  // ── Suggested starter set ─────────────────────────────────────
  // Pick top N from each category aiming for food-group coverage
  const STARTER_TARGETS: Record<string, number> = {
    "Produce": 8,
    "Meat & Fish": 4,
    "Dairy & Eggs": 3,
    "Pantry": 4,
    "Spices & Herbs": 6,
    "Grains & Pasta": 3,
    "Baking": 3,
  };

  console.log(`\n\n──────────────────────────────────────`);
  console.log(`PROPOSED STARTER SET (top-N per food group):\n`);

  const starter: typeof candidates = [];
  for (const [cat, n] of Object.entries(STARTER_TARGETS)) {
    const rows = byCategory[cat] ?? [];
    if (rows.length === 0) {
      console.log(`  (skipping ${cat} — no USDA ingredients in this category)`);
      continue;
    }
    const picks = rows.slice(0, n);
    starter.push(...picks);
    console.log(`\n§ ${cat.toUpperCase()}  (taking top ${picks.length} of ${rows.length})`);
    for (const c of picks) console.log(`  • ${c.name}`);
  }

  console.log(`\nTotal starter set: ${starter.length} ingredients`);
  console.log(`\nglobalIngredientIds (for lib/pantry-seed.ts):`);
  console.log(`  [${starter.map((s) => s.globalId).join(", ")}]`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

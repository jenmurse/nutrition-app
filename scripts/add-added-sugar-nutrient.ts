/**
 * One-time setup for added-sugar tracking.
 *
 * 1. Inserts the "addedSugar" Nutrient row (idempotent — skips if exists).
 * 2. Renumbers protein/fiber orderIndex to 7/8 so addedSugar can sit at 6.
 * 3. Backfills GlobalIngredientNutrient with addedSugar=0 for every
 *    GlobalIngredient whose cached USDA foodCategory is in the whole-food
 *    whitelist. Idempotent — skips if a row already exists.
 *
 * Safe to run multiple times. Run against production via:
 *   npx tsx scripts/add-added-sugar-nutrient.ts
 */

import { PrismaClient } from "@prisma/client";
import { WHITELISTED_USDA_CATEGORIES } from "../lib/usdaAddedSugar";

const prisma = new PrismaClient();

async function main() {
  // ── 1. Insert/find the addedSugar Nutrient row ─────────────────
  let nutrient = await prisma.nutrient.findUnique({ where: { name: "addedSugar" } });
  if (!nutrient) {
    nutrient = await prisma.nutrient.create({
      data: {
        name: "addedSugar",
        displayName: "Added Sugar",
        unit: "g",
        orderIndex: 6,
      },
    });
    console.log(`✓ Created Nutrient #${nutrient.id} addedSugar (orderIndex 6)`);
  } else {
    console.log(`• Nutrient addedSugar already exists (id ${nutrient.id})`);
  }

  // ── 2. Renumber protein & fiber so addedSugar slots cleanly ────
  const protein = await prisma.nutrient.findUnique({ where: { name: "protein" } });
  const fiber = await prisma.nutrient.findUnique({ where: { name: "fiber" } });
  if (protein && protein.orderIndex !== 7) {
    await prisma.nutrient.update({ where: { id: protein.id }, data: { orderIndex: 7 } });
    console.log(`✓ Set protein.orderIndex 7`);
  }
  if (fiber && fiber.orderIndex !== 8) {
    await prisma.nutrient.update({ where: { id: fiber.id }, data: { orderIndex: 8 } });
    console.log(`✓ Set fiber.orderIndex 8`);
  }

  // ── 3. Backfill GlobalIngredient for whole-food categories ────
  const globals = await prisma.globalIngredient.findMany({
    select: { id: true, fdcId: true, name: true },
  });
  console.log(`Scanning ${globals.length} GlobalIngredients…`);

  let created = 0, skippedExisting = 0, skippedNoCategory = 0, skippedNotWhitelisted = 0, skippedNoCache = 0;

  for (const gi of globals) {
    // Skip if a row already exists for this ingredient+nutrient
    const existing = await prisma.globalIngredientNutrient.findUnique({
      where: {
        globalIngredientId_nutrientId: {
          globalIngredientId: gi.id,
          nutrientId: nutrient.id,
        },
      },
    });
    if (existing) { skippedExisting++; continue; }

    // Look up the USDA cache to find its category
    const cache = await prisma.usdaFoodCache.findUnique({ where: { fdcId: gi.fdcId } });
    if (!cache) { skippedNoCache++; continue; }

    const response = cache.response as { foodCategory?: { description?: string } | null };
    const category = response?.foodCategory?.description;
    if (!category) { skippedNoCategory++; continue; }
    if (!WHITELISTED_USDA_CATEGORIES.has(category)) { skippedNotWhitelisted++; continue; }

    await prisma.globalIngredientNutrient.create({
      data: {
        globalIngredientId: gi.id,
        nutrientId: nutrient.id,
        value: 0,
      },
    });
    created++;
  }

  console.log(`\nGlobalIngredient backfill summary:`);
  console.log(`  ✓ created: ${created}`);
  console.log(`  • already had value: ${skippedExisting}`);
  console.log(`  • not whitelisted category: ${skippedNotWhitelisted}`);
  console.log(`  • no category on cache: ${skippedNoCategory}`);
  console.log(`  • no cached USDA response: ${skippedNoCache}`);

  // ── 4. Backfill household Ingredient rows ──────────────────────
  // Same logic, but for the household-scoped Ingredient table. Each row
  // with an fdcId is checked against the USDA cache + whitelist. Without
  // this step, every user's existing pantry would show `—` on day one.
  const ingredients = await prisma.ingredient.findMany({
    where: { fdcId: { not: null } },
    select: { id: true, fdcId: true, name: true },
  });
  console.log(`\nScanning ${ingredients.length} household Ingredient rows with fdcId…`);

  let iCreated = 0, iExisting = 0, iNoCat = 0, iNotWl = 0, iNoCache = 0;

  for (const ing of ingredients) {
    if (!ing.fdcId) continue;
    const existing = await prisma.ingredientNutrient.findUnique({
      where: { ingredientId_nutrientId: { ingredientId: ing.id, nutrientId: nutrient.id } },
    });
    if (existing) { iExisting++; continue; }

    const cache = await prisma.usdaFoodCache.findUnique({ where: { fdcId: ing.fdcId } });
    if (!cache) { iNoCache++; continue; }
    const response = cache.response as { foodCategory?: { description?: string } | null };
    const category = response?.foodCategory?.description;
    if (!category) { iNoCat++; continue; }
    if (!WHITELISTED_USDA_CATEGORIES.has(category)) { iNotWl++; continue; }

    await prisma.ingredientNutrient.create({
      data: { ingredientId: ing.id, nutrientId: nutrient.id, value: 0 },
    });
    iCreated++;
  }

  console.log(`\nIngredient backfill summary:`);
  console.log(`  ✓ created: ${iCreated}`);
  console.log(`  • already had value: ${iExisting}`);
  console.log(`  • not whitelisted category: ${iNotWl}`);
  console.log(`  • no category on cache: ${iNoCat}`);
  console.log(`  • no cached USDA response: ${iNoCache}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

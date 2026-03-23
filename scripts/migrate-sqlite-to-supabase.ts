/**
 * One-time migration: SQLite → Supabase PostgreSQL
 *
 * Migrates: all Ingredients (with nutrient values) + all Recipes (with recipe ingredients)
 * Skips: MealPlans, MealLogs, NutritionGoals, GlobalNutritionGoals (test data)
 *
 * Prerequisites:
 *   1. DATABASE_URL in .env.local must point to Supabase (not SQLite)
 *   2. prisma migrate deploy (or db push) must have been run against Supabase
 *   3. prisma db seed must have been run (to create Nutrients)
 *   4. The old SQLite file must exist at ./prisma/dev.db
 *
 * Run:
 *   npx ts-node --esm scripts/migrate-sqlite-to-supabase.ts
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../prisma/dev.db");

if (!fs.existsSync(dbPath)) {
  console.error(`SQLite file not found at ${dbPath}`);
  process.exit(1);
}

const sqlite = new Database(dbPath, { readonly: true });
const prisma = new PrismaClient();

async function main() {
  // --- Ingredients ---
  const ingredients = sqlite.prepare("SELECT * FROM Ingredient").all() as any[];
  console.log(`Migrating ${ingredients.length} ingredients...`);

  for (const ing of ingredients) {
    const nutrientValues = sqlite
      .prepare("SELECT * FROM IngredientNutrient WHERE ingredientId = ?")
      .all(ing.id) as any[];

    // Upsert so re-running is safe
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: {},
      create: {
        name: ing.name,
        fdcId: ing.fdcId ?? null,
        defaultUnit: ing.defaultUnit ?? "g",
        customUnitName: ing.customUnitName ?? null,
        customUnitAmount: ing.customUnitAmount ?? null,
        customUnitGrams: ing.customUnitGrams ?? null,
        isMealItem: Boolean(ing.isMealItem),
        nutrientValues: {
          create: nutrientValues.map((nv) => ({
            nutrientId: nv.nutrientId,
            value: nv.value,
          })),
        },
      },
    });
  }
  console.log(`✓ ${ingredients.length} ingredients migrated`);

  // Build old→new ingredient ID map (needed for recipe ingredients)
  const allNewIngredients = await prisma.ingredient.findMany({ select: { id: true, name: true } });
  const nameToNewId = new Map(allNewIngredients.map((i) => [i.name, i.id]));
  const oldIngredients = sqlite.prepare("SELECT id, name FROM Ingredient").all() as any[];
  const oldIdToNewId = new Map(oldIngredients.map((i) => [i.id, nameToNewId.get(i.name)]));

  // --- Recipes ---
  const recipes = sqlite.prepare("SELECT * FROM Recipe").all() as any[];
  console.log(`Migrating ${recipes.length} recipes...`);

  for (const r of recipes) {
    const recipeIngredients = sqlite
      .prepare("SELECT * FROM RecipeIngredient WHERE recipeId = ?")
      .all(r.id) as any[];

    await prisma.recipe.create({
      data: {
        name: r.name,
        servingSize: r.servingSize,
        servingUnit: r.servingUnit ?? "servings",
        instructions: r.instructions ?? "",
        sourceApp: r.sourceApp ?? null,
        isComplete: Boolean(r.isComplete),
        tags: r.tags ?? "",
        prepTime: r.prepTime ?? null,
        cookTime: r.cookTime ?? null,
        image: r.image ?? null,
        optimizeAnalysis: r.optimizeAnalysis ?? null,
        mealPrepAnalysis: r.mealPrepAnalysis ?? null,
        analysisModel: r.analysisModel ?? null,
        analyzedAt: r.analyzedAt ? new Date(r.analyzedAt) : null,
        ingredients: {
          create: recipeIngredients
            .filter((ri) => oldIdToNewId.has(ri.ingredientId))
            .map((ri) => ({
              ingredientId: oldIdToNewId.get(ri.ingredientId)!,
              quantity: ri.quantity,
              unit: ri.unit,
              conversionGrams: ri.conversionGrams ?? null,
              notes: ri.notes ?? null,
            })),
        },
      },
    });
  }
  console.log(`✓ ${recipes.length} recipes migrated`);
  console.log("\nMigration complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); sqlite.close(); });

/**
 * Pantry seeding — copies the curated starter set from GlobalIngredient into
 * a household's Ingredient table on first-time onboarding completion.
 *
 * Idempotent: skips if the household already has any ingredients (don't
 * disturb users who've started populating their own).
 *
 * Failure to seed should never block onboarding — wrap the call in try/catch
 * at the call site.
 */

import { prisma } from "@/lib/db";
import { STARTER_PANTRY, STARTER_MEAL_ITEM_NAMES } from "@/lib/starter-pantry";

export type SeedResult = {
  seeded: number;
  skipped: "alreadyHasIngredients" | "ok";
};

export async function seedPantryForHousehold(householdId: number): Promise<SeedResult> {
  // Idempotency: don't seed if the household already has ingredients.
  const existingCount = await prisma.ingredient.count({ where: { householdId } });
  if (existingCount > 0) {
    return { seeded: 0, skipped: "alreadyHasIngredients" };
  }

  // Resolve starter names → category map.
  const categoryByName = new Map(STARTER_PANTRY.map((s) => [s.name, s.category]));
  const wantedNames = Array.from(categoryByName.keys());

  // Fetch matching GlobalIngredients + their nutrient rows in one query.
  const globals = await prisma.globalIngredient.findMany({
    where: { name: { in: wantedNames } },
    include: { nutrients: true },
  });

  if (globals.length === 0) return { seeded: 0, skipped: "ok" };

  // Copy each global into a household-scoped Ingredient row.
  // Use createMany would be faster but we need the nested nutrient writes,
  // so a sequential loop in a transaction keeps it atomic.
  let seeded = 0;
  await prisma.$transaction(async (tx) => {
    for (const gi of globals) {
      await tx.ingredient.create({
        data: {
          householdId,
          name: gi.name,
          fdcId: gi.fdcId,
          source: "usda",
          defaultUnit: gi.defaultUnit,
          customUnitName: gi.customUnitName,
          customUnitAmount: gi.customUnitAmount,
          customUnitGrams: gi.customUnitGrams,
          category: categoryByName.get(gi.name) ?? "",
          // Only genuine standalone meal items (snacks, eat-as-is foods) show
          // in the planner's add-meal picker. Was hardcoded `true` for ALL
          // seeded items, which flooded the picker with flour, oils, spices.
          isMealItem: STARTER_MEAL_ITEM_NAMES.has(gi.name),
          nutrientValues: {
            create: gi.nutrients.map((n) => ({
              nutrientId: n.nutrientId,
              value: n.value,
            })),
          },
        },
      });
      seeded++;
    }
  });

  return { seeded, skipped: "ok" };
}

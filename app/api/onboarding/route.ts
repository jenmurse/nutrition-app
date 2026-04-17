import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * GET /api/onboarding — Returns getting-started checklist status.
 * Single call to check all first-use milestones.
 */
export const GET = withAuth(async (auth) => {
  const [recipeCount, ingredientCount, mealPlanCount, goalsCount, mcpKey] =
    await Promise.all([
      prisma.recipe.count({ where: { householdId: auth.householdId } }),
      prisma.ingredient.count({ where: { householdId: auth.householdId } }),
      prisma.mealPlan.count({ where: { householdId: auth.householdId } }),
      prisma.globalNutritionGoal.count({
        where: { householdId: auth.householdId, personId: auth.personId },
      }),
      prisma.systemSetting.findFirst({
        where: { householdId: auth.householdId, key: "mcpApiToken" },
        select: { value: true },
      }),
    ]);

  return NextResponse.json({
    hasGoals: goalsCount > 0,
    hasRecipe: recipeCount > 0,
    hasIngredient: ingredientCount > 0,
    hasMealPlan: mealPlanCount > 0,
    hasMcp: !!(mcpKey?.value),
  });
});

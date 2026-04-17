import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { convertToGrams, getIngredientDensity } from "../../../lib/unitConversion";
import { withAuth } from "@/lib/apiUtils";
import { computeRecipeServingTotals } from "@/lib/nutritionCalculations";

export const GET = withAuth(async (auth, request: Request) => {
  const slim = new URL(request.url).searchParams.get("slim") === "true";

  const favoriteRows = await prisma.recipeFavorite.findMany({
    where: { personId: auth.personId },
    select: { recipeId: true },
  });
  const favoriteSet = new Set(favoriteRows.map((f) => f.recipeId));

  if (slim) {
    const recipes = await prisma.recipe.findMany({
      where: { householdId: auth.householdId },
      select: {
        id: true, name: true, image: true, tags: true,
        prepTime: true, cookTime: true, servingSize: true,
        servingUnit: true, isComplete: true, instructions: true,
        sourceApp: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(recipes.map((r) => ({ ...r, totals: [], isFavorited: favoriteSet.has(r.id) })));
  }

  const recipes = await prisma.recipe.findMany({
    where: { householdId: auth.householdId },
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: { nutrientValues: { include: { nutrient: true } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const recipesWithTotals = recipes.map((recipe) => ({
    ...recipe,
    totals: computeRecipeServingTotals(recipe.ingredients, recipe.servingSize),
    isFavorited: favoriteSet.has(recipe.id),
  }));

  return NextResponse.json(recipesWithTotals);
}, "Failed to fetch recipes");

export const POST = withAuth(async (auth, request: Request) => {
  try {
    const body = await request.json();
    const { name, servingSize = 1, servingUnit = "servings", instructions = "", sourceApp, tags = "", prepTime, cookTime, image, ingredients = [] } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const imageVal = typeof image === "string" && image.trim() ? image.trim() : null;

    const recipe = await prisma.recipe.create({
      data: {
        name,
        servingSize: Number(servingSize),
        servingUnit,
        instructions,
        sourceApp,
        tags: typeof tags === "string" ? tags : "",
        prepTime: prepTime != null ? Number(prepTime) : null,
        cookTime: cookTime != null ? Number(cookTime) : null,
        image: imageVal,
        householdId: auth.householdId,
      },
    });

    if (ingredients.length > 0) {
      const ingredientIds = ingredients.map((ri: { ingredientId: string | number }) => {
        const id = Number(ri.ingredientId);
        if (isNaN(id)) throw new Error(`Invalid ingredient ID: ${ri.ingredientId}`);
        return id;
      });

      const fetchedIngredients = await prisma.ingredient.findMany({
        where: { id: { in: ingredientIds } },
      });
      const ingredientMap = new Map(fetchedIngredients.map((i) => [i.id, i]));

      const recipeIngredientData = ingredients.map((ri: { ingredientId: string | number; quantity?: number; unit?: string; notes?: string; section?: string | null }) => {
        const ingredientId = Number(ri.ingredientId);
        const quantity = Number(ri.quantity) || 0;
        const unit = ri.unit || "g";
        const ingredient = ingredientMap.get(ingredientId);
        if (!ingredient) throw new Error(`Ingredient not found: ${ingredientId}`);
        const density = getIngredientDensity(ingredient.name);
        const grams = convertToGrams(quantity, unit, density, ingredient);
        return { recipeId: recipe.id, ingredientId, quantity, unit, conversionGrams: grams, notes: ri.notes || null, section: ri.section || null };
      });

      await prisma.recipeIngredient.createMany({ data: recipeIngredientData });
    }

    const created = await prisma.recipe.findUnique({ where: { id: recipe.id }, include: { ingredients: true } });
    return NextResponse.json(created);
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create recipe: ${msg}` }, { status: 500 });
  }
});

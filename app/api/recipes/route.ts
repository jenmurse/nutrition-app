import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { convertToGrams, getIngredientDensity } from "../../../lib/unitConversion";

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: { include: { ingredient: { include: { nutrientValues: { include: { nutrient: true } } } } } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(recipes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      servingSize = 1,
      servingUnit = "servings",
      instructions = "",
      sourceApp = null,
      isComplete = true,
      ingredients = [],
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const recipe = await prisma.recipe.create({
      data: {
        name: name.trim(),
        servingSize: Number(servingSize) || 1,
        servingUnit: servingUnit?.trim() || "servings",
        instructions: instructions?.trim() || "",
        sourceApp: sourceApp?.trim() || null,
        isComplete: !!isComplete,
      },
    });

    // create recipe ingredients
    for (const ri of ingredients) {
      const ingredientId = ri.ingredientId ? Number(ri.ingredientId) : null;
      const quantity = Number(ri.quantity) || 0;
      const unit = typeof ri.unit === "string" ? ri.unit : "";
      const originalText = typeof ri.originalText === "string" ? ri.originalText : null;

      let grams: number | null = null;
      if (ingredientId) {
        const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
        if (!ingredient) {
          throw new Error(`Ingredient not found: ${ingredientId}`);
        }
        const density = getIngredientDensity(ingredient.name);
        grams = convertToGrams(quantity, unit || ingredient.defaultUnit || "g", density, ingredient);
      }

      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId,
          quantity,
          unit,
          conversionGrams: grams,
          notes: ri.notes || null,
          originalText,
        },
      });
    }

    const created = await prisma.recipe.findUnique({ where: { id: recipe.id }, include: { ingredients: true } });
    return NextResponse.json(created);
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create recipe: ${msg}` }, { status: 500 });
  }
}

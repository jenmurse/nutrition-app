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
    const { name, servingSize = 1, servingUnit = "servings", instructions = "", sourceApp, tags = "", ingredients = [] } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const recipe = await prisma.recipe.create({
      data: { 
        name, 
        servingSize: Number(servingSize), 
        servingUnit, 
        instructions, 
        sourceApp,
        tags: typeof tags === "string" ? tags : "",
      },
    });

    // create recipe ingredients
    for (const ri of ingredients) {
      const ingredientId = Number(ri.ingredientId);
      const quantity = Number(ri.quantity) || 0;
      const unit = ri.unit || "g";

      if (isNaN(ingredientId)) {
        throw new Error(`Invalid ingredient ID: ${ri.ingredientId}`);
      }

      const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
      if (!ingredient) {
        throw new Error(`Ingredient not found: ${ingredientId}`);
      }

      const density = getIngredientDensity(ingredient.name);
      const grams = convertToGrams(quantity, unit, density, ingredient);

      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId,
          quantity,
          unit,
          conversionGrams: grams,
          notes: ri.notes || null,
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

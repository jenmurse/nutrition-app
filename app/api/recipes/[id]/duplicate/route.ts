import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);

    // Fetch the original recipe with all ingredients
    const originalRecipe = await prisma.recipe.findUnique({
      where: { id: numId },
      include: {
        ingredients: true,
      },
    });

    if (!originalRecipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Create a new recipe with "Copy of" prefix
    const newRecipe = await prisma.recipe.create({
      data: {
        name: `Copy of ${originalRecipe.name}`,
        servingSize: originalRecipe.servingSize,
        servingUnit: originalRecipe.servingUnit,
        instructions: originalRecipe.instructions,
        sourceApp: originalRecipe.sourceApp,
        isComplete: originalRecipe.isComplete,
        tags: originalRecipe.tags,
        image: originalRecipe.image,
      },
    });

    // Duplicate all ingredients
    for (const ingredient of originalRecipe.ingredients) {
      await prisma.recipeIngredient.create({
        data: {
          recipeId: newRecipe.id,
          ingredientId: ingredient.ingredientId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          conversionGrams: ingredient.conversionGrams,
          notes: ingredient.notes,
        },
      });
    }

    // Fetch the newly created recipe with all details
    const createdRecipe = await prisma.recipe.findUnique({
      where: { id: newRecipe.id },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    });

    return NextResponse.json({ recipe: createdRecipe, originalRecipeId: numId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to duplicate recipe" }, { status: 500 });
  }
}

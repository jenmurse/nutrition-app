import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { withAuth } from "@/lib/apiUtils";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (auth, request: Request, { params }: Ctx) => {
  const { id } = await params;
  const numId = Number(id);

  // Fetch the original recipe with all ingredients
  const originalRecipe = await prisma.recipe.findUnique({
    where: { id: numId },
    include: {
      ingredients: true,
    },
  });

  if (!originalRecipe || originalRecipe.householdId !== auth.householdId) {
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
      householdId: auth.householdId,
    },
  });

  // Duplicate all ingredients in one batch
  if (originalRecipe.ingredients.length > 0) {
    await prisma.recipeIngredient.createMany({
      data: originalRecipe.ingredients.map((ingredient) => ({
        recipeId: newRecipe.id,
        ingredientId: ingredient.ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        conversionGrams: ingredient.conversionGrams,
        notes: ingredient.notes,
      })),
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
}, "Failed to duplicate recipe");

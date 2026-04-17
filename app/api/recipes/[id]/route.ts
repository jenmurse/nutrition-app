import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { withAuth } from "@/lib/apiUtils";
import { computeRecipeServingTotals } from "@/lib/nutritionCalculations";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, _request: Request, { params }: Ctx) => {
  const { id } = await params;
  const numId = Number(id);
  const recipe = await prisma.recipe.findUnique({
    where: { id: numId },
    include: {
      ingredients: { include: { ingredient: { include: { nutrientValues: { include: { nutrient: true } } } } } },
    },
  });
  if (!recipe || recipe.householdId !== auth.householdId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [totalsResult, favoriteRow] = await Promise.all([
    Promise.resolve(computeRecipeServingTotals(recipe.ingredients, recipe.servingSize)),
    prisma.recipeFavorite.findUnique({
      where: { recipeId_personId: { recipeId: numId, personId: auth.personId } },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({ recipe, totals: totalsResult, isFavorited: !!favoriteRow });
}, "Failed to fetch recipe");

export const DELETE = withAuth(async (auth, _request: Request, { params }: Ctx) => {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id: Number(id) } });
  if (!recipe || recipe.householdId !== auth.householdId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipe.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}, "Failed to delete");

export const PUT = withAuth(async (auth, request: Request, { params }: Ctx) => {
  const { id } = await params;
  const numId = Number(id);

  const existingRecipe = await prisma.recipe.findUnique({ where: { id: numId } });
  if (!existingRecipe || existingRecipe.householdId !== auth.householdId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { name, servingSize, servingUnit, instructions, ingredients, isComplete, sourceApp, tags, prepTime, cookTime, image, optimizeAnalysis, mealPrepAnalysis } = body;

  const imageVal = image !== undefined
    ? (typeof image === "string" && image.trim() ? image.trim() : null)
    : undefined;

  await prisma.recipe.update({
    where: { id: numId },
    data: {
      name,
      servingSize,
      servingUnit,
      instructions,
      isComplete: isComplete !== undefined ? Boolean(isComplete) : undefined,
      sourceApp,
      optimizeAnalysis: optimizeAnalysis !== undefined ? optimizeAnalysis : undefined,
      mealPrepAnalysis: mealPrepAnalysis !== undefined ? mealPrepAnalysis : undefined,
      tags: typeof tags === "string" ? tags : undefined,
      prepTime: prepTime != null ? Number(prepTime) : null,
      cookTime: cookTime != null ? Number(cookTime) : null,
      ...(imageVal !== undefined && { image: imageVal }),
    },
  });

  if (Array.isArray(ingredients)) {
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: numId } });
    const data = ingredients
      .filter((ri) => ri.ingredientId)
      .map((ri) => ({
        recipeId: numId,
        ingredientId: Number(ri.ingredientId),
        quantity: Number(ri.quantity) || 0,
        unit: typeof ri.unit === "string" ? ri.unit : "",
        conversionGrams: ri.conversionGrams ?? null,
        notes: ri.notes ?? null,
        section: ri.section ?? null,
      }));
    if (data.length > 0) await prisma.recipeIngredient.createMany({ data });
  }

  const updated = await prisma.recipe.findUnique({
    where: { id: numId },
    include: { ingredients: { include: { ingredient: true } } },
  });
  return NextResponse.json(updated);
}, "Failed to update recipe");

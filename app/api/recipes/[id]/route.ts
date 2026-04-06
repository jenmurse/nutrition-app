import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
      Promise.resolve((() => {
        const totals: Record<number, { nutrientId: number; displayName: string; value: number; unit: string }> = {};
        for (const ri of recipe.ingredients) {
          if (!ri.ingredient) continue;
          const grams = ri.conversionGrams ?? 0;
          for (const iv of ri.ingredient.nutrientValues) {
            const nid = iv.nutrient.id;
            const contribution = (iv.value * grams) / 100.0;
            if (!totals[nid]) totals[nid] = { nutrientId: nid, displayName: iv.nutrient.displayName, value: 0, unit: iv.nutrient.unit };
            totals[nid].value += contribution;
          }
        }
        const servingSize = recipe.servingSize || 1;
        for (const nid in totals) totals[nid].value /= servingSize;
        return Object.values(totals);
      })()),
      prisma.recipeFavorite.findUnique({
        where: { recipeId_personId: { recipeId: numId, personId: auth.personId } },
        select: { id: true },
      }),
    ]);

    return NextResponse.json({ recipe, totals: totalsResult, isFavorited: !!favoriteRow });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({ where: { id: Number(id) } });
    if (!recipe || recipe.householdId !== auth.householdId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.recipe.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
      for (const ri of ingredients) {
        if (!ri.ingredientId) continue;
        await prisma.recipeIngredient.create({
          data: {
            recipeId: numId,
            ingredientId: Number(ri.ingredientId),
            quantity: Number(ri.quantity) || 0,
            unit: typeof ri.unit === "string" ? ri.unit : "",
            conversionGrams: ri.conversionGrams ?? null,
            notes: ri.notes ?? null,
            section: ri.section ?? null,
          },
        });
      }
    }

    const updated = await prisma.recipe.findUnique({
      where: { id: numId },
      include: { ingredients: { include: { ingredient: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 });
  }
}

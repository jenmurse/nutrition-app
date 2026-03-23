import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const recipe = await prisma.recipe.findUnique({
      where: { id: numId },
      include: {
        ingredients: { include: { ingredient: { include: { nutrientValues: { include: { nutrient: true } } } } } },
      },
    });
    if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

    return NextResponse.json({ recipe, totals: Object.values(totals) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.recipe.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();
    const { name, servingSize, servingUnit, instructions, ingredients, isComplete, sourceApp, tags, prepTime, cookTime, image } = body;

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
        isComplete: Boolean(isComplete),
        sourceApp,
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

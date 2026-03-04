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

    // calculate totals
    const totals: Record<number, { nutrientId: number; displayName: string; value: number; unit: string }> = {};

    for (const ri of recipe.ingredients) {
      if (!ri.ingredient) continue;
      const grams = ri.conversionGrams ?? 0;
      const ing = ri.ingredient;
      for (const iv of ing.nutrientValues) {
        const nid = iv.nutrient.id;
        const per100g = iv.value || 0;
        const contribution = (per100g * grams) / 100.0;
        if (!totals[nid]) totals[nid] = { nutrientId: nid, displayName: iv.nutrient.displayName, value: 0, unit: iv.nutrient.unit };
        totals[nid].value += contribution;
      }
    }

    // Divide by serving size to get per-serving nutrition
    const servingSize = recipe.servingSize || 1;
    for (const nid in totals) {
      totals[nid].value = totals[nid].value / servingSize;
    }

    const totalsArray = Object.values(totals);

    return NextResponse.json({ recipe, totals: totalsArray });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    await prisma.recipe.delete({ where: { id: numId } });
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
    const { name, servingSize, servingUnit, instructions, ingredients, isComplete, sourceApp, tags, prepTime, cookTime } = body;

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
      },
    });

    if (Array.isArray(ingredients)) {
      // replace recipe ingredients
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: numId } });
      for (const ri of ingredients) {
        if (!ri.ingredientId) continue; // Skip if no ingredient ID
        const ingredientId = Number(ri.ingredientId);
        const quantity = Number(ri.quantity) || 0;
        const unit = typeof ri.unit === "string" ? ri.unit : "";

        await prisma.recipeIngredient.create({
          data: {
            recipeId: numId,
            ingredientId,
            quantity,
            unit,
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

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: numId },
      include: { nutrientValues: { include: { nutrient: true } } },
    });
    if (!ingredient) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ingredient);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch ingredient" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    const body = await request.json();
    const { name, fdcId, defaultUnit, customUnitName, customUnitAmount, customUnitGrams, nutrientValues } = body;
    const isCustomUnit = ["other", "tsp", "tbsp", "cup"].includes(defaultUnit);

    const updated = await prisma.ingredient.update({
      where: { id: numId },
      data: {
        name,
        fdcId: fdcId || null,
        defaultUnit: defaultUnit || "g",
        customUnitName: isCustomUnit ? customUnitName : null,
        customUnitAmount: isCustomUnit ? customUnitAmount : null,
        customUnitGrams: isCustomUnit ? customUnitGrams : null,
      },
    });

    if (Array.isArray(nutrientValues)) {
      // replace existing nutrient values for this ingredient
      await prisma.ingredientNutrient.deleteMany({ where: { ingredientId: numId } });
      const data = nutrientValues.map((nv: any) => ({
        ingredientId: numId,
        nutrientId: nv.nutrientId,
        value: nv.value,
      }));
      if (data.length > 0) await prisma.ingredientNutrient.createMany({ data });
    }

    const result = await prisma.ingredient.findUnique({
      where: { id: numId },
      include: { nutrientValues: { include: { nutrient: true } } },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    // Delete related records explicitly to handle cascading
    await prisma.ingredientNutrient.deleteMany({ where: { ingredientId: numId } });
    await prisma.recipeIngredient.deleteMany({ where: { ingredientId: numId } });
    await prisma.ingredient.delete({ where: { id: numId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

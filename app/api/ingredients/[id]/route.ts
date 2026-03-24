import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const numId = Number(id);
    const ingredient = await prisma.ingredient.findFirst({
      where: { id: numId, householdId: auth.householdId },
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
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const numId = Number(id);

    // Verify the ingredient belongs to this household
    const existing = await prisma.ingredient.findFirst({
      where: { id: numId, householdId: auth.householdId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { name, fdcId, defaultUnit, customUnitName, customUnitAmount, customUnitGrams, isMealItem, nutrientValues } = body;

    // Only include fields that were actually provided
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (fdcId !== undefined) updateData.fdcId = fdcId || null;
    if (defaultUnit !== undefined) updateData.defaultUnit = defaultUnit;
    if (customUnitName !== undefined) updateData.customUnitName = customUnitName;
    if (customUnitAmount !== undefined) updateData.customUnitAmount = customUnitAmount;
    if (customUnitGrams !== undefined) updateData.customUnitGrams = customUnitGrams;
    if (isMealItem !== undefined) updateData.isMealItem = Boolean(isMealItem);

    if (Object.keys(updateData).length > 0) {
      await prisma.ingredient.update({
        where: { id: numId },
        data: updateData,
      });
    }

    if (Array.isArray(nutrientValues)) {
      // replace existing nutrient values for this ingredient
      console.log(`Deleting existing nutrients for ingredient ${numId}`);
      await prisma.ingredientNutrient.deleteMany({ where: { ingredientId: numId } });
      const data = nutrientValues.map((nv: any) => ({
        ingredientId: numId,
        nutrientId: nv.nutrientId,
        value: nv.value,
      }));
      console.log(`Creating ${data.length} new nutrient values:`, JSON.stringify(data, null, 2));
      if (data.length > 0) {
        const result = await prisma.ingredientNutrient.createMany({ data });
        console.log(`Successfully created ${result.count} nutrient records`);
      }
    }

    const result = await prisma.ingredient.findUnique({
      where: { id: numId },
      include: { nutrientValues: { include: { nutrient: true } } },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PUT /api/ingredients/[id] error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to update ingredient", details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const numId = Number(id);

    // Verify the ingredient belongs to this household
    const existing = await prisma.ingredient.findFirst({
      where: { id: numId, householdId: auth.householdId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { withAuth } from "@/lib/apiUtils";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, _request: Request, { params }: Ctx) => {
  const { id } = await params;
  const numId = Number(id);
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: numId, householdId: auth.householdId },
    include: { nutrientValues: { include: { nutrient: true } } },
  });
  if (!ingredient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ingredient);
}, "Failed to fetch ingredient");

export const PUT = withAuth(async (auth, request: Request, { params }: Ctx) => {
  try {
    const { id } = await params;
    const numId = Number(id);

    const existing = await prisma.ingredient.findFirst({
      where: { id: numId, householdId: auth.householdId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { name, fdcId, defaultUnit, customUnitName, customUnitAmount, customUnitGrams, isMealItem, category, nutrientValues } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (fdcId !== undefined) updateData.fdcId = fdcId || null;
    if (defaultUnit !== undefined) updateData.defaultUnit = defaultUnit;
    if (customUnitName !== undefined) updateData.customUnitName = customUnitName;
    if (customUnitAmount !== undefined) updateData.customUnitAmount = customUnitAmount;
    if (customUnitGrams !== undefined) updateData.customUnitGrams = customUnitGrams;
    if (isMealItem !== undefined) updateData.isMealItem = Boolean(isMealItem);
    if (category !== undefined) updateData.category = category || "";

    if (Object.keys(updateData).length > 0) {
      await prisma.ingredient.update({ where: { id: numId }, data: updateData });
    }

    if (Array.isArray(nutrientValues)) {
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

    const updatedFdcId = fdcId !== undefined ? (fdcId || null) : existing.fdcId;
    if (updatedFdcId && Array.isArray(nutrientValues) && nutrientValues.length > 0) {
      const updatedName = name !== undefined ? name : existing.name;
      prisma.globalIngredient.upsert({
        where: { fdcId: updatedFdcId },
        update: {},
        create: {
          fdcId: updatedFdcId,
          name: updatedName,
          defaultUnit: existing.defaultUnit,
          nutrients: {
            create: nutrientValues.map((nv: any) => ({
              nutrientId: nv.nutrientId,
              value: nv.value,
            })),
          },
        },
      }).catch((e) => console.error("GlobalIngredient upsert failed:", e));
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
});

export const DELETE = withAuth(async (auth, _request: Request, { params }: Ctx) => {
  const { id } = await params;
  const numId = Number(id);

  const existing = await prisma.ingredient.findFirst({
    where: { id: numId, householdId: auth.householdId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ingredientNutrient.deleteMany({ where: { ingredientId: numId } });
  await prisma.recipeIngredient.deleteMany({ where: { ingredientId: numId } });
  await prisma.ingredient.delete({ where: { id: numId } });
  return NextResponse.json({ ok: true });
}, "Failed to delete");

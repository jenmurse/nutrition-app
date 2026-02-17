import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      include: {
        nutrientValues: {
          include: { nutrient: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, fdcId, defaultUnit, customUnitName, customUnitAmount, customUnitGrams, nutrientValues } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const isCustomUnit = ["other", "tsp", "tbsp", "cup"].includes(defaultUnit);

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        fdcId: fdcId || null,
        defaultUnit: defaultUnit || "g",
        customUnitName: isCustomUnit ? customUnitName : null,
        customUnitAmount: isCustomUnit ? customUnitAmount : null,
        customUnitGrams: isCustomUnit ? customUnitGrams : null,
      },
    });

    if (Array.isArray(nutrientValues) && nutrientValues.length > 0) {
      const data = nutrientValues.map((nv: any) => ({
        ingredientId: ingredient.id,
        nutrientId: nv.nutrientId,
        value: nv.value,
      }));
      await prisma.ingredientNutrient.createMany({ data });
    }

    const created = await prisma.ingredient.findUnique({
      where: { id: ingredient.id },
      include: { nutrientValues: { include: { nutrient: true } } },
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 });
  }
}

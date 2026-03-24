import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const ingredients = await prisma.ingredient.findMany({
      where: { householdId: auth.householdId },
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
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { name, fdcId, defaultUnit, customUnitName, customUnitAmount, customUnitGrams, isMealItem, nutrientValues } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const isCustomUnit = ["other", "tsp", "tbsp", "cup"].includes(defaultUnit);

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        fdcId: fdcId || null,
        source: fdcId ? "usda" : "custom",
        defaultUnit: defaultUnit || "g",
        customUnitName: isCustomUnit ? customUnitName : null,
        customUnitAmount: isCustomUnit ? customUnitAmount : null,
        customUnitGrams: isCustomUnit ? customUnitGrams : null,
        isMealItem: Boolean(isMealItem),
        householdId: auth.householdId,
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
    console.error("Error creating ingredient:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create ingredient: ${errorMessage}` }, { status: 500 });
  }
}

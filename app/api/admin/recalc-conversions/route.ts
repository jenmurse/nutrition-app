import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";
import { convertToGrams, getIngredientDensity } from "@/lib/unitConversion";

const VOLUME_UNITS = ["tsp", "tbsp", "cup", "ml", "l", "fl oz", "floz"];

export async function POST(request: Request) {
  const auth = await getAuthenticatedHousehold();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rows = await prisma.recipeIngredient.findMany({
    where: { unit: { in: VOLUME_UNITS } },
    include: { ingredient: true },
  });

  let updated = 0;
  const log: { id: number; ingredient: string; quantity: number; unit: string; old: number | null; new: number }[] = [];

  for (const row of rows) {
    const density = getIngredientDensity(row.ingredient?.name);
    const newGrams = convertToGrams(row.quantity, row.unit, density, row.ingredient ?? undefined);

    if (newGrams !== row.conversionGrams) {
      await prisma.recipeIngredient.update({
        where: { id: row.id },
        data: { conversionGrams: newGrams },
      });
      log.push({
        id: row.id,
        ingredient: row.ingredient?.name ?? "unknown",
        quantity: row.quantity,
        unit: row.unit,
        old: row.conversionGrams,
        new: newGrams,
      });
      updated++;
    }
  }

  return NextResponse.json({ total: rows.length, updated, log });
}

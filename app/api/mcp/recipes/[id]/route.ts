import { NextResponse } from 'next/server';
import { getMcpAuth } from '@/lib/mcp-auth';
import { prisma } from '@/lib/db';

/** GET — return full recipe detail including ingredients and nutrition */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) return NextResponse.json({ error: 'Invalid recipe id' }, { status: 400 });

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: auth.householdId },
    select: {
      id: true,
      name: true,
      image: true, // selected to check existence; stripped to boolean in response below
      servingSize: true,
      servingUnit: true,
      tags: true,
      prepTime: true,
      cookTime: true,
      instructions: true,
      sourceApp: true,
      ingredients: {
        select: {
          quantity: true,
          unit: true,
          notes: true,
          section: true,
          conversionGrams: true,
          ingredient: {
            select: {
              id: true,
              name: true,
              defaultUnit: true,
              nutrientValues: {
                select: {
                  value: true,
                  nutrient: { select: { displayName: true, unit: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

  // Compute per-ingredient nutrition totals
  const ingredients = recipe.ingredients.map((ri) => {
    const grams = ri.conversionGrams ?? 0;
    const nutrition = ri.ingredient.nutrientValues.map((nv) => ({
      nutrient: nv.nutrient.displayName,
      unit: nv.nutrient.unit,
      total: parseFloat(((nv.value * grams) / 100).toFixed(2)),
      per100g: nv.value,
    }));
    return {
      name: ri.ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit,
      notes: ri.notes ?? undefined,
      section: ri.section ?? undefined,
      gramsEquivalent: parseFloat(grams.toFixed(1)),
      nutrition,
    };
  });

  // Compute recipe totals
  const totalsMap: Record<string, { unit: string; total: number }> = {};
  for (const ing of ingredients) {
    for (const n of ing.nutrition) {
      if (!totalsMap[n.nutrient]) totalsMap[n.nutrient] = { unit: n.unit, total: 0 };
      totalsMap[n.nutrient].total += n.total;
    }
  }
  const totals = Object.entries(totalsMap).map(([nutrient, { unit, total }]) => ({
    nutrient,
    unit,
    total: parseFloat(total.toFixed(2)),
    perServing: parseFloat((total / (recipe.servingSize || 1)).toFixed(2)),
  }));

  return NextResponse.json({
    id: recipe.id,
    name: recipe.name,
    servings: recipe.servingSize,
    servingUnit: recipe.servingUnit,
    tags: recipe.tags,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    instructions: recipe.instructions,
    sourceApp: recipe.sourceApp ?? null,
    hasImage: !!recipe.image, // boolean only — base64 data is never sent to the AI
    ingredients,
    nutrition: { totals },
  });
}

/** PUT — update recipe fields (optimization notes, meal prep notes, etc.) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) return NextResponse.json({ error: 'Invalid recipe id' }, { status: 400 });

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: auth.householdId },
  });
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

  const body = await request.json();
  const { optimizeAnalysis, mealPrepAnalysis } = body;

  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      ...(optimizeAnalysis !== undefined && { optimizeAnalysis }),
      ...(mealPrepAnalysis !== undefined && { mealPrepAnalysis }),
    },
  });

  return NextResponse.json({ ok: true });
}

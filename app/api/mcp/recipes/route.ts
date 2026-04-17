import { NextResponse } from 'next/server';
import { getMcpAuth } from '@/lib/mcp-auth';
import { prisma } from '@/lib/db';
import { convertToGrams, getIngredientDensity } from '@/lib/unitConversion';

/** GET — list all recipes for the household */
export async function GET(request: Request) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const recipes = await prisma.recipe.findMany({
    where: { householdId: auth.householdId },
    select: {
      id: true,
      name: true,
      servingSize: true,
      servingUnit: true,
      tags: true,
      prepTime: true,
      cookTime: true,
      // instructions intentionally excluded — large text not needed for listing
      // use GET /api/mcp/recipes/[id] for full recipe details
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(recipes);
}

/**
 * POST — create a recipe from the MCP server.
 *
 * Ingredients are matched by name against existing household ingredients.
 * If an ingredient is not found, a minimal custom ingredient is created so
 * the recipe can be saved immediately. Nutrition data can be added later
 * via the USDA lookup in the app.
 *
 * Body shape:
 * {
 *   name: string
 *   servings?: number          (default 1)
 *   servingUnit?: string       (default "servings")
 *   instructions?: string
 *   tags?: string[]            (e.g. ["dinner", "lunch"])
 *   prepTime?: number          (minutes)
 *   cookTime?: number          (minutes)
 *   sourceApp?: string         (e.g. "Claude", "ChatGPT")
 *   ingredients: {
 *     name: string
 *     quantity: number
 *     unit: string             (e.g. "g", "cup", "tbsp", "oz")
 *     notes?: string
 *   }[]
 * }
 */
export async function POST(request: Request) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    name: string;
    servings?: number;
    servingUnit?: string;
    instructions?: string;
    tags?: string | string[];
    prepTime?: number;
    cookTime?: number;
    sourceApp?: string;
    copyImageFromRecipeId?: number;
    ingredients?: { name: string; quantity: number; unit: string; notes?: string; section?: string }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, servings = 1, servingUnit = 'servings', instructions = '', tags, prepTime, cookTime, sourceApp, copyImageFromRecipeId, ingredients = [] } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 });

  // If copyImageFromRecipeId is provided, fetch the image from that recipe
  let copiedImage: string | null = null;
  if (copyImageFromRecipeId) {
    const source = await prisma.recipe.findFirst({
      where: { id: Number(copyImageFromRecipeId), householdId: auth.householdId },
      select: { image: true },
    });
    copiedImage = source?.image ?? null;
  }

  // Normalise tags: accept string or array
  const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags ?? '');

  // Create the recipe
  const recipe = await prisma.recipe.create({
    data: {
      name: name.trim(),
      servingSize: Number(servings) || 1,
      servingUnit: servingUnit || 'servings',
      instructions: instructions || '',
      tags: tagsStr,
      prepTime: prepTime != null ? Number(prepTime) : null,
      cookTime: cookTime != null ? Number(cookTime) : null,
      sourceApp: sourceApp || null,
      image: copiedImage,
      householdId: auth.householdId,
    },
  });

  // Resolve + attach ingredients
  const resolvedIngredients: { name: string; id: number; quantity: number; unit: string; notes?: string; section?: string }[] = [];
  const stubIngredients: string[] = [];

  for (const ing of ingredients) {
    if (!ing.name?.trim()) continue;

    const normalised = ing.name.trim().toLowerCase();

    // 1. Try exact match (case-insensitive)
    let ingredient = await prisma.ingredient.findFirst({
      where: {
        householdId: auth.householdId,
        name: { equals: ing.name.trim(), mode: 'insensitive' },
      },
    });

    // 2. Try partial match
    if (!ingredient) {
      ingredient = await prisma.ingredient.findFirst({
        where: {
          householdId: auth.householdId,
          name: { contains: normalised, mode: 'insensitive' },
        },
      });
    }

    // 3. Create a minimal stub so the recipe saves successfully
    if (!ingredient) {
      ingredient = await prisma.ingredient.create({
        data: {
          name: ing.name.trim(),
          defaultUnit: ing.unit === 'g' || ing.unit === 'ml' ? ing.unit : 'g',
          source: 'custom',
          householdId: auth.householdId,
        },
      });
      stubIngredients.push(ing.name.trim());
    }

    const density = getIngredientDensity(ingredient.name);
    const grams = convertToGrams(ing.quantity, ing.unit, density, ingredient);

    await prisma.recipeIngredient.create({
      data: {
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        quantity: ing.quantity,
        unit: ing.unit,
        conversionGrams: grams,
        notes: ing.notes || null,
        section: ing.section || null,
      },
    });

    resolvedIngredients.push({ name: ingredient.name, id: ingredient.id, quantity: ing.quantity, unit: ing.unit, notes: ing.notes, section: ing.section });
  }

  return NextResponse.json({
    id: recipe.id,
    name: recipe.name,
    servingSize: recipe.servingSize,
    servingUnit: recipe.servingUnit,
    tags: recipe.tags,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    instructions: recipe.instructions,
    ingredients: resolvedIngredients,
    stubIngredients,
    url: `${new URL(request.url).origin}/recipes`,
  }, { status: 201 });
}

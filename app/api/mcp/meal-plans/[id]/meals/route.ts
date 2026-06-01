import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMcpAuth } from '@/lib/mcp-auth';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/mcp/meal-plans/[id]/meals
 * Add a recipe or ingredient to a meal plan day.
 * Body (recipe):     { recipeId, date, mealType, servings? }
 * Body (ingredient): { ingredientId, quantity, unit, date, mealType }
 */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const mealPlanId = parseInt(id);
  if (!Number.isFinite(mealPlanId)) {
    return NextResponse.json({ error: 'Invalid meal plan id' }, { status: 400 });
  }

  const body = await request.json();
  const { recipeId, ingredientId, quantity, unit, date: rawDate, mealType, notes, servings } = body;

  const date = typeof rawDate === 'string' && !rawDate.includes('T')
    ? rawDate + 'T00:00:00Z'
    : rawDate;

  if (!date || !mealType) {
    return NextResponse.json({ error: 'date and mealType are required' }, { status: 400 });
  }

  const isRecipeBased = !!recipeId;
  const isIngredientBased = !!ingredientId && quantity != null && !!unit;

  if (!isRecipeBased && !isIngredientBased) {
    return NextResponse.json(
      { error: 'Either recipeId OR (ingredientId, quantity, unit) must be provided' },
      { status: 400 }
    );
  }
  if (isRecipeBased && isIngredientBased) {
    return NextResponse.json({ error: 'Cannot provide both recipeId and ingredientId' }, { status: 400 });
  }

  const mealPlan = await prisma.mealPlan.findUnique({ where: { id: mealPlanId } });
  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }

  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'side', 'snack', 'dessert', 'beverage'];
  if (!validMealTypes.includes(mealType)) {
    return NextResponse.json(
      { error: `Invalid meal type. Must be one of: ${validMealTypes.join(', ')}` },
      { status: 400 }
    );
  }

  let mealLogData: any;

  if (isRecipeBased) {
    const normalizedServings = Number(servings ?? 1);
    if (!Number.isFinite(normalizedServings) || normalizedServings <= 0) {
      return NextResponse.json({ error: 'servings must be a positive number' }, { status: 400 });
    }
    const recipe = await prisma.recipe.findUnique({ where: { id: Number(recipeId) } });
    if (!recipe || recipe.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    if (!recipe.isComplete) {
      return NextResponse.json(
        { error: 'Recipe is incomplete. Complete it in the app before adding to a plan.' },
        { status: 400 }
      );
    }
    mealLogData = {
      mealPlanId,
      recipeId: Number(recipeId),
      date: new Date(date),
      mealType,
      servings: normalizedServings,
      notes: notes || null,
    };
  } else {
    const ingredient = await prisma.ingredient.findUnique({ where: { id: Number(ingredientId) } });
    if (!ingredient || ingredient.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }
    const normalizedQuantity = Number(quantity);
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 });
    }
    mealLogData = {
      mealPlanId,
      ingredientId: Number(ingredientId),
      quantity: normalizedQuantity,
      unit,
      date: new Date(date),
      mealType,
      notes: notes || null,
    };
  }

  const dateObj = new Date(date);
  const dayStart = new Date(dateObj); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dateObj); dayEnd.setUTCHours(23, 59, 59, 999);
  const lastEntry = await prisma.mealLog.findFirst({
    where: { mealPlanId, date: { gte: dayStart, lte: dayEnd } },
    orderBy: { position: 'desc' },
  });
  const nextPosition = lastEntry ? lastEntry.position + 1 : 0;

  const mealLog = await prisma.mealLog.create({
    data: { ...mealLogData, position: nextPosition },
    include: { recipe: { select: { id: true, name: true } }, ingredient: { select: { id: true, name: true } } },
  });

  return NextResponse.json(mealLog, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedHousehold } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    const mealPlanId = parseInt(id);

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        mealLogs: {
          include: {
            ingredient: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!mealPlan || mealPlan.householdId !== auth.householdId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const recipeIds = [...new Set(
      mealPlan.mealLogs.filter(m => m.recipeId).map(m => m.recipeId!)
    )];

    const recipes = recipeIds.length > 0 ? await prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      select: {
        id: true,
        servingSize: true,
        ingredients: {
          select: {
            ingredientId: true,
            quantity: true,
            unit: true,
            ingredient: { select: { id: true, name: true } },
          },
        },
      },
    }) : [];

    const recipeMap = new Map(recipes.map(r => [r.id, r]));

    type ShoppingItem = { name: string; qty: number; unit: string };
    const agg = new Map<string, ShoppingItem>();

    for (const log of mealPlan.mealLogs) {
      if (log.recipeId) {
        const recipe = recipeMap.get(log.recipeId);
        if (!recipe) continue;
        const scale = (log.servings || 1) / (recipe.servingSize || 1);
        for (const ri of recipe.ingredients) {
          if (!ri.ingredient) continue;
          const key = `${ri.ingredientId}-${ri.unit}`;
          const qty = (ri.quantity || 0) * scale;
          const existing = agg.get(key);
          if (existing) {
            existing.qty += qty;
          } else {
            agg.set(key, { name: ri.ingredient.name, qty, unit: ri.unit });
          }
        }
      } else if (log.ingredientId && log.ingredient) {
        const unit = log.unit || 'g';
        const key = `${log.ingredientId}-${unit}`;
        const qty = log.quantity || 0;
        const existing = agg.get(key);
        if (existing) {
          existing.qty += qty;
        } else {
          agg.set(key, { name: log.ingredient.name, qty, unit });
        }
      }
    }

    const items = [...agg.values()]
      .filter(i => i.qty > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate shopping list' }, { status: 500 });
  }
}

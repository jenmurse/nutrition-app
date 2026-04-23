import { NextResponse } from 'next/server';
import { getMcpAuth } from '@/lib/mcp-auth';
import { prisma } from '@/lib/db';
import { getWeeklyNutritionSummary } from '@/lib/nutritionCalculations';

type Ctx = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/mcp/meal-plans/[id]
 * Return meal plan with all meals grouped by day + weekly nutrition summary
 * (daily totals + effective goals, merged from plan-specific + person-global).
 */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = params instanceof Promise ? await params : params;
  const mealPlanId = parseInt(id, 10);
  if (!mealPlanId) return NextResponse.json({ error: 'Invalid meal plan id' }, { status: 400 });

  const mealPlan = await prisma.mealPlan.findUnique({
    where: { id: mealPlanId },
    include: {
      person: { select: { id: true, name: true } },
      mealLogs: {
        include: {
          recipe: { select: { id: true, name: true, servingSize: true, servingUnit: true } },
          ingredient: { select: { id: true, name: true, defaultUnit: true } },
        },
        orderBy: [{ date: 'asc' }, { position: 'asc' }, { id: 'asc' }],
      },
      nutritionGoals: {
        select: { nutrientId: true, lowGoal: true, highGoal: true },
      },
    },
  });

  if (!mealPlan || mealPlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
  }

  const weeklySummary = await getWeeklyNutritionSummary(mealPlanId, {
    weekStartDate: mealPlan.weekStartDate,
    nutritionGoals: mealPlan.nutritionGoals,
    personId: mealPlan.personId,
  });

  // Group meals by ISO date string
  const days: Record<string, {
    date: string;
    meals: {
      mealType: string;
      servings: number;
      recipe?: { id: number; name: string };
      ingredient?: { id: number; name: string; quantity: number | null; unit: string | null };
      notes: string | null;
    }[];
  }> = {};

  for (const log of mealPlan.mealLogs) {
    const dateKey = log.date.toISOString().slice(0, 10);
    if (!days[dateKey]) days[dateKey] = { date: dateKey, meals: [] };
    days[dateKey].meals.push({
      mealType: log.mealType,
      servings: log.servings,
      recipe: log.recipe ? { id: log.recipe.id, name: log.recipe.name } : undefined,
      ingredient: log.ingredient
        ? {
            id: log.ingredient.id,
            name: log.ingredient.name,
            quantity: log.quantity,
            unit: log.unit,
          }
        : undefined,
      notes: log.notes,
    });
  }

  return NextResponse.json(
    {
      id: mealPlan.id,
      weekStartDate: mealPlan.weekStartDate,
      person: mealPlan.person,
      days: Object.values(days).sort((a, b) => a.date.localeCompare(b.date)),
      weeklySummary,
    },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=60' } }
  );
}

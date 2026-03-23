import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const personIdParam = searchParams.get('personId');
  const personId = personIdParam ? parseInt(personIdParam, 10) : undefined;

  const [ingredientCount, recipeCount, mealPlanCount, recentPlan, recentRecipes, currentWeekPlan] = await Promise.all([
    prisma.ingredient.count(),
    prisma.recipe.count(),
    prisma.mealPlan.count(personId !== undefined ? { where: { personId } } : undefined),
    prisma.mealPlan.findFirst({
      where: personId !== undefined ? { personId } : undefined,
      orderBy: { weekStartDate: 'desc' },
    }),
    prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, name: true, tags: true, createdAt: true },
    }),
    // Find the plan covering the current week
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const plans = await prisma.mealPlan.findMany({
        where: personId !== undefined ? { personId } : undefined,
        include: {
          _count: { select: { mealLogs: true } },
          mealLogs: {
            select: { date: true },
          },
        },
        orderBy: { weekStartDate: 'desc' },
      });
      return plans.find((p) => {
        const start = new Date(p.weekStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return today >= start && today <= end;
      }) ?? null;
    })(),
  ]);

  // Build week summary from current plan
  let weekSummary: { dayOfWeek: string; date: string; mealCount: number }[] | null = null;
  if (currentWeekPlan) {
    const start = new Date(currentWeekPlan.weekStartDate);
    start.setHours(0, 0, 0, 0);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekSummary = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toDateString();
      const mealCount = currentWeekPlan.mealLogs.filter(
        (m) => new Date(m.date).toDateString() === dateStr
      ).length;
      return {
        dayOfWeek: dayNames[d.getDay()],
        date: d.toISOString(),
        mealCount,
      };
    });
  }

  return NextResponse.json({
    ingredients: ingredientCount,
    recipes: recipeCount,
    mealPlans: mealPlanCount,
    currentPlan: recentPlan ?? null,
    recentRecipes,
    weekSummary,
    currentWeekPlanId: currentWeekPlan?.id ?? null,
  });
}

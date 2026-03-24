import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getAuthenticatedHousehold } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedHousehold();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const personIdParam = searchParams.get('personId');
  const personId = personIdParam ? parseInt(personIdParam, 10) : undefined;

  const householdFilter = { householdId: auth.householdId };
  const mealPlanWhere = { ...householdFilter, ...(personId !== undefined ? { personId } : {}) };

  const [ingredientCount, recipeCount, mealPlanCount, recentPlan, recentRecipes, currentWeekPlan] = await Promise.all([
    prisma.ingredient.count(),
    prisma.recipe.count(),
    prisma.mealPlan.count({ where: mealPlanWhere }),
    prisma.mealPlan.findFirst({
      where: mealPlanWhere,
      orderBy: { weekStartDate: 'desc' },
    }),
    prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, name: true, tags: true, createdAt: true },
    }),
    // Find the plan covering the current week using SQL date filter
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // A plan covers today if: weekStartDate <= today AND weekStartDate >= today - 6 days
      const sixDaysAgo = new Date(today);
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      return prisma.mealPlan.findFirst({
        where: {
          ...mealPlanWhere,
          weekStartDate: { gte: sixDaysAgo, lte: today },
        },
        include: {
          _count: { select: { mealLogs: true } },
          mealLogs: { select: { date: true } },
        },
        orderBy: { weekStartDate: 'desc' },
      });
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

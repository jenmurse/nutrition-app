import { NextResponse } from 'next/server';
import { getMcpAuth } from '@/lib/mcp-auth';
import { prisma } from '@/lib/db';

/** GET ?personId=&weekStartDate= — list meal plans for the household */
export async function GET(request: Request) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const personIdParam = searchParams.get('personId');
  const weekStartParam = searchParams.get('weekStartDate');

  const personId = personIdParam ? parseInt(personIdParam, 10) : undefined;
  const weekStartDate = weekStartParam ? new Date(weekStartParam) : undefined;

  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      householdId: auth.householdId,
      ...(personId ? { personId } : {}),
      ...(weekStartDate ? { weekStartDate } : {}),
    },
    select: {
      id: true,
      weekStartDate: true,
      personId: true,
      person: { select: { id: true, name: true } },
      _count: { select: { mealLogs: true } },
    },
    orderBy: { weekStartDate: 'desc' },
    take: 50,
  });

  return NextResponse.json(
    mealPlans.map((mp) => ({
      id: mp.id,
      weekStartDate: mp.weekStartDate,
      personId: mp.personId,
      personName: mp.person?.name ?? null,
      mealCount: mp._count.mealLogs,
    })),
    { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=60' } }
  );
}

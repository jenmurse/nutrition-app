import { NextResponse } from 'next/server';
import { getMcpAuth } from '@/lib/mcp-auth';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> | { id: string } };

/** GET — list a person's global (baseline) nutrition goals */
export async function GET(request: Request, { params }: Ctx) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = params instanceof Promise ? await params : params;
  const personId = parseInt(id, 10);
  if (!personId) return NextResponse.json({ error: 'Invalid person id' }, { status: 400 });

  // Verify person belongs to the caller's household
  const membership = await prisma.householdMember.findUnique({
    where: { personId_householdId: { personId, householdId: auth.householdId } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'Person not found in this household' }, { status: 404 });
  }

  const goals = await prisma.globalNutritionGoal.findMany({
    where: { personId, householdId: auth.householdId },
    select: {
      lowGoal: true,
      highGoal: true,
      nutrient: { select: { name: true, displayName: true, unit: true } },
    },
  });

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, name: true },
  });

  return NextResponse.json(
    {
      person,
      goals: goals.map((g) => ({
        nutrient: g.nutrient.displayName,
        unit: g.nutrient.unit,
        lowGoal: g.lowGoal,
        highGoal: g.highGoal,
      })),
    },
    { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=60' } }
  );
}

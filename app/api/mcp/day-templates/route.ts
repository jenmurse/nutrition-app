import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMcpAuth } from '@/lib/mcp-auth';

/**
 * GET /api/mcp/day-templates
 * Optional ?personId=N filter (templates with no personId always included).
 */
export async function GET(request: Request) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const personIdParam = url.searchParams.get('personId');
  const personId = personIdParam ? Number(personIdParam) : null;

  const templates = await prisma.dayTemplate.findMany({
    where: {
      householdId: auth.householdId,
      ...(personId ? { OR: [{ personId }, { personId: null }] } : {}),
    },
    include: {
      items: {
        orderBy: [{ mealType: 'asc' }, { position: 'asc' }],
        select: {
          id: true, mealType: true, position: true,
          recipeId: true, servings: true,
          ingredientId: true, quantity: true, unit: true,
          notes: true,
        },
      },
      person: { select: { id: true, name: true } },
    },
    orderBy: [{ sortIndex: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(templates);
}

/**
 * POST /api/mcp/day-templates
 * Body: { planId, date (YYYY-MM-DD), name, personId? }
 * Snapshots the meals on the target day into a new template.
 */
export async function POST(request: Request) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { planId, date, name, personId } = body as {
    planId: number; date: string; name: string; personId?: number;
  };

  if (!planId || !date || !name?.trim()) {
    return NextResponse.json({ error: 'planId, date, and name are required' }, { status: 400 });
  }

  const plan = await prisma.mealPlan.findUnique({ where: { id: Number(planId) } });
  if (!plan || plan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const normalizedDate = date.includes('T') ? date : `${date}T00:00:00Z`;
  const dateObj = new Date(normalizedDate);
  const dayStart = new Date(dateObj); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dateObj); dayEnd.setUTCHours(23, 59, 59, 999);

  const logs = await prisma.mealLog.findMany({
    where: { mealPlanId: Number(planId), date: { gte: dayStart, lte: dayEnd } },
    orderBy: { position: 'asc' },
  });

  if (logs.length === 0) {
    return NextResponse.json({ error: 'No meals on that day to save' }, { status: 400 });
  }

  const existing = await prisma.dayTemplate.findFirst({
    where: { householdId: auth.householdId, name: name.trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'A template with that name already exists', existingId: existing.id },
      { status: 409 }
    );
  }

  const resolvedPersonId = personId ?? auth.personId ?? null;

  const created = await prisma.dayTemplate.create({
    data: {
      householdId: auth.householdId,
      personId: resolvedPersonId,
      name: name.trim(),
      items: {
        create: logs.map((log) => ({
          mealType: log.mealType,
          position: log.position,
          recipeId: log.recipeId,
          servings: log.servings,
          ingredientId: log.ingredientId,
          quantity: log.quantity,
          unit: log.unit,
          notes: log.notes,
        })),
      },
    },
    include: { items: true, person: { select: { id: true, name: true } } },
  });

  return NextResponse.json(created, { status: 201 });
}

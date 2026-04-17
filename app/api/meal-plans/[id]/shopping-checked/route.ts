import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/apiUtils';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const mealPlanId = parseInt(id);

  const plan = await prisma.mealPlan.findUnique({ where: { id: mealPlanId }, select: { householdId: true } });
  if (!plan || plan.householdId !== auth.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { checked } = await request.json() as { checked: string[] };
  await prisma.mealPlan.update({
    where: { id: mealPlanId },
    data: { shoppingChecked: JSON.stringify(checked) },
  });

  return NextResponse.json({ ok: true });
}, 'Failed to save');

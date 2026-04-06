import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedHousehold } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

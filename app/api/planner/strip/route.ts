import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/apiUtils';

/**
 * GET /api/planner/strip?personId=&start=ISO&end=ISO
 *
 * Returns aggregated per-day fill data for the planner's 30-day zoom-out strip.
 * For each day in the [start, end] window we return:
 *   - dateKey:  YYYY-MM-DD (UTC)
 *   - planId:   the plan covering this day for the given person, or null
 *   - count:    number of meal logs on this day across that plan
 *   - slots:    number of slots the plan has (from MealPlan.slotOrder if set,
 *               otherwise the base slot count of 7)
 *
 * The client divides count by slots (capped at 1) to get a fill ratio.
 * The endpoint is lightweight — it does not load recipes, ingredients, or
 * nutrition data. Used by the always-visible strip; safe to call often.
 */
export const GET = withAuth(async (auth, request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const personIdParam = searchParams.get('personId');
  const startStr = searchParams.get('start');
  const endStr = searchParams.get('end');

  if (!personIdParam || !startStr || !endStr) {
    return NextResponse.json(
      { error: 'personId, start, end are required' },
      { status: 400 }
    );
  }

  const personId = parseInt(personIdParam, 10);
  const start = new Date(startStr.includes('T') ? startStr : startStr + 'T00:00:00Z');
  const end = new Date(endStr.includes('T') ? endStr : endStr + 'T23:59:59Z');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'invalid start/end' }, { status: 400 });
  }

  // Fetch all plans for this person whose week could overlap the window.
  // A plan covers a 7-day week starting at weekStartDate. To overlap the
  // window [start, end] the plan's weekStartDate must be in [start - 6d, end].
  const earliest = new Date(start);
  earliest.setUTCDate(earliest.getUTCDate() - 6);
  const plans = await prisma.mealPlan.findMany({
    where: {
      householdId: auth.householdId,
      personId,
      weekStartDate: { gte: earliest, lte: end },
    },
    select: { id: true, weekStartDate: true, slotOrder: true },
  });

  // Fetch meal log counts per (plan, day) inside the window. We use a
  // raw groupBy because Prisma's typed groupBy on Date is awkward.
  const planIds = plans.map((p) => p.id);
  const logs = planIds.length > 0
    ? await prisma.mealLog.findMany({
        where: {
          mealPlanId: { in: planIds },
          date: { gte: start, lte: end },
        },
        select: { mealPlanId: true, date: true },
      })
    : [];

  // Count by (planId + dateKey).
  const counts = new Map<string, number>();
  for (const log of logs) {
    const dt = new Date(log.date);
    const dateKey = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    const key = `${log.mealPlanId}|${dateKey}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Build day → plan mapping by walking each plan's 7 days.
  const days: Array<{ dateKey: string; planId: number | null; count: number; slots: number }> = [];
  const BASE_SLOT_COUNT = 7; // breakfast, lunch, dinner, snack, side, dessert, beverage
  const dayMap = new Map<string, { planId: number; count: number; slots: number }>();

  for (const plan of plans) {
    const slots = plan.slotOrder
      ? plan.slotOrder.split(',').filter(Boolean).length || BASE_SLOT_COUNT
      : BASE_SLOT_COUNT;
    const ws = new Date(plan.weekStartDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws);
      d.setUTCDate(d.getUTCDate() + i);
      if (d < start || d > end) continue;
      const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const count = counts.get(`${plan.id}|${dateKey}`) ?? 0;
      // If two plans somehow overlap the same day, prefer the one whose
      // weekStartDate is earliest (deterministic).
      const existing = dayMap.get(dateKey);
      if (!existing) dayMap.set(dateKey, { planId: plan.id, count, slots });
    }
  }

  // Walk every day in the window, fill in null for days with no plan.
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const e = dayMap.get(dateKey);
    days.push({
      dateKey,
      planId: e?.planId ?? null,
      count: e?.count ?? 0,
      slots: e?.slots ?? BASE_SLOT_COUNT,
    });
  }

  return NextResponse.json({ days });
}, 'Failed to load planner strip');

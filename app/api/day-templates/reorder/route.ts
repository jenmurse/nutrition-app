import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * PATCH /api/day-templates/reorder
 * Body: { order: number[] }   // template ids in desired display order
 *
 * Assigns sortIndex by position in the array (0, 1, 2, …).
 * Templates not in the array keep their existing sortIndex.
 */
export const PATCH = withAuth(async (auth, request: Request) => {
  const body = await request.json();
  const { order } = body as { order?: unknown };

  if (!Array.isArray(order) || !order.every((n) => Number.isFinite(n))) {
    return NextResponse.json(
      { error: "order must be an array of template ids" },
      { status: 400 }
    );
  }

  const ids = (order as number[]).map((n) => Number(n));

  // Verify all templates belong to this household
  const owned = await prisma.dayTemplate.findMany({
    where: { id: { in: ids }, householdId: auth.householdId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((t) => t.id));
  if (ownedIds.size !== ids.length) {
    return NextResponse.json(
      { error: "One or more templates not found in this household" },
      { status: 404 }
    );
  }

  await prisma.$transaction(
    ids.map((id, idx) =>
      prisma.dayTemplate.update({
        where: { id },
        data: { sortIndex: idx },
      })
    )
  );

  return NextResponse.json({ ok: true });
}, "Failed to reorder templates");

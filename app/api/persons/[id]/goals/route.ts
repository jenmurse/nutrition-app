import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * GET /api/persons/[id]/goals
 * Returns the person's global nutrition goals with nutrient info.
 */

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, _request: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const personId = parseInt(id);
  if (isNaN(personId)) {
    return NextResponse.json({ error: "Invalid person ID" }, { status: 400 });
  }

  // Verify person belongs to household
  const membership = await prisma.householdMember.findFirst({
    where: { householdId: auth.householdId, personId },
  });
  if (!membership) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const goals = await prisma.globalNutritionGoal.findMany({
    where: { personId, householdId: auth.householdId },
    include: {
      nutrient: {
        select: { id: true, displayName: true, unit: true, orderIndex: true },
      },
    },
    orderBy: { nutrient: { orderIndex: "asc" } },
  });

  return NextResponse.json(
    goals.map((g) => ({
      nutrientId: g.nutrientId,
      lowGoal: g.lowGoal,
      highGoal: g.highGoal,
      nutrient: {
        displayName: g.nutrient.displayName,
        unit: g.nutrient.unit,
      },
    }))
  );
});

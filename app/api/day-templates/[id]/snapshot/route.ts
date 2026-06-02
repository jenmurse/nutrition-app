import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PUT /api/day-templates/[id]/snapshot
 * Replace the template's items with the meals on (planId, date).
 * Body: { planId: number, date: string (YYYY-MM-DD) }
 *
 * Keeps id, name, personId, createdAt. Bumps updatedAt.
 * Used when the user wants to "save over" an existing template.
 */
export const PUT = withAuth(async (auth, request: Request, { params }: Ctx) => {
  const { id } = await params;
  const templateId = Number(id);

  const body = await request.json();
  const { planId, date } = body as { planId: number; date: string };

  if (!templateId || !planId || !date) {
    return NextResponse.json(
      { error: "templateId, planId, and date are required" },
      { status: 400 }
    );
  }

  const template = await prisma.dayTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const normalizedDate = date.includes("T") ? date : `${date}T00:00:00Z`;
  const dateObj = new Date(normalizedDate);
  const dayStart = new Date(dateObj); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dateObj); dayEnd.setUTCHours(23, 59, 59, 999);

  const logs = await prisma.mealLog.findMany({
    where: { mealPlanId: planId, date: { gte: dayStart, lte: dayEnd } },
    orderBy: { position: "asc" },
  });

  if (logs.length === 0) {
    return NextResponse.json({ error: "No meals on that day to save" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.dayTemplateItem.deleteMany({ where: { dayTemplateId: templateId } });
    await tx.dayTemplateItem.createMany({
      data: logs.map((log) => ({
        dayTemplateId: templateId,
        mealType: log.mealType,
        position: log.position,
        recipeId: log.recipeId,
        servings: log.servings,
        ingredientId: log.ingredientId,
        quantity: log.quantity,
        unit: log.unit,
        notes: log.notes,
      })),
    });
    return tx.dayTemplate.update({
      where: { id: templateId },
      data: {}, // touch updatedAt
      include: { items: true, person: { select: { id: true, name: true, color: true } } },
    });
  });

  return NextResponse.json(updated);
}, "Failed to overwrite template");

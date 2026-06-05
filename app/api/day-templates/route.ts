import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * GET /api/day-templates
 * List all day templates for the household, newest first.
 * Each row includes the items + a count.
 */
export const GET = withAuth(async (auth) => {
  const templates = await prisma.dayTemplate.findMany({
    where: { householdId: auth.householdId },
    include: {
      items: {
        orderBy: [{ mealType: "asc" }, { position: "asc" }],
        select: {
          id: true,
          mealType: true,
          position: true,
          recipeId: true,
          servings: true,
          ingredientId: true,
          quantity: true,
          unit: true,
          notes: true,
        },
      },
      person: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: [{ sortIndex: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(templates);
}, "Failed to load day templates");

/**
 * POST /api/day-templates
 * Save the meals for a given (planId, date) as a new template.
 * Body: { planId: number, date: string (YYYY-MM-DD), name: string, personId?: number }
 *
 * Reads all MealLogs on that day and copies their content into items.
 */
export const POST = withAuth(async (auth, request: Request) => {
  const body = await request.json();
  const { planId, date, name, personId } = body as {
    planId: number;
    date: string;
    name: string;
    personId?: number;
  };

  if (!planId || !date || !name?.trim()) {
    return NextResponse.json(
      { error: "planId, date, and name are required" },
      { status: 400 }
    );
  }

  // Verify the plan belongs to this household
  const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Pull meal logs for the target date
  const normalizedDate = date.includes("T") ? date : `${date}T00:00:00Z`;
  const dateObj = new Date(normalizedDate);
  const dayStart = new Date(dateObj);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dateObj);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const logs = await prisma.mealLog.findMany({
    where: { mealPlanId: planId, date: { gte: dayStart, lte: dayEnd } },
    orderBy: { position: "asc" },
  });

  if (logs.length === 0) {
    return NextResponse.json(
      { error: "No meals on that day to save" },
      { status: 400 }
    );
  }

  // Check name uniqueness within household
  const existing = await prisma.dayTemplate.findFirst({
    where: { householdId: auth.householdId, name: name.trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A template with that name already exists", existingId: existing.id },
      { status: 409 }
    );
  }

  // personId: prefer body value, fall back to auth person
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
          externalLabel: log.externalLabel,
          notes: log.notes,
        })),
      },
    },
    include: { items: true, person: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(created, { status: 201 });
}, "Failed to save day template");

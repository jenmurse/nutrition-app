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
  const { planId, date, name, personId, items: rawItems } = body as {
    planId?: number;
    date?: string;
    name: string;
    personId?: number;
    // Alternative to planId+date: a directly-composed item list (used by the
    // in-app chat, which builds templates from scratch rather than snapshotting
    // an existing day). Each item is recipe-based.
    items?: Array<{ mealType: string; recipeId: number; servings?: number }>;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Check name uniqueness within household (shared by both paths)
  const existing = await prisma.dayTemplate.findFirst({
    where: { householdId: auth.householdId, name: name.trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A template with that name already exists", existingId: existing.id },
      { status: 409 }
    );
  }

  const resolvedPersonId = personId ?? auth.personId ?? null;

  // ── Path A: directly-composed items (chat) ──────────────────────────────
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    // Validate every recipe belongs to this household.
    const recipeIds = rawItems.map((it) => Number(it.recipeId)).filter(Number.isFinite);
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds }, householdId: auth.householdId },
      select: { id: true },
    });
    const valid = new Set(recipes.map((r) => r.id));
    const missing = recipeIds.filter((id) => !valid.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Recipes not found in this household: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
    const created = await prisma.dayTemplate.create({
      data: {
        householdId: auth.householdId,
        personId: resolvedPersonId,
        name: name.trim(),
        items: {
          create: rawItems.map((it, idx) => ({
            mealType: it.mealType,
            position: idx,
            recipeId: Number(it.recipeId),
            servings: it.servings ?? 1,
          })),
        },
      },
      include: { items: true, person: { select: { id: true, name: true, color: true } } },
    });
    return NextResponse.json(created, { status: 201 });
  }

  // ── Path B: snapshot an existing day (original behavior) ────────────────
  if (!planId || !date) {
    return NextResponse.json(
      { error: "Provide either items[] or planId+date" },
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

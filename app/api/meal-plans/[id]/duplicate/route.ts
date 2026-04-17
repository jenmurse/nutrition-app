import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * POST /api/meal-plans/[id]/duplicate
 * Duplicate a meal plan's meals into a target week.
 * Body: { targetWeekStartDate: ISO string, personId?: number }
 *
 * If a plan already exists for that person+week, meals are added to it.
 * Otherwise a new plan is created.
 */

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const sourcePlanId = Number(id);
  if (isNaN(sourcePlanId)) {
    return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
  }

  const body = await request.json();
  const { targetWeekStartDate, personId } = body;

  if (!targetWeekStartDate) {
    return NextResponse.json(
      { error: "targetWeekStartDate is required" },
      { status: 400 }
    );
  }

  // Fetch source plan with meals
  const sourcePlan = await prisma.mealPlan.findUnique({
    where: { id: sourcePlanId },
    include: { mealLogs: true },
  });

  if (!sourcePlan || sourcePlan.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Source plan not found" }, { status: 404 });
  }

  if (sourcePlan.mealLogs.length === 0) {
    return NextResponse.json({ error: "Source plan has no meals to copy" }, { status: 400 });
  }

  const targetPersonId = personId ?? sourcePlan.personId;
  const targetWeekStart = new Date(
    targetWeekStartDate.includes("T")
      ? targetWeekStartDate
      : targetWeekStartDate + "T00:00:00Z"
  );
  const sourceWeekStart = new Date(sourcePlan.weekStartDate);

  // Find or create target plan
  let targetPlan = await prisma.mealPlan.findFirst({
    where: {
      personId: targetPersonId,
      weekStartDate: targetWeekStart,
    },
  });

  if (!targetPlan) {
    targetPlan = await prisma.mealPlan.create({
      data: {
        weekStartDate: targetWeekStart,
        personId: targetPersonId,
        householdId: auth.householdId,
      },
    });

    // Copy nutrition goals from source
    const sourceGoals = await prisma.nutritionGoal.findMany({
      where: { mealPlanId: sourcePlanId },
    });
    if (sourceGoals.length > 0) {
      await prisma.nutritionGoal.createMany({
        data: sourceGoals.map((g) => ({
          mealPlanId: targetPlan!.id,
          nutrientId: g.nutrientId,
          lowGoal: g.lowGoal,
          highGoal: g.highGoal,
        })),
      });
    }
  }

  // Copy meals in one batch, adjusting dates to target week
  const dayOffset = targetWeekStart.getTime() - sourceWeekStart.getTime();

  await prisma.mealLog.createMany({
    data: sourcePlan.mealLogs.map((meal) => ({
      mealPlanId: targetPlan!.id,
      date: new Date(new Date(meal.date).getTime() + dayOffset),
      mealType: meal.mealType,
      recipeId: meal.recipeId,
      ingredientId: meal.ingredientId,
      quantity: meal.quantity,
      unit: meal.unit,
      servings: meal.servings,
      position: meal.position,
    })),
  });

  return NextResponse.json({
    planId: targetPlan.id,
    mealsCopied: sourcePlan.mealLogs.length,
  });
}, "Failed to duplicate meal plan");

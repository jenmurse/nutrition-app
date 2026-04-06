import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";
import { themeHex } from "@/lib/themes";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedHousehold();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const personId = Number(id);
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

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    data.name = body.name.trim();
  }

  if (body.color !== undefined) {
    data.color = body.color;
  }

  if (body.theme !== undefined) {
    data.theme = body.theme;
    data.color = themeHex(body.theme);
  }

  if (body.onboardingComplete !== undefined) {
    data.onboardingComplete = Boolean(body.onboardingComplete);
  }

  if (body.dismissedTips !== undefined) {
    data.dismissedTips = JSON.stringify(body.dismissedTips);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const person = await prisma.person.update({
      where: { id: personId },
      data,
    });
    return NextResponse.json(person);
  } catch {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedHousehold();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const personId = Number(id);
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

  // Only owners can remove other members; members can only remove themselves
  if (auth.personId !== personId && auth.role !== 'owner') {
    return NextResponse.json(
      { error: "Only household owners can remove other members" },
      { status: 403 }
    );
  }

  // Prevent deleting the last person
  const count = await prisma.person.count({
    where: { householdMembers: { some: { householdId: auth.householdId } } },
  });
  if (count <= 1) {
    return NextResponse.json(
      { error: "Cannot remove the last person in the household" },
      { status: 400 }
    );
  }

  try {
    // Delete related data first (cascade)
    await prisma.globalNutritionGoal.deleteMany({ where: { personId } });

    const personPlans = await prisma.mealPlan.findMany({ where: { personId } });
    for (const plan of personPlans) {
      await prisma.nutritionGoal.deleteMany({ where: { mealPlanId: plan.id } });
      await prisma.mealLog.deleteMany({ where: { mealPlanId: plan.id } });
    }
    await prisma.mealPlan.deleteMany({ where: { personId } });

    await prisma.person.delete({ where: { id: personId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete person" }, { status: 500 });
  }
}

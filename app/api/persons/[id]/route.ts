import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const personId = Number(id);
  if (isNaN(personId)) {
    return NextResponse.json({ error: "Invalid person ID" }, { status: 400 });
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
  const { id } = await params;
  const personId = Number(id);
  if (isNaN(personId)) {
    return NextResponse.json({ error: "Invalid person ID" }, { status: 400 });
  }

  // Prevent deleting the last person
  const count = await prisma.person.count();
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

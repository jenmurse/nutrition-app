import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/day-templates/[id]
 * Rename a template.
 * Body: { name: string }
 */
export const PATCH = withAuth(async (auth, request: Request, { params }: Ctx) => {
  const { id } = await params;
  const templateId = Number(id);
  const body = await request.json();
  const { name } = body as { name?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const existing = await prisma.dayTemplate.findUnique({ where: { id: templateId } });
  if (!existing || existing.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Conflict check
  const collision = await prisma.dayTemplate.findFirst({
    where: {
      householdId: auth.householdId,
      name: name.trim(),
      NOT: { id: templateId },
    },
  });
  if (collision) {
    return NextResponse.json(
      { error: "A template with that name already exists" },
      { status: 409 }
    );
  }

  const updated = await prisma.dayTemplate.update({
    where: { id: templateId },
    data: { name: name.trim() },
    include: { items: true, person: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(updated);
}, "Failed to rename template");

/**
 * DELETE /api/day-templates/[id]
 */
export const DELETE = withAuth(async (auth, _request: Request, { params }: Ctx) => {
  const { id } = await params;
  const templateId = Number(id);

  const existing = await prisma.dayTemplate.findUnique({ where: { id: templateId } });
  if (!existing || existing.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.dayTemplate.delete({ where: { id: templateId } });
  return NextResponse.json({ ok: true });
}, "Failed to delete template");

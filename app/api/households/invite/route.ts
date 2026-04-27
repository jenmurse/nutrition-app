import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * GET /api/households/invite — list all invites for the active household.
 * Each invite includes forPersonId so callers can match invites to members.
 */
export const GET = withAuth(async (auth, request: Request) => {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const invites = await prisma.householdInvite.findMany({
    where: { householdId: auth.householdId },
    orderBy: { id: "desc" },
  });

  // Resolve names for redeemed invites
  const usedByIds = invites.map((i) => i.usedBy).filter((id): id is number => id !== null);
  const persons = usedByIds.length
    ? await prisma.person.findMany({ where: { id: { in: usedByIds } }, select: { id: true, name: true } })
    : [];
  const personMap = new Map(persons.map((p) => [p.id, p.name]));

  const now = new Date();
  return NextResponse.json(
    invites.map((inv) => ({
      id: inv.id,
      token: inv.token,
      url: `${origin}/login?invite=${inv.token}`,
      forPersonId: inv.forPersonId,
      inviteSentAt: inv.inviteSentAt,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      usedByName: inv.usedBy ? (personMap.get(inv.usedBy) ?? null) : null,
      expired: inv.expiresAt < now && !inv.usedAt,
    }))
  );
}, "Failed to fetch invites");

/**
 * POST /api/households/invite — generate an invite link for the active household.
 * Body: { forPersonId?: number } — when provided, ties the invite to that Person record
 * so redemption links the redeeming user to the existing record (no duplicate Person).
 * Returns: { id, token, url, expiresAt, forPersonId }
 */
export const POST = withAuth(async (auth, request: Request) => {
  const body = await request.json().catch(() => ({}));
  const forPersonId: number | null =
    typeof body?.forPersonId === "number" ? body.forPersonId : null;

  // If forPersonId is given, verify that Person belongs to this household
  if (forPersonId !== null) {
    const membership = await prisma.householdMember.findFirst({
      where: { householdId: auth.householdId, personId: forPersonId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Person not in this household" }, { status: 400 });
    }
    // Block invite creation for tracked-only members
    const target = await prisma.person.findUnique({ where: { id: forPersonId }, select: { trackedOnly: true } });
    if (target?.trackedOnly) {
      return NextResponse.json({ error: "Cannot invite a tracked-only member" }, { status: 400 });
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365 * 10); // effectively never expires; revisit policy later

  const invite = await prisma.householdInvite.create({
    data: {
      householdId: auth.householdId,
      createdBy: auth.personId,
      forPersonId,
      expiresAt,
    },
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const url = `${origin}/login?invite=${invite.token}`;

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    url,
    expiresAt: invite.expiresAt,
    forPersonId: invite.forPersonId,
  });
}, "Failed to create invite");

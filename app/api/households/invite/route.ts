import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * GET /api/households/invite — list all invites for the active household
 */
export const GET = withAuth(async (auth, request: Request) => {
  const { origin } = new URL(request.url);

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
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      usedByName: inv.usedBy ? (personMap.get(inv.usedBy) ?? null) : null,
      expired: inv.expiresAt < now && !inv.usedAt,
    }))
  );
}, "Failed to fetch invites");

/**
 * POST /api/households/invite — generate an invite link for the active household
 * Returns: { token, url, expiresAt }
 */
export const POST = withAuth(async (auth, request: Request) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

  const invite = await prisma.householdInvite.create({
    data: {
      householdId: auth.householdId,
      createdBy: auth.personId,
      expiresAt,
    },
  });

  const { origin } = new URL(request.url);
  const url = `${origin}/login?invite=${invite.token}`;

  return NextResponse.json({
    token: invite.token,
    url,
    expiresAt: invite.expiresAt,
  });
}, "Failed to create invite");

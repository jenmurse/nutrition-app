import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * DELETE /api/households/invite/[id] — revoke or remove an invite link
 * Only the household that owns the invite can delete it.
 */
export const DELETE = withAuth(async (auth, request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const inviteId = parseInt(id, 10);
  if (isNaN(inviteId)) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }

  const invite = await prisma.householdInvite.findUnique({ where: { id: inviteId } });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.householdInvite.delete({ where: { id: inviteId } });
  return NextResponse.json({ ok: true });
}, "Failed to delete invite");

/**
 * PATCH /api/households/invite/[id] — mark invite as sent when the link is copied/shared.
 * Body: { sent: true } sets inviteSentAt = now (idempotent — won't reset once set).
 */
export const PATCH = withAuth(async (auth, request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const inviteId = parseInt(id, 10);
  if (isNaN(inviteId)) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }

  const invite = await prisma.householdInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.householdId !== auth.householdId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body?.sent === true && !invite.inviteSentAt) {
    const updated = await prisma.householdInvite.update({
      where: { id: inviteId },
      data: { inviteSentAt: new Date() },
    });
    return NextResponse.json({ ok: true, invite: updated });
  }

  return NextResponse.json({ ok: true, invite });
}, "Failed to update invite");

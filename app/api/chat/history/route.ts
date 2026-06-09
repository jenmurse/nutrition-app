/**
 * GET  /api/chat/history — last 50 messages for current person, with proposals.
 * DELETE /api/chat/history — wipe all messages.
 * PATCH  /api/chat/history — update a single message's proposalStatus.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/apiUtils";
import { prisma } from "@/lib/db";

const HISTORY_LIMIT = 20;

export const GET = withAuth(async (auth) => {
  const rows = await prisma.chatMessage.findMany({
    where: { personId: auth.personId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, role: true, content: true, proposalJson: true, proposalStatus: true, createdAt: true },
  });
  return NextResponse.json({ messages: rows.reverse() });
}, "Failed to load chat history");

export const DELETE = withAuth(async (auth) => {
  await prisma.chatMessage.deleteMany({ where: { personId: auth.personId } });
  return NextResponse.json({ ok: true });
}, "Failed to clear chat history");

/**
 * PATCH /api/chat/history
 * Body: { id: number, proposalStatus: "applied" | "cancelled" }
 * Updates a single message's proposal status (called by client on APPLY/CANCEL).
 */
export const PATCH = withAuth(async (auth, req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const messageId = Number(body?.id);
  const status = body?.proposalStatus;
  if (!messageId || !["applied", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }
  // Verify the message belongs to this person.
  const msg = await prisma.chatMessage.findFirst({
    where: { id: messageId, personId: auth.personId },
    select: { id: true },
  });
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { proposalStatus: status },
  });
  return NextResponse.json({ ok: true });
}, "Failed to update proposal status");

/**
 * GET /api/chat/history — returns the current person's last 50 chat messages
 * in chronological order, ready for the panel to render on mount.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/apiUtils";
import { prisma } from "@/lib/db";

const HISTORY_LIMIT = 50;

export const GET = withAuth(async (auth) => {
  const rows = await prisma.chatMessage.findMany({
    where: { personId: auth.personId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return NextResponse.json({ messages: rows.reverse() });
}, "Failed to load chat history");

/**
 * DELETE /api/chat/history — wipe all chat messages for the current person.
 * Useful for "start a new conversation" and for testing during build.
 */
export const DELETE = withAuth(async (auth) => {
  await prisma.chatMessage.deleteMany({ where: { personId: auth.personId } });
  return NextResponse.json({ ok: true });
}, "Failed to clear chat history");

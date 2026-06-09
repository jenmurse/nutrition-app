/**
 * POST /api/chat — streaming SSE endpoint for in-app AI chat.
 *
 * Request body: { message: string }
 * The route looks up the current person, loads the last 50 persisted messages
 * for context, builds the live lightweight context block, persists the user
 * message, streams the assistant response (forwarding runChatTurn's events as
 * SSE), and finally persists the assistant message.
 *
 * Does NOT use the withAuth HOF — that wraps a NextResponse return type, but
 * SSE needs a plain Response. Inline auth instead.
 */

import { NextRequest } from "next/server";
import { getAuthenticatedHousehold } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildContext } from "@/lib/chat/context";
import { runChatTurn, type ChatTurn } from "@/lib/chat/anthropic";

const HISTORY_LIMIT = 50;

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedHousehold();
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return new Response(JSON.stringify({ error: "Empty message" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // The client passes the currently-selected person ID (from PersonContext).
  // We validate it belongs to the same household — never trust client input
  // for cross-household reads. Fall back to the logged-in person if missing
  // or invalid.
  let viewingPersonId = auth.personId;
  const rawViewingId = Number(body?.viewingPersonId);
  if (Number.isInteger(rawViewingId) && rawViewingId > 0 && rawViewingId !== auth.personId) {
    const member = await prisma.householdMember.findFirst({
      where: { householdId: auth.householdId, personId: rawViewingId, active: true },
      select: { personId: true },
    });
    if (member) viewingPersonId = rawViewingId;
  }

  // User's local timezone (browser-supplied) so we can format "today" in
  // their frame of reference. Default to America/Los_Angeles for the
  // friends-and-family launch; falls back to UTC if invalid.
  const timezone = typeof body?.timezone === "string" ? body.timezone : "America/Los_Angeles";

  const [history, context] = await Promise.all([
    loadHistory(auth.personId),
    buildContext(auth.personId, viewingPersonId, auth.householdId),
  ]);

  // Persist the user message before streaming so a network drop mid-response
  // still leaves the user's turn in history.
  await prisma.chatMessage.create({
    data: { personId: auth.personId, role: "user", content: message },
  });

  const turns: ChatTurn[] = [...history, { role: "user", content: message }];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let assistantText = "";
      try {
        for await (const ev of runChatTurn({
          history: turns,
          context,
          personId: auth.personId,
          householdId: auth.householdId,
          timezone,
        })) {
          if (ev.type === "text") assistantText += ev.delta;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`),
        );
      } finally {
        // Persist whatever we got — even partial responses if the client dropped.
        if (assistantText) {
          await prisma.chatMessage
            .create({
              data: { personId: auth.personId, role: "assistant", content: assistantText },
            })
            .catch((e) => console.error("Failed to persist assistant message:", e));
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

async function loadHistory(personId: number): Promise<ChatTurn[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { personId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });
  return rows
    .reverse()
    .map((r) => ({ role: r.role as ChatTurn["role"], content: r.content }));
}

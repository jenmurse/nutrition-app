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
import type Anthropic from "@anthropic-ai/sdk";
import type { MealProposal, BulkMealProposal } from "@/lib/chat/proposals";
import { getAuthenticatedHousehold } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildContext } from "@/lib/chat/context";
import { runChatTurn, CHAT_MODEL, type ChatTurn } from "@/lib/chat/anthropic";
import { logChatUsage } from "@/lib/chat/usage";

const HISTORY_LIMIT = 20;

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
      // Race the placeholder DB write against the model stream so neither
      // blocks the other. Previously we awaited the placeholder before any
      // streaming — if Prisma was slow (cold connection on Railway, etc.)
      // the user saw a hung "Thinking..." with no text for seconds.
      //
      // Now: kick off the placeholder insert as a Promise, start streaming
      // immediately. When the placeholder resolves, emit message_id (which
      // arrives within the first second under normal conditions, before
      // the user could possibly tap APPLY on a confirm-card).
      let assistantDbId: number | null = null;
      const placeholderPromise = prisma.chatMessage.create({
        data: {
          personId: auth.personId,
          role: "assistant",
          content: "",
          proposalJson: null,
          proposalStatus: null,
        },
      }).then((row) => {
        assistantDbId = row.id;
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "message_id", id: row.id })}\n\n`,
            ),
          );
        } catch { /* controller may already be closed */ }
        return row;
      }).catch((e) => {
        console.error("Failed to create assistant placeholder:", e);
        return null;
      });

      let assistantText = "";
      let proposal: MealProposal | BulkMealProposal | null = null;
      const usages: Anthropic.Usage[] = [];
      const toolsUsed: string[] = [];
      try {
        for await (const ev of runChatTurn({
          history: turns,
          context,
          personId: auth.personId,
          householdId: auth.householdId,
          timezone,
        })) {
          if (ev.type === "text") assistantText += ev.delta;
          if (ev.type === "proposal") proposal = ev.data;
          if (ev.type === "tool_start" && ev.name) toolsUsed.push(ev.name);
          if (ev.type === "done" && ev.usage) usages.push(ev.usage);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`),
        );
      } finally {
        // Make sure the placeholder promise has settled before we try to
        // update or delete it. If it failed, assistantDbId stays null.
        await placeholderPromise.catch(() => null);
        // Update the placeholder row with the final content + proposal.
        if (assistantDbId && (assistantText || proposal)) {
          try {
            await prisma.chatMessage.update({
              where: { id: assistantDbId },
              data: {
                content: assistantText,
                proposalJson: proposal ? JSON.stringify(proposal) : null,
                proposalStatus: proposal ? "pending" : null,
              },
            });
          } catch (e) {
            console.error("Failed to update assistant message:", e);
          }
        } else if (assistantDbId && !assistantText && !proposal) {
          // No content was produced — clean up the empty placeholder so
          // history isn't polluted with blank rows.
          try {
            await prisma.chatMessage.delete({ where: { id: assistantDbId } });
          } catch { /* best effort */ }
        }
        await logChatUsage({
          personId: auth.personId,
          householdId: auth.householdId,
          model: CHAT_MODEL,
          usages,
          userMessage: message,
          toolsUsed,
          promptVersion: "V11",
        });
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

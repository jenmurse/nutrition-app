"use client";

/**
 * Chat state provider — single source of truth for messages, open/closed,
 * streaming status, and the send/abort/clear API.
 *
 * Mounted once at the root layout. Components access via `useChat()`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePersonContext } from "../PersonContext";
import { clientCache } from "@/lib/clientCache";
import type { MealProposal, BulkMealProposal, RecipeSaveProposal, DayTemplateSaveProposal } from "@/lib/chat/proposals";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  error?: string;
  createdAt?: string; // ISO string — present for history-loaded messages
  // Gate 2+: proposal attached to an assistant message
  proposal?: MealProposal | BulkMealProposal | RecipeSaveProposal | DayTemplateSaveProposal;
  proposalStatus?: "pending" | "applied" | "cancelled";
  /** DB-assigned id — set when message_id SSE event arrives or loaded from history. */
  dbId?: number;
  /** Id returned by a successful apply (e.g. the new recipe id from a save_recipe
   * "new" — lets the ack link land on the actual recipe, not the list). In-session
   * only; not persisted across refresh. */
  appliedResultId?: number;
}

interface ChatState {
  open: boolean;
  setOpen: (v: boolean) => void;
  messages: ChatMessage[];
  isStreaming: boolean;
  /** Toolname currently executing, if any — surfaced in the UI as a status line. */
  toolInFlight: string | null;
  /** Send a user message. Returns when the stream completes. */
  send: (text: string) => Promise<void>;
  /** Abort the current stream (if any). */
  abort: () => void;
  /** Clear local + server history. */
  clear: () => Promise<void>;
  /** Apply a pending single proposal (fires the API call). */
  applyProposal: (messageId: string, dbId?: number) => Promise<void>;
  /** Apply a pending bulk proposal (fires all API calls sequentially). */
  applyBulkProposal: (messageId: string, dbId?: number) => Promise<void>;
  /** Cancel a pending proposal (no API call). */
  cancelProposal: (messageId: string) => void;
}

const ChatContext = createContext<ChatState | null>(null);

export function useChat(): ChatState {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolInFlight, setToolInFlight] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { selectedPersonId } = usePersonContext();
  // Keep the most recent selectedPersonId in a ref so the send() closure
  // (which captures it at creation time) always sends the freshest value.
  const viewingIdRef = useRef<number | null>(selectedPersonId);
  useEffect(() => {
    viewingIdRef.current = selectedPersonId;
  }, [selectedPersonId]);

  // Load history once on mount. Quiet failure if user not authenticated.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.messages) return;
        setMessages(
          data.messages.map(
            (m: { id: number; role: string; content: string; proposalJson?: string | null; proposalStatus?: string | null; createdAt?: string }) => ({
              id: `srv-${m.id}`,
              dbId: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              createdAt: m.createdAt,
              proposal: m.proposalJson ? JSON.parse(m.proposalJson) as (MealProposal | BulkMealProposal | RecipeSaveProposal | DayTemplateSaveProposal) : undefined,
              proposalStatus: (m.proposalStatus as ChatMessage["proposalStatus"]) ?? undefined,
            }),
          ),
        );
      })
      .catch(() => { /* not logged in or offline — fine */ });
    return () => { cancelled = true; };
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setToolInFlight(null);
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    let asstId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: asstId, role: "assistant", content: "", streaming: true },
    ]);
    setIsStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Pass the user's local timezone so the server can format "today's date"
      // in the user's frame of reference, not Railway's UTC. Browsers know
      // their timezone via Intl. Falls back to UTC if Intl is unavailable.
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "UTC";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          viewingPersonId: viewingIdRef.current,
          timezone: tz,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Request failed");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId
              ? { ...m, streaming: false, error: errText, content: m.content || "" }
              : m,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by blank lines.
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          let ev: { type: string; delta?: string; name?: string; message?: string; data?: MealProposal | BulkMealProposal | RecipeSaveProposal | DayTemplateSaveProposal; id?: number };
          try { ev = JSON.parse(json); } catch { continue; }

          if (ev.type === "text" && ev.delta) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstId ? { ...m, content: m.content + ev.delta } : m,
              ),
            );
          } else if (ev.type === "tool_start") {
            setToolInFlight(ev.name ?? null);
          } else if (ev.type === "tool_done") {
            setToolInFlight(null);
          } else if (ev.type === "proposal" && ev.data) {
            // Attach the proposal to the current assistant message.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstId
                  ? { ...m, proposal: ev.data, proposalStatus: "pending" }
                  : m,
              ),
            );
          } else if (ev.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstId
                  ? { ...m, streaming: false, error: ev.message ?? "Unknown error" }
                  : m,
              ),
            );
          } else if (ev.type === "message_id" && ev.id) {
            // ONLY set dbId — do NOT rename the local id. Renaming was
            // breaking subsequent text deltas: by the time frame N+1
            // arrived, asstId had been reassigned to "srv-X" but the
            // queued setMessages from frame N hadn't applied yet, so
            // prev.map looked for "srv-X" in state that still had "a-{ts}".
            // Result: text deltas couldn't find their target message and
            // the UI stayed blank even though the SSE response was perfect.
            //
            // Keeping asstId as "a-{ts}" forever works fine — ConfirmCard
            // and apply handlers use dbId (now reliably set) to PATCH, and
            // history-loaded messages naturally use "srv-{N}" format.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstId ? { ...m, dbId: ev.id } : m,
              ),
            );
          } else if (ev.type === "done") {
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, streaming: false } : m)),
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // AbortError on user-initiated abort: leave the partial message, no error chrome.
      if ((err as Error).name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, streaming: false } : m)),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId ? { ...m, streaming: false, error: msg } : m,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
      setToolInFlight(null);
      abortRef.current = null;
    }
  }, [isStreaming]);

  const clear = useCallback(async () => {
    await fetch("/api/chat/history", { method: "DELETE" }).catch(() => {});
    setMessages([]);
  }, []);

  /** Persist proposal status to DB. Returns a Promise so callers can await before navigating. */
  const persistProposalStatus = useCallback(
    async (messageId: string, status: "applied" | "cancelled", explicitDbId?: number): Promise<void> => {
      // Three ways to get dbId, in order of preference:
      // 1. Explicit param (avoids stale closure)
      // 2. dbId field on the message
      // 3. Parse from srv-{N} id format as last resort
      const msg = messages.find((m) => m.id === messageId);
      const parsedFromId = messageId.startsWith("srv-") ? Number(messageId.slice(4)) : NaN;
      const dbId = explicitDbId ?? msg?.dbId ?? (Number.isFinite(parsedFromId) ? parsedFromId : undefined);
      if (!dbId) {
        console.warn("[chat] persistProposalStatus: no dbId for", messageId, "— status won't persist across refresh");
        return;
      }
      console.warn(`[CHAT-DEBUG] persistProposalStatus called: dbId=${dbId} status=${status} messageId=${messageId}`);
      try {
        const r = await fetch("/api/chat/history", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: dbId, proposalStatus: status }),
        });
        if (!r.ok) {
          const body = await r.text().catch(() => "(no body)");
          console.error(
            `[CHAT-DEBUG] persistProposalStatus FAILED: ${r.status} ${r.statusText} for dbId=${dbId} status=${status}. body:`,
            body,
          );
        } else {
          console.warn(`[CHAT-DEBUG] persistProposalStatus OK: dbId=${dbId} -> ${status}`);
        }
      } catch (e) {
        console.error("[CHAT-DEBUG] persistProposalStatus threw:", e);
      }
    },
    [messages],
  );

  const applyProposal = useCallback(async (messageId: string, explicitDbId?: number) => {
    console.warn(`[CHAT-DEBUG] applyProposal click: messageId=${messageId} explicitDbId=${explicitDbId}`);
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.proposal || msg.proposalStatus !== "pending") {
      console.warn(`[CHAT-DEBUG] applyProposal bailed early: msg?=${!!msg} proposal?=${!!msg?.proposal} status=${msg?.proposalStatus}`);
      return;
    }
    const dbId = explicitDbId ?? msg.dbId;
    console.warn(`[CHAT-DEBUG] applyProposal dbId resolved: ${dbId} (msg.dbId=${msg.dbId})`);
    const { execute } = msg.proposal;
    try {
      const r = await fetch(execute.url, {
        method: execute.method,
        headers: execute.body ? { "Content-Type": "application/json" } : {},
        body: execute.body ? JSON.stringify(execute.body) : undefined,
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => "Failed");
        setMessages((prev) =>
          prev.map((m) => m.id === messageId ? { ...m, error: errText } : m),
        );
        return;
      }
      // For a save_recipe "new", the POST response is the created recipe with
      // its id — capture it so the ack link can land on the actual recipe
      // rather than the full list.
      let appliedResultId: number | undefined;
      if (msg.proposal.type === "save_recipe" && msg.proposal.mode === "new") {
        try {
          const created = await r.json();
          if (created && typeof created.id === "number") appliedResultId = created.id;
        } catch { /* response not JSON — fall back to list */ }
      }
      // Invalidate every cache a write could touch — none are large, so the
      // cheapest correct move is to clear all three (meal plans, recipes,
      // day templates).
      clientCache.invalidate("/api/meal-plans");
      clientCache.invalidate("/api/recipes");
      clientCache.invalidate("/api/day-templates");
      // Broadcast so any currently-mounted planner / recipes page can re-fetch.
      // Listeners read `event.detail` for hints (currently none).
      try { window.dispatchEvent(new CustomEvent("gm:meal-plan-changed")); } catch { /* */ }
      try { window.dispatchEvent(new CustomEvent("gm:recipes-changed")); } catch { /* */ }
      // Persist BEFORE updating UI — guarantees DB is updated before
      // the ack shows and user can click "View in planner".
      await persistProposalStatus(messageId, "applied", dbId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, proposalStatus: "applied", appliedResultId } : m)),
      );
      // Auto-continue ONLY for meal-plan proposals, which chain (fix Monday,
      // then Tuesday...). A recipe save is TERMINAL — there's no "next one".
      // Auto-sending after a save made the model try to save AGAIN (re-fetching
      // and re-proposing a slightly different card). Skip it for save_recipe.
      if (msg.proposal.type !== "save_recipe") {
        void send("Applied. If there are more changes from my original request, propose the next one. Otherwise just confirm we're done.");
      }
    } catch (err) {
      const msg2 = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, error: msg2 } : m)),
      );
    }
  }, [messages, persistProposalStatus, send]);

  const applyBulkProposal = useCallback(async (messageId: string, explicitDbId?: number) => {
    console.warn(`[CHAT-DEBUG] applyBulkProposal click: messageId=${messageId} explicitDbId=${explicitDbId}`);
    const msg = messages.find((m) => m.id === messageId);
    const bulk = msg?.proposal as BulkMealProposal | undefined;
    if (!bulk || !("executeAll" in bulk || "execute" in bulk) || msg?.proposalStatus !== "pending") {
      console.warn(`[CHAT-DEBUG] applyBulkProposal bailed early: msg?=${!!msg} bulk?=${!!bulk} status=${msg?.proposalStatus}`);
      return;
    }
    const dbId = explicitDbId ?? msg.dbId;
    console.warn(`[CHAT-DEBUG] applyBulkProposal dbId resolved: ${dbId} (msg.dbId=${msg.dbId})`);

    try {
      if ("execute" in bulk && bulk.execute) {
        // Single call (apply_template)
        const r = await fetch(bulk.execute.url, {
          method: bulk.execute.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bulk.execute.body),
        });
        if (!r.ok) {
          const errText = await r.text().catch(() => "Failed");
          setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, error: errText } : m));
          return;
        }
      } else if ("executeAll" in bulk && bulk.executeAll) {
        // Sequential calls (fill_week)
        for (const exec of bulk.executeAll) {
          const r = await fetch(exec.url, {
            method: exec.method,
            headers: exec.body ? { "Content-Type": "application/json" } : {},
            body: exec.body ? JSON.stringify(exec.body) : undefined,
          });
          if (!r.ok) {
            const errText = await r.text().catch(() => "Failed");
            setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, error: errText } : m));
            return;
          }
        }
      }
      clientCache.invalidate("/api/meal-plans");
      try { window.dispatchEvent(new CustomEvent("gm:meal-plan-changed")); } catch { /* */ }
      await persistProposalStatus(messageId, "applied", dbId);
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, proposalStatus: "applied" } : m));
      // Auto-continue across all bulk types — apply_template most often chains,
      // but fill_week can too. If there's nothing to continue with, the model
      // just acknowledges and stops.
      void send("Applied. If there are more changes from my original request, propose the next one. Otherwise just confirm we're done.");
    } catch (err) {
      const msg2 = err instanceof Error ? err.message : String(err);
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, error: msg2 } : m));
    }
  }, [messages, persistProposalStatus, send]);

  const cancelProposal = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    const dbId = msg?.dbId;
    await persistProposalStatus(messageId, "cancelled", dbId);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.proposalStatus === "pending"
          ? { ...m, proposalStatus: "cancelled" }
          : m,
      ),
    );
  }, [messages, persistProposalStatus]);

  return (
    <ChatContext.Provider
      value={{ open, setOpen, messages, isStreaming, toolInFlight, send, abort, clear, applyProposal, applyBulkProposal, cancelProposal }}
    >
      {children}
    </ChatContext.Provider>
  );
}

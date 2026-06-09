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
import type { MealProposal } from "@/lib/chat/proposals";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  error?: string;
  // Gate 2: proposal attached to an assistant message
  proposal?: MealProposal;
  proposalStatus?: "pending" | "applied" | "cancelled";
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
  /** Apply a pending proposal (fires the API call). */
  applyProposal: (messageId: string) => Promise<void>;
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
            (m: { id: number; role: string; content: string; proposalJson?: string | null; proposalStatus?: string | null }) => ({
              id: `srv-${m.id}`,
              role: m.role as "user" | "assistant",
              content: m.content,
              // Restore proposal and its persisted status (if any).
              proposal: m.proposalJson ? JSON.parse(m.proposalJson) as MealProposal : undefined,
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
          let ev: { type: string; delta?: string; name?: string; message?: string; data?: MealProposal; id?: number };
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
            // Upgrade the local id to the DB-assigned id so APPLY/CANCEL
            // can persist the status via the history PATCH endpoint.
            const serverId = `srv-${ev.id}`;
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, id: serverId } : m)),
            );
            // Also update asstId so subsequent events target the right message.
            asstId = serverId;
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

  /** Persist proposal status to DB (fire-and-forget). */
  const persistProposalStatus = useCallback(
    (messageId: string, status: "applied" | "cancelled") => {
      const numericId = messageId.startsWith("srv-")
        ? Number(messageId.slice(4))
        : NaN;
      if (isNaN(numericId)) return;
      fetch("/api/chat/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: numericId, proposalStatus: status }),
      }).catch(() => { /* best-effort */ });
    },
    [],
  );

  const applyProposal = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.proposal || msg.proposalStatus !== "pending") return;
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
      clientCache.invalidate("/api/meal-plans");
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, proposalStatus: "applied" } : m)),
      );
      persistProposalStatus(messageId, "applied");
    } catch (err) {
      const msg2 = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, error: msg2 } : m)),
      );
    }
  }, [messages, persistProposalStatus]);

  const cancelProposal = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.proposalStatus === "pending"
          ? { ...m, proposalStatus: "cancelled" }
          : m,
      ),
    );
    persistProposalStatus(messageId, "cancelled");
  }, [persistProposalStatus]);

  return (
    <ChatContext.Provider
      value={{ open, setOpen, messages, isStreaming, toolInFlight, send, abort, clear, applyProposal, cancelProposal }}
    >
      {children}
    </ChatContext.Provider>
  );
}

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

export interface ChatMessage {
  id: string; // local id for React keys (server id once persisted)
  role: "user" | "assistant";
  content: string;
  // True while the assistant message is still being streamed.
  streaming?: boolean;
  // Set when streaming hit an error after partial content was written.
  error?: string;
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
            (m: { id: number; role: string; content: string }) => ({
              id: `srv-${m.id}`,
              role: m.role as "user" | "assistant",
              content: m.content,
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
    const asstId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: asstId, role: "assistant", content: "", streaming: true },
    ]);
    setIsStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          viewingPersonId: viewingIdRef.current,
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
          let ev: { type: string; delta?: string; name?: string; message?: string };
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
          } else if (ev.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstId
                  ? { ...m, streaming: false, error: ev.message ?? "Unknown error" }
                  : m,
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

  return (
    <ChatContext.Provider
      value={{ open, setOpen, messages, isStreaming, toolInFlight, send, abort, clear }}
    >
      {children}
    </ChatContext.Provider>
  );
}

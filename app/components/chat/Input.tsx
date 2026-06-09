"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useChat } from "./ChatProvider";

// Preserve typed-but-unsent input across chat panel close/open and across
// page navigations (e.g. user types a prompt, closes chat to look at the
// planner for reference, reopens chat — the draft is still there). Per-tab,
// not persistent across browser restarts.
const DRAFT_KEY = "gm-chat-draft";

/**
 * Bottom-pinned input. Enter submits, Shift+Enter is a newline, Esc aborts
 * a streaming response if one is in flight.
 */
export default function Input() {
  const { send, isStreaming, abort } = useChat();
  // Initialize from sessionStorage so a re-mount (panel closed + reopened)
  // restores the in-progress draft. Done in useState init so the very first
  // render already has the draft — no flash of empty textarea.
  const [text, setText] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return sessionStorage.getItem(DRAFT_KEY) ?? ""; } catch { return ""; }
  });
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Persist on every change. Tiny writes, no debounce needed.
  useEffect(() => {
    try {
      if (text) sessionStorage.setItem(DRAFT_KEY, text);
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch { /* private mode / quota */ }
  }, [text]);

  // Auto-resize textarea to content (up to 5 lines).
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = 5 * 22; // line-height-ish cap
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [text]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isStreaming) return;
    const toSend = text;
    setText("");
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* */ }
    void send(toSend);
  };

  return (
    <form className="ck-input-wrap" onSubmit={onSubmit}>
      <div className="ck-input-row">
        <textarea
          ref={taRef}
          className="ck-input"
          placeholder="Ask anything about your kitchen…"
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as FormEvent);
            } else if (e.key === "Escape" && isStreaming) {
              abort();
            }
          }}
          aria-label="Message"
        />
        {isStreaming ? (
          <button type="button" className="ck-input-send" onClick={abort}>
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="ck-input-send"
            disabled={!text.trim()}
          >
            Send ↵
          </button>
        )}
      </div>
    </form>
  );
}

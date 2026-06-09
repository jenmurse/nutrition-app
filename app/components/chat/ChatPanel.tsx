"use client";

/**
 * Desktop right-docked chat panel.
 *
 * Portaled to document.body so it escapes any `transform`'d ancestor
 * (the locked stacking-context trap). Auto-closes on Esc when not streaming.
 * Auto-scrolls the message list to the bottom as content arrives.
 *
 * Mobile is a separate container shipped in Gate 4 — same internals
 * (Message, Input, EmptyState, useChat), different chrome.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useChat } from "./ChatProvider";
import Message from "./Message";
import Input from "./Input";
import EmptyState from "./EmptyState";

export default function ChatPanel() {
  const { open, setOpen, messages, toolInFlight } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Esc closes the panel (when not streaming — Input.tsx handles aborting).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Auto-scroll to bottom on new content. Uses a tiny RAF to wait for paint.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, toolInFlight]);

  // Portal-mount guard: createPortal requires document.body, which doesn't
  // exist during SSR. Render nothing on the server.
  if (typeof document === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <>
      <div
        className="ck-backdrop"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className="ck-panel"
        role="dialog"
        aria-modal="false"
        aria-label="Ask"
      >
        <header className="ck-head">
          <div className="ck-head-title">
            <span className="ck-head-star" aria-hidden="true">✦</span> Ask
          </div>
          <button
            type="button"
            className="ck-head-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="ck-scroll" ref={scrollRef}>
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((m) => <Message key={m.id} message={m} />)
          )}
          {toolInFlight && (
            <div className="ck-thinking">Looking up {prettyToolName(toolInFlight)}…</div>
          )}
        </div>

        <Input />
      </aside>
    </>,
    document.body,
  );
}

function prettyToolName(name: string): string {
  switch (name) {
    case "get_recipe":
      return "recipe detail";
    case "get_meal_plan_week":
      return "week totals";
    case "search_ingredients":
      return "pantry items";
    default:
      return name;
  }
}

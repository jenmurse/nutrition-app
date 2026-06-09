"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useChat } from "./ChatProvider";

/**
 * Bottom-pinned input. Enter submits, Shift+Enter is a newline, Esc aborts
 * a streaming response if one is in flight.
 */
export default function Input() {
  const { send, isStreaming, abort } = useChat();
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

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

"use client";

import type { ChatMessage } from "./ChatProvider";
import ConfirmCard from "./ConfirmCard";

/**
 * One message bubble — except there are no bubbles. Mono speaker label above,
 * document body below. **Bold** in the body renders as <strong> (var(--fg), 600).
 * Per the mock: YOU label uses var(--accent), GOOD MEASURE uses var(--fg).
 */
export default function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`ck-msg ${isUser ? "ck-msg-you" : "ck-msg-asst"}`}>
      <div className="ck-msg-speaker">{isUser ? "You" : "Good Measure"}</div>
      {message.content && (
        <div className="ck-msg-body">
          {renderBold(message.content)}
          {message.streaming && !message.proposal && (
            <span className="ck-cursor" aria-hidden="true">▌</span>
          )}
        </div>
      )}
      {message.proposal && (
        <ConfirmCard
          messageId={message.id}
          proposal={message.proposal}
          status={message.proposalStatus ?? "pending"}
        />
      )}
      {message.error && (
        <div className="ck-msg-error">{message.error}</div>
      )}
    </div>
  );
}

/**
 * Minimal **bold** → <strong> renderer. Sufficient for the system prompt's
 * "wrap numbers in **bold**" convention. Markdown-heavier output isn't needed
 * for v1 — if the model emits other Markdown we render it literally.
 */
function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

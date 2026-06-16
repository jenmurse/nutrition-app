"use client";

import { useChat } from "./ChatProvider";

const PROMPTS = [
  "What's my fiber average this week?",
  "Which recipes hit protein hardest?",
  "How much sodium is in Tuesday's lunch?",
];

export default function EmptyState() {
  const { send, isStreaming } = useChat();
  return (
    <div className="ck-empty">
      <div className="ck-empty-eyebrow">A new conversation</div>
      <div className="ck-empty-headline">Ask about your kitchen.</div>
      <p className="ck-empty-lede">
        Plan a day, dial in a recipe, or check tomorrow&rsquo;s groceries. Ask in plain
        language &mdash; for now I&rsquo;ll answer questions about your data; writes come soon.
      </p>
      <div className="ck-empty-prompts">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            className="ck-empty-prompt"
            disabled={isStreaming}
            onClick={() => send(p)}
          >
            &ldquo;{p}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}

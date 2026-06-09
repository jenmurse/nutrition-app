"use client";

import { useChat } from "./ChatProvider";

/**
 * ✦ glyph trigger. Used in TopNav (desktop) and MobileTopBar (mobile).
 * Ink color (matches other global nav affordances) — not theme-reactive,
 * because chat is a global action, not identity. Theme accents live inside
 * the panel.
 */
export default function ChatTrigger({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const { open, setOpen } = useChat();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label="Ask"
      aria-pressed={open}
      className={variant === "desktop" ? "ck-trigger-desktop" : "ck-trigger-mobile"}
    >
      ✦
    </button>
  );
}

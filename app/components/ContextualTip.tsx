"use client";

import { useEffect, useState, ReactNode } from "react";
import { usePersonContext } from "./PersonContext";

interface ContextualTipProps {
  tipId: string;
  label: string;
  children: ReactNode;
}

/**
 * One-time contextual tip card. Dismissed tips are stored server-side
 * per person, so each household member sees tips independently.
 */
export default function ContextualTip({ tipId, label, children }: ContextualTipProps) {
  const { selectedPerson, dismissTip } = usePersonContext();
  const [exiting, setExiting] = useState(false);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);

  const isDismissed = manuallyDismissed || (selectedPerson?.dismissedTips.includes(tipId) ?? false);

  // Wait for person data before deciding visibility
  const isReady = selectedPerson !== null;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setManuallyDismissed(true);
      dismissTip(tipId);
    }, 200);
  };

  if (!isReady || isDismissed) return null;

  return (
    <div
      className="flex gap-3 px-4 py-[12px] bg-[var(--accent-l)] border-l-2 border-[var(--accent)] transition-[opacity] duration-[200ms]"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(-4px)" : "translateY(0)",
        transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
      }}
      role="note"
      aria-label={label}
    >
      {/* Tip icon */}
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="shrink-0 mt-[1px]"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>

      <div className="flex-1 min-w-0">
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--accent)] mb-[4px]">{label}</div>
        <div className="font-sans text-[13px] text-[var(--fg)] leading-[1.6]">{children}</div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="w-[16px] h-[16px] flex items-center justify-center shrink-0 bg-transparent border-0 cursor-pointer text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
        aria-label={`Dismiss ${label} tip`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

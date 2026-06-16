"use client";

import { useState, ReactNode } from "react";
import { usePersonContext } from "./PersonContext";

const TIP_ID = "planner-tips";

interface TipStep {
  label: string;
  body: ReactNode;
}

const STEPS: TipStep[] = [
  {
    label: "Dial in a day",
    body: (
      <>
        Open a day&apos;s ⋯ menu and choose <strong>Optimize this day</strong>. Pick 1–3
        nutrition goals, lock anything you want to keep, and you&apos;ll get three swap
        options to choose from.
      </>
    ),
  },
  {
    label: "Save a day that works",
    body: (
      <>
        Built a day you like? Open its ⋯ menu and choose <strong>Save as template</strong> —
        then drop it onto any future day in one tap from the same menu.
      </>
    ),
  },
  {
    label: "Change the view",
    body: (
      <>
        Use <strong>View ▾</strong> in the toolbar to hide the nutrition totals, or switch to
        the <strong>monthly plan</strong> to see the whole month at a glance.
      </>
    ),
  },
];

/**
 * Planner onboarding tips, shown one at a time with a stepper so they don't
 * stack into a wall. Dismissal is stored once (per person) under a single tipId.
 */
export default function PlannerTips({ className }: { className?: string }) {
  const { selectedPerson, dismissTip } = usePersonContext();
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);

  const isReady = selectedPerson !== null;
  const isDismissed = manuallyDismissed || (selectedPerson?.dismissedTips.includes(TIP_ID) ?? false);

  if (!isReady || isDismissed) return null;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setManuallyDismissed(true);
      dismissTip(TIP_ID);
    }, 200);
  };

  const current = STEPS[step];
  const atStart = step === 0;
  const atEnd = step === STEPS.length - 1;

  return (
    <div
      className={`flex gap-3 px-4 py-[12px] bg-[var(--accent-l)] border-l-2 border-[var(--accent)] transition-[opacity] duration-[200ms]${className ? ` ${className}` : ""}`}
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(-4px)" : "translateY(0)",
        transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
      }}
      role="note"
      aria-label="Planner tips"
    >
      {/* Tip icon */}
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="shrink-0 mt-[1px]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>

      <div className="flex-1 min-w-0">
        {/* Label + step counter */}
        <div className="flex items-center justify-between gap-3 mb-[4px]">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--accent)]">{current.label}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] shrink-0">{step + 1} / {STEPS.length}</span>
        </div>

        {/* Body */}
        <div className="font-sans text-[13px] text-[var(--fg)] leading-[1.6]">{current.body}</div>

        {/* Stepper controls */}
        <div className="flex items-center gap-4 mt-[10px]">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={atStart}
            className="font-mono text-[9px] uppercase tracking-[0.14em] bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-default text-[var(--muted)] hover:enabled:text-[var(--fg)]"
            aria-label="Previous tip"
          >
            ‹ Back
          </button>
          {atEnd ? (
            <button
              type="button"
              onClick={handleDismiss}
              className="font-mono text-[9px] uppercase tracking-[0.14em] bg-transparent border-0 cursor-pointer transition-colors text-[var(--accent)] hover:opacity-70"
              aria-label="Finish tips"
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="font-mono text-[9px] uppercase tracking-[0.14em] bg-transparent border-0 cursor-pointer transition-colors text-[var(--fg)] hover:opacity-70"
              aria-label="Next tip"
            >
              Next ›
            </button>
          )}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="w-[16px] h-[16px] flex items-center justify-center shrink-0 bg-transparent border-0 cursor-pointer text-[var(--muted)] hover:text-[var(--fg)] transition-colors self-start"
        aria-label="Dismiss planner tips"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

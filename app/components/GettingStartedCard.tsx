"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePersonContext } from "./PersonContext";

/* ─── Task definitions ─────────────────────────────────────────────────── */

interface Task {
  id: string;
  text: string;
  note: string;
  href: string;
  checkKey: keyof OnboardingStatus;
}

interface OnboardingStatus {
  hasGoals: boolean;
  hasRecipe: boolean;
  hasIngredient: boolean;
  hasMealPlan: boolean;
  hasDashboardStats: boolean;
  hasMcp: boolean;
}

const TASKS: Task[] = [
  { id: "goals", text: "Set nutrition goals", note: "", href: "/settings#goals", checkKey: "hasGoals" },
  { id: "recipe", text: "Import your first recipe", note: "", href: "/recipes", checkKey: "hasRecipe" },
  { id: "pantry", text: "Add your first ingredient", note: "", href: "/ingredients", checkKey: "hasIngredient" },
  { id: "plan", text: "Plan your first week", note: "", href: "/meal-plans", checkKey: "hasMealPlan" },
  { id: "dashboard", text: "Choose 3 dashboard stats", note: "", href: "/settings#dashboard", checkKey: "hasDashboardStats" },
  { id: "ai", text: "Set up AI optimization", note: "Needs MCP setup", href: "/settings#mcp", checkKey: "hasMcp" },
];

/* ═══════════════════════════════════════════════════════════════════════════ */

const GETTING_STARTED_TIP_ID = "getting-started";

export default function GettingStartedCard() {
  const { selectedPerson, dismissTip } = usePersonContext();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [exiting, setExiting] = useState(false);

  const dismissed = selectedPerson?.dismissedTips.includes(GETTING_STARTED_TIP_ID) ?? false;

  // Fetch status
  useEffect(() => {
    if (dismissed) return;
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        // Dashboard stats are in localStorage — check if exactly 3 are selected
        try {
          const stored = localStorage.getItem('dashboard-stats');
          if (stored) {
            const parsed = JSON.parse(stored);
            data.hasDashboardStats = Array.isArray(parsed.enabledStats) && parsed.enabledStats.length === 3;
          } else {
            // No key means defaults are in use (calories, protein, carbs) — that's 3 stats
            data.hasDashboardStats = true;
          }
        } catch { data.hasDashboardStats = true; }
        setStatus(data);
      })
      .catch(() => {});
  }, [dismissed]);

  const completedCount = status ? TASKS.filter((t) => status[t.checkKey]).length : 0;
  const totalCount = TASKS.length;
  const allDone = completedCount === totalCount;

  // Auto-dismiss when all tasks are complete
  useEffect(() => {
    if (allDone && status && !dismissed) {
      const t = setTimeout(() => {
        dismissTip(GETTING_STARTED_TIP_ID);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [allDone, status, dismissed]);

  if (!selectedPerson || dismissed || !status) return null;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      dismissTip(GETTING_STARTED_TIP_ID);
    }, 320);
  };

  return (
    <div
      className="border border-[var(--rule)] overflow-hidden transition-[max-height,opacity,margin] duration-[320ms]"
      style={{
        maxHeight: exiting ? 0 : 600,
        opacity: exiting ? 0 : 1,
        marginBottom: exiting ? 0 : undefined,
        transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
      }}
      role="region"
      aria-label="Getting started checklist"
    >
      {/* Header — static, no collapse */}
      <div className="flex items-center justify-between px-5 py-[14px]">
        <span className="font-sans text-[13px] font-medium text-[var(--fg)]">Getting started</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] px-[8px] py-[2px] bg-[var(--accent-l)] text-[var(--accent)]">
          {completedCount} of {totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-[var(--rule)] mx-5 overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-[400ms]"
          style={{
            width: `${(completedCount / totalCount) * 100}%`,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </div>

      {/* Body — always open */}
      <div className="px-5 pt-1 pb-2">
        {/* Task list */}
        <div className="flex flex-col">
          {TASKS.map((task) => {
            const done = status[task.checkKey];
            return (
              <Link
                key={task.id}
                href={done ? "#" : task.href}
                className={`flex items-center gap-3 py-[9px] border-b border-[var(--rule-faint)] last:border-b-0 no-underline transition-colors group ${
                  done ? "pointer-events-none" : "hover:bg-[var(--bg-2)] -mx-5 px-5"
                }`}
                onClick={done ? (e) => e.preventDefault() : undefined}
                aria-label={`${task.text}${done ? " — complete" : ""}`}
              >
                {/* Check box */}
                <div
                  className="w-[16px] h-[16px] flex items-center justify-center shrink-0 transition-colors duration-[200ms]"
                  style={{
                    background: done ? "var(--accent)" : "transparent",
                    border: done ? "none" : "1.5px solid var(--rule)",
                  }}
                >
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                {/* Text */}
                <span
                  className="flex-1 font-sans text-[13px] transition-colors"
                  style={{
                    color: done ? "var(--muted)" : "var(--fg)",
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  {task.text}
                  {task.note && !done && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] ml-2">
                      {task.note}
                    </span>
                  )}
                </span>

                {/* Arrow */}
                {!done && (
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 transition-transform duration-[140ms] group-hover:translate-x-[2px]"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3">
          <button
            onClick={handleDismiss}
            className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent border-0 cursor-pointer transition-colors"
            aria-label="Dismiss getting started checklist"
          >
            {allDone ? "Done — dismiss" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  hasMcp: boolean;
}

const TASKS: Task[] = [
  { id: "goals", text: "Nutrition goals set", note: "", href: "/settings", checkKey: "hasGoals" },
  { id: "recipe", text: "Import your first recipe", note: "", href: "/recipes", checkKey: "hasRecipe" },
  { id: "pantry", text: "Add your first ingredient", note: "", href: "/ingredients", checkKey: "hasIngredient" },
  { id: "plan", text: "Plan your first week", note: "", href: "/meal-plans", checkKey: "hasMealPlan" },
  { id: "ai", text: "Set up AI optimization", note: "Needs MCP setup", href: "/settings#ai", checkKey: "hasMcp" },
];

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function GettingStartedCard() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Check dismissed state from localStorage
  useEffect(() => {
    if (localStorage.getItem("gettingStartedDismissed") === "true") {
      setDismissed(true);
    }
  }, []);

  // Fetch status
  useEffect(() => {
    if (dismissed) return;
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStatus(data); })
      .catch(() => {});
  }, [dismissed]);

  if (dismissed || !status) return null;

  const completedCount = TASKS.filter((t) => status[t.checkKey]).length;
  const totalCount = TASKS.length;

  // Auto-dismiss when all complete (after user sees it)
  const allDone = completedCount === totalCount;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem("gettingStartedDismissed", "true");
      setDismissed(true);
    }, 320);
  };

  return (
    <div
      className="bg-[var(--bg-raised)] rounded-[10px] overflow-hidden transition-all duration-[320ms]"
      style={{
        boxShadow: "var(--shadow-sm)",
        maxHeight: exiting ? 0 : 600,
        opacity: exiting ? 0 : 1,
        marginBottom: exiting ? 0 : undefined,
        transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      {/* Header — clickable to toggle collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-[12px] bg-transparent border-0 cursor-pointer text-left hover:bg-[rgba(0,0,0,0.01)] transition-colors"
        aria-expanded={!collapsed}
        aria-label={`Getting started — ${completedCount} of ${totalCount} complete. Click to ${collapsed ? "expand" : "collapse"}`}
      >
        <span className="font-sans text-[13px] font-medium text-[var(--fg)]">Getting started</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] px-[8px] py-[3px] rounded-[20px] bg-[var(--accent-light)] text-[var(--accent)]">
            {completedCount} of {totalCount}
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform duration-200"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Progress bar */}
      <div
        className="h-[2px] bg-[var(--rule)] mx-5 rounded-full overflow-hidden transition-all duration-[300ms]"
        style={{
          maxHeight: collapsed ? 0 : 2,
          opacity: collapsed ? 0 : 1,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-[400ms]"
          style={{
            width: `${(completedCount / totalCount) * 100}%`,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </div>

      {/* Body — collapsible */}
      <div
        className="transition-all duration-[300ms] overflow-hidden"
        style={{
          maxHeight: collapsed ? 0 : 400,
          opacity: collapsed ? 0 : 1,
          padding: collapsed ? "0 20px" : "8px 20px 12px",
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Task list */}
        <div className="flex flex-col">
          {TASKS.map((task) => {
            const done = status[task.checkKey];
            return (
              <Link
                key={task.id}
                href={done ? "#" : task.href}
                className={`flex items-center gap-3 py-[9px] border-b border-[var(--rule-faint)] last:border-b-0 no-underline transition-colors group ${
                  done ? "pointer-events-none" : "hover:bg-[rgba(0,0,0,0.02)]"
                }`}
                onClick={done ? (e) => e.preventDefault() : undefined}
                aria-label={`${task.text}${done ? " — complete" : ""}`}
              >
                {/* Check circle */}
                <div
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 transition-colors duration-[200ms]"
                  style={{
                    background: done ? "var(--accent)" : "transparent",
                    border: done ? "none" : "1.5px solid var(--rule-strong)",
                  }}
                >
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] ml-2">
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
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
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

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

interface PendingInvite {
  inviteId: number;
  personName: string;
  url: string;
}

const TASKS: Task[] = [
  { id: "goals", text: "Set nutrition goals", note: "", href: "/settings#goals", checkKey: "hasGoals" },
  { id: "recipe", text: "Import your first recipe", note: "", href: "/recipes", checkKey: "hasRecipe" },
  { id: "pantry", text: "Add your first ingredient", note: "", href: "/ingredients", checkKey: "hasIngredient" },
  { id: "plan", text: "Plan your first week", note: "", href: "/meal-plans", checkKey: "hasMealPlan" },
  { id: "dashboard", text: "Customize your dashboard stats", note: "", href: "/settings#dashboard", checkKey: "hasDashboardStats" },
];

// Optional tasks shown below the main list — not counted toward completion
const OPTIONAL_TASKS: Task[] = [
  { id: "ai", text: "Set up AI optimization", note: "Desktop only · MCP required", href: "/settings#mcp", checkKey: "hasMcp" },
];

/* ═══════════════════════════════════════════════════════════════════════════ */

const GETTING_STARTED_TIP_ID = "getting-started";

type PersonRow = {
  id: number;
  name: string;
  supabaseId?: string | null;
  trackedOnly?: boolean;
};
type InviteRow = {
  id: number;
  url: string;
  forPersonId: number | null;
  inviteSentAt: string | null;
  usedAt: string | null;
};

export default function GettingStartedCard() {
  const { selectedPerson, dismissTip } = usePersonContext();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [expandedInviteId, setExpandedInviteId] = useState<number | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<number | null>(null);
  const [exiting, setExiting] = useState(false);

  const dismissed = selectedPerson?.dismissedTips.includes(GETTING_STARTED_TIP_ID) ?? false;

  // Fetch status + invites
  useEffect(() => {
    if (dismissed) return;
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        // Dashboard stats are in localStorage — only complete when the user has
        // explicitly configured them (_configured: true) AND chosen exactly 3.
        // This guards against pre-fix auto-written defaults counting as "done".
        try {
          const stored = localStorage.getItem('dashboard-stats');
          if (stored) {
            const parsed = JSON.parse(stored);
            data.hasDashboardStats =
              parsed._configured === true &&
              Array.isArray(parsed.enabledStats) &&
              parsed.enabledStats.length === 3;
          } else {
            data.hasDashboardStats = false;
          }
        } catch { data.hasDashboardStats = false; }
        setStatus(data);
      })
      .catch(() => {});

    // Fetch invites + persons in parallel to build the per-member invite rows
    Promise.all([
      fetch("/api/persons").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/households/invite").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([personsData, invitesData]) => {
        if (!personsData?.persons || !Array.isArray(invitesData)) return;
        const currentPersonId: number | null = personsData.currentPersonId ?? null;
        const persons: PersonRow[] = personsData.persons;
        const invites: InviteRow[] = invitesData;

        const rows: PendingInvite[] = [];
        for (const p of persons) {
          if (p.id === currentPersonId) continue;
          if (p.trackedOnly) continue;
          if (p.supabaseId) continue; // already redeemed/joined
          const invite = invites.find((i) => i.forPersonId === p.id && !i.usedAt);
          if (!invite) continue;
          if (invite.inviteSentAt) continue;
          rows.push({ inviteId: invite.id, personName: p.name, url: invite.url });
        }
        setPendingInvites(rows);
      })
      .catch(() => {});
  }, [dismissed]);

  const completedCount = status ? TASKS.filter((t) => status[t.checkKey]).length : 0;
  const totalCount = TASKS.length + pendingInvites.length;
  const completedTotal = completedCount; // pending invites are by definition incomplete
  const allDone = completedTotal === totalCount && pendingInvites.length === 0;

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

  const handleCopyInvite = async (invite: PendingInvite) => {
    try {
      await navigator.clipboard.writeText(invite.url);
    } catch {
      // Fallback: ignore — most modern browsers support clipboard
    }
    setCopiedInviteId(invite.inviteId);
    // Mark sent on the server
    try {
      await fetch(`/api/households/invite/${invite.inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sent: true }),
      });
    } catch {}
    // Briefly show the checked state, then remove the row
    setTimeout(() => {
      setPendingInvites((rows) => rows.filter((r) => r.inviteId !== invite.inviteId));
      setExpandedInviteId(null);
      setCopiedInviteId(null);
    }, 900);
  };

  return (
    <div
      className="border border-[var(--rule)] overflow-hidden transition-[max-height,opacity,margin] duration-[320ms]"
      style={{
        maxHeight: exiting ? 0 : 800,
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
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
          {completedTotal} / {totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-[var(--rule)] mx-5 overflow-hidden">
        <div
          className="h-full bg-[var(--fg)] transition-[width] duration-[400ms]"
          style={{
            width: `${totalCount > 0 ? (completedTotal / totalCount) * 100 : 0}%`,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </div>

      {/* Body — always open */}
      <div className="px-5 pt-1 pb-2">
        {/* Per-member invite rows (top of list) */}
        {pendingInvites.length > 0 && (
          <div className="flex flex-col">
            {pendingInvites.map((invite) => {
              const expanded = expandedInviteId === invite.inviteId;
              const copied = copiedInviteId === invite.inviteId;
              return (
                <div key={invite.inviteId} className="border-b border-[var(--rule-faint)]">
                  <button
                    type="button"
                    onClick={() => setExpandedInviteId(expanded ? null : invite.inviteId)}
                    className={`w-full flex items-center gap-3 py-[9px] bg-transparent border-0 cursor-pointer text-left transition-colors group ${
                      expanded ? "" : "hover:bg-[var(--bg-2)] -mx-5 px-5"
                    }`}
                    aria-expanded={expanded}
                    aria-label={`Send ${invite.personName} an invite`}
                  >
                    {/* Check box */}
                    <div
                      className="w-[16px] h-[16px] flex items-center justify-center shrink-0 transition-colors duration-[200ms]"
                      style={{
                        background: copied ? "var(--fg)" : "transparent",
                        border: copied ? "none" : "1.5px solid var(--rule)",
                      }}
                    >
                      {copied && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="flex-1 font-sans text-[13px] text-[var(--fg)]">
                      Send {invite.personName} an invite
                    </span>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="shrink-0 transition-transform duration-[140ms]"
                      style={{ transform: expanded ? "rotate(90deg)" : "none" }}
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  {expanded && (
                    <div className="pb-3 pt-1 flex flex-col gap-[10px]">
                      <div className="flex items-stretch gap-2">
                        <div
                          className="flex-1 font-mono text-[11px] text-[var(--fg)] px-3 py-2 break-all"
                          style={{ borderLeft: "2px solid var(--rule)" }}
                        >
                          {invite.url}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyInvite(invite)}
                          className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--fg)] border border-[var(--rule)] px-3 py-2 bg-transparent cursor-pointer hover:bg-[var(--bg-2)] transition-colors shrink-0"
                          aria-label={`Copy invite link for ${invite.personName}`}
                        >
                          {copied ? "Copied" : "Copy link"}
                        </button>
                      </div>
                      <div className="font-sans text-[11px] text-[var(--muted)]">
                        Send this link to {invite.personName} so they can set up their own login.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
                    background: done ? "var(--fg)" : "transparent",
                    border: done ? "none" : "1.5px solid var(--rule)",
                  }}
                >
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

        {/* Optional tasks */}
        <div className="border-t border-[var(--rule-faint)] mt-1 pt-1">
          <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)] px-0 py-[6px]">Optional</div>
          {OPTIONAL_TASKS.map((task) => {
            const done = status[task.checkKey];
            return (
              <Link
                key={task.id}
                href={done ? "#" : task.href}
                className={`flex items-center gap-3 py-[7px] no-underline transition-colors group ${
                  done ? "pointer-events-none" : "hover:bg-[var(--bg-2)] -mx-5 px-5"
                }`}
                onClick={done ? (e) => e.preventDefault() : undefined}
                aria-label={`${task.text}${done ? " — complete" : " (optional)"}`}
              >
                <div
                  className="w-[16px] h-[16px] flex items-center justify-center shrink-0 transition-colors duration-[200ms]"
                  style={{
                    background: done ? "var(--fg)" : "transparent",
                    border: done ? "none" : "1.5px dashed var(--rule)",
                  }}
                >
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className="flex-1 font-sans text-[13px] text-[var(--muted)]" style={{ textDecoration: done ? "line-through" : "none" }}>
                  {task.text}
                  {task.note && !done && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] ml-2 opacity-60">{task.note}</span>
                  )}
                </span>
                {!done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50 transition-transform duration-[140ms] group-hover:translate-x-[2px]" aria-hidden="true">
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
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

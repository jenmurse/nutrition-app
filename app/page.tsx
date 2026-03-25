"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePersonContext } from "./components/PersonContext";
import { clientCache } from "@/lib/clientCache";

/** Get the Sunday that starts the current week */
function getCurrentWeekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // roll back to Sunday
  return d;
}

/** Parse a UTC date string preserving the calendar date in local timezone */
function parseUTCDate(dateStr: string | Date): Date {
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type DayNutrient = {
  nutrientId: number;
  displayName: string;
  unit: string;
  value: number;
  lowGoal?: number;
  highGoal?: number;
  status?: "ok" | "warning" | "error";
};

type DayData = {
  date: string;
  dayOfWeek: string;
  totalNutrients: DayNutrient[];
};

const MACRO_KEYS = ["protein", "carb", "fat", "fiber", "sugar"];

export default function Home() {
  const { selectedPersonId, selectedPerson } = usePersonContext();
  const [weekPlanId, setWeekPlanId] = useState<number | null>(null);
  const [planChecked, setPlanChecked] = useState(false);
  const [todayData, setTodayData] = useState<DayData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (selectedPersonId === null) return;
    setPlanChecked(false);
    setTodayData(null);
    setWeekPlanId(null);
    setPlanLoading(true);

    const weekStart = getCurrentWeekStart();
    const planListKey = `/api/meal-plans?personId=${selectedPersonId}`;

    const runWithPlans = async (plans: { id: number; weekStartDate: string }[]) => {
      const plan = plans.find((p) => {
        const d = parseUTCDate(p.weekStartDate);
        return d.toDateString() === weekStart.toDateString();
      });
      setPlanChecked(true);
      if (!plan) { setPlanLoading(false); return; }

      setWeekPlanId(plan.id);
      // Use cached detail if available
      const cached = clientCache.get<{ weeklySummary?: { dailyNutritions: DayData[] } }>(`/api/meal-plans/${plan.id}`);
      const detail = cached ?? await fetch(`/api/meal-plans/${plan.id}`).then((r) => r.ok ? r.json() : null);
      if (!detail?.weeklySummary?.dailyNutritions) { setPlanLoading(false); return; }

      const dayEntry = detail.weeklySummary.dailyNutritions.find(
        (d: DayData) => parseUTCDate(d.date).toDateString() === today.toDateString()
      );
      if (dayEntry) setTodayData(dayEntry);
      setPlanLoading(false);
    };

    // Use cached plan list if available for instant render
    const cachedPlans = clientCache.get<{ id: number; weekStartDate: string }[]>(planListKey);
    if (cachedPlans) {
      runWithPlans(cachedPlans).catch(() => { setPlanChecked(true); setPlanLoading(false); });
    } else {
      fetch(planListKey)
        .then((r) => r.json())
        .then((plans) => runWithPlans(plans))
        .catch(() => { setPlanChecked(true); setPlanLoading(false); });
    }
  }, [selectedPersonId]);

  const calNutrient = todayData?.totalNutrients.find((n) =>
    ["energy", "calorie"].some((k) => n.displayName.toLowerCase().includes(k))
  );
  const calValue = calNutrient?.value ?? 0;
  const calGoal = calNutrient?.highGoal ?? calNutrient?.lowGoal ?? 0;
  const calPct = calGoal > 0 ? Math.min(Math.round((calValue / calGoal) * 100), 100) : 0;

  const macros = (todayData?.totalNutrients ?? []).filter((n) =>
    MACRO_KEYS.some((k) => n.displayName.toLowerCase().includes(k))
  );

  const belowMin = (todayData?.totalNutrients ?? []).filter(
    (n) => n.status === "warning" && n.lowGoal && n.value < n.lowGoal
  );

  const hasData = todayData && calValue > 0;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-1 overflow-y-auto">

        {/* Greeting */}
        <div className="px-8 pt-8 pb-6">
          <div className="font-serif text-[28px] text-[var(--fg)] leading-tight">
            {getGreeting()}{selectedPerson ? `, ${selectedPerson.name}.` : "."}
          </div>
          <div className="font-mono text-[10px] tracking-[0.08em] text-[var(--muted)] mt-[6px]">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
          </div>
        </div>

        {/* Today's nutrition */}
        <div className="px-8 pt-5 pb-7">
          {!planChecked || planLoading ? (
            <div className="space-y-[10px] max-w-[480px]">
              <div className="h-8 w-28 bg-[var(--bg-subtle)] animate-loading" />
              <div className="h-[3px] w-full bg-[var(--rule)]" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[28px] w-full bg-[var(--bg-subtle)] animate-loading" />
              ))}
            </div>
          ) : !weekPlanId ? (
            <div className="border border-[var(--rule)] shadow-[var(--shadow-md)] rounded-md max-w-[380px] px-7 py-8 space-y-4">
              <div className="font-serif text-[18px] text-[var(--fg)] leading-snug">
                No plan for this week
              </div>
              <p className="font-sans text-[12px] text-[var(--muted)] leading-relaxed">
                Create a weekly meal plan to start logging meals and tracking your nutrition.
              </p>
              <Link
                href="/meal-plans"
                className="inline-block bg-[var(--accent)] text-[var(--accent-text)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--accent-hover)] transition-colors no-underline"
                aria-label="Create a meal plan for this week"
              >
                + Create this week's plan
              </Link>
            </div>
          ) : !hasData ? (
            <div>
              <p className="font-sans text-[13px] text-[var(--muted)] mb-4 leading-relaxed">
                No meals logged for today yet.
              </p>
              <Link
                href={`/meal-plans?planId=${weekPlanId}`}
                className="inline-block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--accent)] border border-[var(--rule)] rounded-sm px-4 py-2 no-underline hover:bg-[var(--accent-light)] transition-colors"
              >
                Open meal plan →
              </Link>
            </div>
          ) : (
            <div className="max-w-[480px]">

              {/* Calorie hero */}
              <div className="flex items-baseline gap-[6px] mb-[6px]">
                <span className="font-serif text-[32px] text-[var(--fg)] leading-none tabular-nums">
                  {Math.round(calValue).toLocaleString()}
                </span>
                <span className="font-mono text-[10px] text-[var(--muted)]">kcal</span>
                {calGoal > 0 && (
                  <span className="font-mono text-[10px] text-[var(--muted)] ml-auto tabular-nums">
                    of {Math.round(calGoal).toLocaleString()} · {calPct}%
                  </span>
                )}
              </div>
              {calGoal > 0 && (
                <div className="h-[4px] bg-[var(--rule)] mb-5 relative rounded-full">
                  <div
                    className={`absolute top-0 left-0 h-full transition-[width] duration-500 rounded-full ${
                      calPct >= 100 && calNutrient?.highGoal != null ? "bg-[var(--error)]" : "bg-[var(--accent)]"
                    }`}
                    style={{ width: `${calPct}%` }}
                  />
                </div>
              )}

              {/* Macro rows */}
              {macros.map((n) => {
                const goal = n.highGoal ?? n.lowGoal ?? 0;
                const pct = goal > 0 ? Math.min(Math.round((n.value / goal) * 100), 100) : 0;
                const isOverMax = n.highGoal && n.highGoal > 0 && n.value > n.highGoal;
                const isWarning = n.status === "warning";
                const isError = n.status === "error" || isOverMax;
                const barColor = isError ? "bg-[var(--error)]" : isWarning ? "bg-[var(--warning)]" : "bg-[var(--accent)]";
                const valColor = isError ? "text-[var(--error)]" : isWarning ? "text-[var(--warning)]" : "text-[var(--muted)]";
                const unitSuffix = n.displayName.toLowerCase() === "calories" ? "" : ` ${n.unit}`;
                const formatVal = (v: number) => { const r = Math.round(v); return r >= 1000 ? r.toLocaleString() : String(r); };

                return (
                  <div key={n.nutrientId} className="mb-3">
                    <div className="flex justify-between items-baseline mb-[5px]">
                      <span className="font-mono text-[10px] text-[var(--fg)] uppercase tracking-[0.06em]">{n.displayName}</span>
                      <span className={`font-mono text-[10px] tabular-nums ${valColor}`}>
                        {formatVal(n.value)} / {formatVal(goal)}{unitSuffix}
                      </span>
                    </div>
                    <div className="h-[4px] bg-[var(--bg-subtle)] rounded-sm overflow-hidden">
                      <div className={`h-full rounded-sm ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              {/* Below-minimum chips */}
              {belowMin.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {belowMin.map((n) => (
                    <span key={n.nutrientId} className="font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--warning-light)] text-[var(--warning-text)] px-[10px] py-[5px] rounded-sm">
                      {n.displayName} below minimum
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <Link
                  href={`/meal-plans?planId=${weekPlanId}`}
                  className="inline-block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--accent)] border border-[var(--rule)] rounded-sm px-4 py-2 no-underline hover:bg-[var(--accent-light)] transition-colors"
                >
                  View meal plan →
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

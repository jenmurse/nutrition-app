"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePersonContext } from "./components/PersonContext";

function getCurrentWeekMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
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

    const monday = getCurrentWeekMonday();

    fetch(`/api/meal-plans?personId=${selectedPersonId}`)
      .then((r) => r.json())
      .then(async (plans: { id: number; weekStartDate: string }[]) => {
        const plan = plans.find((p) => {
          const d = new Date(p.weekStartDate);
          d.setHours(0, 0, 0, 0);
          return d.toDateString() === monday.toDateString();
        });
        setPlanChecked(true);
        if (!plan) return;

        setWeekPlanId(plan.id);
        const detail = await fetch(`/api/meal-plans/${plan.id}`).then((r) =>
          r.ok ? r.json() : null
        );
        if (!detail?.weeklySummary?.dailyNutritions) return;

        const dayEntry = detail.weeklySummary.dailyNutritions.find(
          (d: DayData) => new Date(d.date).toDateString() === today.toDateString()
        );
        if (dayEntry) setTodayData(dayEntry);
      })
      .catch(() => setPlanChecked(true))
      .finally(() => setPlanLoading(false));
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
              <div className="h-8 w-28 bg-[var(--bg-subtle)]" />
              <div className="h-[3px] w-full bg-[var(--rule)]" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[28px] w-full bg-[var(--bg-subtle)] opacity-50" />
              ))}
            </div>
          ) : !weekPlanId ? (
            <div>
              <p className="font-sans text-[13px] text-[var(--muted)] mb-4 leading-relaxed">
                No meal plan for this week.
              </p>
              <Link href="/meal-plans" className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--accent)] no-underline hover:underline">
                Create a plan →
              </Link>
            </div>
          ) : !hasData ? (
            <div>
              <p className="font-sans text-[13px] text-[var(--muted)] mb-4 leading-relaxed">
                No meals logged for today yet.
              </p>
              <Link href={`/meal-plans?planId=${weekPlanId}`} className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--accent)] no-underline hover:underline">
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
                <div className="h-[4px] bg-[var(--rule)] mb-5 relative">
                  <div
                    className={`absolute top-0 left-0 h-full transition-[width] duration-500 ${
                      calPct >= 100 ? "bg-[var(--error)]" : "bg-[var(--accent)]"
                    }`}
                    style={{ width: `${calPct}%` }}
                  />
                </div>
              )}

              {/* Macro rows */}
              {macros.map((n) => {
                const goal = n.highGoal ?? n.lowGoal ?? 0;
                const pct = goal > 0 ? Math.min(Math.round((n.value / goal) * 100), 100) : 0;
                const isWarning = n.status === "warning";
                const isError = n.status === "error";
                const barColor = isError ? "bg-[var(--error)]" : isWarning ? "bg-[var(--warning)]" : "bg-[var(--accent)]";
                const valColor = isError ? "text-[var(--error)]" : isWarning ? "text-[var(--warning)]" : "text-[var(--muted)]";

                return (
                  <div key={n.nutrientId} className="flex items-center gap-3 py-[7px] border-b border-[var(--rule)] last:border-b-0">
                    <span className="font-sans text-[11px] text-[var(--muted)] w-[88px] shrink-0">{n.displayName}</span>
                    <div className="flex-1 h-[3px] bg-[var(--rule)] relative">
                      <div className={`absolute top-0 left-0 h-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`font-mono text-[10px] tabular-nums w-[80px] text-right shrink-0 ${valColor}`}>
                      {Math.round(n.value * 10) / 10}{n.unit}{goal > 0 ? ` / ${Math.round(goal)}` : ""}
                    </span>
                  </div>
                );
              })}

              {/* Below-minimum chips */}
              {belowMin.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {belowMin.map((n) => (
                    <span key={n.nutrientId} className="font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--warning-light)] text-[var(--warning-text)] px-[10px] py-[5px]">
                      {n.displayName} below minimum
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <Link
                  href={`/meal-plans?planId=${weekPlanId}`}
                  className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] border border-[var(--rule)] px-3 py-[6px] no-underline hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors"
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePersonContext } from "./components/PersonContext";
import { clientCache } from "@/lib/clientCache";

function getCurrentWeekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

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

type MealLog = {
  id: number;
  date: string;
  mealType: string;
  recipe?: { name: string } | null;
  ingredient?: { name: string } | null;
};

const MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner", "dessert"];

export default function Home() {
  const { selectedPersonId, selectedPerson } = usePersonContext();
  const [weekPlanId, setWeekPlanId] = useState<number | null>(null);
  const [planChecked, setPlanChecked] = useState(false);
  const [todayData, setTodayData] = useState<DayData | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealLog[]>([]);
  const [planLoading, setPlanLoading] = useState(false);

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (selectedPersonId === null) return;
    setPlanChecked(false);
    setTodayData(null);
    setTodayMeals([]);
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
      const cached = clientCache.get<{ weeklySummary?: { dailyNutritions: DayData[] }; mealLogs?: MealLog[] }>(`/api/meal-plans/${plan.id}`);
      const detail = cached ?? await fetch(`/api/meal-plans/${plan.id}`).then((r) => r.ok ? r.json() : null);
      if (!detail?.weeklySummary?.dailyNutritions) { setPlanLoading(false); return; }

      const dayEntry = detail.weeklySummary.dailyNutritions.find(
        (d: DayData) => parseUTCDate(d.date).toDateString() === today.toDateString()
      );
      if (dayEntry) setTodayData(dayEntry);

      if (detail.mealLogs) {
        const todayLogs = (detail.mealLogs as MealLog[]).filter(
          (m) => parseUTCDate(m.date).toDateString() === today.toDateString()
        );
        setTodayMeals(todayLogs);
      }

      setPlanLoading(false);
    };

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

  const allNutrients = todayData?.totalNutrients ?? [];
  // Only count nutrients with a lowGoal — these require hitting a minimum target.
  // Nutrients with only a highGoal (sodium, fat, etc.) are limits, not targets.
  const nutrientsWithMin = allNutrients.filter((n) => n.lowGoal != null);
  const onTrackCount = nutrientsWithMin.filter((n) => {
    const hi = n.highGoal ?? Infinity;
    return n.value >= n.lowGoal! && n.value <= hi;
  }).length;
  const totalGoals = nutrientsWithMin.length;

  const circum = 2 * Math.PI * 35;
  const ringPct = totalGoals > 0 ? onTrackCount / totalGoals : 0;
  const dashOffset = circum * (1 - ringPct);

  const overLimit = allNutrients.filter((n) => n.highGoal != null && n.value > n.highGoal);
  const belowMin = allNutrients.filter((n) => n.lowGoal != null && n.value < n.lowGoal);

  const formatVal = (v: number) => {
    const r = Math.round(v);
    return r >= 1000 ? r.toLocaleString() : String(r);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-1 overflow-y-auto">

        {/* Greeting — full width, no bottom border */}
        <div className="px-9 pt-7 pb-[22px]">
          <div className="text-[26px] font-semibold tracking-[-0.025em] text-[var(--fg)] leading-[1.15]">
            {getGreeting()}{selectedPerson ? `, ${selectedPerson.name}.` : "."}
          </div>
          <div className="font-mono text-[9px] tracking-[0.1em] text-[var(--muted)] uppercase mt-[5px]">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>

        {/* Body states */}
        {!planChecked || planLoading ? (
          <div className="px-9 space-y-[10px]">
            <div className="h-8 w-28 bg-[var(--bg-subtle)] animate-loading" />
            <div className="h-[3px] w-64 bg-[var(--bg-subtle)] animate-loading" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[28px] w-full max-w-[480px] bg-[var(--bg-subtle)] animate-loading" />
            ))}
          </div>

        ) : !weekPlanId ? (
          <div className="px-9 pb-10">
            <div className="text-[16px] font-medium text-[var(--fg)] mb-2">No meal plan for this week.</div>
            <p className="font-sans text-[13px] text-[var(--muted)] mb-6 whitespace-nowrap">
              Create a plan to start logging meals and tracking your daily nutrition.
            </p>
            <Link
              href="/meal-plans"
              className="inline-block bg-[var(--accent)] text-[var(--accent-text)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] rounded-[6px] hover:bg-[var(--accent-hover)] transition-colors no-underline"
              aria-label="Create a meal plan for this week"
            >
              + Create this week's plan
            </Link>
          </div>

        ) : !todayData ? (
          <div className="px-9 pb-10">
            <p className="font-sans text-[13px] text-[var(--muted)] mb-4">No meals logged for today yet.</p>
            <Link
              href={`/meal-plans?planId=${weekPlanId}`}
              className="inline-block font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] border border-[var(--rule)] rounded-[6px] bg-[var(--bg-raised)] px-4 py-2 no-underline hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] hover:border-[var(--rule-strong)] transition-colors"
            >
              Open meal plan →
            </Link>
          </div>

        ) : (
          /* Two-column layout — single row, hairline inset top+bottom */
          <div className="relative grid grid-cols-2">

            {/* Vertical hairline */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: "50%",
                top: "20px",
                bottom: "28px",
                width: "1px",
                background: "var(--rule-faint)",
                transform: "translateX(-0.5px)",
              }}
            />

            {/* Left: ring hero + nutrition */}
            <div className="px-9 pb-7">

              {/* Ring hero */}
              <div className="flex items-center gap-5 mb-6">
                <svg
                  width="80" height="80" viewBox="0 0 88 88"
                  aria-label={`${onTrackCount} of ${totalGoals} nutrition goals on track`}
                  role="img"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="44" cy="44" r="35" fill="none" stroke="var(--bg-subtle)" strokeWidth="7" />
                  <circle
                    cx="44" cy="44" r="35"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="7"
                    strokeDasharray={circum}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 44 44)"
                  />
                </svg>
                <div>
                  <div className="flex items-baseline gap-[6px] mb-[2px]">
                    <span className="text-[36px] font-semibold tracking-[-0.03em] text-[var(--fg)] leading-none tabular-nums">
                      {onTrackCount}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--muted)]">of {totalGoals} goals on track</span>
                  </div>
                  {(overLimit.length > 0 || belowMin.length > 0) && (
                    <div className="flex flex-col gap-[3px] mt-[6px]">
                      {overLimit.map((n) => (
                        <div key={n.nutrientId} className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)] flex items-center gap-[5px]">
                          <span>△</span> {n.displayName} +{formatVal(n.value - (n.highGoal ?? 0))}{n.unit} over limit
                        </div>
                      ))}
                      {belowMin.map((n) => (
                        <div key={n.nutrientId} className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)] flex items-center gap-[5px]">
                          <span>⊖</span> {n.displayName} −{formatVal((n.lowGoal ?? 0) - n.value)}{n.unit} below min
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Nutrition label + bars */}
              <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mb-[14px]">
                Today&apos;s nutrition
              </div>
              <div className="flex flex-col gap-[10px]">
                {allNutrients.map((n) => {
                  const goal = n.highGoal ?? n.lowGoal ?? 0;
                  const pct = goal > 0 ? Math.min(Math.round((n.value / goal) * 100), 100) : 0;
                  return (
                    <div key={n.nutrientId}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg)]">
                          {n.displayName}
                        </span>
                        <span className="font-mono text-[9px] tabular-nums text-[var(--muted)]">
                          {formatVal(n.value)} / {formatVal(goal)} {n.unit}
                        </span>
                      </div>
                      <div className="h-[4px] bg-[var(--bg-subtle)] rounded-[4px] overflow-hidden">
                        <div className="h-full rounded-[4px] bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: meals */}
            <div className="px-8 pb-7">
              <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mb-[14px]">
                Today&apos;s meals
              </div>
              <div className="flex flex-col">
                {MEAL_TYPES.map((type) => {
                  const logs = todayMeals.filter((m) => m.mealType.toLowerCase() === type);
                  const name = logs.length > 0
                    ? logs.map((m) => m.recipe?.name ?? m.ingredient?.name ?? "").filter(Boolean).join(", ")
                    : null;
                  return (
                    <div key={type} className="flex items-center py-[11px] border-b border-[var(--rule-faint)] last:border-b-0">
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)] w-[72px] shrink-0">
                        {type}
                      </span>
                      {name ? (
                        <span className="font-sans text-[12px] text-[var(--fg)] flex-1">{name}</span>
                      ) : (
                        <>
                          <span className="font-mono text-[9px] text-[var(--placeholder)] flex-1">Nothing logged yet</span>
                          <Link
                            href={`/meal-plans?planId=${weekPlanId}`}
                            className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--accent)] no-underline opacity-70 hover:opacity-100 transition-opacity"
                          >
                            + add
                          </Link>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <Link
                href={`/meal-plans?planId=${weekPlanId}`}
                className="inline-block mt-5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)] border border-[var(--rule)] rounded-[6px] bg-[var(--bg-raised)] px-3 py-[6px] no-underline hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] hover:border-[var(--rule-strong)] transition-colors"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                View full meal plan →
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

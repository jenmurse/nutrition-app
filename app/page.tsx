"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePersonContext } from "./components/PersonContext";
import { clientCache } from "@/lib/clientCache";
import GettingStartedCard from "./components/GettingStartedCard";
import ContextualTip from "./components/ContextualTip";

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
  const router = useRouter();
  const { selectedPersonId, selectedPerson, persons, onboardingComplete } = usePersonContext();

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!onboardingComplete) {
      router.push("/onboarding");
    }
  }, [onboardingComplete, router]);
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
      // Always fetch fresh so mealLogs reflect the current state, then update the cache for the meal plan page
      const detail = await fetch(`/api/meal-plans/${plan.id}`).then((r) => r.ok ? r.json() : null);
      if (!detail?.weeklySummary?.dailyNutritions) { setPlanLoading(false); return; }
      clientCache.set(`/api/meal-plans/${plan.id}`, detail);

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
  // Count all nutrients with any goal set (min, max, or range).
  // On track = satisfies whichever bounds exist.
  const nutrientsWithGoals = allNutrients.filter((n) => n.lowGoal != null || n.highGoal != null);
  const onTrackCount = nutrientsWithGoals.filter((n) => {
    const aboveMin = n.lowGoal == null || n.value >= n.lowGoal;
    const belowMax = n.highGoal == null || n.value <= n.highGoal;
    return aboveMin && belowMax;
  }).length;
  const totalGoals = nutrientsWithGoals.length;

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

        {/* Getting started checklist */}
        <div className="px-9 pb-4">
          <GettingStartedCard />
        </div>

        {/* Household switching tip — shown when 2+ members */}
        {persons.length > 1 && (
          <div className="px-9 pb-4">
            <ContextualTip tipId="household-switch" label="Switching between people">
              Use the colored dots in the top bar to switch views. Recipes and pantry are shared across the household — meal plans and nutrition goals are personal to each person.
            </ContextualTip>
          </div>
        )}

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

        ) : !todayData || todayMeals.length === 0 ? (
          <div className="px-9 pb-10">
            <div className="text-[16px] font-medium text-[var(--fg)] mb-2">No meals logged for today.</div>
            <p className="font-sans text-[13px] text-[var(--muted)] mb-6 whitespace-nowrap">
              Open your meal plan to log breakfast, lunch, and dinner.
            </p>
            <Link
              href={`/meal-plans?planId=${weekPlanId}`}
              className="inline-block bg-[var(--accent)] text-[var(--accent-text)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] rounded-[6px] hover:bg-[var(--accent-hover)] transition-colors no-underline"
              aria-label="Open meal plan to log meals"
            >
              Open meal plan →
            </Link>
          </div>

        ) : (
          /* Two-column layout: row 1 = hero (left) + spacer (right), row 2 = nutrition (left) + meals (right) */
          <div className="relative grid grid-cols-2" style={{ gridTemplateRows: "auto 1fr" }}>

            {/* Vertical hairline — short, spans only the nutrition/meals content */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: "50%",
                top: "94px",
                bottom: "14px",
                width: "1px",
                background: "var(--rule-faint)",
                transform: "translateX(-0.5px)",
              }}
            />

            {/* Row 1 left: ring hero */}
            <div className="col-start-1 row-start-1 px-9 pt-1 pb-5">
              {(() => {
                const warnings = [
                  ...overLimit.map((n) => ({ id: n.nutrientId, icon: "⚠︎", text: `${n.displayName} +${formatVal(n.value - (n.highGoal ?? 0))}${n.unit} over limit` })),
                  ...belowMin.map((n) => ({ id: n.nutrientId, icon: "⊖", text: `${n.displayName} −${formatVal((n.lowGoal ?? 0) - n.value)}${n.unit} below min` })),
                ];
                const count = warnings.length;
                // ≤2 warnings: ring vertically centered with text; 3+: ring top-aligned
                const align = count <= 2 ? "items-center" : "items-start";
                // 6+ warnings: 2-col grid, smaller text
                const manyWarnings = count >= 6;
                const warnFontSize = manyWarnings ? "text-[8px]" : "text-[9px]";
                const warnGap = manyWarnings ? "gap-[2px]" : count >= 3 ? "gap-[3px]" : "gap-[4px]";
                const warnMt = manyWarnings ? "mt-[4px]" : "mt-[8px]";
                const heroPb = count <= 1 ? "pb-4" : "";
                return (
                  <div className={`flex ${align} gap-5 ${heroPb}`}>
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
                      {count > 0 && (
                        <div className={`${warnMt} ${manyWarnings ? "grid grid-cols-2 gap-x-[18px]" : "flex flex-col"} ${warnGap}`}>
                          {warnings.map((w) => (
                            <div key={w.id} className={`font-mono ${warnFontSize} uppercase tracking-[0.06em] text-[var(--muted)] flex items-center gap-[5px]`}>
                              <span className={manyWarnings ? "text-[9px]" : "text-[10px]"} style={{ lineHeight: 1 }}>{w.icon}</span>
                              {w.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Row 1 right: spacer — matches hero height via grid row */}
            <div className="col-start-2 row-start-1" />

            {/* Row 2 left: Today's nutrition */}
            <div className="col-start-1 row-start-2 px-9 pb-7">
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

            {/* Row 2 right: Today's meals — starts at same y as nutrition label */}
            <div className="col-start-2 row-start-2 px-8 pb-7">
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

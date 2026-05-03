"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePersonContext } from "../components/PersonContext";
import { clientCache } from "@/lib/clientCache";
import GettingStartedCard from "../components/GettingStartedCard";
import EmptyState from "../components/EmptyState";
import { BrandName } from "../components/BrandName";
import ContextualTip from "../components/ContextualTip";

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
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
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
  servings?: number;
  quantity?: number;
  recipe?: { id: number; name: string } | null;
  ingredient?: { name: string } | null;
};

type PlanDetail = {
  id: number;
  weekStartDate: string;
  mealLogs: MealLog[];
  weeklySummary?: { dailyNutritions: DayData[] };
  recipeCaloriesMap?: Record<number, number>;
  mealLogCaloriesMap?: Record<number, number>;
  recipeNutrientsMap?: Record<number, Record<string, number>>;
  mealLogNutrientsMap?: Record<number, Record<string, number>>;
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "side"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Canonical display order for dashboard stats — matches settings page order
const STAT_CANONICAL_ORDER = ['calories', 'fat', 'sat-fat', 'sodium', 'carbs', 'sugar', 'protein', 'fiber'];

// Map stat keys to nutrient displayNames used in the API
const STAT_NUTRIENT_NAMES: Record<string, string[]> = {
  calories: ['Calories', 'Energy'],
  fat: ['Fat'],
  'sat-fat': ['Saturated Fat'],
  sodium: ['Sodium'],
  carbs: ['Carbs', 'Carbohydrate'],
  sugar: ['Sugar'],
  protein: ['Protein'],
  fiber: ['Fiber'],
};

export default function Home() {
  const router = useRouter();
  const { selectedPersonId, selectedPerson, persons, setSelectedPersonId, onboardingComplete } = usePersonContext();

  // Prevent browser navigation from leaving focus on first list item
  useEffect(() => {
    const id = requestAnimationFrame(() => { (document.activeElement as HTMLElement)?.blur(); });
    return () => cancelAnimationFrame(id);
  }, []);

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
  const [weekDays, setWeekDays] = useState<DayData[]>([]);
  const [allMealLogs, setAllMealLogs] = useState<MealLog[]>([]);
  const [recipeCaloriesMap, setRecipeCaloriesMap] = useState<Record<number, number>>({});
  const [mealLogCaloriesMap, setMealLogCaloriesMap] = useState<Record<number, number>>({});
  const [recipeNutrientsMap, setRecipeNutrientsMap] = useState<Record<number, Record<string, number>>>({});
  const [mealLogNutrientsMap, setMealLogNutrientsMap] = useState<Record<number, Record<string, number>>>({});

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  useEffect(() => {
    if (selectedPersonId === null) return;
    setPlanChecked(false);
    setTodayData(null);
    setTodayMeals([]);
    setWeekPlanId(null);
    setPlanLoading(true);
    setWeekDays([]);
    setAllMealLogs([]);
    setRecipeCaloriesMap({});
    setMealLogCaloriesMap({});
    setRecipeNutrientsMap({});
    setMealLogNutrientsMap({});

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
      const detail: PlanDetail | null = await fetch(`/api/meal-plans/${plan.id}`).then((r) => r.ok ? r.json() : null);
      if (!detail?.weeklySummary?.dailyNutritions) { setPlanLoading(false); return; }
      clientCache.set(`/api/meal-plans/${plan.id}`, detail);

      // Store week-level data
      setWeekDays(detail.weeklySummary.dailyNutritions);
      setAllMealLogs(detail.mealLogs ?? []);
      setRecipeCaloriesMap(detail.recipeCaloriesMap ?? {});
      setMealLogCaloriesMap(detail.mealLogCaloriesMap ?? {});
      setRecipeNutrientsMap(detail.recipeNutrientsMap ?? {});
      setMealLogNutrientsMap(detail.mealLogNutrientsMap ?? {});

      const dayEntry = detail.weeklySummary.dailyNutritions.find(
        (d: DayData) => parseUTCDate(d.date).toDateString() === today.toDateString()
      );
      if (dayEntry) setTodayData(dayEntry);

      if (detail.mealLogs) {
        const todayLogs = detail.mealLogs.filter(
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

  const formatVal = (v: number) => {
    const r = Math.round(v);
    return r >= 1000 ? r.toLocaleString() : String(r);
  };

  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Dashboard stat preferences from settings
  const [enabledStats, setEnabledStats] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dashboard-stats');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.enabledStats) setEnabledStats(parsed.enabledStats);
      }
    } catch {}
  }, []);

  // Map stat keys to nutrient lookup
  const STAT_KEY_MAP: Record<string, { match: (n: DayNutrient) => boolean; label: string; unit: string }> = {
    calories: { match: (n) => (n.displayName?.toLowerCase().includes('calor') ?? false), label: 'Calories', unit: '' },
    fat: { match: (n) => n.displayName === 'Fat', label: 'Fat', unit: 'g' },
    'sat-fat': { match: (n) => n.displayName === 'Saturated Fat', label: 'Sat Fat', unit: 'g' },
    sodium: { match: (n) => n.displayName === 'Sodium', label: 'Sodium', unit: 'mg' },
    carbs: { match: (n) => (n.displayName === 'Carbs' || n.displayName === 'Carbohydrate'), label: 'Carbs', unit: 'g' },
    sugar: { match: (n) => n.displayName === 'Sugar', label: 'Sugar', unit: 'g' },
    protein: { match: (n) => n.displayName === 'Protein', label: 'Protein', unit: 'g' },
    fiber: { match: (n) => n.displayName === 'Fiber', label: 'Fiber', unit: 'g' },
  };

  // Sort enabled stats into canonical order
  const orderedStats = STAT_CANONICAL_ORDER.filter(k => enabledStats.includes(k)).slice(0, 3);

  const statEntries = orderedStats.map(key => {
    const cfg = STAT_KEY_MAP[key];
    if (!cfg) return null;
    const nutrient = allNutrients.find(cfg.match);
    const value = nutrient?.value ?? 0;
    const highGoal = nutrient?.highGoal ?? 0;
    const lowGoal  = nutrient?.lowGoal  ?? 0;
    const goal = highGoal || lowGoal;
    const pct  = goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : 0;
    // isOver: value exceeded a hard cap (highGoal set)
    const isOver   = highGoal > 0 && value > highGoal;
    // isMetMin: value reached a minimum target and there is no cap to violate
    const isMetMin = !highGoal && lowGoal > 0 && value >= lowGoal;
    return { key, label: cfg.label, unit: cfg.unit, value, goal, pct, isOver, isMetMin };
  }).filter(Boolean) as { key: string; label: string; unit: string; value: number; goal: number; pct: number; isOver: boolean; isMetMin: boolean }[];

  /** Get nutrient values for a meal log based on selected stats */
  const getMealNutrients = (m: MealLog): { label: string; value: number; unit: string }[] => {
    let nutrients: Record<string, number> = {};
    if (m.recipe?.id && recipeNutrientsMap[m.recipe.id]) {
      const perServing = recipeNutrientsMap[m.recipe.id];
      for (const [name, val] of Object.entries(perServing)) {
        nutrients[name] = Math.round(val * (m.servings ?? 1));
      }
    } else if (mealLogNutrientsMap[m.id]) {
      nutrients = mealLogNutrientsMap[m.id];
    }
    return orderedStats.map(key => {
      const cfg = STAT_KEY_MAP[key];
      if (!cfg) return null;
      const names = STAT_NUTRIENT_NAMES[key] ?? [];
      const matchName = names.find(n => nutrients[n] != null);
      return matchName != null ? { label: cfg.label, value: nutrients[matchName], unit: cfg.unit } : null;
    }).filter(Boolean) as { label: string; value: number; unit: string }[];
  };

  /** Get kcal for a meal log */
  const getMealKcal = (m: MealLog): number | null => {
    if (m.recipe?.id && recipeCaloriesMap[m.recipe.id] != null) {
      return Math.round(recipeCaloriesMap[m.recipe.id] * (m.servings ?? 1));
    }
    if (mealLogCaloriesMap[m.id] != null) {
      return mealLogCaloriesMap[m.id];
    }
    return null;
  };

  /** Group today's meals by type for the editorial numbered columns */
  const mealColumns = MEAL_TYPES.map((type, i) => {
    const logs = todayMeals.filter((m) => m.mealType.toLowerCase() === type);
    return { type, number: String(i + 1).padStart(2, "0"), logs };
  }).filter((col) => col.logs.length > 0);

  // Scroll-reveal: observe .hm-reveal elements and add .hm-in when visible
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('hm-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { root, threshold: 0.1 }
    );
    const els = root.querySelectorAll('.hm-reveal');
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [planChecked, planLoading, weekPlanId, todayMeals]);

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto hm-bottom-pad animate-page-enter">

        {/* Hero — full-viewport greeting (compact on mobile via .hm-hero) */}
        <div key={`hero-${selectedPersonId}`} className="hm-hero">
          {/* Mobile chrome: logo + person switcher (hidden on desktop — top nav covers this) */}
          <div className="hm-mob-chrome" aria-hidden="false">
            <BrandName className="hm-mob-brand" />
            {persons.length > 1 && (
              <div className="hm-mob-persons" role="group" aria-label="Switch person">
                {persons.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonId(p.id)}
                    className={`hm-mob-person-chip${selectedPersonId === p.id ? ' on' : ''}`}
                    aria-label={p.name}
                    aria-pressed={selectedPersonId === p.id}
                    style={selectedPersonId === p.id ? { borderColor: p.color || 'var(--accent)' } : undefined}
                  >
                    <span className="hm-mob-person-chip-dot" style={{ background: p.color || 'var(--accent)' }} />
                    <span className="hm-mob-person-chip-name">{persons.length <= 3 ? p.name : p.name[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Household switching tip */}
          {persons.length > 1 && (
            <div style={{ padding: `20px var(--pad) 0` }}>
              <ContextualTip tipId="household-switch" label="Switching between people">
                Use the colored dots in the top bar to switch views. Recipes and pantry are shared across the household — meal plans and nutrition goals are personal to each person.
              </ContextualTip>
            </div>
          )}

          {/* Getting started checklist */}
          <div style={{ padding: `16px var(--pad) 32px` }}>
            <GettingStartedCard />
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', padding: `0 var(--pad) 20px` }}>
            <div>
              {/* Eyebrow: date */}
              <div className="flex items-center gap-3 mb-4" style={{ marginLeft: '2px', animation: 'hmFadeIn 500ms var(--ease-out) both' }}>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">{dateStr}</span>
              </div>
              {/* Greeting */}
              <div className="font-serif hm-greeting-text" style={{ fontWeight: 500, lineHeight: 0.91, letterSpacing: '-0.03em', color: 'var(--fg)', marginLeft: '-6px' }}>
                <span className="block" style={{ animation: 'hmFadeUp 500ms var(--ease-out) 40ms both' }}>{getGreeting()}</span>
                <span className="block text-[var(--accent)]" style={{ animation: 'hmFadeUp 500ms var(--ease-out) 130ms both' }}>{selectedPerson?.name ?? ""}</span>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className={`hm-stats-border border-t border-[var(--rule)]${statEntries.length === 0 ? ' border-b' : ''}`}>
            {statEntries.length === 0 ? (
              <div style={{ padding: `20px var(--pad)`, borderLeft: '2px solid var(--rule)', marginLeft: 'var(--pad)' }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--muted)] mb-[8px]">§ DASHBOARD STATS</div>
                <div className="font-sans text-[13px] text-[var(--fg-2)] mb-[12px]">Pick three nutrition values to track here.</div>
                <Link
                  href="/settings#dashboard"
                  className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--fg)] no-underline hover:opacity-70 transition-opacity"
                >
                  Choose stats →
                </Link>
              </div>
            ) : (
              <div className="hm-stats-strip" style={{ padding: `0 var(--pad)` }}>
                {statEntries.map((stat, idx) => {
                  const delay = 350 + idx * 80;
                  return (
                    <div
                      key={stat.key}
                      className="hm-stat-item"
                      style={{
                        opacity: 0,
                        animation: `hmFadeUp 500ms var(--ease-out) ${delay}ms both`,
                      }}
                    >
                      <div className="hm-stat-label font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] mb-[5px]">{stat.label}</div>
                      <div className="hm-stat-value font-sans text-[36px] font-medium tracking-[-0.03em] tabular-nums text-[var(--fg)] leading-none">
                        {formatVal(stat.value)}
                        {stat.unit && <span className="hm-stat-unit font-mono text-[11px] text-[var(--muted)] ml-1">{stat.unit}</span>}
                      </div>
                      <div className="hm-stat-sub font-mono text-[9px] tracking-[0.06em] text-[var(--muted)] mt-[5px]" style={{ visibility: stat.goal > 0 ? 'visible' : 'hidden' }}>
                        of {formatVal(stat.goal)}{stat.unit ? ` ${stat.unit}` : ''}
                      </div>
                      <div className="h-[2px] bg-[var(--rule)] mt-[10px] relative">
                        <div className="absolute top-0 left-0 h-full" style={{ width: `${stat.pct}%`, transition: 'width 0.6s var(--ease-out)', background: stat.isOver ? 'var(--err)' : stat.isMetMin ? 'var(--ok)' : 'var(--fg)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Body states */}
        {!planChecked || planLoading ? (
          <div style={{ padding: `40px var(--pad)` }} className="space-y-3">
            <div className="h-8 w-28 bg-[var(--bg-3)] animate-loading" />
            <div className="h-[3px] w-64 bg-[var(--bg-3)] animate-loading" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[28px] w-full max-w-[480px] bg-[var(--bg-3)] animate-loading" />
            ))}
          </div>

        ) : !weekPlanId ? (
          <div style={{ padding: `56px var(--pad) 72px` }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)] mb-6">This week</div>
            <EmptyState
              eyebrow="§ NO PLAN THIS WEEK"
              headline="A blank week."
              lede={<>Drop in recipes for the days ahead<br />and the nutrition math handles itself.</>}
              ctaLabel="+ CREATE PLAN →"
              ctaHref="/meal-plans"
            />
          </div>

        ) : !todayData || todayMeals.length === 0 ? (
          <>
            <div style={{ padding: `56px var(--pad) 72px` }}>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)] mb-6">Today</div>
              <EmptyState
                eyebrow="§ NOTHING TODAY"
                headline="No meals logged."
                lede={<>Open the planner to add meals<br />for today.</>}
                ctaLabel="+ ADD MEAL →"
                ctaHref={`/meal-plans/add-meal?planId=${weekPlanId}&date=${todayISO}`}
              />
            </div>

            {/* This Week — show even when no meals today (hidden on mobile) */}
            {weekDays.length > 0 && (
              <div className="hm-thisweek-section" style={{ padding: `0 var(--pad)`, paddingBottom: 0 }}>
                <div className="hm-thisweek-hdr hm-reveal flex items-center justify-between" style={{ padding: '40px 0 28px', borderTop: 'none' }}>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">This week</span>
                  <Link
                    href={`/meal-plans?planId=${weekPlanId}`}
                    className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg)] no-underline hover:opacity-70 transition-opacity"
                  >
                    Full planner →
                  </Link>
                </div>
                <WeekOverview
                  weekDays={weekDays}
                  allMealLogs={allMealLogs}
                  recipeCaloriesMap={recipeCaloriesMap}
                  mealLogCaloriesMap={mealLogCaloriesMap}
                  weekPlanId={weekPlanId}
                />
              </div>
            )}
          </>

        ) : (
          <>
            {/* Today's Meals — editorial numbered columns */}
            <div className="hm-meals-wrap" style={{ padding: `0 var(--pad) 72px` }}>
              <div className="hm-keymeal-hdr hm-reveal flex items-center justify-between border-t border-[var(--rule)]" style={{ padding: '56px 0 28px' }}>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">Today&apos;s key meals</span>
                <Link
                  href={`/meal-plans?planId=${weekPlanId}`}
                  className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg)] no-underline hover:opacity-70 transition-opacity"
                >
                  Open planner →
                </Link>
              </div>

              {mealColumns.length > 0 ? (
                <div className="hm-meal-cols">
                  {mealColumns.map((col, idx) => (
                    <div
                      key={col.type}
                      className="hm-meal-col hm-reveal"
                      style={{ transitionDelay: `${idx * 70}ms` }}
                    >
                      {col.logs.map((m, mi) => {
                        const name = m.recipe?.name ?? m.ingredient?.name ?? "";
                        const mealStats = getMealNutrients(m);
                        return (
                          <div key={m.id}>
                            {/* Number · Type header */}
                            <div
                              className="hm-mealtype-hdr font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--muted)] mb-3 pb-[10px] border-b border-[var(--rule)]"
                            >
                              {col.number} · {col.type}
                              {mi > 0 ? ` (${mi + 1})` : ""}
                            </div>
                            {/* Meal name */}
                            {m.recipe?.id ? (
                              <Link
                                href={`/recipes/${m.recipe.id}`}
                                className="no-underline group"
                              >
                                <div className="meal-card-name" style={{ textWrap: 'balance' }}>
                                  {name}
                                </div>
                              </Link>
                            ) : (
                              <div className="meal-card-name" style={{ textWrap: 'balance' }}>
                                {name}
                              </div>
                            )}
                            {/* Nutrient rows — 3 selected stats */}
                            {mealStats.map((s) => (
                              <div key={s.label} className="flex justify-between items-center py-[6px] border-b border-[var(--rule)]">
                                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">{s.label}</span>
                                <span className="font-serif text-[16px] font-semibold tracking-[-0.01em] tabular-nums">
                                  {s.value}{s.unit && <span className="text-[11px] text-[var(--muted)] ml-[2px]">{s.unit}</span>}
                                </span>
                              </div>
                            ))}
                            {m.recipe?.id && (
                              <Link
                                href={`/recipes/${m.recipe.id}`}
                                className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg)] no-underline hover:opacity-70 transition-opacity mt-[14px] inline-block"
                              >
                                See recipe →
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  eyebrow="§ NOTHING TODAY"
                  headline="No meals logged."
                  lede={<>Open the planner to add meals<br />for today.</>}
                  ctaLabel="+ ADD MEAL →"
                  ctaHref={`/meal-plans/add-meal?planId=${weekPlanId}&date=${todayISO}`}
                />
              )}
            </div>

            {/* This Week — 7-day overview (hidden on mobile) */}
            {weekDays.length > 0 && (
              <div className="hm-thisweek-section" style={{ padding: `0 var(--pad)`, paddingBottom: 0 }}>
                <div className="hm-thisweek-hdr hm-reveal flex items-center justify-between" style={{ padding: '40px 0 28px' }}>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">This week</span>
                  <Link
                    href={`/meal-plans?planId=${weekPlanId}`}
                    className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg)] no-underline hover:opacity-70 transition-opacity"
                  >
                    Full planner →
                  </Link>
                </div>
                <WeekOverview
                  weekDays={weekDays}
                  allMealLogs={allMealLogs}
                  recipeCaloriesMap={recipeCaloriesMap}
                  mealLogCaloriesMap={mealLogCaloriesMap}
                  weekPlanId={weekPlanId}
                />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

/* ── This Week overview component ─────────────────────────────────── */

function WeekOverview({
  weekDays,
  allMealLogs,
  recipeCaloriesMap,
  mealLogCaloriesMap,
  weekPlanId,
}: {
  weekDays: DayData[];
  allMealLogs: MealLog[];
  recipeCaloriesMap: Record<number, number>;
  mealLogCaloriesMap: Record<number, number>;
  weekPlanId: number;
}) {
  const todayStr = new Date().toDateString();

  return (
    <div className="hm-week-grid">
      <div className="hm-week-inner" style={{ minHeight: '55vh', alignItems: 'stretch' }}>
      {weekDays.map((day, dayIdx) => {
        const date = parseUTCDate(day.date);
        const isToday = date.toDateString() === todayStr;
        const dayMeals = allMealLogs.filter(
          (m) => parseUTCDate(m.date).toDateString() === date.toDateString()
        );

        // Calories for this day
        const calNutrient = day.totalNutrients.find(
          (n) => n.displayName?.toLowerCase().includes("calor")
        );
        const calVal = calNutrient ? Math.round(calNutrient.value) : 0;
        const calGoal = calNutrient?.highGoal ?? calNutrient?.lowGoal ?? 0;
        const calPct = calGoal > 0 ? Math.min(Math.round((calVal / calGoal) * 100), 100) : 0;

        return (
          <div
            key={day.date}
            className="hm-week-day hm-reveal"
            style={{ background: isToday ? 'var(--accent-l)' : undefined, transitionDelay: `${dayIdx * 40}ms` }}
          >
            {/* Day header */}
            <div className="hm-week-day-header" style={{ padding: '12px 14px 14px' }}>
              <div
                className="hm-day-abbr font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{ color: isToday ? 'var(--accent)' : 'var(--muted)' }}
              >
                {DAY_NAMES[date.getDay()]}
              </div>
              <div
                className="hm-day-num font-serif text-[28px] font-bold tracking-[-0.03em] leading-none mt-[2px] tabular-nums"
                style={{ color: isToday ? 'var(--fg)' : 'var(--fg-2)' }}
              >
                {date.getDate()}
              </div>
              <div className="hm-day-kcal font-mono text-[9px] tracking-[0.04em] text-[var(--muted)] mt-1">
                {calVal > 0 ? `${calVal.toLocaleString()} kcal` : "\u00A0"}
              </div>
              <div className="hm-day-bar h-[2px] bg-[var(--rule)] mt-[6px] relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: isToday ? 'var(--accent)' : 'var(--ok)',
                    width: `${calPct}%`,
                    transition: 'width 0.5s var(--ease-out)',
                  }}
                />
              </div>
            </div>

            {/* Meals */}
            <div className="hm-day-meals" style={{ padding: '8px 14px 72px' }}>
              {dayMeals.map((m) => {
                const name = m.recipe?.name ?? m.ingredient?.name ?? "";
                let kcal: number | null = null;
                if (m.recipe?.id && recipeCaloriesMap[m.recipe.id] != null) {
                  kcal = Math.round(recipeCaloriesMap[m.recipe.id] * (m.servings ?? 1));
                } else if (mealLogCaloriesMap[m.id] != null) {
                  kcal = mealLogCaloriesMap[m.id];
                }
                return (
                  <div key={m.id} style={{ padding: '6px 0' }}>
                    <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[2px]">
                      {m.mealType}
                    </div>
                    <div className="font-sans text-[11px] text-[var(--fg)] leading-[1.35]">{name}</div>
                    {kcal != null && (
                      <div className="font-mono text-[9px] text-[var(--muted)] mt-[1px]">{kcal} kcal</div>
                    )}
                  </div>
                );
              })}
              {dayMeals.length === 0 && (
                <Link
                  href={`/meal-plans?planId=${weekPlanId}`}
                  className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] no-underline hover:text-[var(--fg)] transition-colors block py-[6px]"
                >
                  + Add
                </Link>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

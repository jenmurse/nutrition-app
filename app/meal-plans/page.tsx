'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MealPlanWeek from '@/app/components/MealPlanWeek';
import MealPlanDndWrapper from '@/app/components/MealPlanDndWrapper';
import SmartSuggestionsPanel from '@/app/components/SmartSuggestionsPanel';
import { usePersonContext, Person } from '@/app/components/PersonContext';
import { dialog } from '@/lib/dialog';
import EmptyState from '@/app/components/EmptyState';
import { toast } from '@/lib/toast';
import { clientCache } from '@/lib/clientCache';

/** Parse a UTC date string as a local Date preserving the calendar date.
 *  e.g. "2026-03-22T00:00:00.000Z" → local Date for March 22 midnight,
 *  not March 21 (which happens when JS shifts UTC to local timezone). */
function parseUTCDate(dateStr: string | Date): Date {
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

interface Recipe {
  id: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  isComplete?: boolean;
}

interface Ingredient {
  id: number;
  name: string;
  defaultUnit: string;
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  isMealItem?: boolean;
}

interface Nutrient {
  nutrientId: number;
  nutrientName: string;
  displayName: string;
  unit: string;
  value: number;
  lowGoal?: number;
  highGoal?: number;
  status?: 'ok' | 'warning' | 'error';
}

interface DayNutrients {
  date: Date;
  dayOfWeek: string;
  totalNutrients: Nutrient[];
}

interface MealLog {
  id: number;
  date: string;
  mealType: string;
  recipe?: Recipe;
  ingredient?: Ingredient;
  servings?: number;
  quantity?: number;
  unit?: string;
  position?: number;
}

interface MealPlan {
  id: number;
  weekStartDate: string;
  personId?: number | null;
  createdAt: string;
  mealLogs?: MealLog[];
  nutritionGoals?: Array<{
    nutrientId: number;
    lowGoal?: number;
    highGoal?: number;
    nutrient: Nutrient;
  }>;
  weeklySummary?: {
    dailyNutritions: DayNutrients[];
  };
  recipeCaloriesMap?: Record<number, number>;
  mealLogCaloriesMap?: Record<number, number>;
  _count?: { mealLogs: number };
  shoppingChecked?: string;
}

// Shared meal key: recipeId-dateString
function sharedKey(recipeId: number, date: string) {
  return `${recipeId}-${parseUTCDate(date).toDateString()}`;
}

function BothView({
  persons,
  weekStartDate,
}: {
  persons: Person[];
  weekStartDate: string;
}) {
  const [plansByPerson, setPlansByPerson] = useState<Map<number, MealPlan | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileDayIdx, setActiveMobileDayIdx] = useState(0);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Default to today's day index within the week
  useEffect(() => {
    const weekStart = parseUTCDate(weekStartDate);
    const todayStr = new Date().toDateString();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      if (d.toDateString() === todayStr) { setActiveMobileDayIdx(i); return; }
    }
    setActiveMobileDayIdx(0);
  }, [weekStartDate]);

  useEffect(() => {
    if (!weekStartDate) return;
    setLoading(true);

    const weekStart = parseUTCDate(weekStartDate);

    async function fetchAll() {
      const map = new Map<number, MealPlan | null>();
      await Promise.all(
        persons.map(async (p) => {
          const res = await fetch(`/api/meal-plans?personId=${p.id}`);
          if (!res.ok) { map.set(p.id, null); return; }
          const plans: MealPlan[] = await res.json();
          const match = plans.find((pl) => {
            const d = parseUTCDate(pl.weekStartDate);
            return d.getTime() === weekStart.getTime();
          });
          if (!match) { map.set(p.id, null); return; }
          const detailRes = await fetch(`/api/meal-plans/${match.id}`);
          if (!detailRes.ok) { map.set(p.id, null); return; }
          map.set(p.id, await detailRes.json());
        })
      );
      setPlansByPerson(map);
      setLoading(false);
    }
    fetchAll();
  }, [persons, weekStartDate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="font-mono text-[11px] text-[var(--muted)]">Loading both plans...</span>
      </div>
    );
  }

  // Build set of shared recipe keys across all persons
  const recipeDateSets: Set<string>[] = persons.map((p) => {
    const plan = plansByPerson.get(p.id);
    const s = new Set<string>();
    plan?.mealLogs?.forEach((m) => { if (m.recipe) s.add(sharedKey(m.recipe.id, m.date)); });
    return s;
  });
  const sharedKeys = new Set<string>();
  if (recipeDateSets.length >= 2) {
    recipeDateSets[0].forEach((k) => {
      if (recipeDateSets.slice(1).every((s) => s.has(k))) sharedKeys.add(k);
    });
  }

  // Build 7 day dates from weekStartDate
  const weekStart = parseUTCDate(weekStartDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'side', 'snack', 'dessert', 'beverage'];
  const mealTypeLetters: Record<string, string> = { breakfast: 'B', lunch: 'L', dinner: 'D', side: 'Si', snack: 'Sn', dessert: 'De', beverage: 'Bv' };
  const todayStr = new Date().toDateString();

  if (isMobile) {
    // ── Mobile: day-first, stacked persons ──
    const activeDay = days[activeMobileDayIdx];
    const isToday = activeDay?.toDateString() === todayStr;
    // 2-char abbreviations fit 7 buttons across 375px without crowding
    const dayAbbr = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
      // pl-main provides flex:1 + flex-direction:column so strip stacks above content
      <div className="pl-main">
        {/* Day strip */}
        <div className="pl-day-strip" role="tablist" aria-label="Week days">
          {days.map((day, idx) => {
            const todayFlag = day.toDateString() === todayStr;
            return (
              <button
                key={idx}
                role="tab"
                className={`pl-day-strip-btn${todayFlag ? ' today' : ''}${idx === activeMobileDayIdx ? ' active' : ''}`}
                onClick={() => setActiveMobileDayIdx(idx)}
                aria-selected={idx === activeMobileDayIdx}
                aria-label={`${dayNames[day.getDay()]} ${day.getDate()}`}
              >
                <span className="pl-day-strip-name">{dayAbbr[day.getDay()]}</span>
                <span className="pl-day-strip-num">{day.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* Active day — stacked person sections */}
        {activeDay && (
          <div
            className={`pl-mobile-day${isToday ? ' today' : ''}`}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const delta = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(delta) > 50) {
                if (delta < 0 && activeMobileDayIdx < days.length - 1) setActiveMobileDayIdx(i => i + 1);
                else if (delta > 0 && activeMobileDayIdx > 0) setActiveMobileDayIdx(i => i - 1);
              }
            }}
          >
            {/* Day header */}
            <div className="wk-day-header">
              <div className="wk-day-name">{dayNames[activeDay.getDay()]}</div>
              <div className="wk-day-num">{activeDay.getDate()}</div>
            </div>

            {/* One section per person */}
            {persons.map((p) => {
              const plan = plansByPerson.get(p.id);
              const meals = (plan?.mealLogs?.filter(
                (m) => parseUTCDate(m.date).toDateString() === activeDay.toDateString()
              ) ?? []).sort((a, b) => mealTypeOrder.indexOf(a.mealType) - mealTypeOrder.indexOf(b.mealType));

              return (
                <div key={p.id} className="ev-mobile-person">
                  <div className="ev-mobile-person-label">
                    <span className="ev-row-dot" style={{ background: p.color || 'var(--accent)' }} />
                    <span className="ev-row-name">{p.name}</span>
                  </div>
                  {meals.length === 0 ? (
                    <p className="pl-mobile-empty" style={{ padding: '8px 0 4px', textAlign: 'left' }}>No meals</p>
                  ) : (
                    meals.map((m) => {
                      const name = m.recipe?.name ?? m.ingredient?.name ?? '?';
                      const typeLetter = mealTypeLetters[m.mealType] || m.mealType.charAt(0).toUpperCase();
                      return (
                        <div key={m.id} className="ev-cell-meal">
                          <span className="ev-meal-type">{typeLetter}</span>
                          {name}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ev-grid">
      {/* Header row: spacer + 7 day headers */}
      <div className="ev-spacer" />
      {days.map((day, i) => {
        const isToday = day.toDateString() === todayStr;
        return (
          <div
            key={day.toISOString()}
            className={`ev-day-head ${isToday ? 'today' : ''}`}
            style={{ '--col-i': i } as React.CSSProperties}
          >
            <div className="ev-dname">{dayNames[day.getDay()]}</div>
            <div className="ev-dnum">{day.getDate()}</div>
          </div>
        );
      })}

      {/* Person rows */}
      {persons.map((p, ri) => {
        const plan = plansByPerson.get(p.id);
        return (
          <React.Fragment key={p.id}>
            {/* Person label column */}
            <div className="ev-row-label" style={{ '--row-i': ri } as React.CSSProperties}>
              <span className="ev-row-dot" style={{ background: p.color || 'var(--accent)' }} />
              <span className="ev-row-name">{p.name}</span>
            </div>

            {/* 7 day cells for this person */}
            {days.map((day) => {
              const isToday = day.toDateString() === todayStr;
              const meals = (plan?.mealLogs?.filter(
                (m) => parseUTCDate(m.date).toDateString() === day.toDateString()
              ) ?? []).sort((a, b) => mealTypeOrder.indexOf(a.mealType) - mealTypeOrder.indexOf(b.mealType));
              return (
                <div
                  key={day.toISOString()}
                  className={`ev-cell ${isToday ? 'today' : ''}`}
                  style={{ '--row-i': ri } as React.CSSProperties}
                >
                  {meals.length === 0 ? (
                    <span className="ev-meal-type">&mdash;</span>
                  ) : (
                    meals.map((m) => {
                      const name = m.recipe?.name ?? m.ingredient?.name ?? '?';
                      const typeLetter = mealTypeLetters[m.mealType] || m.mealType.charAt(0).toUpperCase();
                      return (
                        <div key={m.id} className="ev-cell-meal">
                          <span className="ev-meal-type">{typeLetter}</span>
                          {name}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const MealPlansPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedPlanId = searchParams?.get("planId") ? Number(searchParams.get("planId")) : null;
  const { persons, selectedPerson, selectedPersonId, setSelectedPersonId } = usePersonContext();

  // Prevent browser navigation from leaving focus on first list item
  useEffect(() => {
    const id = requestAnimationFrame(() => { (document.activeElement as HTMLElement)?.blur(); });
    return () => cancelAnimationFrame(id);
  }, []);

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [analysisRefreshKey, setAnalysisRefreshKey] = useState(0);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [newWeekStartDate, setNewWeekStartDate] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planJustCreated, setPlanJustCreated] = useState(false);
  const showCreateForm = !planJustCreated && searchParams?.get("showForm") === "true";
  const openSheetParam = searchParams?.get('openSheet');
  const [editMode, setEditMode] = useState(false);
  const [selectedMealIds, setSelectedMealIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'personal' | 'both'>('personal');
  const [copyFromPlanId, setCopyFromPlanId] = useState<string>('');
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const copyRef = useRef<HTMLDivElement>(null);
  const [weekStartMenuOpen, setWeekStartMenuOpen] = useState(false);
  const weekStartRef = useRef<HTMLDivElement>(null);
  const [sundayOptions, setSundayOptions] = useState<string[]>([]);
  const [summaryPanelOpen, setSummaryPanelOpen] = useState(false);
  const [mobNutSheetOpen, setMobNutSheetOpen] = useState(false);
  const [mobilePeopleOpen, setMobilePeopleOpen] = useState(false);
  const mobilePeopleRef = useRef<HTMLDivElement>(null);

  const prevPersonId = useRef<number | null>(null);

  const fetchMealPlanDetails = useCallback(async (planId: number) => {
    // Show cached plan instantly, then always revalidate (meal logs change frequently)
    const cached = clientCache.get<MealPlan>(`/api/meal-plans/${planId}`);
    if (cached) setSelectedPlan(cached);
    try {
      const response = await fetch(`/api/meal-plans/${planId}`);
      if (!response.ok) throw new Error('Failed to fetch meal plan details');
      const data = await response.json();
      clientCache.set(`/api/meal-plans/${planId}`, data);
      setSelectedPlan(data);
    } catch (error) {
      console.error('Error fetching meal plan details:', error);
      if (!cached) toast.error('Failed to load meal plan details');
    }
  }, []);

  // Close copy-from dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (copyRef.current && !copyRef.current.contains(e.target as Node)) setCopyMenuOpen(false);
    };
    if (copyMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [copyMenuOpen]);

  // Close week-start dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (weekStartRef.current && !weekStartRef.current.contains(e.target as Node)) setWeekStartMenuOpen(false);
    };
    if (weekStartMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [weekStartMenuOpen]);

  // Generate ~16 Sundays centered on today — client-only to avoid SSR/hydration mismatch
  useEffect(() => {
    const today = new Date();
    const thisSunday = new Date(today);
    thisSunday.setDate(today.getDate() - today.getDay());
    thisSunday.setHours(0, 0, 0, 0);
    const options = Array.from({ length: 16 }, (_, i) => {
      const d = new Date(thisSunday);
      d.setDate(thisSunday.getDate() + (i - 4) * 7);
      return d.toISOString().slice(0, 10);
    });
    setSundayOptions(options);
    // Default the week start to this Sunday if not already set
    setNewWeekStartDate(prev => prev || options[4]);
  }, []);

  // Close mobile people dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobilePeopleRef.current && !mobilePeopleRef.current.contains(e.target as Node)) setMobilePeopleOpen(false);
    };
    if (mobilePeopleOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobilePeopleOpen]);

  // Load plans + auto-select + fetch details in one flow (no waterfall)
  useEffect(() => {
    if (selectedPersonId === null) return;
    const personJustSwitched = prevPersonId.current !== null && prevPersonId.current !== selectedPersonId;
    if (personJustSwitched) {
      // Person switched — clear plan selection
      setSelectedPlan(null);
      setSelectedDay(null);
      setHasAutoSelected(false);
      setViewMode('personal');
      const params = new URLSearchParams(searchParams?.toString());
      params.delete("planId");
      router.replace(`/meal-plans${params.toString() ? '?' + params.toString() : ''}`);
    }
    prevPersonId.current = selectedPersonId;

    const load = async () => {
      const planListKey = `/api/meal-plans?personId=${selectedPersonId}`;
      const cachedPlans = clientCache.get<MealPlan[]>(planListKey);

      if (cachedPlans) {
        // Instant render from cache
        setMealPlans(cachedPlans);
        // Ignore stale URL planId when person just switched
        const effectivePlanId = personJustSwitched ? null : selectedPlanId;
        let cachedPlanId = effectivePlanId;
        if (!cachedPlanId && cachedPlans.length > 0) {
          // Auto-select current week's plan (same logic as non-cached path)
          const todayLocal = new Date();
          todayLocal.setHours(0, 0, 0, 0);
          const thisWeekPlans = cachedPlans.filter((plan) => {
            const weekStart = parseUTCDate(plan.weekStartDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return todayLocal >= weekStart && todayLocal <= weekEnd;
          });
          // Prefer Sunday-starting plans (getDay()===0) over Monday-starting ones
          const currentWeekPlan = thisWeekPlans.find(p => parseUTCDate(p.weekStartDate).getDay() === 0) || thisWeekPlans[0];
          cachedPlanId = (currentWeekPlan || cachedPlans[0]).id;
        }
        if (cachedPlanId && cachedPlans.some(p => p.id === cachedPlanId)) {
          // Update URL so other effects can see the selected plan
          const params = new URLSearchParams(searchParams?.toString());
          params.set("planId", String(cachedPlanId));
          router.push(`/meal-plans?${params.toString()}`);
          setHasAutoSelected(true);
          await fetchMealPlanDetails(cachedPlanId);
        }
        setLoading(false);
        // Background revalidate plan list
        fetch(`/api/meal-plans?personId=${selectedPersonId}`).then(r => r.json()).then((data) => {
          if (Array.isArray(data)) { clientCache.set(planListKey, data); setMealPlans(data); }
        }).catch(console.error);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/meal-plans?personId=${selectedPersonId}`);
        if (!response.ok) throw new Error('Failed to fetch meal plans');
        const plans: MealPlan[] = await response.json();
        clientCache.set(planListKey, plans);
        setMealPlans(Array.isArray(plans) ? plans : []);

        // Determine which plan to load details for — ignore stale URL planId on person switch
        let targetPlanId = personJustSwitched ? null : selectedPlanId;

        if (targetPlanId && !plans.some((p) => p.id === targetPlanId)) {
          // Stale planId — clear it
          targetPlanId = null;
          const params = new URLSearchParams(searchParams?.toString());
          params.delete("planId");
          router.replace(`/meal-plans${params.toString() ? '?' + params.toString() : ''}`);
        }

        if (!targetPlanId && plans.length > 0 && (personJustSwitched || !hasAutoSelected)) {
          // Auto-select current week's plan or first plan
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const thisWeekPlans = plans.filter((plan) => {
            const weekStart = parseUTCDate(plan.weekStartDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return today >= weekStart && today <= weekEnd;
          });
          // Prefer Sunday-starting plans (getDay()===0) over Monday-starting ones
          const currentWeekPlan = thisWeekPlans.find(p => parseUTCDate(p.weekStartDate).getDay() === 0) || thisWeekPlans[0];
          const planToSelect = currentWeekPlan || plans[0];
          if (planToSelect) {
            targetPlanId = planToSelect.id;
            setHasAutoSelected(true);
            const params = new URLSearchParams(searchParams?.toString());
            params.set("planId", String(planToSelect.id));
            router.push(`/meal-plans?${params.toString()}`);
          }
        }

        // Fetch plan details before clearing loading — prevents the "Select a meal plan" flash
        if (targetPlanId) {
          await fetchMealPlanDetails(targetPlanId);
        }
      } catch (error) {
        console.error('Error fetching meal plans:', error);
        toast.error('Failed to load meal plans');
        setMealPlans([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonId]);

  // Handle URL-driven plan changes (user clicks a different plan in the sidebar)
  useEffect(() => {
    if (selectedPlanId && !loading && mealPlans.some((p) => p.id === selectedPlanId)) {
      // Only fetch if this is a different plan than what's loaded
      if (selectedPlan?.id !== selectedPlanId) {
        fetchMealPlanDetails(selectedPlanId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId]);

  // Handle ?openSheet=nutrition from toolbar
  useEffect(() => {
    if (openSheetParam !== 'nutrition' || !selectedPlan) return;
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('openSheet');
    const qs = params.toString();
    router.replace(`/meal-plans${qs ? '?' + qs : ''}`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    setSelectedDay(today);
    setMobNutSheetOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSheetParam, selectedPlan?.id]);

  // Default selectedDay to today (if in range) when a plan loads
  useEffect(() => {
    if (!selectedPlan?.weeklySummary) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inPlan = selectedPlan.weeklySummary.dailyNutritions.some(
      d => parseUTCDate(d.date).toDateString() === today.toDateString()
    );
    if (inPlan) {
      setSelectedDay(today);
    } else if (!selectedDay) {
      const first = selectedPlan.weeklySummary.dailyNutritions[0];
      if (first) setSelectedDay(parseUTCDate(first.date));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan?.id]);

  const handleDeleteMealPlan = async (planId: number) => {
    if (!await dialog.confirm({ title: 'Delete this plan?', body: "All meals will be removed. This can't be undone.", confirmLabel: 'Delete', danger: true })) return;
    try {
      const response = await fetch(`/api/meal-plans/${planId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete meal plan');
      clientCache.delete(`/api/meal-plans/${planId}`);
      const updated = mealPlans.filter(p => p.id !== planId);
      clientCache.set(`/api/meal-plans?personId=${selectedPersonId}`, updated);
      setMealPlans(updated);
      if (selectedPlanId === planId) {
        setSelectedPlan(null);
        const params = new URLSearchParams(searchParams?.toString());
        params.delete("planId");
        router.push(`/meal-plans${params.toString() ? '?' + params.toString() : ''}`);
      }
      toast.success('Meal plan deleted successfully');

    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast.error('Failed to delete meal plan');
    }
  };

  const addMealToPlan = async (
    planId: number,
    body: Record<string, unknown>
  ) => {
    const response = await fetch(`/api/meal-plans/${planId}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add meal');
    }
    return response.json();
  };

  const handleAddRecipeMeal = async (
    date: Date,
    mealType: string,
    recipeId: number,
    servings: number,
    alsoAddToPlanIds?: number[]
  ) => {
    const planId = selectedPlanId ?? selectedPlan?.id;
    if (!planId) { toast.error('No meal plan selected'); return; }
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const body = { recipeId, date: dateStr, mealType, servings };
    const newMeal = await addMealToPlan(planId, body);
    if (alsoAddToPlanIds) {
      for (const otherPlanId of alsoAddToPlanIds) {
        await addMealToPlan(otherPlanId, body);
      }
    }
    // Optimistic: add meal to local state immediately
    setSelectedPlan(prev => prev ? {
      ...prev,
      mealLogs: [...(prev.mealLogs || []), newMeal].sort((a: MealLog, b: MealLog) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() || (a.position ?? 0) - (b.position ?? 0)
      ),
    } : prev);
    toast.success('Meal added successfully!');

    // Background refresh for nutrition recalc (non-blocking)
    fetchMealPlanDetails(planId);
    setAnalysisRefreshKey(k => k + 1);
  };

  const handleRemoveMeal = async (mealId: number) => {
    if (!selectedPlanId) return;
    try {
      const response = await fetch(`/api/meal-plans/${selectedPlanId}/meals/${mealId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to remove meal');
      // Optimistic: remove meal from local state immediately
      setSelectedPlan(prev => prev ? {
        ...prev,
        mealLogs: prev.mealLogs.filter((m: MealLog) => m.id !== mealId),
      } : prev);
      toast.success('Meal removed successfully');

      // Background refresh for nutrition recalc (non-blocking)
      fetchMealPlanDetails(selectedPlanId);
      setAnalysisRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Error removing meal:', error);
      toast.error('Failed to remove meal');
    }
  };

  const handleMoveMeal = async (mealId: number, toDateISO: string) => {
    if (!selectedPlanId || !selectedPlan) return;

    // Optimistic update: move the meal in local state immediately
    const prevLogs = selectedPlan.mealLogs ?? [];
    const updatedLogs = prevLogs.map((m: MealLog) =>
      m.id === mealId ? { ...m, date: toDateISO } : m
    );
    setSelectedPlan(prev => prev ? { ...prev, mealLogs: updatedLogs } : prev);

    try {
      const res = await fetch(`/api/meal-plans/${selectedPlanId}/meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: toDateISO }),
      });
      if (!res.ok) throw new Error('Failed to move meal');
      // Background refresh for nutrition recalc
      fetchMealPlanDetails(selectedPlanId);
    } catch (err) {
      console.error('Error moving meal:', err);
      // Revert on failure
      setSelectedPlan(prev => prev ? { ...prev, mealLogs: prevLogs } : prev);
      toast.error('Failed to move meal');
    }
  };

  const toggleSelectMeal = (id: number) => {
    setSelectedMealIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedMealIds.size === 0) return;
    if (!await dialog.confirm({ title: `Remove ${selectedMealIds.size} meal${selectedMealIds.size !== 1 ? 's' : ''}?`, body: "This can't be undone.", confirmLabel: 'Remove', danger: true })) return;
    for (const id of selectedMealIds) await handleRemoveMeal(id);
    setSelectedMealIds(new Set());
    setEditMode(false);
  };

  if (loading && selectedPersonId !== null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="font-mono text-[13px] font-light text-[var(--muted)] animate-loading">Loading meal plans...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Editorial toolbar */}
      <div className="pl-toolbar">
        {/* Week range */}
        <span className="pl-range" role="heading" aria-level={1}>
          {selectedPlan ? (() => {
            const s = parseUTCDate(selectedPlan.weekStartDate);
            const e = new Date(s); e.setDate(e.getDate() + 6);
            return s.getMonth() === e.getMonth()
              ? `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}`
              : `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          })() : 'Meal Plans'}
        </span>

        {/* Nav: Prev / Next / This Week */}
        {mealPlans.length > 1 && selectedPlan && viewMode === 'personal' && (
          <>
            <button
              className="ed-btn-text"
              onClick={() => {
                const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                if (idx < mealPlans.length - 1) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("planId", String(mealPlans[idx + 1].id));
                  router.push(`/meal-plans?${params.toString()}`);
                }
              }}
              aria-label="Previous week"
            >&#8249; PREV</button>
            <button
              className="ed-btn-text"
              onClick={() => {
                const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                if (idx > 0) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("planId", String(mealPlans[idx - 1].id));
                  router.push(`/meal-plans?${params.toString()}`);
                }
              }}
              aria-label="Next week"
            >NEXT &#8250;</button>
          </>
        )}
        <button
          className="ed-btn-text pl-this-week-btn"
          onClick={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thisWeekMatches = mealPlans.filter((plan) => {
              const start = parseUTCDate(plan.weekStartDate);
              const end = new Date(start);
              end.setDate(end.getDate() + 6);
              return today >= start && today <= end;
            });
            const todayPlan = thisWeekMatches.find(p => parseUTCDate(p.weekStartDate).getDay() === 0) || thisWeekMatches[0];
            if (todayPlan) {
              const params = new URLSearchParams(searchParams?.toString());
              params.set("planId", String(todayPlan.id));
              router.push(`/meal-plans?${params.toString()}`);
              setViewMode('personal');
            } else {
              const params = new URLSearchParams(searchParams?.toString());
              params.set("showForm", "true");
              router.push(`/meal-plans?${params.toString()}`);
              toast.error('No meal plan covers today. Create a new plan starting this week.');
            }
          }}
          aria-label="Go to this week"
        >This Week</button>

        {/* Shopping list button — only when plans exist */}
        {mealPlans.length > 0 && (
          <Link
            href={selectedPlan ? `/shopping?week=${selectedPlan.weekStartDate}` : '/shopping'}
            className="pl-cart-btn"
            aria-label="View shopping list"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </Link>
        )}



        {/* Right group: + New Plan, separator, edit controls, nutrition, person chips */}
        <div className="pl-right-group">
          <button
            className="pl-new-btn"
            onClick={() => {
              setPlanJustCreated(false);
              // Pre-fill with next Sunday after the latest existing plan (or this week's Sunday)
              const existingStarts = mealPlans.map(p => parseUTCDate(p.weekStartDate).getTime()).sort((a,b) => b-a);
              const latestStart = existingStarts.length > 0 ? new Date(existingStarts[0]) : null;
              const today = new Date(); today.setHours(0,0,0,0);
              const thisSunday = new Date(today); thisSunday.setDate(today.getDate() - today.getDay());
              const nextSunday = latestStart && latestStart >= thisSunday
                ? new Date(latestStart.getTime() + 7 * 86400000)
                : thisSunday;
              setNewWeekStartDate(nextSunday.toISOString().slice(0, 10));
              const params = new URLSearchParams(searchParams?.toString());
              params.set("showForm", "true");
              router.push(`/meal-plans?${params.toString()}`);
            }}
            aria-label="New plan"
          >+ NEW PLAN</button>

          {/* Edit mode controls */}
          {selectedPlan && viewMode === 'personal' && !editMode && (
            <button
              className="ed-btn-text"
              onClick={() => setEditMode(true)}
              aria-label="Edit meals"
            >EDIT</button>
          )}
          {editMode && (
            <>
              <span className="pl-range" style={{ paddingRight: 0 }}>{selectedMealIds.size} sel</span>
              <button
                className="pl-nav-btn pl-nav-btn--destroy"
                disabled={selectedMealIds.size === 0}
                onClick={handleDeleteSelected}
                aria-label="Delete selected meals"
              >DELETE</button>
              <button
                className="pl-nav-btn pl-nav-btn--destroy"
                onClick={async () => {
                  if (!selectedPlan) return;
                  if (!await dialog.confirm({ title: 'Delete this plan?', body: "This can't be undone.", confirmLabel: 'DELETE', danger: true })) return;
                  const deletedId = selectedPlan.id;
                  await fetch(`/api/meal-plans/${deletedId}`, { method: 'DELETE' });
                  // Update state immediately — don't wait for refetch
                  clientCache.invalidate(`/api/meal-plans`);
                  setMealPlans(prev => prev.filter(p => p.id !== deletedId));
                  setSelectedPlan(null);
                  setEditMode(false);
                  setSelectedMealIds(new Set());
                  const params = new URLSearchParams(searchParams?.toString());
                  params.delete('planId');
                  router.push(`/meal-plans?${params.toString()}`);
                }}
                aria-label="Delete entire plan"
              >DELETE PLAN</button>
              <button
                className="pl-nav-btn"
                onClick={() => { setEditMode(false); setSelectedMealIds(new Set()); }}
                aria-label="Exit edit mode"
              >DONE</button>
            </>
          )}

          {/* Nutrition toggle */}
          {selectedPlan && viewMode !== 'both' && (
            <button
              className={`ed-btn-text ${summaryPanelOpen ? 'is-active' : ''}`}
              onClick={() => {
                const opening = !summaryPanelOpen;
                setSummaryPanelOpen(opening);
                if (opening) {
                  const today = new Date(); today.setHours(0,0,0,0);
                  setSelectedDay(today);
                }
              }}
              aria-label={summaryPanelOpen ? "Collapse summary panel" : "Expand summary panel"}
              aria-expanded={summaryPanelOpen}
            >
              {summaryPanelOpen ? 'Nutrition \u203A' : '\u2039 Nutrition'}
            </button>
          )}

          {/* Person chips */}
          {persons.length > 1 && mealPlans.length > 0 && (
            <>
              <div className="pl-person-chips">
              {persons.map((p) => {
                const isActive = viewMode === 'personal' && selectedPersonId === p.id;
                return (
                  <button
                    key={p.id}
                    className={`pl-person-chip ${isActive ? 'on' : ''}`}
                    style={{ borderColor: isActive ? (p.color || 'var(--fg)') : undefined }}
                    onClick={() => {
                      const wasEveryone = viewMode === 'both';
                      setViewMode('personal');
                      if (wasEveryone && selectedPersonId === p.id) {
                        if (selectedPlan?.id) {
                          fetchMealPlanDetails(selectedPlan.id);
                        } else if (selectedPlanId) {
                          fetchMealPlanDetails(selectedPlanId);
                        } else {
                          setHasAutoSelected(false);
                          prevPersonId.current = null;
                          setSelectedPersonId(p.id);
                        }
                      } else if (selectedPersonId === p.id) {
                        setHasAutoSelected(false);
                        prevPersonId.current = null;
                        setSelectedPersonId(p.id);
                      } else {
                        setSelectedPersonId(p.id);
                      }
                    }}
                    aria-pressed={isActive}
                    aria-label={p.name}
                  >
                    <span className="pl-person-chip-dot" style={{ background: p.color || 'var(--accent)' }} aria-hidden="true" />
                    {p.name}
                  </button>
                );
              })}
              <button
                className={`pl-person-chip ${viewMode === 'both' ? 'on' : ''}`}
                onClick={() => setViewMode('both')}
                aria-pressed={viewMode === 'both'}
                aria-label="Everyone"
              >EVERYONE</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile toolbar — hidden on desktop ── */}
      <div className="pl-mob-toolbar">
        {/* Row 1: locator + identity */}
        <div className="pl-toolbar-row">
          <span className="pl-range" role="heading" aria-level={1}>
            {selectedPlan ? (() => {
              const s = parseUTCDate(selectedPlan.weekStartDate);
              const e = new Date(s); e.setDate(e.getDate() + 6);
              return s.getMonth() === e.getMonth()
                ? `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}`
                : `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            })() : 'Meal Plans'}
          </span>
          <span className="pl-toolbar-spacer" />
          {persons.length > 0 && mealPlans.length > 0 && (persons.length === 1 ? (
            <div className="person-chip-static" aria-label={selectedPerson?.name}>
              <span className="person-chip-dot" style={{ background: selectedPerson?.color || 'var(--accent)' }} />
              <span>{selectedPerson?.name}</span>
            </div>
          ) : (
            <div className="pl-mob-person-wrap" ref={mobilePeopleRef}>
              <button
                className="pl-mob-person-btn"
                onClick={() => setMobilePeopleOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={mobilePeopleOpen}
                aria-label="Switch person or view"
              >
                <span
                  className="pl-mob-person-dot"
                  style={{ background: viewMode === 'both' ? 'var(--fg-2)' : selectedPerson?.color || 'var(--accent)' }}
                />
                <span className="pl-mob-person-name">
                  {viewMode === 'both' ? 'Everyone' : selectedPerson?.name || 'Me'}
                </span>
                <span className="pl-mob-person-arrow" aria-hidden>▾</span>
              </button>
              {mobilePeopleOpen && (
                <div className="pl-mob-person-menu" role="listbox">
                  {persons.map((p) => {
                    const isActive = viewMode === 'personal' && selectedPersonId === p.id;
                    return (
                      <button
                        key={p.id}
                        role="option"
                        aria-selected={isActive}
                        className={`pl-mob-person-item${isActive ? ' on' : ''}`}
                        onClick={() => {
                          const wasEveryone = viewMode === 'both';
                          setViewMode('personal');
                          if (wasEveryone && selectedPersonId === p.id) {
                            if (selectedPlan?.id) fetchMealPlanDetails(selectedPlan.id);
                          } else {
                            setSelectedPersonId(p.id);
                          }
                          setMobilePeopleOpen(false);
                        }}
                      >
                        <span className="pl-mob-person-dot" style={{ background: p.color || 'var(--accent)' }} />
                        {p.name}
                      </button>
                    );
                  })}
                  {persons.length > 1 && (
                    <button
                      role="option"
                      aria-selected={viewMode === 'both'}
                      className={`pl-mob-person-item${viewMode === 'both' ? ' on' : ''}`}
                      onClick={() => { setViewMode('both'); setMobilePeopleOpen(false); }}
                    >
                      <span className="pl-mob-person-dot" style={{ background: 'var(--fg-2)' }} />
                      Everyone
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          <button
            className="ed-btn-outline"
            onClick={() => {
              setPlanJustCreated(false);
              const existingStarts = mealPlans.map(p => parseUTCDate(p.weekStartDate).getTime()).sort((a,b) => b-a);
              const latestStart = existingStarts.length > 0 ? new Date(existingStarts[0]) : null;
              const today = new Date(); today.setHours(0,0,0,0);
              const thisSunday = new Date(today); thisSunday.setDate(today.getDate() - today.getDay());
              const nextSunday = latestStart && latestStart >= thisSunday
                ? new Date(latestStart.getTime() + 7 * 86400000)
                : thisSunday;
              setNewWeekStartDate(nextSunday.toISOString().slice(0, 10));
              const params = new URLSearchParams(searchParams?.toString());
              params.set("showForm", "true");
              router.push(`/meal-plans?${params.toString()}`);
            }}
            aria-label="New plan"
          >+ NEW PLAN</button>
        </div>
      </div>

      {/* Inline create-plan row */}
      <form
        className={`pl-create-row ${showCreateForm ? 'open' : ''}`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newWeekStartDate) return;
          const snappedDate = newWeekStartDate;
          setCreatingPlan(true);
          try {
            const res = await fetch('/api/meal-plans', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ weekStartDate: snappedDate, personId: selectedPersonId }),
            });
            if (!res.ok) throw new Error('Failed to create');
            const plan = await res.json();

            if (copyFromPlanId) {
              try {
                await fetch(`/api/meal-plans/${copyFromPlanId}/duplicate`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    targetWeekStartDate: snappedDate,
                    personId: selectedPersonId,
                  }),
                });
              } catch {
                toast.error('Plan created but failed to copy meals');
              }
            }

            const updatedPlans = [plan, ...mealPlans];
            clientCache.set(`/api/meal-plans?personId=${selectedPersonId}`, updatedPlans);
            setMealPlans(updatedPlans);
            setNewWeekStartDate('');
            setCopyFromPlanId('');
            setPlanJustCreated(true);
            const params = new URLSearchParams(searchParams?.toString());
            params.set("planId", String(plan.id));
            params.delete("showForm");
            router.push(`/meal-plans?${params.toString()}`);
            setViewMode('personal');
          } catch {
            toast.error('Failed to create meal plan');
          } finally {
            setCreatingPlan(false);
          }
        }}
      >
        <span className="pl-create-label">Week Start</span>
        <div className="pl-copy-wrap" ref={weekStartRef}>
          <button
            type="button"
            className="pl-copy-btn"
            onClick={() => setWeekStartMenuOpen(o => !o)}
            aria-expanded={weekStartMenuOpen}
            aria-haspopup="listbox"
            aria-label="Select week start date"
          >
            {newWeekStartDate
              ? (() => {
                  const d = new Date(newWeekStartDate + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                })()
              : 'Select week'}
          </button>
          <div className={`pl-copy-menu ${weekStartMenuOpen ? 'open' : ''}`} role="listbox" aria-label="Week start options">
            {sundayOptions.map(dateStr => {
              const d = new Date(dateStr + 'T00:00:00');
              const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const isToday = dateStr === sundayOptions[4]; // this week
              return (
                <button
                  key={dateStr}
                  type="button"
                  className={newWeekStartDate === dateStr ? 'on' : ''}
                  onClick={() => { setNewWeekStartDate(dateStr); setWeekStartMenuOpen(false); }}
                  role="option"
                  aria-selected={newWeekStartDate === dateStr}
                >
                  {label}{isToday ? ' · This week' : ''}
                </button>
              );
            })}
          </div>
        </div>
        <span className="pl-create-label">Copy From</span>
        <div className="pl-copy-wrap" ref={copyRef}>
          <button
            type="button"
            className="pl-copy-btn"
            onClick={() => setCopyMenuOpen(o => !o)}
            aria-expanded={copyMenuOpen}
            aria-haspopup="listbox"
            aria-label="Copy meals from existing plan"
          >
            {copyFromPlanId
              ? (() => {
                  const p = mealPlans.find(pl => String(pl.id) === copyFromPlanId);
                  if (!p) return 'None';
                  const d = parseUTCDate(p.weekStartDate);
                  return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${p._count?.mealLogs ?? 0} meals)`;
                })()
              : 'None'}
          </button>
          <div className={`pl-copy-menu ${copyMenuOpen ? 'open' : ''}`} role="listbox" aria-label="Copy from options">
            <button
              type="button"
              className={copyFromPlanId === '' ? 'on' : ''}
              onClick={() => { setCopyFromPlanId(''); setCopyMenuOpen(false); }}
              role="option"
              aria-selected={copyFromPlanId === ''}
            >None</button>
            {mealPlans
              .filter(p => p.personId === selectedPersonId && (p._count?.mealLogs ?? 0) > 0)
              .slice(0, 8)
              .map(p => {
                const d = parseUTCDate(p.weekStartDate);
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={copyFromPlanId === String(p.id) ? 'on' : ''}
                    onClick={() => { setCopyFromPlanId(String(p.id)); setCopyMenuOpen(false); }}
                    role="option"
                    aria-selected={copyFromPlanId === String(p.id)}
                  >
                    Week of {label} ({p._count?.mealLogs ?? 0} meals)
                  </button>
                );
              })}
          </div>
        </div>
        <div className="pl-create-actions">
          <button type="submit" className="pl-create-btn" disabled={creatingPlan}>
            {creatingPlan ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            className="pl-cancel-btn"
            onClick={() => {
              const params = new URLSearchParams(searchParams?.toString());
              params.delete("showForm");
              router.push(`/meal-plans?${params.toString()}`);
            }}
          >Cancel</button>
        </div>
      </form>

      {/* Mobile nutrition sheet */}
      {mobNutSheetOpen && selectedPlan?.weeklySummary && (() => {
        const dailyNutritions = selectedPlan.weeklySummary.dailyNutritions;
        const activeDate = selectedDay ?? new Date();
        const dayData = dailyNutritions.find(d => parseUTCDate(d.date).toDateString() === activeDate.toDateString()) ?? dailyNutritions[0];
        if (!dayData) return null;
        const calorieNutrient = dayData.totalNutrients.find(n => n.displayName === 'Calories' || n.displayName === 'Energy');
        const calorieGoal = calorieNutrient?.highGoal ?? calorieNutrient?.lowGoal ?? 0;
        const caloriePct = calorieGoal && calorieNutrient ? Math.min((calorieNutrient.value / calorieGoal) * 100, 100) : 0;
        const keyNutrientNames = ['Fat', 'Saturated Fat', 'Sodium', 'Carbs', 'Carbohydrate', 'Sugar', 'Protein', 'Fiber'];
        const keyNutrients = keyNutrientNames
          .map(name => dayData.totalNutrients.find(n => n.displayName.includes(name)))
          .filter((n): n is NonNullable<typeof n> => !!n);
        const activeDay = parseUTCDate(dayData.date);
        return createPortal(
          <>
            <div className="mob-sheet-backdrop mob-sheet-backdrop--above-nav" onClick={() => setMobNutSheetOpen(false)} aria-hidden="true" />
            <div className="mob-sheet" role="dialog" aria-modal="true" aria-label="Nutrition summary">
              <div style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1, borderBottom: '1px solid var(--rule-faint)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="mob-sheet-handle" aria-hidden="true" />
                <div className="flex items-center justify-between" style={{ padding: '8px 20px 12px' }}>
                  <div className="font-sans text-[16px] font-semibold text-[var(--fg)]">
                    {dayData.dayOfWeek}, {activeDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <button
                    onClick={() => setMobNutSheetOpen(false)}
                    className="w-[44px] h-[44px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--fg)] transition-colors -mr-[8px]"
                    aria-label="Close nutrition summary"
                  >✕</button>
                </div>
              </div>
              {calorieNutrient && (
                <div style={{ padding: '16px 20px 8px' }}>
                  <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[4px]">Calories</div>
                  <div className="font-serif text-[36px] font-bold tracking-[-0.025em] tabular-nums text-[var(--fg)] leading-none">
                    {Math.round(calorieNutrient.value).toLocaleString()}
                    {calorieGoal > 0 && <span className="font-mono text-[13px] text-[var(--muted)] font-normal ml-2">/ {Math.round(calorieGoal).toLocaleString()}</span>}
                  </div>
                  <div className="h-[3px] bg-[var(--rule)] mt-[12px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[var(--accent)]" style={{ width: `${caloriePct}%`, transition: 'width 0.6s var(--ease-out)' }} />
                  </div>
                </div>
              )}
              <div style={{ padding: '16px 20px 4px' }}>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] mb-[12px]">Nutrients</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                  {keyNutrients.map(n => {
                    const goal = n.highGoal ?? n.lowGoal ?? 0;
                    const pct = goal > 0 ? Math.min((n.value / goal) * 100, 100) : 0;
                    const statusColor = n.status === 'error' ? 'var(--err)' : 'var(--muted)';
                    return (
                      <div key={n.nutrientId}>
                        <div className="flex justify-between items-baseline mb-[3px]">
                          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--muted)]">{n.displayName}</span>
                          <span className="font-mono text-[11px] tabular-nums text-[var(--fg)]">{Math.round(n.value)}<span className="text-[var(--muted)] text-[9px] ml-[2px]">{n.unit}</span></span>
                        </div>
                        {goal > 0 && (
                          <div className="h-[2px] bg-[var(--rule)] relative overflow-hidden">
                            <div className="absolute inset-0" style={{ background: statusColor, width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Warning chips */}
              {(() => {
                const warnNutrients = dayData.totalNutrients.filter(
                  n => n.status === 'warning' || n.status === 'error'
                );
                if (warnNutrients.length === 0) return null;
                return (
                  <div style={{ padding: '12px 20px 0' }}>
                    <div className="warn-chips">
                      {warnNutrients.map(n => {
                        const isBelowMin = n.status === 'warning' && n.lowGoal != null && n.value < n.lowGoal;
                        const isAboveMax = n.status === 'error' && n.highGoal != null && n.value > n.highGoal;
                        const chipClass = isAboveMax ? 'err-chip' : 'warn-chip';
                        const label = isBelowMin
                          ? `${n.displayName} +${Math.round(n.lowGoal! - n.value)}${n.unit} to target`
                          : isAboveMax
                          ? `${n.displayName} +${Math.round(n.value - n.highGoal!)}${n.unit} over limit`
                          : `${n.displayName} outside target`;
                        return <div key={n.nutrientId} className={chipClass}><span className="status-pill-dot" />{label}</div>;
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Smart swap suggestions */}
              <div style={{ padding: '8px 20px 0' }}>
                <SmartSuggestionsPanel
                  key={`mob-smart-${analysisRefreshKey}-${activeDay.toDateString()}`}
                  mealPlanId={selectedPlan!.id}
                  date={activeDay}
                  onClose={() => setMobNutSheetOpen(false)}
                  onSwapMeal={async (mealLogId, newRecipeId) => {
                    try {
                      const originalMeal = selectedPlan!.mealLogs?.find((m: MealLog) => m.id === mealLogId);
                      const mealType = originalMeal?.mealType ?? 'side';
                      await handleRemoveMeal(mealLogId);
                      await handleAddRecipeMeal(activeDay, mealType, newRecipeId, 1);
                      toast.success('Meal swapped!');
                      setAnalysisRefreshKey(k => k + 1);
                    } catch {
                      toast.error('Failed to swap meal');
                    }
                  }}
                  onAddMeal={async (recipeId) => {
                    try {
                      await handleAddRecipeMeal(activeDay, 'dinner', recipeId, 1);
                      toast.success('Meal added!');
                      setAnalysisRefreshKey(k => k + 1);
                    } catch {
                      toast.error('Failed to add meal');
                    }
                  }}
                />
              </div>

            </div>
          </>,
          document.body
        );
      })()}

      {/* Main Content */}
      <div className="pl-wrap animate-page-enter" style={{ flex: 1, minHeight: 0 }}>
        {viewMode === 'both' && selectedPlan ? (
          <BothView persons={persons} weekStartDate={selectedPlan.weekStartDate} />
        ) : selectedPlan ? (
          <>
            {/* Left: Week view */}
            <div className="pl-main">
              <MealPlanDndWrapper
                onMoveMeal={handleMoveMeal}
                mealPlanId={selectedPlan.id}
                weekStartDate={parseUTCDate(selectedPlan.weekStartDate)}
                days={
                  selectedPlan.weeklySummary?.dailyNutritions.map((day) => ({
                    date: parseUTCDate(day.date),
                    dayOfWeek: day.dayOfWeek,
                    meals: selectedPlan.mealLogs
                      ? selectedPlan.mealLogs
                          .filter((meal) => parseUTCDate(meal.date).toDateString() === parseUTCDate(day.date).toDateString())
                          .map((meal) => ({
                            id: meal.id,
                            mealType: meal.mealType as 'breakfast' | 'lunch' | 'dinner' | 'side' | 'snack' | 'dessert' | 'beverage',
                            recipe: meal.recipe,
                            ingredient: meal.ingredient,
                            servings: meal.servings,
                            quantity: meal.quantity,
                            unit: meal.unit,
                          }))
                      : [],
                    dayNutrients: day.totalNutrients,
                  })) || []
                }
                onRemoveMeal={handleRemoveMeal}
                onError={(msg) => toast.error(msg)}
                selectedDay={(summaryPanelOpen || mobNutSheetOpen) ? selectedDay : null}
                onDayClick={(summaryPanelOpen || mobNutSheetOpen) ? (date) => {
                  setSelectedDay(date);
                } : undefined}
                editMode={editMode}
                selectedMealIds={selectedMealIds}
                onToggleMealSelect={toggleSelectMeal}
                recipeCaloriesMap={selectedPlan.recipeCaloriesMap}
                mealLogCaloriesMap={selectedPlan.mealLogCaloriesMap}
                personName={persons.find((p) => p.id === selectedPersonId)?.name}
                personColor={persons.find((p) => p.id === selectedPersonId)?.color}
                onNavigatePrevWeek={mealPlans.length > 1 && selectedPlan ? () => {
                  const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                  if (idx < mealPlans.length - 1) {
                    const params = new URLSearchParams(searchParams?.toString());
                    params.set("planId", String(mealPlans[idx + 1].id));
                    router.push(`/meal-plans?${params.toString()}`);
                  }
                } : undefined}
                onNavigateNextWeek={mealPlans.length > 1 && selectedPlan ? () => {
                  const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                  if (idx > 0) {
                    const params = new URLSearchParams(searchParams?.toString());
                    params.set("planId", String(mealPlans[idx - 1].id));
                    router.push(`/meal-plans?${params.toString()}`);
                  }
                } : undefined}
                onOpenNutrition={(date: Date) => {
                  setSelectedDay(date);
                  setMobNutSheetOpen(true);
                }}
                onMealAdded={() => fetchMealPlanDetails(selectedPlan.id)}
              />
            </div>

            {/* Right: Daily summary sidebar */}
            {selectedPlan.weeklySummary && (() => {
              const dailyNutritions = selectedPlan.weeklySummary.dailyNutritions;
              const dayData = selectedDay
                ? dailyNutritions.find(d => parseUTCDate(d.date).toDateString() === selectedDay.toDateString())
                : null;
              const activeDayData = dayData ?? dailyNutritions[0];
              if (!activeDayData) return null;

              const calorieNutrient = activeDayData.totalNutrients.find(n =>
                n.displayName === 'Calories' || n.displayName === 'Energy'
              );
              const calorieGoal = calorieNutrient?.highGoal ?? calorieNutrient?.lowGoal ?? null;
              const caloriePct = calorieGoal && calorieNutrient
                ? Math.min((calorieNutrient.value / calorieGoal) * 100, 100)
                : 0;

              const keyNutrientNames = ['Fat', 'Saturated Fat', 'Sodium', 'Carbs', 'Carbohydrate', 'Sugar', 'Protein', 'Fiber'];
              const keyNutrients = keyNutrientNames
                .map(name => activeDayData.totalNutrients.find(n => n.displayName.includes(name)))
                .filter((n): n is NonNullable<typeof n> => !!n);

              const warningNutrients = activeDayData.totalNutrients.filter(
                n => n.status === 'warning' || n.status === 'error'
              );

              const activeDate = parseUTCDate(activeDayData.date);

              return (
                <div className={`pl-right ${summaryPanelOpen ? 'open' : ''}`}>
                  <div className="pl-right-inner">
                    {/* Sidebar header */}
                    <div className="pl-side-header">
                      <span className="pl-side-day">
                        {activeDayData.dayOfWeek},{' '}
                        {activeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {selectedPerson && (
                        <span className="pl-side-person">
                          <span className="pl-side-person-dot" style={{ background: selectedPerson.color || 'var(--accent)' }} aria-hidden="true" />
                          {selectedPerson.name}
                        </span>
                      )}
                    </div>

                    {/* Calorie hero */}
                    {calorieNutrient && (
                      <>
                        <div className="pl-kcal-hero">
                          <span key={Math.round(calorieNutrient.value)} className="pl-kcal-num animate-count-tick">{Math.round(calorieNutrient.value).toLocaleString()}</span>
                          <span className="pl-kcal-unit">kcal</span>
                        </div>
                        {calorieGoal && (
                          <div className="pl-kcal-sub">
                            of {calorieGoal.toLocaleString()} kcal daily goal · {Math.round(caloriePct)}%
                          </div>
                        )}
                        <div className="pl-kcal-bar">
                          <div className="pl-kcal-bar-fill" style={{ width: `${caloriePct}%` }} />
                        </div>
                      </>
                    )}

                    {/* Nutrient rows */}
                    {keyNutrients.length > 0 && (
                      <div className="pl-nut-rows">
                        {keyNutrients.map(nutrient => {
                          const goal = nutrient.highGoal ?? nutrient.lowGoal;
                          const pct = goal ? Math.min(Math.round((nutrient.value / goal) * 100), 100) : 0;
                          const isOver = nutrient.highGoal && nutrient.highGoal > 0 && nutrient.value > nutrient.highGoal;
                          const fillClass = isOver ? 'fill-err' : 'fill-ok';
                          const unitSuffix = nutrient.displayName.toLowerCase() === 'calories' ? '' : ` ${nutrient.unit}`;
                          const formatVal = (v: number) => { const r = Math.round(v); return r >= 1000 ? r.toLocaleString() : String(r); };
                          return (
                            <div key={nutrient.nutrientId} className="nut-row">
                              <div className="nut-row-top">
                                <span className="nut-name">{nutrient.displayName}</span>
                                <span key={nutrient.value} className="nut-val animate-count-tick">
                                  {formatVal(nutrient.value)} / {formatVal(goal ?? 0)}{unitSuffix}
                                  {goal ? <span className="nut-pct"> · {pct}%</span> : null}
                                </span>
                              </div>
                              <div className="nut-track">
                                <div className={`nut-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Warning chips */}
                    {warningNutrients.length > 0 && (
                      <div className="pl-warn-section">
                        <div className="warn-chips">
                          {warningNutrients.map(n => {
                            const isBelowMin = n.status === 'warning' && n.lowGoal != null && n.value < n.lowGoal;
                            const isAboveMax = n.status === 'error' && n.highGoal != null && n.value > n.highGoal;
                            const chipClass = isAboveMax ? 'err-chip' : 'warn-chip';
                            const label = isBelowMin
                              ? `${n.displayName} +${Math.round(n.lowGoal! - n.value)}${n.unit} to target`
                              : isAboveMax
                              ? `${n.displayName} +${Math.round(n.value - n.highGoal!)}${n.unit} over limit`
                              : `${n.displayName} outside target`;
                            return <div key={n.nutrientId} className={chipClass}><span className="status-pill-dot" />{label}</div>;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Suggested swaps */}
                    <SmartSuggestionsPanel
                      key={`smart-${analysisRefreshKey}-${activeDate.toDateString()}`}
                      mealPlanId={selectedPlan.id}
                      date={activeDate}
                      onClose={() => setSelectedDay(null)}
                      onSwapMeal={async (mealLogId, newRecipeId) => {
                        try {
                          const originalMeal = selectedPlan.mealLogs?.find((m: MealLog) => m.id === mealLogId);
                          const mealType = originalMeal?.mealType ?? 'side';
                          await handleRemoveMeal(mealLogId);
                          await handleAddRecipeMeal(activeDate, mealType, newRecipeId, 1);
                          toast.success('Meal swapped!');
                          setAnalysisRefreshKey(k => k + 1);
                        } catch {
                          toast.error('Failed to swap meal');
                        }
                      }}
                      onAddMeal={async (recipeId) => {
                        try {
                          await handleAddRecipeMeal(activeDate, 'dinner', recipeId, 1);
                          toast.success('Meal added!');
                          setAnalysisRefreshKey(k => k + 1);
                        } catch {
                          toast.error('Failed to add meal');
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <div className="pl-main" style={{ alignItems: 'center', justifyContent: 'center' }}>
            {mealPlans.length === 0 ? (
              <EmptyState
                eyebrow="§ NO PLAN THIS WEEK"
                headline="A blank week."
                lede={<>Drop in recipes for the days ahead<br />and the nutrition math handles itself.</>}
                ctaLabel="+ CREATE PLAN →"
                onCta={() => {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("showForm", "true");
                  router.push(`/meal-plans?${params.toString()}`);
                }}
              />
            ) : (
              <EmptyState
                eyebrow="§ SELECT A PLAN"
                headline="A week to plan."
                ctaLabel="+ CREATE PLAN →"
                onCta={() => {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("showForm", "true");
                  router.push(`/meal-plans?${params.toString()}`);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function MealPlansPageWrapper() {
  return (
    <Suspense>
      <MealPlansPage />
    </Suspense>
  );
}

export default MealPlansPageWrapper;

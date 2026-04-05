'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MealPlanWeek from '@/app/components/MealPlanWeek';
import SmartSuggestionsPanel from '@/app/components/SmartSuggestionsPanel';
import { usePersonContext, Person } from '@/app/components/PersonContext';
import { dialog } from '@/lib/dialog';
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
}

// Shared meal key: recipeId-dateString
function sharedKey(recipeId: number, date: string) {
  return `${recipeId}-${new Date(date).toDateString()}`;
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
  const mealTypeLetters: Record<string, string> = { breakfast: 'B', lunch: 'L', dinner: 'D', snack: 'S', dessert: 'Ds', beverage: 'Bv' };
  const todayStr = new Date().toDateString();

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
              const meals = plan?.mealLogs?.filter(
                (m) => new Date(m.date).toDateString() === day.toDateString()
              ) ?? [];
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

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [analysisRefreshKey, setAnalysisRefreshKey] = useState(0);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [newWeekStartDate, setNewWeekStartDate] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planJustCreated, setPlanJustCreated] = useState(false);
  const showCreateForm = !planJustCreated && searchParams?.get("showForm") === "true";
  const [editMode, setEditMode] = useState(false);
  const [selectedMealIds, setSelectedMealIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'personal' | 'both'>('personal');
  const [copyFromPlanId, setCopyFromPlanId] = useState<string>('');
  const [summaryPanelOpen, setSummaryPanelOpen] = useState(false);

  // Find other person's plan for the current week (for "also add to" checkbox)
  const otherPersonPlanId = (() => {
    if (!selectedPlan || !selectedPersonId || persons.length < 2) return undefined;
    // This requires knowing other persons' plans — we'll fetch them on the fly in MealPlanWeek
    // We store them in allPersonPlans
    return undefined; // populated below via allPersonPlans
  })();
  const [allPersonPlansForWeek, setAllPersonPlansForWeek] = useState<MealPlan[]>([]);

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

  // Fetch all persons' plans for the current week (for "also add to" feature)
  const fetchAllPersonPlansForWeek = useCallback(async (weekStartDate: string) => {
    if (persons.length < 2) return;
    const weekStart = parseUTCDate(weekStartDate);
    try {
      const all = await Promise.all(
        persons.map(async (p) => {
          const res = await fetch(`/api/meal-plans?personId=${p.id}`);
          if (!res.ok) return [];
          const plans: MealPlan[] = await res.json();
          return plans.filter((pl) => {
            const d = parseUTCDate(pl.weekStartDate);
            return d.getTime() === weekStart.getTime();
          });
        })
      );
      setAllPersonPlansForWeek(all.flat());
    } catch {
      // non-critical
    }
  }, [persons]);

  useEffect(() => {
    fetchRecipes();
    fetchIngredients();
  }, []);

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
          const currentWeekPlan = cachedPlans.find((plan) => {
            const weekStart = parseUTCDate(plan.weekStartDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return todayLocal >= weekStart && todayLocal <= weekEnd;
          });
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
          const currentWeekPlan = plans.find((plan) => {
            const weekStart = parseUTCDate(plan.weekStartDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return today >= weekStart && today <= weekEnd;
          });
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

  // Fetch other persons' plans using weekStartDate from the plan list (not detail)
  useEffect(() => {
    if (mealPlans.length > 0 && selectedPlanId) {
      const plan = mealPlans.find((p) => p.id === selectedPlanId);
      if (plan) fetchAllPersonPlansForWeek(plan.weekStartDate);
    }
  }, [mealPlans, selectedPlanId, fetchAllPersonPlansForWeek]);

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

  const fetchRecipes = async () => {
    const cached = clientCache.get<Recipe[]>('/api/recipes');
    if (cached) { setRecipes(cached); return; }
    try {
      const response = await fetch('/api/recipes');
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      clientCache.set('/api/recipes', list);
      setRecipes(list);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipes([]);
    }
  };

  const fetchIngredients = async () => {
    const cached = clientCache.get<Ingredient[]>('/api/ingredients?slim=true');
    if (cached) { setIngredients(cached); return; }
    try {
      const response = await fetch('/api/ingredients?slim=true');
      if (!response.ok) throw new Error('Failed to fetch ingredients');
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      clientCache.set('/api/ingredients?slim=true', list);
      setIngredients(list);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      setIngredients([]);
    }
  };

  const handleDeleteMealPlan = async (planId: number) => {
    if (!await dialog.confirm('Delete this meal plan? All meals will be removed.', { confirmLabel: 'Delete', danger: true })) return;
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

  const handleAddIngredientMeal = async (
    date: Date,
    mealType: string,
    ingredientId: number,
    quantity: number,
    unit: string,
    alsoAddToPlanIds?: number[]
  ) => {
    const planId = selectedPlanId ?? selectedPlan?.id;
    if (!planId) { toast.error('No meal plan selected'); return; }
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const body = { ingredientId, quantity, unit, date: dateStr, mealType };
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
    toast.success('Ingredient added successfully!');

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

  const handleReorderMeals = async (_dayDate: Date, orderedIds: number[]) => {
    if (!selectedPlanId) return;
    try {
      const order = orderedIds.map((id, position) => ({ id, position }));
      const response = await fetch(`/api/meal-plans/${selectedPlanId}/meals`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      if (!response.ok) throw new Error('Failed to reorder meals');
      await fetchMealPlanDetails(selectedPlanId);
    } catch (error) {
      console.error('Error reordering meals:', error);
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
    if (!await dialog.confirm(`Remove ${selectedMealIds.size} item${selectedMealIds.size !== 1 ? 's' : ''} from the plan?`, { confirmLabel: 'Remove', danger: true })) return;
    for (const id of selectedMealIds) await handleRemoveMeal(id);
    setSelectedMealIds(new Set());
    setEditMode(false);
  };

  // Find other people's plans for the same week (for "also add to" feature)
  const otherPersonPlans = selectedPlan && selectedPersonId
    ? allPersonPlansForWeek
        .filter((p) => p.personId !== selectedPersonId && p.personId !== null)
        .map((p) => {
          const person = persons.find((per) => per.id === p.personId);
          return person ? { personId: person.id, planId: p.id, name: person.name } : null;
        })
        .filter((x): x is { personId: number; planId: number; name: string } => x !== null)
    : [];

  if (loading && selectedPersonId !== null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="font-mono text-[12px] font-light text-[var(--muted)] animate-loading">Loading meal plans...</div>
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
              className="pl-nav-btn"
              onClick={() => {
                const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                if (idx < mealPlans.length - 1) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("planId", String(mealPlans[idx + 1].id));
                  router.push(`/meal-plans?${params.toString()}`);
                }
              }}
              aria-label="Previous week"
            >&#8249; Prev</button>
            <button
              className="pl-nav-btn"
              onClick={() => {
                const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                if (idx > 0) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("planId", String(mealPlans[idx - 1].id));
                  router.push(`/meal-plans?${params.toString()}`);
                }
              }}
              aria-label="Next week"
            >Next &#8250;</button>
          </>
        )}
        <button
          className="pl-nav-btn"
          onClick={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayPlan = mealPlans.find((plan) => {
              const start = parseUTCDate(plan.weekStartDate);
              const end = new Date(start);
              end.setDate(end.getDate() + 6);
              return today >= start && today <= end;
            });
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

        {/* Right group: + New Plan, separator, edit controls, nutrition, person chips */}
        <div className="pl-right-group">
          <button
            className="pl-new-btn"
            onClick={() => {
              setPlanJustCreated(false);
              const params = new URLSearchParams(searchParams?.toString());
              params.set("showForm", "true");
              router.push(`/meal-plans?${params.toString()}`);
            }}
            aria-label="New plan"
          >+ New Plan</button>

          <div className="pl-chip-sep" />

          {/* Edit mode controls */}
          {selectedPlan && viewMode === 'personal' && !editMode && (
            <button
              className="pl-nav-btn"
              onClick={() => setEditMode(true)}
              aria-label="Edit meals"
            >Edit</button>
          )}
          {editMode && (
            <>
              <span className="pl-range" style={{ paddingRight: 0 }}>{selectedMealIds.size} sel</span>
              <button
                className="pl-nav-btn"
                style={{ background: 'var(--err-l)', color: 'var(--err)', borderColor: 'transparent' }}
                disabled={selectedMealIds.size === 0}
                onClick={handleDeleteSelected}
                aria-label="Delete selected meals"
              >Delete</button>
              <button
                className="pl-nav-btn"
                onClick={() => { setEditMode(false); setSelectedMealIds(new Set()); }}
                aria-label="Exit edit mode"
              >Done</button>
            </>
          )}

          {/* Nutrition toggle */}
          {selectedPlan && viewMode !== 'both' && (
            <button
              className={`pl-nut-chip ${summaryPanelOpen ? 'on' : ''}`}
              onClick={() => setSummaryPanelOpen(o => !o)}
              aria-label={summaryPanelOpen ? "Collapse summary panel" : "Expand summary panel"}
              aria-expanded={summaryPanelOpen}
            >
              {summaryPanelOpen ? 'Nutrition \u203A' : '\u2039 Nutrition'}
            </button>
          )}

          {/* Person chips */}
          {persons.length > 1 && mealPlans.length > 0 && (
            <>
              {persons.map((p) => {
                const isActive = viewMode === 'personal' && selectedPersonId === p.id;
                return (
                  <button
                    key={p.id}
                    className={`pl-person-chip ${isActive ? 'on' : ''}`}
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
                  >{p.name}</button>
                );
              })}
              <button
                className={`pl-person-chip ${viewMode === 'both' ? 'on' : ''}`}
                onClick={() => setViewMode('both')}
                aria-pressed={viewMode === 'both'}
                aria-label="Everyone"
              >Everyone</button>
            </>
          )}
        </div>
      </div>


      {/* Inline create-plan row */}
      <form
        className={`pl-create-row ${showCreateForm ? 'open' : ''}`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newWeekStartDate) return;
          setCreatingPlan(true);
          try {
            const res = await fetch('/api/meal-plans', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ weekStartDate: newWeekStartDate, personId: selectedPersonId }),
            });
            if (!res.ok) throw new Error('Failed to create');
            const plan = await res.json();

            if (copyFromPlanId) {
              try {
                await fetch(`/api/meal-plans/${copyFromPlanId}/duplicate`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    targetWeekStartDate: newWeekStartDate,
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
        <input
          type="date"
          className="pl-create-date"
          value={newWeekStartDate}
          onChange={(e) => setNewWeekStartDate(e.target.value)}
          required
          aria-label="Week start date"
        />
        <span className="pl-create-label">Copy From</span>
        <select
          value={copyFromPlanId}
          onChange={(e) => setCopyFromPlanId(e.target.value)}
          className="pl-create-date"
          style={{ minWidth: 180 }}
          aria-label="Copy meals from existing plan"
        >
          <option value="">None</option>
          {mealPlans
            .filter(p => p.personId === selectedPersonId && (p._count?.mealLogs ?? 0) > 0)
            .slice(0, 8)
            .map(p => {
              const d = parseUTCDate(p.weekStartDate);
              const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <option key={p.id} value={p.id}>
                  Week of {label} ({p._count?.mealLogs ?? 0} meals)
                </option>
              );
            })}
        </select>
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

      {/* Main Content */}
      <div className="pl-wrap" style={{ flex: 1, minHeight: 0 }}>
        {viewMode === 'both' && selectedPlan ? (
          <BothView persons={persons} weekStartDate={selectedPlan.weekStartDate} />
        ) : selectedPlan ? (
          <>
            {/* Left: Week view */}
            <div className="pl-main">
              <MealPlanWeek
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
                            mealType: meal.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'beverage',
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
                recipes={recipes}
                ingredients={ingredients}
                onAddRecipeMeal={handleAddRecipeMeal}
                onAddIngredientMeal={handleAddIngredientMeal}
                onRemoveMeal={handleRemoveMeal}
                onReorderMeals={handleReorderMeals}
                onError={(msg) => toast.error(msg)}
                selectedDay={summaryPanelOpen ? selectedDay : null}
                onDayClick={summaryPanelOpen ? (date) => {
                  if (selectedDay && date.toDateString() === selectedDay.toDateString()) {
                    setSelectedDay(null);
                  } else {
                    setSelectedDay(date);
                  }
                } : undefined}
                editMode={editMode}
                selectedMealIds={selectedMealIds}
                onToggleMealSelect={toggleSelectMeal}
                otherPersonPlans={otherPersonPlans}
                recipeCaloriesMap={selectedPlan.recipeCaloriesMap}
                mealLogCaloriesMap={selectedPlan.mealLogCaloriesMap}
                onRefreshIngredients={fetchIngredients}
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

              const keyNutrientNames = ['Protein', 'Carbs', 'Carbohydrate', 'Fat', 'Fiber', 'Sugar'];
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
                          <span className="pl-kcal-num">{Math.round(calorieNutrient.value).toLocaleString()}</span>
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
                          const fillClass = isOver ? 'fill-err' : nutrient.status === 'warning' ? 'fill-warn' : 'fill-ok';
                          const unitSuffix = nutrient.displayName.toLowerCase() === 'calories' ? '' : ` ${nutrient.unit}`;
                          const formatVal = (v: number) => { const r = Math.round(v); return r >= 1000 ? r.toLocaleString() : String(r); };
                          return (
                            <div key={nutrient.nutrientId} className="nut-row">
                              <div className="nut-row-top">
                                <span className="nut-name">{nutrient.displayName}</span>
                                <span className="nut-val">
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
                              ? `\u26A0 ${n.displayName} -${Math.round(n.lowGoal! - n.value)}${n.unit} below min`
                              : isAboveMax
                              ? `\u26A0 ${n.displayName} +${Math.round(n.value - n.highGoal!)}${n.unit} over limit`
                              : `\u26A0 ${n.displayName} outside target`;
                            return <div key={n.nutrientId} className={chipClass}>{label}</div>;
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
                          const mealType = originalMeal?.mealType ?? 'snack';
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
            <div style={{ textAlign: 'center', maxWidth: 280 }}>
              <div className="font-serif" style={{ fontSize: 20, color: 'var(--fg)', marginBottom: 12 }}>
                {mealPlans.length === 0
                  ? selectedPerson ? `No plans for ${selectedPerson.name} yet` : 'No meal plans yet'
                  : 'Select a meal plan'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                {mealPlans.length === 0
                  ? 'Create a weekly meal plan to start tracking your nutrition.'
                  : 'Use the controls above to navigate between plans.'}
              </div>
              {mealPlans.length === 0 && (
                <button
                  className="pl-new-btn"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams?.toString());
                    params.set("showForm", "true");
                    router.push(`/meal-plans?${params.toString()}`);
                  }}
                  aria-label="Create a new plan"
                >+ Create Plan</button>
              )}
            </div>
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

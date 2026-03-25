'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MealPlanWeek from '@/app/components/MealPlanWeek';
import DailySummary from '@/app/components/DailySummary';
import SmartSuggestionsPanel from '@/app/components/SmartSuggestionsPanel';
import AIAnalysisPanel from '@/app/components/AIAnalysisPanel';
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
        <span className="font-mono text-[11px] text-[var(--muted)]">Loading both plans…</span>
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

  return (
    <div className="flex-1 overflow-y-auto px-7 py-5">
      <div className="grid" style={{ gridTemplateColumns: `76px repeat(${persons.length}, 1fr)` }}>
        {/* Header row */}
        <div className="border-b border-[var(--rule)] py-3" />
        {persons.map((p) => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-3 border-b border-l border-[var(--rule)]">
            <span className="w-[10px] h-[10px] rounded-full shrink-0 bg-[var(--accent)]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg)]">{p.name}</span>
            {!plansByPerson.get(p.id) && (
              <span className="font-mono text-[9px] text-[var(--muted)] ml-1">(no plan)</span>
            )}
          </div>
        ))}

        {/* Day rows */}
        {days.map((day) => {
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <React.Fragment key={day.toISOString()}>
              {/* Day label */}
              <div className={`py-3 pl-4 border-b border-[var(--rule)] ${isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em]">{dayNames[day.getDay()]}</div>
                <div className="font-mono text-[9px] mt-[1px] uppercase">
                  {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* Meals per person */}
              {persons.map((p) => {
                const plan = plansByPerson.get(p.id);
                const meals = plan?.mealLogs?.filter(
                  (m) => new Date(m.date).toDateString() === day.toDateString()
                ) ?? [];
                return (
                  <div key={p.id} className="py-3 px-3 border-b border-l border-[var(--rule)] min-h-[48px]">
                    {meals.length === 0 ? (
                      <span className="font-mono text-[9px] text-[var(--muted)]">—</span>
                    ) : (
                      <div className="flex flex-col gap-[3px]">
                        {meals.map((m) => {
                          const isShared = m.recipe ? sharedKeys.has(sharedKey(m.recipe.id, m.date)) : false;
                          const name = m.recipe?.name ?? m.ingredient?.name ?? '?';
                          return (
                            <div key={m.id} className="flex items-center justify-between border border-[var(--rule)] bg-[var(--bg)] px-2 py-[5px] gap-2">
                              <span className="font-sans text-[11px] text-[var(--fg)] leading-snug truncate min-w-0">{name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {isShared && (
                                  <span
                                    className="font-mono text-[8px] uppercase tracking-[0.1em] px-1 py-[1px] bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)] rounded-sm"
                                    title="Shared meal"
                                  >
                                    shared
                                  </span>
                                )}
                                <span className="font-sans text-[10px] text-[var(--muted)] capitalize">{m.mealType}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
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

        if (!targetPlanId && plans.length > 0 && !hasAutoSelected) {
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
    if (!planId) return;
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
      mealLogs: [...prev.mealLogs, newMeal].sort((a: MealLog, b: MealLog) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() || a.position - b.position
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
    if (!planId) return;
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
      mealLogs: [...prev.mealLogs, newMeal].sort((a: MealLog, b: MealLog) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() || a.position - b.position
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
      {/* Unified header bar — 46px */}
      <div className="flex items-center h-[46px] px-6 border-b border-[var(--rule)] gap-2 shrink-0 overflow-hidden">
        {/* Week title */}
        <h1 className="font-serif text-[16px] text-[var(--fg)] mr-2 whitespace-nowrap shrink-0">
          {selectedPlan
            ? `Week of ${parseUTCDate(selectedPlan.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'Meal Plans'}
        </h1>

        {/* Prev / Next */}
        {mealPlans.length > 1 && selectedPlan && viewMode === 'personal' && (
          <>
            <button
              className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] px-[9px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors shrink-0"
              onClick={() => {
                const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                if (idx < mealPlans.length - 1) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("planId", String(mealPlans[idx + 1].id));
                  router.push(`/meal-plans?${params.toString()}`);
                }
              }}
              aria-label="Previous plan"
            >‹ Prev</button>
            <button
              className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] px-[9px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors shrink-0"
              onClick={() => {
                const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                if (idx > 0) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("planId", String(mealPlans[idx - 1].id));
                  router.push(`/meal-plans?${params.toString()}`);
                }
              }}
              aria-label="Next plan"
            >Next ›</button>
          </>
        )}

        {/* This Week */}
        <button
          className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] px-[9px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors shrink-0"
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
        >This Week</button>

        {/* + New Plan */}
        <button
          className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--accent)] bg-[var(--accent)] text-white px-[9px] py-[3px] hover:bg-[var(--accent-hover)] transition-colors shrink-0"
          onClick={() => {
            setPlanJustCreated(false);
            const params = new URLSearchParams(searchParams?.toString());
            params.set("showForm", "true");
            router.push(`/meal-plans?${params.toString()}`);
          }}
        >+ New Plan</button>

        {/* Edit mode controls */}
        {selectedPlan && viewMode === 'personal' && !editMode && (
          <button
            className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] px-[9px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors shrink-0"
            onClick={() => setEditMode(true)}
          >Edit</button>
        )}
        {editMode && (
          <>
            <span className="font-mono text-[9px] text-[var(--muted)] shrink-0">{selectedMealIds.size} sel</span>
            <button
              className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--error)] text-[var(--error)] px-[9px] py-[3px] disabled:opacity-40 transition-colors shrink-0"
              disabled={selectedMealIds.size === 0}
              onClick={handleDeleteSelected}
            >Delete</button>
            <button
              className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] px-[9px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors shrink-0"
              onClick={() => { setEditMode(false); setSelectedMealIds(new Set()); }}
            >Done</button>
          </>
        )}

        {/* Person tabs + Nutrition — anchored right */}
        {selectedPlan && (
          <div className="flex items-center shrink-0 ml-auto">
            {/* Summary panel toggle — hidden in "everyone" view */}
            {viewMode !== 'both' && (
              <button
                onClick={() => setSummaryPanelOpen(o => !o)}
                aria-label={summaryPanelOpen ? "Collapse summary panel" : "Expand summary panel"}
                aria-expanded={summaryPanelOpen}
                className={`font-mono text-[8px] uppercase tracking-[0.1em] px-[9px] py-[3px] border transition-colors shrink-0 mr-2 ${
                  summaryPanelOpen
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]'
                    : 'border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)]'
                }`}
              >
                {summaryPanelOpen ? 'Nutrition ›' : '‹ Nutrition'}
              </button>
            )}
            {persons.length > 1 && (
              <>
                {persons.map((p) => {
                  const isActive = viewMode === 'personal' && selectedPersonId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setViewMode('personal'); setSelectedPersonId(p.id); }}
                      style={{ borderRadius: 0 }}
                      className={`flex items-center gap-[5px] font-mono text-[9px] uppercase tracking-[0.1em] px-3 h-[46px] transition-colors border-b-2 ${
                        isActive ? 'text-[var(--fg)] border-[var(--accent)]' : 'text-[var(--muted)] border-transparent hover:text-[var(--fg)]'
                      }`}
                      aria-pressed={isActive}
                    >
                      <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--accent)]" aria-hidden="true" />
                      {p.name}
                    </button>
                  );
                })}
                <button
                  onClick={() => setViewMode('both')}
                  style={{ borderRadius: 0 }}
                  className={`font-mono text-[9px] uppercase tracking-[0.1em] px-3 h-[46px] transition-colors border-b-2 ${
                    viewMode === 'both' ? 'text-[var(--fg)] border-[var(--fg)]' : 'text-[var(--muted)] border-transparent hover:text-[var(--fg)]'
                  }`}
                  aria-pressed={viewMode === 'both'}
                >Everyone</button>
              </>
            )}
          </div>
        )}
      </div>


      {/* Inline create form */}
      {showCreateForm && (
        <div className="px-7 py-4 border-b border-[var(--rule)] bg-[var(--bg-subtle)]">
          <form
            className="flex items-center gap-3 flex-wrap"
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

                // Copy meals from selected source plan
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
                    // Non-critical — plan was created, just meals weren't copied
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
            <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Week start</label>
            <input
              type="date"
              value={newWeekStartDate}
              onChange={(e) => setNewWeekStartDate(e.target.value)}
              required
              className="border border-[var(--rule)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
            />
            {selectedPerson && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--muted)]">
                <span className="w-[7px] h-[7px] rounded-full bg-[var(--accent)]" />
                {selectedPerson.name}
              </span>
            )}
            {/* Copy from previous plan */}
            {mealPlans.filter(p => p.personId === selectedPersonId && (p._count?.mealLogs ?? 0) > 0).length > 0 && (
              <>
                <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Copy from</label>
                <select
                  value={copyFromPlanId}
                  onChange={(e) => setCopyFromPlanId(e.target.value)}
                  className="border border-[var(--rule)] bg-[var(--bg)] px-2 py-1 font-mono text-[11px] text-[var(--fg)]"
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
              </>
            )}
            <button
              type="submit"
              disabled={creatingPlan}
              className="font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--accent-text)] px-3 py-[5px] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {creatingPlan ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              className="font-mono text-[10px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
              onClick={() => {
                const params = new URLSearchParams(searchParams?.toString());
                params.delete("showForm");
                router.push(`/meal-plans?${params.toString()}`);
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {viewMode === 'both' && selectedPlan ? (
          <BothView persons={persons} weekStartDate={selectedPlan.weekStartDate} />
        ) : selectedPlan ? (
          <>
            {/* Left: Week view */}
            <div className="flex-1 overflow-y-auto">
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
              />
            </div>

            {/* Right: Daily summary — always visible */}
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

              const dayMeals = selectedPlan.mealLogs?.filter(m =>
                parseUTCDate(m.date).toDateString() === parseUTCDate(activeDayData.date).toDateString()
              ) ?? [];

              const activeDate = parseUTCDate(activeDayData.date);

              return (
                <div className="relative flex shrink-0">
                  {/* Panel — collapses via width transition */}
                  <div
                    className="flex flex-col overflow-hidden border-l border-[var(--rule)] transition-[width,min-width] duration-300"
                    style={{
                      width: summaryPanelOpen ? 380 : 0,
                      minWidth: summaryPanelOpen ? 380 : 0,
                    }}
                  >
                  {/* Summary header — matches shared header height */}
                  <div className="h-[46px] flex items-center justify-between px-5 border-b border-[var(--rule)] shrink-0 bg-[var(--accent-light)]">
                    <h2 className="font-serif text-[17px] text-[var(--accent)]">
                      {activeDayData.dayOfWeek},{' '}
                      {activeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h2>
                    {selectedPerson && (
                      <div className="flex items-center gap-[5px] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
                        <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--accent)]" aria-hidden="true" />
                        {selectedPerson.name}
                      </div>
                    )}
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Calorie hero */}
                    {calorieNutrient && (
                      <div className="mb-4">
                        <div className="flex items-baseline gap-[6px] mb-1">
                          <span className="font-serif text-[32px] text-[var(--fg)] leading-none">
                            {Math.round(calorieNutrient.value).toLocaleString()}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--muted)]">kcal</span>
                        </div>
                        {calorieGoal && (
                          <div className="font-mono text-[10px] text-[var(--muted)] mb-2">
                            of {calorieGoal.toLocaleString()} kcal daily goal · {Math.round(caloriePct)}%
                          </div>
                        )}
                        <div className="h-[5px] bg-[var(--rule)] w-full">
                          <div
                            className="h-[5px] bg-[var(--accent)]"
                            style={{ width: `${caloriePct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Compact nutrient bars */}
                    {keyNutrients.length > 0 && (
                      <div className="mb-4">
                        {keyNutrients.map(nutrient => {
                          const goal = nutrient.highGoal ?? nutrient.lowGoal;
                          const pct = goal ? Math.min(Math.round((nutrient.value / goal) * 100), 100) : 0;
                          const isOver = goal ? nutrient.value > goal : false;
                          const isWarn = nutrient.status === 'warning';
                          const barColor = isOver || nutrient.status === 'error'
                            ? 'bg-[var(--error)]'
                            : isWarn
                            ? 'bg-[var(--warning)]'
                            : 'bg-[var(--accent)]';
                          const valueColor = isOver || nutrient.status === 'error'
                            ? 'text-[var(--error)]'
                            : 'text-[var(--muted)]';
                          const unitSuffix = nutrient.displayName.toLowerCase() === 'calories' ? '' : ` ${nutrient.unit}`;
                          const formatVal = (v: number) => { const r = Math.round(v); return r >= 1000 ? r.toLocaleString() : String(r); };
                          return (
                            <div key={nutrient.nutrientId} className="mb-3">
                              <div className="flex justify-between items-baseline mb-[5px]">
                                <span className="font-mono text-[10px] text-[var(--fg)] uppercase tracking-[0.06em]">{nutrient.displayName}</span>
                                <span className={`font-mono text-[10px] tabular-nums ${valueColor}`}>
                                  {formatVal(nutrient.value)} / {formatVal(goal ?? 0)}{unitSuffix}
                                </span>
                              </div>
                              <div className="h-[4px] bg-[var(--bg-subtle)] rounded-sm overflow-hidden">
                                <div className={`h-full rounded-sm ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Warning chips */}
                    {warningNutrients.map(n => {
                      const isBelowMin = n.status === 'warning' && n.lowGoal != null && n.value < n.lowGoal;
                      const isAboveMax = n.status === 'error' && n.highGoal != null && n.value > n.highGoal;
                      return (
                        <div
                          key={n.nutrientId}
                          className="font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--warning-light)] px-[10px] py-[5px] mb-2 text-[var(--warning-text)]"
                        >
                          {isBelowMin
                            ? `${n.displayName} −${Math.round(n.lowGoal! - n.value)}${n.unit} below min`
                            : isAboveMax
                            ? `${n.displayName} +${Math.round(n.value - n.highGoal!)}${n.unit} over limit`
                            : `${n.displayName} outside target`}
                        </div>
                      );
                    })}


                    {/* Suggested swaps */}
                    <SmartSuggestionsPanel
                      key={`smart-${analysisRefreshKey}-${activeDate.toDateString()}`}
                      mealPlanId={selectedPlan.id}
                      date={activeDate}
                      onClose={() => setSelectedDay(null)}
                      onSwapMeal={async (mealLogId, newRecipeId) => {
                        try {
                          // Preserve the original meal's type (breakfast/lunch/dinner/snack)
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
                </div>
              );
            })()}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center space-y-4 max-w-[280px]">
              <div className="font-serif text-[20px] text-[var(--fg)]">
                {mealPlans.length === 0
                  ? selectedPerson ? `No plans for ${selectedPerson.name} yet` : 'No meal plans yet'
                  : 'Select a meal plan'}
              </div>
              <div className="text-[11px] text-[var(--muted)] leading-relaxed">
                {mealPlans.length === 0
                  ? 'Create a weekly meal plan to start tracking your nutrition.'
                  : 'Use the controls above to navigate between plans.'}
              </div>
              {mealPlans.length === 0 && (
                <button
                  className="bg-[var(--accent)] text-[var(--accent-text)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--accent-hover)] transition-colors"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams?.toString());
                    params.set("showForm", "true");
                    router.push(`/meal-plans?${params.toString()}`);
                  }}
                >
                  + Create Plan
                </button>
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

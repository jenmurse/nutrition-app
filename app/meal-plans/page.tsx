'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MealPlanWeek from '@/app/components/MealPlanWeek';
import DailySummary from '@/app/components/DailySummary';
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
    <div className="flex-1 overflow-y-auto" style={{ padding: '0 var(--pad)' }}>
      <div className="grid py-5" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
        {/* Header row: spacer + 7 day headers */}
        <div className="border-b border-[var(--rule)]" />
        {days.map((day) => {
          const isToday = day.toDateString() === todayStr;
          return (
            <div
              key={day.toISOString()}
              className={`px-3 py-3 border-b border-[var(--rule)] ${isToday ? 'bg-[var(--accent-l)]' : ''}`}
            >
              <div className={`font-mono text-[7px] uppercase tracking-[0.14em] ${isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                {dayNames[day.getDay()]}
              </div>
              <div className={`font-serif text-[28px] font-bold leading-none mt-[2px] tracking-[-0.02em] ${isToday ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {day.getDate()}
              </div>
            </div>
          );
        })}

        {/* Person rows */}
        {persons.map((p) => {
          const plan = plansByPerson.get(p.id);
          return (
            <React.Fragment key={p.id}>
              {/* Person label column */}
              <div className="flex items-start gap-[6px] py-3 pl-2 border-b border-[var(--rule)]">
                <span className="w-[8px] h-[8px] rounded-full shrink-0 mt-[2px]" style={{ background: p.color || 'var(--accent)' }} />
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg)] leading-none">{p.name}</span>
                  {!plan && (
                    <div className="font-mono text-[7px] text-[var(--muted)] mt-[2px]">no plan</div>
                  )}
                </div>
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
                    className={`py-3 px-3 border-b border-[var(--rule)] ${isToday ? 'bg-[var(--accent-l)]' : ''}`}
                    style={{ minHeight: '90px' }}
                  >
                    {meals.length === 0 ? (
                      <span className="font-mono text-[9px] text-[var(--muted)]">&mdash;</span>
                    ) : (
                      <div className="flex flex-col gap-[4px]">
                        {meals.map((m) => {
                          const isShared = m.recipe ? sharedKeys.has(sharedKey(m.recipe.id, m.date)) : false;
                          const name = m.recipe?.name ?? m.ingredient?.name ?? '?';
                          const typeLetter = mealTypeLetters[m.mealType] || m.mealType.charAt(0).toUpperCase();
                          return (
                            <div key={m.id} className="flex items-start gap-[5px]">
                              <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--muted)] mt-[2px] shrink-0 w-[12px]">{typeLetter}</span>
                              <span className="font-sans text-[11px] text-[var(--fg)] leading-snug truncate min-w-0">{name}</span>
                              {isShared && (
                                <span
                                  className="font-mono text-[7px] uppercase tracking-[0.1em] px-[5px] py-[1px] bg-[var(--bg-3)] text-[var(--muted)] rounded-full shrink-0"
                                  title="Shared meal"
                                >
                                  shared
                                </span>
                              )}
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
      <div
        className="flex items-center shrink-0 overflow-hidden sticky top-0 z-[5] bg-[var(--bg)] border-b border-[var(--rule)]"
        style={{ height: 'var(--filter-h)', padding: '0 var(--pad)' }}
      >
        {/* Week range */}
        <h1 className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] mr-3 whitespace-nowrap shrink-0">
          {selectedPlan ? (() => {
            const s = parseUTCDate(selectedPlan.weekStartDate);
            const e = new Date(s); e.setDate(e.getDate() + 6);
            return s.getMonth() === e.getMonth()
              ? `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}`
              : `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          })() : 'Meal Plans'}
        </h1>

        {/* Nav: Prev / Next */}
        {mealPlans.length > 1 && selectedPlan && viewMode === 'personal' && (
          <>
            <button
              className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] bg-[var(--bg)] px-[8px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors shrink-0"
              onClick={() => {
                const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                if (idx < mealPlans.length - 1) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("planId", String(mealPlans[idx + 1].id));
                  router.push(`/meal-plans?${params.toString()}`);
                }
              }}
              aria-label="Previous week"
            >&#8249;</button>
            <button
              className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] bg-[var(--bg)] px-[8px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors shrink-0 mr-2"
              onClick={() => {
                const idx = mealPlans.findIndex(p => p.id === selectedPlan.id);
                if (idx > 0) {
                  const params = new URLSearchParams(searchParams?.toString());
                  params.set("planId", String(mealPlans[idx - 1].id));
                  router.push(`/meal-plans?${params.toString()}`);
                }
              }}
              aria-label="Next week"
            >&#8250;</button>
          </>
        )}

        {/* This Week */}
        <button
          className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] bg-[var(--bg)] px-[8px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors shrink-0 mr-2"
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

        {/* Person chips */}
        {persons.length > 1 && mealPlans.length > 0 && (
          <div className="flex items-center mr-2">
            {persons.map((p) => {
              const isActive = viewMode === 'personal' && selectedPersonId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    const wasEveryone = viewMode === 'both';
                    setViewMode('personal');
                    if (wasEveryone && selectedPersonId === p.id) {
                      // Same person — useEffect won't re-trigger, so reload plan manually
                      if (selectedPlan?.id) {
                        fetchMealPlanDetails(selectedPlan.id);
                      } else if (selectedPlanId) {
                        fetchMealPlanDetails(selectedPlanId);
                      } else {
                        // Force re-load by toggling person id
                        setHasAutoSelected(false);
                        prevPersonId.current = null;
                        setSelectedPersonId(p.id);
                      }
                    } else if (selectedPersonId === p.id) {
                      // Already this person but not from Everyone — force reload
                      setHasAutoSelected(false);
                      prevPersonId.current = null;
                      setSelectedPersonId(p.id);
                    } else {
                      setSelectedPersonId(p.id);
                    }
                  }}
                  className={`flex items-center gap-[5px] font-mono text-[8px] uppercase tracking-[0.1em] px-[8px] py-[3px] transition-[color,background] duration-[120ms] border-0 cursor-pointer ${
                    isActive ? 'text-[var(--fg)] bg-[var(--accent-l)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                  aria-pressed={isActive}
                >
                  <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: p.color || 'var(--accent)' }} aria-hidden="true" />
                  {p.name}
                </button>
              );
            })}
            <button
              onClick={() => setViewMode('both')}
              className={`font-mono text-[8px] uppercase tracking-[0.1em] px-[8px] py-[3px] transition-[color,background] duration-[120ms] border-0 cursor-pointer ${
                viewMode === 'both' ? 'text-[var(--fg)] bg-[var(--bg-3)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
              aria-pressed={viewMode === 'both'}
            >Everyone</button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* + New Plan (accent bg) */}
        <button
          className="font-mono text-[8px] uppercase tracking-[0.1em] border-0 bg-[var(--accent)] text-[var(--accent-fg)] px-[10px] py-[4px] hover:opacity-90 transition-opacity shrink-0 mr-2"
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
            className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] bg-[var(--bg)] px-[8px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors shrink-0 mr-2"
            onClick={() => setEditMode(true)}
          >Edit</button>
        )}
        {editMode && (
          <>
            <span className="font-mono text-[8px] text-[var(--muted)] shrink-0 mr-1">{selectedMealIds.size} sel</span>
            <button
              className="font-mono text-[8px] uppercase tracking-[0.1em] border-0 bg-[var(--err-l)] text-[var(--err)] px-[8px] py-[3px] disabled:opacity-40 hover:bg-[var(--err)] hover:text-white transition-colors shrink-0 mr-1"
              disabled={selectedMealIds.size === 0}
              onClick={handleDeleteSelected}
            >Delete</button>
            <button
              className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--rule)] bg-[var(--bg)] px-[8px] py-[3px] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors shrink-0 mr-2"
              onClick={() => { setEditMode(false); setSelectedMealIds(new Set()); }}
            >Done</button>
          </>
        )}

        {/* Nutrition toggle */}
        {selectedPlan && viewMode !== 'both' && (
          <button
            onClick={() => setSummaryPanelOpen(o => !o)}
            aria-label={summaryPanelOpen ? "Collapse summary panel" : "Expand summary panel"}
            aria-expanded={summaryPanelOpen}
            className={`font-mono text-[8px] uppercase tracking-[0.1em] px-[8px] py-[3px] transition-[color,background] duration-[120ms] cursor-pointer shrink-0 ${
              summaryPanelOpen
                ? 'text-[var(--accent)] border border-[var(--accent)] bg-transparent'
                : 'text-[var(--muted)] border border-transparent hover:text-[var(--fg)] hover:border-[var(--rule)]'
            }`}
          >
            {summaryPanelOpen ? 'Nutrition >' : '< Nutrition'}
          </button>
        )}
      </div>


      {/* Inline create form */}
      {showCreateForm && (
        <div className="border-b border-[var(--rule)] bg-[var(--bg-2)]" style={{ padding: '16px var(--pad)' }}>
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
              className="font-mono text-[9px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--accent-fg)] px-3 py-[5px] hover:opacity-90 transition-opacity disabled:opacity-50"
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
            <div className="flex-1 overflow-y-auto" style={{ padding: '0 var(--pad)' }}>
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

            {/* Right: Daily summary panel */}
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
                    className={`flex flex-col overflow-hidden bg-[var(--bg)] transition-[width,min-width] duration-300 [transition-timing-function:var(--ease-drawer)] relative z-[1] ${summaryPanelOpen ? 'border-l border-[var(--rule)]' : ''}`}
                    style={{
                      width: summaryPanelOpen ? 280 : 0,
                      minWidth: summaryPanelOpen ? 280 : 0,
                    }}
                  >
                  {/* Summary header */}
                  <div
                    className="flex items-center justify-between border-b border-[var(--rule)] shrink-0 bg-[var(--bg)]"
                    style={{ height: 'var(--filter-h)', padding: '0 20px' }}
                  >
                    <h2 className="font-sans text-[13px] font-medium text-[var(--fg)]">
                      {activeDayData.dayOfWeek},{' '}
                      {activeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h2>
                    {selectedPerson && (
                      <div className="flex items-center gap-[5px] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
                        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: selectedPerson.color || 'var(--accent)' }} aria-hidden="true" />
                        {selectedPerson.name}
                      </div>
                    )}
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto" style={{ padding: '24px 20px' }}>
                    {/* Calorie hero */}
                    {calorieNutrient && (
                      <div className="mb-4">
                        <div className="flex items-baseline gap-[6px] mb-1">
                          <span className="font-serif text-[36px] text-[var(--fg)] leading-none tracking-[-0.02em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {Math.round(calorieNutrient.value).toLocaleString()}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--muted)]">kcal</span>
                        </div>
                        {calorieGoal && (
                          <div className="font-mono text-[10px] text-[var(--muted)] mb-2">
                            of {calorieGoal.toLocaleString()} kcal daily goal · {Math.round(caloriePct)}%
                          </div>
                        )}
                        <div className="h-[4px] bg-[var(--bg-3)] w-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)]"
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
                          const isOverMax = nutrient.highGoal && nutrient.highGoal > 0 && nutrient.value > nutrient.highGoal;
                          const isWarn = nutrient.status === 'warning';
                          const barColor = 'bg-[var(--accent)]';
                          const valueColor = 'text-[var(--muted)]';
                          const unitSuffix = nutrient.displayName.toLowerCase() === 'calories' ? '' : ` ${nutrient.unit}`;
                          const formatVal = (v: number) => { const r = Math.round(v); return r >= 1000 ? r.toLocaleString() : String(r); };
                          return (
                            <div key={nutrient.nutrientId} className="mb-3">
                              <div className="flex justify-between items-baseline mb-[5px]">
                                <span className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-[0.1em]">{nutrient.displayName}</span>
                                <span className={`font-mono text-[10px] tabular-nums ${valueColor}`}>
                                  {formatVal(nutrient.value)} / {formatVal(goal ?? 0)}{unitSuffix}
                                </span>
                              </div>
                              <div className="h-[4px] bg-[var(--bg-3)] overflow-hidden">
                                <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
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
                          className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--muted)] mb-[6px] flex items-center gap-[5px]"
                        >
                          <span className="text-[13px] leading-none" aria-hidden="true">{isAboveMax ? '\u26A0\uFE0E' : '\u2296'}</span>
                          {isBelowMin
                            ? `${n.displayName} -${Math.round(n.lowGoal! - n.value)}${n.unit} below min`
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
                  className="bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-[8px] text-[9px] font-mono uppercase tracking-[0.1em] border-0 hover:opacity-90 transition-opacity cursor-pointer"
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

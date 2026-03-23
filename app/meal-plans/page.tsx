'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MealPlanWeek from '@/app/components/MealPlanWeek';
import DailySummary from '@/app/components/DailySummary';
import SmartSuggestionsPanel from '@/app/components/SmartSuggestionsPanel';
import AIAnalysisPanel from '@/app/components/AIAnalysisPanel';
import { usePersonContext, Person } from '@/app/components/PersonContext';

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

    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);

    async function fetchAll() {
      const map = new Map<number, MealPlan | null>();
      await Promise.all(
        persons.map(async (p) => {
          const res = await fetch(`/api/meal-plans?personId=${p.id}`);
          if (!res.ok) { map.set(p.id, null); return; }
          const plans: MealPlan[] = await res.json();
          const match = plans.find((pl) => {
            const d = new Date(pl.weekStartDate);
            d.setHours(0, 0, 0, 0);
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
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);
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
                                    className="font-mono text-[8px] uppercase tracking-[0.1em] px-1 py-[1px] bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]"
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [analysisRefreshKey, setAnalysisRefreshKey] = useState(0);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [newWeekStartDate, setNewWeekStartDate] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const showCreateForm = searchParams?.get("showForm") === "true";
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

  const fetchMealPlans = useCallback(async (personId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/meal-plans?personId=${personId}`);
      if (!response.ok) throw new Error('Failed to fetch meal plans');
      const data = await response.json();
      setMealPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      setMessage({ type: 'error', text: 'Failed to load meal plans' });
      setMealPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMealPlanDetails = useCallback(async (planId: number) => {
    try {
      const response = await fetch(`/api/meal-plans/${planId}`);
      if (!response.ok) throw new Error('Failed to fetch meal plan details');
      const data = await response.json();
      setSelectedPlan(data);
    } catch (error) {
      console.error('Error fetching meal plan details:', error);
      setMessage({ type: 'error', text: 'Failed to load meal plan details' });
    }
  }, []);

  // Fetch all persons' plans for the current week (for "also add to" feature)
  const fetchAllPersonPlansForWeek = useCallback(async (weekStartDate: string) => {
    if (persons.length < 2) return;
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    try {
      const all = await Promise.all(
        persons.map(async (p) => {
          const res = await fetch(`/api/meal-plans?personId=${p.id}`);
          if (!res.ok) return [];
          const plans: MealPlan[] = await res.json();
          return plans.filter((pl) => {
            const d = new Date(pl.weekStartDate);
            d.setHours(0, 0, 0, 0);
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

  // Re-fetch plans when selected person changes
  useEffect(() => {
    if (selectedPersonId === null) return;
    if (prevPersonId.current !== null && prevPersonId.current !== selectedPersonId) {
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
    fetchMealPlans(selectedPersonId);
  }, [selectedPersonId]);

  useEffect(() => {
    if (selectedPlanId) {
      // Wait until plans are loaded, then validate this planId belongs to the current person
      if (!loading) {
        if (!mealPlans.some((p) => p.id === selectedPlanId)) {
          // Stale planId from previous person — clear it
          const params = new URLSearchParams(searchParams?.toString());
          params.delete("planId");
          router.replace(`/meal-plans${params.toString() ? '?' + params.toString() : ''}`);
          return;
        }
        fetchMealPlanDetails(selectedPlanId);
      }
    } else if (mealPlans.length > 0 && !hasAutoSelected) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentWeekPlan = mealPlans.find((plan) => {
        const weekStart = new Date(plan.weekStartDate);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return today >= weekStart && today <= weekEnd;
      });
      const planToSelect = currentWeekPlan || mealPlans[0];
      if (planToSelect) {
        setHasAutoSelected(true);
        const params = new URLSearchParams(searchParams?.toString());
        params.set("planId", String(planToSelect.id));
        router.push(`/meal-plans?${params.toString()}`);
      }
    }
  }, [mealPlans, selectedPlanId, hasAutoSelected, loading, router, searchParams]);

  // Fetch other persons' plans when selected plan changes
  useEffect(() => {
    if (selectedPlan) {
      fetchAllPersonPlansForWeek(selectedPlan.weekStartDate);
    }
  }, [selectedPlan, fetchAllPersonPlansForWeek]);

  // Default selectedDay to today (if in range) when a plan loads
  useEffect(() => {
    if (!selectedPlan?.weeklySummary) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inPlan = selectedPlan.weeklySummary.dailyNutritions.some(
      d => new Date(d.date).toDateString() === today.toDateString()
    );
    if (inPlan) {
      setSelectedDay(today);
    } else if (!selectedDay) {
      const first = selectedPlan.weeklySummary.dailyNutritions[0];
      if (first) setSelectedDay(new Date(first.date));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan?.id]);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const data = await response.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipes([]);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients');
      if (!response.ok) throw new Error('Failed to fetch ingredients');
      const data = await response.json();
      setIngredients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      setIngredients([]);
    }
  };

  const handleDeleteMealPlan = async (planId: number) => {
    if (!confirm('Delete this meal plan? All meals will be removed.')) return;
    try {
      const response = await fetch(`/api/meal-plans/${planId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete meal plan');
      setMealPlans(mealPlans.filter((p) => p.id !== planId));
      if (selectedPlanId === planId) {
        setSelectedPlan(null);
        const params = new URLSearchParams(searchParams?.toString());
        params.delete("planId");
        router.push(`/meal-plans${params.toString() ? '?' + params.toString() : ''}`);
      }
      setMessage({ type: 'success', text: 'Meal plan deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      setMessage({ type: 'error', text: 'Failed to delete meal plan' });
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
  };

  const handleAddRecipeMeal = async (
    date: Date,
    mealType: string,
    recipeId: number,
    servings: number,
    alsoAddToPlanIds?: number[]
  ) => {
    if (!selectedPlanId) return;
    const body = { recipeId, date: date.toISOString(), mealType, servings };
    await addMealToPlan(selectedPlanId, body);
    if (alsoAddToPlanIds) {
      for (const planId of alsoAddToPlanIds) {
        await addMealToPlan(planId, body);
      }
    }
    await fetchMealPlanDetails(selectedPlanId);
    setAnalysisRefreshKey(k => k + 1);
    setMessage({ type: 'success', text: 'Meal added successfully!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleAddIngredientMeal = async (
    date: Date,
    mealType: string,
    ingredientId: number,
    quantity: number,
    unit: string,
    alsoAddToPlanIds?: number[]
  ) => {
    if (!selectedPlanId) return;
    const body = { ingredientId, quantity, unit, date: date.toISOString(), mealType };
    await addMealToPlan(selectedPlanId, body);
    if (alsoAddToPlanIds) {
      for (const planId of alsoAddToPlanIds) {
        await addMealToPlan(planId, body);
      }
    }
    await fetchMealPlanDetails(selectedPlanId);
    setAnalysisRefreshKey(k => k + 1);
    setMessage({ type: 'success', text: 'Ingredient added successfully!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleRemoveMeal = async (mealId: number) => {
    if (!selectedPlanId) return;
    try {
      const response = await fetch(`/api/meal-plans/${selectedPlanId}/meals/${mealId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to remove meal');
      await fetchMealPlanDetails(selectedPlanId);
      setAnalysisRefreshKey(k => k + 1);
      setMessage({ type: 'success', text: 'Meal removed successfully' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error removing meal:', error);
      setMessage({ type: 'error', text: 'Failed to remove meal' });
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
    if (!confirm(`Remove ${selectedMealIds.size} item${selectedMealIds.size !== 1 ? 's' : ''} from the plan?`)) return;
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
        <div className="font-mono text-[12px] font-light text-[var(--muted)]">Loading meal plans...</div>
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
            ? `Week of ${new Date(selectedPlan.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
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
              const start = new Date(plan.weekStartDate);
              start.setHours(0, 0, 0, 0);
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
              setMessage({ type: 'error', text: 'No meal plan covers today. Create a new plan starting this week.' });
              setTimeout(() => setMessage(null), 5000);
            }
          }}
        >This Week</button>

        {/* + New Plan */}
        <button
          className="font-mono text-[8px] uppercase tracking-[0.1em] border border-[var(--accent)] bg-[var(--accent)] text-white px-[9px] py-[3px] hover:bg-[var(--accent-hover)] transition-colors shrink-0"
          onClick={() => {
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

        {/* Summary panel toggle — hidden in "everyone" view */}
        {selectedPlan && viewMode !== 'both' && (
          <button
            onClick={() => setSummaryPanelOpen(o => !o)}
            aria-label={summaryPanelOpen ? "Collapse summary panel" : "Expand summary panel"}
            aria-expanded={summaryPanelOpen}
            className={`ml-auto font-mono text-[8px] uppercase tracking-[0.1em] px-[9px] py-[3px] border transition-colors shrink-0 ${
              summaryPanelOpen
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-light)]'
                : 'border-[var(--rule)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--rule-strong)]'
            }`}
          >
            {summaryPanelOpen ? 'Nutrition ›' : '‹ Nutrition'}
          </button>
        )}

        {/* Person tabs — right-aligned */}
        {persons.length > 1 && selectedPlan && (
          <div className="flex items-center shrink-0">
            {persons.map((p) => {
              const isActive = viewMode === 'personal' && selectedPersonId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setViewMode('personal'); setSelectedPersonId(p.id); }}
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
              className={`font-mono text-[9px] uppercase tracking-[0.1em] px-3 h-[46px] transition-colors border-b-2 ${
                viewMode === 'both' ? 'text-[var(--fg)] border-[var(--fg)]' : 'text-[var(--muted)] border-transparent hover:text-[var(--fg)]'
              }`}
              aria-pressed={viewMode === 'both'}
            >Everyone</button>
          </div>
        )}
      </div>

      {/* Status message */}
      {message && (
        <div className={`px-7 py-3 text-[11px] border-b border-[var(--rule)] ${
          message.type === 'success' ? 'text-[var(--accent)]' : 'text-[var(--error)]'
        }`}>
          {message.text}
        </div>
      )}

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
                    setMessage({ type: 'error', text: 'Plan created but failed to copy meals' });
                  }
                }

                setMealPlans(prev => [plan, ...prev]);
                setNewWeekStartDate('');
                setCopyFromPlanId('');
                const params = new URLSearchParams(searchParams?.toString());
                params.set("planId", String(plan.id));
                params.delete("showForm");
                router.push(`/meal-plans?${params.toString()}`);
                setViewMode('personal');
              } catch {
                setMessage({ type: 'error', text: 'Failed to create meal plan' });
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
                      const d = new Date(p.weekStartDate);
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
                weekStartDate={new Date(selectedPlan.weekStartDate)}
                days={
                  selectedPlan.weeklySummary?.dailyNutritions.map((day) => ({
                    date: new Date(day.date),
                    dayOfWeek: day.dayOfWeek,
                    meals: selectedPlan.mealLogs
                      ? selectedPlan.mealLogs
                          .filter((meal) => new Date(meal.date).toDateString() === new Date(day.date).toDateString())
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
                onError={(msg) => setMessage({ type: 'error', text: msg })}
                selectedDay={selectedDay}
                onDayClick={(date) => {
                  if (selectedDay && date.toDateString() === selectedDay.toDateString()) {
                    setSelectedDay(null);
                  } else {
                    setSelectedDay(date);
                  }
                }}
                editMode={editMode}
                selectedMealIds={selectedMealIds}
                onToggleMealSelect={toggleSelectMeal}
                otherPersonPlans={otherPersonPlans}
              />
            </div>

            {/* Right: Daily summary — always visible */}
            {selectedPlan.weeklySummary && (() => {
              const dailyNutritions = selectedPlan.weeklySummary.dailyNutritions;
              const dayData = selectedDay
                ? dailyNutritions.find(d => new Date(d.date).toDateString() === selectedDay.toDateString())
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
                new Date(m.date).toDateString() === new Date(activeDayData.date).toDateString()
              ) ?? [];

              const activeDate = new Date(activeDayData.date);

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
                          const pct = goal ? Math.min((nutrient.value / goal) * 100, 100) : 0;
                          const barColor = nutrient.status === 'error'
                            ? 'bg-[var(--error)]'
                            : nutrient.status === 'warning'
                            ? 'bg-[var(--warning)]'
                            : 'bg-[var(--accent)]';
                          const valueColor = nutrient.status === 'error'
                            ? 'text-[var(--error)]'
                            : nutrient.status === 'warning'
                            ? 'text-[var(--warning)]'
                            : 'text-[var(--muted)]';
                          return (
                            <div key={nutrient.nutrientId} className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] w-16 shrink-0">
                                {nutrient.displayName}
                              </span>
                              <div className="flex-1 h-[3px] bg-[var(--rule)]">
                                <div className={`h-[3px] ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`font-mono text-[9px] w-[72px] text-right whitespace-nowrap ${valueColor}`}>
                                {Math.round(nutrient.value)}{nutrient.unit} / {goal}{nutrient.unit}
                              </span>
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
                          await handleRemoveMeal(mealLogId);
                          await handleAddRecipeMeal(activeDate, 'snack', newRecipeId, 1);
                          setMessage({ type: 'success', text: 'Meal swapped!' });
                          setAnalysisRefreshKey(k => k + 1);
                          setTimeout(() => setMessage(null), 3000);
                        } catch {
                          setMessage({ type: 'error', text: 'Failed to swap meal' });
                        }
                      }}
                      onAddMeal={async (recipeId) => {
                        try {
                          await handleAddRecipeMeal(activeDate, 'snack', recipeId, 1);
                          setMessage({ type: 'success', text: 'Meal added!' });
                          setAnalysisRefreshKey(k => k + 1);
                          setTimeout(() => setMessage(null), 3000);
                        } catch {
                          setMessage({ type: 'error', text: 'Failed to add meal' });
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

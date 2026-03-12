'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import MealPlanWeek from '@/app/components/MealPlanWeek';
import DailySummary from '@/app/components/DailySummary';

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

interface MealPlan {
  id: number;
  weekStartDate: string;
  createdAt: string;
  mealLogs?: Array<{
    id: number;
    date: string;
    mealType: string;
    recipe?: Recipe;
    ingredient?: Ingredient;
    servings?: number;
    quantity?: number;
    unit?: string;
  }>;
  nutritionGoals?: Array<{
    nutrientId: number;
    lowGoal?: number;
    highGoal?: number;
    nutrient: Nutrient;
  }>;
  weeklySummary?: {
    dailyNutritions: DayNutrients[];
  };
}

const MealPlansPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedPlanId = searchParams?.get("planId") ? Number(searchParams.get("planId")) : null;

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedMealIds, setSelectedMealIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchMealPlans();
    fetchRecipes();
    fetchIngredients();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchMealPlanDetails(selectedPlanId);
    } else if (mealPlans.length > 0 && !hasAutoSelected) {
      // Auto-select the meal plan for the current week if no plan is selected
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentWeekPlan = mealPlans.find((plan) => {
        const weekStart = new Date(plan.weekStartDate);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        return today >= weekStart && today <= weekEnd;
      });

      if (currentWeekPlan) {
        // Auto-select the current week's plan
        setHasAutoSelected(true);
        const params = new URLSearchParams(searchParams?.toString());
        params.set("planId", String(currentWeekPlan.id));
        router.push(`/meal-plans?${params.toString()}`);
      }
    }
  }, [mealPlans, selectedPlanId, hasAutoSelected, router, searchParams]);

  const fetchMealPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/meal-plans');
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
  };

  const fetchMealPlanDetails = async (planId: number) => {
    try {
      const response = await fetch(`/api/meal-plans/${planId}`);
      if (!response.ok) throw new Error('Failed to fetch meal plan details');
      const data = await response.json();
      setSelectedPlan(data);
    } catch (error) {
      console.error('Error fetching meal plan details:', error);
      setMessage({ type: 'error', text: 'Failed to load meal plan details' });
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const data = await response.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setMessage({ type: 'error', text: 'Failed to load recipes' });
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
      setMessage({ type: 'error', text: 'Failed to load ingredients' });
      setIngredients([]);
    }
  };

  const handleDeleteMealPlan = async (planId: number) => {
    if (!confirm('Delete this meal plan? All meals will be removed.')) return;

    try {
      const response = await fetch(`/api/meal-plans/${planId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete meal plan');

      setMealPlans(mealPlans.filter((p) => p.id !== planId));
      if (selectedPlanId === planId) {
        setSelectedPlan(null);
        // Clear the planId from URL
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

  const handleAddRecipeMeal = async (
    date: Date,
    mealType: string,
    recipeId: number,
    servings: number
  ) => {
    if (!selectedPlanId) return;

    try {
      const response = await fetch(`/api/meal-plans/${selectedPlanId}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId,
          date: date.toISOString(),
          mealType,
          servings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add meal');
      }

      // Refresh meal plan details
      await fetchMealPlanDetails(selectedPlanId);
      setMessage({ type: 'success', text: 'Meal added successfully!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error adding meal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add meal';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleAddIngredientMeal = async (
    date: Date,
    mealType: string,
    ingredientId: number,
    quantity: number,
    unit: string
  ) => {
    if (!selectedPlanId) return;

    try {
      const response = await fetch(`/api/meal-plans/${selectedPlanId}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId,
          quantity,
          unit,
          date: date.toISOString(),
          mealType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add ingredient meal');
      }

      // Refresh meal plan details
      await fetchMealPlanDetails(selectedPlanId);
      setMessage({ type: 'success', text: 'Ingredient added successfully!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error adding ingredient meal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add ingredient meal';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleRemoveMeal = async (mealId: number) => {
    if (!selectedPlanId) return;

    try {
      const response = await fetch(
        `/api/meal-plans/${selectedPlanId}/meals/${mealId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove meal');

      // Refresh meal plan details
      await fetchMealPlanDetails(selectedPlanId);
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
    for (const id of selectedMealIds) {
      await handleRemoveMeal(id);
    }
    setSelectedMealIds(new Set());
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="font-mono text-[12px] font-light text-[var(--muted)]">Loading meal plans...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page Head */}
      <div className="px-7 py-5 border-b border-[var(--rule)]">
        <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]">Meal Plans</div>
        {selectedPlan && (
          <h1 className="font-sans text-[16px] font-normal text-[var(--fg)] mt-[2px]">
            Week of{' '}
            {new Date(selectedPlan.weekStartDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h1>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-7 py-5">
        {selectedPlan ? (
          <div className="space-y-6">
            <div className="flex items-center justify-end gap-3">
              {editMode ? (
                <>
                  <span className="font-mono text-[10px] font-light text-[var(--muted)]">{selectedMealIds.size} selected</span>
                  <button
                    className="border border-[var(--error)] text-[var(--error)] px-3 py-[6px] text-[9px] font-mono uppercase tracking-[0.12em] hover:opacity-80 transition disabled:opacity-40"
                    disabled={selectedMealIds.size === 0}
                    onClick={handleDeleteSelected}
                  >
                    Delete selected
                  </button>
                  <button
                    className="text-[9px] font-mono uppercase tracking-[0.12em] border border-[var(--rule)] px-3 py-[6px] text-[var(--muted)] hover:text-[var(--fg)] transition"
                    onClick={() => { setEditMode(false); setSelectedMealIds(new Set()); }}
                  >
                    Done
                  </button>
                </>
              ) : (
                <button
                  className="text-[9px] font-mono uppercase tracking-[0.12em] border border-[var(--rule)] px-3 py-[6px] text-[var(--muted)] hover:text-[var(--fg)] transition"
                  onClick={() => setEditMode(true)}
                >
                  Edit Meal Plan
                </button>
              )}
            </div>

            <MealPlanWeek
              mealPlanId={selectedPlan.id}
              weekStartDate={new Date(selectedPlan.weekStartDate)}
              days={
                selectedPlan.weeklySummary?.dailyNutritions.map((day) => ({
                  date: new Date(day.date),
                  dayOfWeek: day.dayOfWeek,
                  meals: selectedPlan.mealLogs
                    ? selectedPlan.mealLogs
                        .filter(
                          (meal) =>
                            new Date(meal.date).toDateString() ===
                            new Date(day.date).toDateString()
                        )
                        .map((meal) => ({
                          id: meal.id,
                          mealType: meal.mealType as
                            | 'breakfast'
                            | 'lunch'
                            | 'dinner'
                            | 'snack'
                            | 'dessert'
                            | 'beverage',
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
              onDayClick={setSelectedDay}
              editMode={editMode}
              selectedMealIds={selectedMealIds}
              onToggleMealSelect={toggleSelectMeal}
            />

            {/* Daily Nutrition Summary */}
            {selectedDay && selectedPlan.weeklySummary && (() => {
              const dayData = selectedPlan.weeklySummary.dailyNutritions.find(
                (day) => new Date(day.date).toDateString() === selectedDay.toDateString()
              );
              if (!dayData) return null;
              return (
                <div className="mt-6 pt-6 border-t border-[var(--rule)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]">Daily Summary</div>
                      <h2 className="font-sans text-[14px] font-medium text-[var(--fg)] mt-[2px]">
                        {dayData.dayOfWeek}, {new Date(dayData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </h2>
                    </div>
                    <button
                      className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)] transition"
                      onClick={() => setSelectedDay(null)}
                    >
                      Close
                    </button>
                  </div>
                  <DailySummary
                    dayOfWeek={dayData.dayOfWeek}
                    date={new Date(dayData.date)}
                    nutrients={dayData.totalNutrients}
                    variant="card"
                  />
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <div className="font-mono text-[12px] font-light text-[var(--muted)]">
                {mealPlans.length === 0
                  ? 'No meal plans yet. Click "+ New Plan" to get started.'
                  : 'Select a meal plan from the list.'}
              </div>
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

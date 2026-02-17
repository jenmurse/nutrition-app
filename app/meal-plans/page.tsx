'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MealPlanWeek from '@/app/components/MealPlanWeek';
import DailySummary from '@/app/components/DailySummary';
import { Button } from '@/components/ui/button';

interface Recipe {
  id: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  isComplete?: boolean;
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
    recipe: Recipe;
    servings?: number;
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
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWeekStartDate, setNewWeekStartDate] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchMealPlans();
    fetchRecipes();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      fetchMealPlanDetails(selectedPlanId);
    }
  }, [selectedPlanId]);

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

  const handleCreateMealPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeekStartDate) {
      setMessage({ type: 'error', text: 'Please select a start date' });
      return;
    }

    try {
      setCreatingPlan(true);
      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate: newWeekStartDate }),
      });

      if (!response.ok) throw new Error('Failed to create meal plan');
      const newPlan = await response.json();
      
      setMealPlans([newPlan, ...mealPlans]);
      setSelectedPlanId(newPlan.id);
      setShowCreateForm(false);
      setNewWeekStartDate('');
      setMessage({ type: 'success', text: 'Meal plan created successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error creating meal plan:', error);
      setMessage({ type: 'error', text: 'Failed to create meal plan' });
    } finally {
      setCreatingPlan(false);
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
        setSelectedPlanId(null);
        setSelectedPlan(null);
      }
      setMessage({ type: 'success', text: 'Meal plan deleted successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      setMessage({ type: 'error', text: 'Failed to delete meal plan' });
    }
  };

  const handleAddMeal = async (
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading meal plans...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Center Panel - Main Content (Week Grid) */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedPlan ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold">
                Week of{' '}
                {new Date(selectedPlan.weekStartDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h1>
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
                            | 'snack',
                          recipe: meal.recipe,
                          servings: meal.servings ?? 1,
                        }))
                    : [],
                  dayNutrients: day.totalNutrients,
                })) || []
              }
              recipes={recipes}
              onAddMeal={handleAddMeal}
              onRemoveMeal={handleRemoveMeal}
              onError={(msg) => setMessage({ type: 'error', text: msg })}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <div className="text-sm text-muted-foreground">
                {mealPlans.length === 0
                  ? 'No meal plans yet. Create one to get started →'
                  : 'Select a meal plan from the sidebar →'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Plan Selection & Summaries */}
      <aside className="flex w-80 flex-col border-l bg-muted/10">
        {/* Header */}
        <div className="p-4">
          <h2 className="text-sm font-semibold">Meal Plans</h2>
        </div>

        {/* Create New Plan */}
        <div className="p-4 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : '+ New Plan'}
          </Button>

          {showCreateForm && (
            <form onSubmit={handleCreateMealPlan} className="space-y-3">
              <label className="flex flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Week start
                <input
                  id="weekStartDate"
                  type="date"
                  value={newWeekStartDate}
                  onChange={(e) => setNewWeekStartDate(e.target.value)}
                  required
                  className="border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                />
              </label>
              <Button type="submit" variant="outline" className="w-full" disabled={creatingPlan}>
                {creatingPlan ? 'Creating...' : 'Create'}
              </Button>
            </form>
          )}
        </div>

        {/* Plan List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {message && (
            <div
              className={`border px-3 py-2 text-xs mb-3 ${
                message.type === 'success'
                  ? 'border-foreground/20 bg-background'
                  : 'border-rose-600/40 bg-rose-600/10'
              }`}
            >
              {message.text}
            </div>
          )}

          {mealPlans.length === 0 ? (
            <div className="border border-dashed border-muted-foreground/40 bg-muted/10 px-3 py-3 text-[11px] text-muted-foreground">
              No meal plans
            </div>
          ) : (
            mealPlans.map((plan) => {
              const isActive = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`group border px-3 py-2 transition cursor-pointer ${
                    isActive
                      ? 'border-foreground bg-background'
                      : 'border-muted bg-background hover:bg-muted/40'
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        Week of{' '}
                        {new Date(plan.weekStartDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(plan.weekStartDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    {isActive && (
                      <button
                        className="text-xs text-muted-foreground hover:text-destructive transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMealPlan(plan.id);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Daily Summaries - Only shown when a plan is selected */}
        {selectedPlan && selectedPlan.weeklySummary && (
          <div className="border-t">
            <div className="p-4">
              <h3 className="text-sm font-semibold">Daily Nutrition</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {selectedPlan.weeklySummary.dailyNutritions.map((day) => (
                <div
                  key={new Date(day.date).toISOString()}
                  className="border-b last:border-b-0"
                >
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between px-4 text-xs font-semibold hover:bg-muted/40 transition"
                    onClick={(event) => {
                      const content = event.currentTarget.nextElementSibling as HTMLDivElement | null;
                      const icon = event.currentTarget.querySelector('[data-accordion-icon]') as HTMLSpanElement | null;
                      if (!content) return;
                      const isOpen = content.dataset.open === 'true';
                      const nextOpen = !isOpen;
                      content.dataset.open = nextOpen.toString();
                      content.classList.toggle('hidden', !nextOpen);
                      if (icon) {
                        icon.textContent = nextOpen ? '-' : '+';
                      }
                    }}
                  >
                    <span>
                      {day.dayOfWeek.slice(0, 3)} {new Date(day.date).getDate()}
                    </span>
                    <span
                      className="text-xs font-semibold text-muted-foreground"
                      aria-hidden="true"
                      data-accordion-icon
                    >
                      +
                    </span>
                  </button>
                  <div className="hidden px-4 pb-3" data-open="false">
                    <DailySummary
                      dayOfWeek={day.dayOfWeek}
                      date={new Date(day.date)}
                      nutrients={day.totalNutrients}
                      variant="flat"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default MealPlansPage;

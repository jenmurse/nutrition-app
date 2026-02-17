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
      <div className="border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading meal plans...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="p-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Meal Plans</h1>
          </div>
          <Button variant="outline" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Close planner' : '+ New Meal Plan'}
          </Button>
        </div>

        {showCreateForm && (
          <form
            className="mt-6 grid gap-4 border bg-background p-4 md:grid-cols-[1fr_auto]"
            onSubmit={handleCreateMealPlan}
          >
            <label className="flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Week start date
              <input
                id="weekStartDate"
                type="date"
                value={newWeekStartDate}
                onChange={(e) => setNewWeekStartDate(e.target.value)}
                required
                className="border bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="outline" disabled={creatingPlan}>
                {creatingPlan ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        )}
        <div className="mt-4">
          {mealPlans.length === 0 ? (
            <div className="border border-dashed border-muted-foreground/40 bg-muted/10 px-3 py-4 text-xs text-muted-foreground">
              No meal plans yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {mealPlans.map((plan) => {
                const isActive = selectedPlanId === plan.id;
                return (
                  <div key={plan.id} className="flex items-center gap-2">
                    <button
                      className={`flex-1 border px-3 py-2 text-left transition ${
                        isActive
                          ? 'border-foreground bg-background'
                          : 'border-muted bg-background hover:bg-muted/40'
                      }`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <div className="text-sm font-semibold">
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
                    </button>
                    {isActive && (
                      <Button
                        variant="outline"
                        className="h-full px-3 text-xs"
                        onClick={() => handleDeleteMealPlan(plan.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {message && (
        <div
          className={`border px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'border-foreground/20 bg-background text-foreground'
              : 'border-foreground/20 bg-background text-foreground'
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="min-w-0 space-y-6">
          {selectedPlan ? (
            <>
              <div className="mt-10">
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Daily summaries</h2>
                </div>
                <div className="w-full space-y-2">
                  {selectedPlan.weeklySummary?.dailyNutritions.map((day) => (
                    <div
                      key={new Date(day.date).toISOString()}
                      className="border-t border-border last:border-b last:pb-2"
                    >
                      <button
                        type="button"
                        className="flex h-12 w-full items-center justify-between px-1 pt-[3px] text-sm font-semibold"
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
                        <span className="relative top-[3px]">
                          {day.dayOfWeek} ·{' '}
                          {new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span
                          className="relative top-[3px] text-sm font-semibold text-muted-foreground"
                          aria-hidden="true"
                          data-accordion-icon
                        >
                          +
                        </span>
                      </button>
                      <div className="hidden px-1 pb-3" data-open="false">
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
            </>
          ) : null}
        </section>
    </div>
  );
};

export default MealPlansPage;

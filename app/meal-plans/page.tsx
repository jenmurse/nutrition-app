'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedPlanId = searchParams?.get("planId") ? Number(searchParams.get("planId")) : null;
  
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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
    <div className="flex h-full flex-col">
      {/* Main Content Area */}
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
              selectedDay={selectedDay}
              onDayClick={setSelectedDay}
            />

            {/* Daily Nutrition Summary */}
            {selectedDay && selectedPlan.weeklySummary && (() => {
              const dayData = selectedPlan.weeklySummary.dailyNutritions.find(
                (day) => new Date(day.date).toDateString() === selectedDay.toDateString()
              );
              if (!dayData) return null;
              return (
                <div className="mt-6 pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      Nutrition - {dayData.dayOfWeek}, {new Date(dayData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h2>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground transition"
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
              <div className="text-sm text-muted-foreground">
                {mealPlans.length === 0
                  ? 'No meal plans yet. Click "+ New Plan" to get started →'
                  : 'Select a meal plan from the list →'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPlansPage;

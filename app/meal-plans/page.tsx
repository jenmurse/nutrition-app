'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MealPlanWeek from '@/app/components/MealPlanWeek';
import DailySummary from '@/app/components/DailySummary';
import styles from './meal-plans.module.css';

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
      <div className={styles.container}>
        <div className={styles.loading}>Loading meal plans...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Meal Plans</h1>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Meal Plan'}
        </button>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {showCreateForm && (
        <form className={styles.createForm} onSubmit={handleCreateMealPlan}>
          <div className={styles.formGroup}>
            <label htmlFor="weekStartDate">Week Start Date</label>
            <input
              id="weekStartDate"
              type="date"
              value={newWeekStartDate}
              onChange={(e) => setNewWeekStartDate(e.target.value)}
              required
            />
          </div>
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={creatingPlan}
            >
              {creatingPlan ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <h3>Your Meal Plans</h3>
          {mealPlans.length === 0 ? (
            <p className={styles.noPlans}>No meal plans yet. Create one to get started!</p>
          ) : (
            <div className={styles.planList}>
              {mealPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`${styles.planItem} ${
                    selectedPlanId === plan.id ? styles.active : ''
                  }`}
                >
                  <button
                    className={styles.planButton}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className={styles.planName}>
                      Week of{' '}
                      {new Date(plan.weekStartDate).toLocaleDateString(
                        'en-US',
                        { month: 'short', day: 'numeric' }
                      )}
                    </div>
                    <div className={styles.planDate}>
                      {new Date(plan.weekStartDate).toLocaleDateString(
                        'en-US',
                        { year: 'numeric' }
                      )}
                    </div>
                  </button>
                  {selectedPlanId === plan.id && (
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteMealPlan(plan.id)}
                      title="Delete meal plan"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={styles.sidebarFooter}>
            <Link href="/settings" className={styles.settingsLink}>
              ⚙️ Manage Goals
            </Link>
          </div>
        </div>

        <div className={styles.mainContent}>
          {selectedPlan ? (
            <>
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

              <div className={styles.dailySummaries}>
                <h2>Daily Summaries</h2>
                <div className={styles.summariesGrid}>
                  {selectedPlan.weeklySummary?.dailyNutritions.map((day) => (
                    <DailySummary
                      key={new Date(day.date).toISOString()}
                      dayOfWeek={day.dayOfWeek}
                      date={new Date(day.date)}
                      nutrients={day.totalNutrients}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noSelection}>
              <p>Select a meal plan from the sidebar or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealPlansPage;

'use client';

import React, { useState, useCallback } from 'react';
import styles from './MealPlanWeek.module.css';

interface Recipe {
  id: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  isComplete?: boolean;
}

interface Nutrient {
  nutrientId: number;
  displayName: string;
  unit: string;
  value: number;
  status?: 'ok' | 'warning' | 'error';
}

interface Meal {
  id: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: Recipe;
  servings?: number;
}

interface DayMeals {
  date: Date;
  dayOfWeek: string;
  meals: Meal[];
  dayNutrients: Nutrient[];
}

interface MealPlanWeekProps {
  mealPlanId: number;
  weekStartDate: Date;
  days: DayMeals[];
  recipes: Recipe[];
  onAddMeal: (date: Date, mealType: string, recipeId: number, servings: number) => Promise<void>;
  onRemoveMeal: (mealId: number) => Promise<void>;
  onError?: (message: string) => void;
  isLoading?: boolean;
}

const MealPlanWeek: React.FC<MealPlanWeekProps> = ({
  mealPlanId,
  weekStartDate,
  days,
  recipes,
  onAddMeal,
  onRemoveMeal,
  onError,
  isLoading = false,
}) => {
  const [selectedDayMeal, setSelectedDayMeal] = useState<{
    date: Date;
    mealType: string;
  } | null>(null);
  const [recipeDropdownOpen, setRecipeDropdownOpen] = useState(false);
  const [mealTypeDropdownOpen, setMealTypeDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addingMealLoading, setAddingMealLoading] = useState(false);
  const [selectedServings, setSelectedServings] = useState(1);

  const availableMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'beverage'];

  const handleAddMealClick = (date: Date) => {
    setSelectedDate(date);
    setMealTypeDropdownOpen(true);
  };

  const handleSelectMealType = (mealType: string) => {
    if (!selectedDate) return;
    setSelectedDayMeal({ date: selectedDate, mealType });
    setMealTypeDropdownOpen(false);
    setRecipeDropdownOpen(true);
    setSelectedServings(1);
  };

  const handleSelectRecipe = async (recipeId: number) => {
    if (!selectedDayMeal) return;

    // Find the recipe to check if it's complete
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe && recipe.isComplete === false) {
      alert('This recipe is incomplete. Please finish adding ingredients before using it in a meal plan.');
      return;
    }

    setAddingMealLoading(true);
    try {
      await onAddMeal(
        selectedDayMeal.date,
        selectedDayMeal.mealType,
        recipeId,
        selectedServings
      );
      setSelectedDayMeal(null);
      setRecipeDropdownOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add meal';
      console.error('Error adding meal:', error);
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setAddingMealLoading(false);
    }
  };

  const handleRemoveMeal = async (mealId: number) => {
    if (!confirm('Remove this meal from the plan?')) return;

    try {
      await onRemoveMeal(mealId);
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ok':
        return '#4caf50'; // green
      case 'warning':
        return '#ff9800'; // orange
      case 'error':
        return '#f44336'; // red
      default:
        return '#999';
    }
  };

  const formatNutrientValue = (nutrient: Nutrient) => {
    return `${nutrient.displayName}: ${nutrient.value}${nutrient.unit}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.weekHeader}>
        <h2>Week of {weekStartDate.toLocaleDateString()}</h2>
      </div>

      <div className={styles.weekGrid}>
        {days.map((day) => (
          <div key={day.date.toISOString()} className={styles.dayColumn}>
            <div className={styles.dayHeader}>
              <div className={styles.dayName}>{day.dayOfWeek}</div>
              <div className={styles.dayDate}>
                {new Date(day.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div className={styles.mealsContainer}>
              {/* Group meals by meal type for display */}
              {day.meals.length > 0 ? (
                <>
                  {availableMealTypes.map((mealType) => {
                    const mealsOfType = day.meals.filter((m) => m.mealType === mealType);
                    if (mealsOfType.length === 0) return null;
                    
                    return (
                      <div key={mealType} className={styles.mealTypeSection}>
                        <div className={styles.mealTypeLabel}>
                          {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                        </div>
                        <div className={styles.mealsList}>
                          {mealsOfType.map((meal) => (
                            <div
                              key={meal.id}
                              className={styles.mealItem}
                              title={`Remove meal: ${meal.recipe.name}`}
                              onClick={() => handleRemoveMeal(meal.id)}
                            >
                              <div className={styles.mealName}>
                                {meal.recipe.name}
                              </div>
                              <div className={styles.mealServings}>
                                {meal.servings ?? 1} {meal.recipe.servingUnit} serving{(meal.servings ?? 1) !== 1 ? 's' : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className={styles.emptyDay}>
                  <p className={styles.emptyDayText}>No meals planned</p>
                </div>
              )}

              {/* Add Meal Button */}
              <div
                className={styles.addMealButtonContainer}
                onClick={() => handleAddMealClick(new Date(day.date))}
              >
                <button className={styles.addMealPrimaryButton}>
                  + Add Meal
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Meal Type Selector Modal */}
      {mealTypeDropdownOpen && selectedDate && (
        <div className={styles.modal} onClick={() => setMealTypeDropdownOpen(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Select Meal Type</h3>
              <button
                className={styles.closeButton}
                onClick={() => setMealTypeDropdownOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.mealTypesList}>
              {availableMealTypes.map((mealType) => (
                <button
                  key={mealType}
                  className={styles.mealTypeOption}
                  onClick={() => handleSelectMealType(mealType)}
                >
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Selector Modal */}
      {recipeDropdownOpen && selectedDayMeal && (
        <div className={styles.modal} onClick={() => setRecipeDropdownOpen(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                Select Recipe for{' '}
                {selectedDayMeal.mealType.charAt(0).toUpperCase() +
                  selectedDayMeal.mealType.slice(1)}
              </h3>
              <button
                className={styles.closeButton}
                onClick={() => setRecipeDropdownOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.servingsRow}>
              <label className={styles.servingsLabel} htmlFor="meal-servings">
                Servings
              </label>
              <input
                id="meal-servings"
                type="number"
                min={0.25}
                step={0.25}
                className={styles.servingsInput}
                value={selectedServings}
                onChange={(e) => setSelectedServings(Number(e.target.value) || 1)}
              />
            </div>

            <div className={styles.recipesList}>
              {recipes.length === 0 ? (
                <p className={styles.noRecipes}>No recipes available</p>
              ) : (
                recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className={`${styles.recipeOption} ${!recipe.isComplete ? styles.recipeIncomplete : ''}`}
                    onClick={
                      addingMealLoading || !recipe.isComplete
                        ? undefined
                        : () => handleSelectRecipe(recipe.id)
                    }
                    title={!recipe.isComplete ? 'Complete this recipe before adding to meal plan' : ''}
                  >
                    <div className={styles.recipeName}>
                      {recipe.name}
                      {!recipe.isComplete && (
                        <span className={styles.incompleteTag}> (incomplete)</span>
                      )}
                    </div>
                    <div className={styles.recipeServings}>
                      {recipe.servingSize} {recipe.servingUnit}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanWeek;

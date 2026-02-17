'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Recipe {
  id: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  tags?: string;
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

    const recipe = recipes.find((r) => r.id === recipeId);
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

  const filteredRecipes = useMemo(() => {
    if (!selectedDayMeal) return recipes;
    const target = selectedDayMeal.mealType.toLowerCase();
    return recipes.filter((recipe) => {
      if (!recipe.tags) return true;
      const tags = recipe.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      return tags.length === 0 ? true : tags.includes(target);
    });
  }, [recipes, selectedDayMeal]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Week of
          </p>
          <h2 className="text-lg font-semibold">
            {weekStartDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h2>
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-full max-w-full overflow-x-auto">
          <div className="grid min-w-[860px] grid-cols-7 gap-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {days.map((day) => (
              <div key={day.date.toISOString()} className="text-center">
                {day.dayOfWeek.slice(0, 3)}
              </div>
            ))}
          </div>
        </div>
        <div className="w-full max-w-full overflow-x-auto">
          <div className="grid min-w-[860px] grid-cols-7 gap-3">
            {days.map((day) => (
              <div
                key={day.date.toISOString()}
                className="flex flex-col gap-3 border bg-card p-3"
              >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                  })}
                </div>
              </div>
              <div className="border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {day.meals.length} meal{day.meals.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {day.meals.length > 0 ? (
                availableMealTypes.map((mealType) => {
                  const mealsOfType = day.meals.filter((m) => m.mealType === mealType);
                  if (mealsOfType.length === 0) return null;

                  return (
                    <div key={mealType} className="space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        {mealType}
                      </div>
                      <div className="space-y-1.5">
                        {mealsOfType.map((meal) => (
                          <button
                            key={meal.id}
                            type="button"
                            className="w-full border border-border bg-background px-2 py-1.5 text-left text-xs transition hover:border-foreground/40"
                            title={`Remove meal: ${meal.recipe.name}`}
                            onClick={() => handleRemoveMeal(meal.id)}
                          >
                            <div className="text-xs font-semibold text-foreground">
                              {meal.recipe.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {meal.servings ?? 1} {meal.recipe.servingUnit} serving{(meal.servings ?? 1) !== 1 ? 's' : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="border border-dashed border-muted-foreground/40 bg-muted/10 px-3 py-4 text-center text-[11px] text-muted-foreground">
                  No meals planned yet
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => handleAddMealClick(new Date(day.date))}
            >
              + Add Meal
            </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {mealTypeDropdownOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold">Select meal type</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMealTypeDropdownOpen(false)}
              >
                ✕
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {availableMealTypes.map((mealType) => (
                <button
                  key={mealType}
                  type="button"
                  className="rounded-xl border border-muted bg-muted/30 px-3 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/10"
                  onClick={() => handleSelectMealType(mealType)}
                >
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {recipeDropdownOpen && selectedDayMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold">
                {selectedDayMeal.mealType.charAt(0).toUpperCase() +
                  selectedDayMeal.mealType.slice(1)}{' '}
                recipes
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRecipeDropdownOpen(false)}
              >
                ✕
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground" htmlFor="meal-servings">
                Servings
              </label>
              <input
                id="meal-servings"
                type="number"
                min={0.25}
                step={0.25}
                className="w-28 rounded-lg border bg-background px-2 py-1 text-sm"
                value={selectedServings}
                onChange={(e) => setSelectedServings(Number(e.target.value) || 1)}
              />
              <span className="text-xs text-muted-foreground">
                Adjust serving count to scale nutrition totals
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredRecipes.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  No recipes match this meal type
                </div>
              ) : (
                filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      recipe.isComplete === false
                        ? 'cursor-not-allowed border-destructive/40 bg-destructive/10 text-muted-foreground'
                        : 'border-muted bg-background hover:border-primary/40 hover:bg-primary/5'
                    }`}
                    onClick={
                      addingMealLoading || !recipe.isComplete
                        ? undefined
                        : () => handleSelectRecipe(recipe.id)
                    }
                    title={!recipe.isComplete ? 'Complete this recipe before adding to meal plan' : ''}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">
                        {recipe.name}
                      </div>
                      {!recipe.isComplete && (
                        <span className="text-[11px] uppercase tracking-[0.2em] text-destructive">
                          Incomplete
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {recipe.servingSize} {recipe.servingUnit}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MealPlanWeek;

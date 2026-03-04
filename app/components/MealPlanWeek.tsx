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
  displayName: string;
  unit: string;
  value: number;
  status?: 'ok' | 'warning' | 'error';
}

interface Meal {
  id: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'beverage';
  recipe?: Recipe;
  ingredient?: Ingredient;
  servings?: number;
  quantity?: number;
  unit?: string;
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
  ingredients: Ingredient[];
  onAddRecipeMeal: (date: Date, mealType: string, recipeId: number, servings: number) => Promise<void>;
  onAddIngredientMeal: (date: Date, mealType: string, ingredientId: number, quantity: number, unit: string) => Promise<void>;
  onRemoveMeal: (mealId: number) => Promise<void>;
  onReorderMeals?: (dayDate: Date, orderedIds: number[]) => Promise<void>;
  onError?: (message: string) => void;
  isLoading?: boolean;
  selectedDay?: Date | null;
  onDayClick?: (date: Date) => void;
  editMode?: boolean;
  selectedMealIds?: Set<number>;
  onToggleMealSelect?: (id: number) => void;
}

const MealPlanWeek: React.FC<MealPlanWeekProps> = ({
  mealPlanId,
  weekStartDate,
  days,
  recipes,
  ingredients,
  onAddRecipeMeal,
  onAddIngredientMeal,
  onRemoveMeal,
  onReorderMeals,
  onError,
  isLoading = false,
  selectedDay,
  onDayClick,
  editMode = false,
  selectedMealIds = new Set(),
  onToggleMealSelect,
}) => {
  const [selectedDayMeal, setSelectedDayMeal] = useState<{
    date: Date;
    mealType: string;
  } | null>(null);
  const [mealTypeDropdownOpen, setMealTypeDropdownOpen] = useState(false);
  const [itemTypeTabOpen, setItemTypeTabOpen] = useState<'recipe' | 'ingredient' | null>(null);
  const [recipeDropdownOpen, setRecipeDropdownOpen] = useState(false);
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addingMealLoading, setAddingMealLoading] = useState(false);
  const [selectedServings, setSelectedServings] = useState('1');
  const [selectedQuantity, setSelectedQuantity] = useState('100');
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');
  const [pendingRecipeId, setPendingRecipeId] = useState<number | null>(null);
  const [pendingIngredientId, setPendingIngredientId] = useState<number | null>(null);
  const [draggedMealId, setDraggedMealId] = useState<number | null>(null);
  const [dragOverMealId, setDragOverMealId] = useState<number | null>(null);

  const availableMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'beverage'];

  const handleAddMealClick = (date: Date) => {
    setSelectedDate(date);
    setMealTypeDropdownOpen(true);
  };

  const handleSelectMealType = (mealType: string) => {
    if (!selectedDate) return;
    setSelectedDayMeal({ date: selectedDate, mealType });
    setMealTypeDropdownOpen(false);
    setItemTypeTabOpen('recipe');
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
      const parsedServings = parseFloat(selectedServings);
      if (!Number.isFinite(parsedServings) || parsedServings <= 0) {
        alert('Please enter a valid number of servings');
        setAddingMealLoading(false);
        return;
      }
      await onAddRecipeMeal(
        selectedDayMeal.date,
        selectedDayMeal.mealType,
        recipeId,
        parsedServings
      );
      setPendingRecipeId(null);
      setSelectedServings('1');
      setSelectedDayMeal(null);
      setItemTypeTabOpen(null);
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

  const handleSelectIngredient = async (ingredientId: number) => {
    if (!selectedDayMeal) return;

    const normalizedQuantity = parseFloat(selectedQuantity);
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setAddingMealLoading(true);
    try {
      await onAddIngredientMeal(
        selectedDayMeal.date,
        selectedDayMeal.mealType,
        ingredientId,
        normalizedQuantity,
        selectedUnit
      );
      setPendingIngredientId(null);
      setSelectedDayMeal(null);
      setItemTypeTabOpen(null);
      setIngredientDropdownOpen(false);
      setSelectedQuantity('100');
      setSelectedUnit('g');
      setIngredientSearchTerm('');
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

  const handleDrop = (day: DayMeals, targetMealId: number) => {
    if (!draggedMealId || draggedMealId === targetMealId) return;
    const meals = day.meals;
    const from = meals.findIndex((m) => m.id === draggedMealId);
    const to = meals.findIndex((m) => m.id === targetMealId);
    if (from === -1 || to === -1) return;
    const reordered = [...meals];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setDraggedMealId(null);
    setDragOverMealId(null);
    onReorderMeals?.(day.date, reordered.map((m) => m.id));
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
      <div className="space-y-4">
        <div className="w-full max-w-full overflow-x-auto">
          <div className="grid min-w-[860px] grid-cols-7 gap-3 text-center">
            {days.map((day) => (
              <div key={day.date.toISOString()}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {day.dayOfWeek.slice(0, 3)}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full max-w-full overflow-x-auto">
          <div className="grid min-w-[860px] grid-cols-7 gap-3">
            {days.map((day) => {
              return (
              <div
                key={day.date.toISOString()}
                className="flex flex-col gap-3 border bg-card p-3"
              >
            <Button
              variant="ghost"
              className="h-8 w-full text-xs"
              onClick={() => onDayClick?.(new Date(day.date))}
            >
              View Nutrition
            </Button>

            <div className="flex-1 space-y-2">
              {day.meals.length > 0 ? (
                <div className="space-y-1.5">
                  {day.meals.map((meal) => (
                    <div
                      key={meal.id}
                      draggable={!editMode}
                      onDragStart={(e) => {
                        if (editMode) return;
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedMealId(meal.id);
                      }}
                      onDragOver={(e) => {
                        if (editMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverMealId(meal.id);
                      }}
                      onDrop={(e) => {
                        if (editMode) return;
                        e.preventDefault();
                        e.stopPropagation();
                        handleDrop(day, meal.id);
                      }}
                      onDragEnd={() => {
                        setDraggedMealId(null);
                        setDragOverMealId(null);
                      }}
                      onClick={() => editMode && onToggleMealSelect?.(meal.id)}
                      className={`w-full border bg-background px-2 py-1.5 text-xs transition select-none ${
                        editMode
                          ? selectedMealIds.has(meal.id)
                            ? 'border-destructive bg-destructive/10 cursor-pointer'
                            : 'border-border cursor-pointer hover:border-destructive/40'
                          : draggedMealId === meal.id
                          ? 'opacity-40 border-dashed border-muted-foreground'
                          : dragOverMealId === meal.id && draggedMealId !== null
                          ? 'border-primary border-t-2'
                          : 'border-border hover:border-foreground/40'
                      }`}
                    >
                      <div className="flex items-start gap-1">
                        {editMode ? (
                          <input
                            type="checkbox"
                            className="mt-0.5 shrink-0 accent-destructive"
                            checked={selectedMealIds.has(meal.id)}
                            onChange={() => onToggleMealSelect?.(meal.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="mt-0.5 text-muted-foreground/40 text-[13px] cursor-grab leading-none select-none">⠿</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">
                            {meal.recipe?.name || meal.ingredient?.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {meal.recipe ? (
                              <>
                                {(() => {
                                  const count = meal.servings ?? 1;
                                  const unit = meal.recipe.servingUnit ?? '';
                                  const isGenericServing = /^servings?$/i.test(unit.trim());
                                  return isGenericServing
                                    ? `${count} serving${count !== 1 ? 's' : ''}`
                                    : `${count} ${unit}`;
                                })()}
                              </>
                            ) : (
                              <>{meal.quantity} {meal.unit}</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-muted-foreground/40 bg-muted/10 px-3 py-4 text-center text-[11px] text-muted-foreground">
                  No meals planned yet
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full text-xs"
              disabled={editMode}
              onClick={() => handleAddMealClick(new Date(day.date))}
            >
              + Add Item
            </Button>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {mealTypeDropdownOpen && selectedDate && !itemTypeTabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm overflow-y-auto">
          <div
            className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-semibold">Select meal type</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setMealTypeDropdownOpen(false);
                  setSelectedDate(null);
                }}
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

      {itemTypeTabOpen && selectedDayMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl max-h-[90vh] rounded-2xl border bg-card shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-6 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setItemTypeTabOpen('recipe')}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    itemTypeTabOpen === 'recipe'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Recipes
                </button>
                <button
                  onClick={() => setItemTypeTabOpen('ingredient')}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    itemTypeTabOpen === 'ingredient'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Ingredients
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setItemTypeTabOpen(null);
                  setSelectedDayMeal(null);
                  setIngredientSearchTerm('');
                }}
              >
                ✕
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {itemTypeTabOpen === 'recipe' ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3 mb-4">
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
                        onChange={(e) => setSelectedServings(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">
                      Adjust serving count to scale nutrition totals
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
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
                              : pendingRecipeId === recipe.id
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-muted bg-background hover:border-primary/40 hover:bg-primary/5'
                          }`}
                          onClick={
                            addingMealLoading || !recipe.isComplete
                              ? undefined
                              : () => setPendingRecipeId(recipe.id)
                          }
                          title={!recipe.isComplete ? 'Complete this recipe before adding to meal plan' : ''}
                          disabled={addingMealLoading}
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
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 rounded-xl border bg-muted/20 px-4 py-3 mb-4">
                    <div className="flex-1 flex items-center gap-2 min-w-max">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground" htmlFor="ingredient-search">
                        Search
                      </label>
                      <input
                        id="ingredient-search"
                        type="text"
                        placeholder="Find ingredient..."
                        className="flex-1 rounded-lg border bg-background px-2 py-1 text-sm"
                        value={ingredientSearchTerm}
                        onChange={(e) => setIngredientSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground" htmlFor="ingredient-quantity">
                        Quantity
                      </label>
                      <input
                        id="ingredient-quantity"
                        type="number"
                        min={0.01}
                        step={0.1}
                        className="w-20 rounded-lg border bg-background px-2 py-1 text-sm"
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground" htmlFor="ingredient-unit">
                        Unit
                      </label>
                      <input
                        id="ingredient-unit"
                        type="text"
                        className="w-20 rounded-lg border bg-background px-2 py-1 text-sm"
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        placeholder="g, ml, etc."
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {ingredients.filter(ing => 
                      ing.isMealItem && ing.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
                    ).length === 0 ? (
                      <div className="col-span-full rounded-xl border border-dashed border-muted-foreground/40 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                        {ingredients.filter(ing => ing.isMealItem).length === 0 ? 'No meal items available' : 'No meal items match your search'}
                      </div>
                    ) : (
                      ingredients.filter(ing => 
                        ing.isMealItem && ing.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
                      ).map((ingredient) => (
                        <button
                          key={ingredient.id}
                          type="button"
                          onClick={() => {
                            const unit = ingredient.customUnitName || ingredient.defaultUnit;
                            const qty = ingredient.customUnitName ? '1' : selectedQuantity;
                            setSelectedUnit(unit);
                            setSelectedQuantity(qty);
                            setPendingIngredientId(ingredient.id);
                          }}
                          disabled={addingMealLoading}
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            pendingIngredientId === ingredient.id
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-muted bg-background hover:border-primary/40 hover:bg-primary/5'
                          }`}
                        >
                          <div className="text-sm font-semibold">
                            {ingredient.name}
                          </div>
                          <div className="mt-1 font-mono text-xs text-muted-foreground">
                            {ingredient.customUnitName
                              ? `${ingredient.customUnitAmount ?? 1} ${ingredient.customUnitName} = ${ingredient.customUnitGrams}g`
                              : `per ${ingredient.defaultUnit}`}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="border-t p-6 shrink-0 flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setItemTypeTabOpen(null);
                  setSelectedDayMeal(null);
                  setIngredientSearchTerm('');
                  setPendingRecipeId(null);
                  setPendingIngredientId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  addingMealLoading ||
                  (itemTypeTabOpen === 'recipe' ? !pendingRecipeId : !pendingIngredientId)
                }
                onClick={() => {
                  if (itemTypeTabOpen === 'recipe' && pendingRecipeId) {
                    handleSelectRecipe(pendingRecipeId);
                  } else if (pendingIngredientId) {
                    handleSelectIngredient(pendingIngredientId);
                  }
                }}
              >
                {addingMealLoading ? 'Adding…' : 'Add to Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MealPlanWeek;

'use client';

import React, { useMemo, useState } from 'react';

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
                <div className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]">
                  {day.dayOfWeek.slice(0, 3)}
                </div>
                <div className="font-mono text-[11px] font-normal text-[var(--fg)]">
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
                className="flex flex-col gap-3 border border-[var(--rule)] p-3"
              >
            <button
              className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)] transition h-8 w-full"
              onClick={() => onDayClick?.(new Date(day.date))}
            >
              View Nutrition
            </button>

            <div className="flex-1 space-y-0">
              {day.meals.length > 0 ? (
                <div>
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
                      className={`w-full border-b border-[var(--rule)] py-2 text-[11px] transition select-none ${
                        editMode
                          ? selectedMealIds.has(meal.id)
                            ? 'border-[var(--error)] bg-[var(--error)]/5 cursor-pointer'
                            : 'cursor-pointer hover:bg-[#fafafa]'
                          : draggedMealId === meal.id
                          ? 'opacity-40 border-dashed'
                          : dragOverMealId === meal.id && draggedMealId !== null
                          ? 'border-[var(--fg)] border-b-2'
                          : 'hover:bg-[#fafafa]'
                      }`}
                    >
                      <div className="flex items-start gap-1">
                        {editMode ? (
                          <input
                            type="checkbox"
                            className="mt-0.5 shrink-0"
                            checked={selectedMealIds.has(meal.id)}
                            onChange={() => onToggleMealSelect?.(meal.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="mt-0.5 text-[var(--muted)] text-[13px] cursor-grab leading-none select-none opacity-40">&#x283F;</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-[var(--fg)] truncate">
                            {meal.recipe?.name || meal.ingredient?.name}
                          </div>
                          <div className="font-mono text-[10px] text-[var(--muted)]">
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
                <div className="text-[11px] text-[var(--muted)] py-4 text-center border border-dashed border-[var(--rule)]">
                  No meals planned yet
                </div>
              )}
            </div>

            <button
              className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)] w-full py-[6px] transition disabled:opacity-40"
              disabled={editMode}
              onClick={() => handleAddMealClick(new Date(day.date))}
            >
              + Add Item
            </button>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {mealTypeDropdownOpen && selectedDate && !itemTypeTabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto">
          <div
            className="w-full max-w-lg border border-[var(--rule)] bg-[var(--bg)] p-6 my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--rule)] pb-3 mb-4">
              <h3 className="font-sans text-[14px] font-medium text-[var(--fg)]">Select meal type</h3>
              <button
                className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)] transition"
                onClick={() => {
                  setMealTypeDropdownOpen(false);
                  setSelectedDate(null);
                }}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {availableMealTypes.map((mealType) => (
                <button
                  key={mealType}
                  type="button"
                  className="border border-[var(--rule)] px-3 py-2 text-[11px] font-mono uppercase tracking-[0.08em] text-[var(--fg)] transition hover:bg-[#fafafa]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            className="w-full max-w-2xl max-h-[90vh] border border-[var(--rule)] bg-[var(--bg)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--rule)] p-6 shrink-0">
              <div className="flex gap-4">
                <button
                  onClick={() => setItemTypeTabOpen('recipe')}
                  className={`pb-1 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors ${
                    itemTypeTabOpen === 'recipe'
                      ? 'border-b-2 border-[var(--fg)] text-[var(--fg)]'
                      : 'text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  Recipes
                </button>
                <button
                  onClick={() => setItemTypeTabOpen('ingredient')}
                  className={`pb-1 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors ${
                    itemTypeTabOpen === 'ingredient'
                      ? 'border-b-2 border-[var(--fg)] text-[var(--fg)]'
                      : 'text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  Ingredients
                </button>
              </div>
              <button
                className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--fg)] transition"
                onClick={() => {
                  setItemTypeTabOpen(null);
                  setSelectedDayMeal(null);
                  setIngredientSearchTerm('');
                }}
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {itemTypeTabOpen === 'recipe' ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 border border-[var(--rule)] px-4 py-3 mb-4">
                    <label className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]" htmlFor="meal-servings">
                      Servings
                    </label>
                    <input
                      id="meal-servings"
                      type="number"
                      min={0.25}
                      step={0.25}
                      className="w-28 border border-[var(--rule)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
                      value={selectedServings}
                        onChange={(e) => setSelectedServings(e.target.value)}
                    />
                    <span className="font-mono text-[10px] text-[var(--muted)]">
                      Adjust serving count to scale nutrition totals
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredRecipes.length === 0 ? (
                      <div className="col-span-full border border-dashed border-[var(--rule)] px-4 py-6 text-center font-mono text-[11px] text-[var(--muted)]">
                        No recipes match this meal type
                      </div>
                    ) : (
                      filteredRecipes.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          className={`border px-3 py-2 text-left transition ${
                            recipe.isComplete === false
                              ? 'cursor-not-allowed border-[var(--error)] opacity-50 text-[var(--muted)]'
                              : pendingRecipeId === recipe.id
                              ? 'border-[var(--fg)] bg-[#fafafa]'
                              : 'border-[var(--rule)] hover:border-[var(--fg)] hover:bg-[#fafafa]'
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
                            <div className="text-[12px] font-medium text-[var(--fg)]">
                              {recipe.name}
                            </div>
                            {!recipe.isComplete && (
                              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--error)]">
                                Incomplete
                              </span>
                            )}
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                            {recipe.servingSize} {recipe.servingUnit}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 border border-[var(--rule)] px-4 py-3 mb-4">
                    <div className="flex-1 flex items-center gap-2 min-w-max">
                      <label className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]" htmlFor="ingredient-search">
                        Search
                      </label>
                      <input
                        id="ingredient-search"
                        type="text"
                        placeholder="Find ingredient..."
                        className="flex-1 border border-[var(--rule)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
                        value={ingredientSearchTerm}
                        onChange={(e) => setIngredientSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]" htmlFor="ingredient-quantity">
                        Quantity
                      </label>
                      <input
                        id="ingredient-quantity"
                        type="number"
                        min={0.01}
                        step={0.1}
                        className="w-20 border border-[var(--rule)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[9px] font-light uppercase tracking-[0.12em] text-[var(--muted)]" htmlFor="ingredient-unit">
                        Unit
                      </label>
                      <input
                        id="ingredient-unit"
                        type="text"
                        className="w-20 border border-[var(--rule)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
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
                      <div className="col-span-full border border-dashed border-[var(--rule)] px-4 py-6 text-center font-mono text-[11px] text-[var(--muted)]">
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
                          className={`border px-3 py-2 text-left transition ${
                            pendingIngredientId === ingredient.id
                              ? 'border-[var(--fg)] bg-[#fafafa]'
                              : 'border-[var(--rule)] hover:border-[var(--fg)] hover:bg-[#fafafa]'
                          }`}
                        >
                          <div className="text-[12px] font-medium text-[var(--fg)]">
                            {ingredient.name}
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-[var(--muted)]">
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

            <div className="border-t border-[var(--rule)] p-6 shrink-0 flex gap-3 justify-end">
              <button
                className="text-[9px] font-mono uppercase tracking-[0.12em] border border-[var(--rule)] px-5 py-[7px] text-[var(--muted)] hover:text-[var(--fg)] transition"
                onClick={() => {
                  setItemTypeTabOpen(null);
                  setSelectedDayMeal(null);
                  setIngredientSearchTerm('');
                  setPendingRecipeId(null);
                  setPendingIngredientId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-[var(--fg)] text-[var(--bg)] px-5 py-[7px] text-[9px] font-mono uppercase tracking-[0.12em] hover:opacity-80 transition disabled:opacity-40"
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
                {addingMealLoading ? 'Adding...' : 'Add to Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MealPlanWeek;

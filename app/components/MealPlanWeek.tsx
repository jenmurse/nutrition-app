'use client';

import React, { useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { dialog } from '@/lib/dialog';

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
  onAddRecipeMeal: (date: Date, mealType: string, recipeId: number, servings: number, alsoAddToPlanIds?: number[]) => Promise<void>;
  onAddIngredientMeal: (date: Date, mealType: string, ingredientId: number, quantity: number, unit: string, alsoAddToPlanIds?: number[]) => Promise<void>;
  onRemoveMeal: (mealId: number) => Promise<void>;
  onReorderMeals?: (dayDate: Date, orderedIds: number[]) => Promise<void>;
  onError?: (message: string) => void;
  isLoading?: boolean;
  selectedDay?: Date | null;
  onDayClick?: (date: Date) => void;
  editMode?: boolean;
  selectedMealIds?: Set<number>;
  onToggleMealSelect?: (id: number) => void;
  otherPersonPlans?: { personId: number; planId: number; name: string }[];
  recipeCaloriesMap?: Record<number, number>;
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
  otherPersonPlans = [],
  recipeCaloriesMap = {},
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
  const [alsoAddToPlanIds, setAlsoAddToPlanIds] = useState<Set<number>>(new Set());

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
      toast.error('This recipe is incomplete. Please finish adding ingredients before using it in a meal plan.');
      return;
    }

    setAddingMealLoading(true);
    try {
      const parsedServings = parseFloat(selectedServings);
      if (!Number.isFinite(parsedServings) || parsedServings <= 0) {
        toast.error('Please enter a valid number of servings');
        setAddingMealLoading(false);
        return;
      }
      await onAddRecipeMeal(
        selectedDayMeal.date,
        selectedDayMeal.mealType,
        recipeId,
        parsedServings,
        alsoAddToPlanIds.size > 0 ? Array.from(alsoAddToPlanIds) : undefined
      );
      setPendingRecipeId(null);
      setSelectedServings('1');
      setAlsoAddToPlanIds(new Set());
      setSelectedDayMeal(null);
      setItemTypeTabOpen(null);
      setRecipeDropdownOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add meal';
      console.error('Error adding meal:', error);
      if (onError) {
        onError(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setAddingMealLoading(false);
    }
  };

  const handleSelectIngredient = async (ingredientId: number) => {
    if (!selectedDayMeal) return;

    const normalizedQuantity = parseFloat(selectedQuantity);
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setAddingMealLoading(true);
    try {
      await onAddIngredientMeal(
        selectedDayMeal.date,
        selectedDayMeal.mealType,
        ingredientId,
        normalizedQuantity,
        selectedUnit,
        alsoAddToPlanIds.size > 0 ? Array.from(alsoAddToPlanIds) : undefined
      );
      setPendingIngredientId(null);
      setAlsoAddToPlanIds(new Set());
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
        toast.error(errorMessage);
      }
    } finally {
      setAddingMealLoading(false);
    }
  };

  const handleRemoveMeal = async (mealId: number) => {
    if (!await dialog.confirm('Remove this meal from the plan?', { confirmLabel: 'Remove', danger: true })) return;

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

  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [recipeFilterTags, setRecipeFilterTags] = useState<string[]>([]);
  const availableRecipeTags = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'beverage'];

  const filteredRecipes = useMemo(() => {
    let result = recipes;
    // Auto-filter by meal type — only show recipes tagged for this meal type
    if (selectedDayMeal) {
      const target = selectedDayMeal.mealType.toLowerCase();
      result = result.filter((recipe) => {
        if (!recipe.tags) return false;
        const tags = recipe.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
        return tags.length === 0 ? false : tags.includes(target);
      });
    }
    // Search filter
    if (recipeSearchTerm) {
      const term = recipeSearchTerm.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(term));
    }
    // Tag filter
    if (recipeFilterTags.length > 0) {
      result = result.filter((r) => {
        if (!r.tags) return false;
        const tags = r.tags.split(',').map((t) => t.trim().toLowerCase());
        return recipeFilterTags.some((ft) => tags.includes(ft));
      });
    }
    return result;
  }, [recipes, selectedDayMeal, recipeSearchTerm, recipeFilterTags]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
  };

  const getCalories = (nutrients: Nutrient[]) => {
    const cal = nutrients.find((n) => n.displayName === 'Calories');
    return cal ? Math.round(cal.value) : null;
  };

  return (
    <>
      <div className="overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, minmax(0, 1fr))', minWidth: 660 }}>
          {/* Column headers */}
          <div className="p-3" />
          {days.map((day, dayIdx) => {
            const todayFlag = isToday(new Date(day.date));
            const isSelected = selectedDay && new Date(selectedDay).toDateString() === new Date(day.date).toDateString();
            const dayNum = new Date(day.date).getDate();
            const isLastCol = dayIdx === days.length - 1;
            return (
              <div
                key={`header-${day.date.toISOString()}`}
                className={`p-3 text-center cursor-pointer transition-colors ${
                  isSelected ? 'bg-[var(--accent-light)]' : todayFlag ? 'bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]' : ''
                }`}
                onClick={() => onDayClick?.(new Date(day.date))}
                role="button"
                aria-label={day.dayOfWeek}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">{day.dayOfWeek.slice(0, 3)}</div>
                <div className={`font-serif text-[18px] leading-none ${todayFlag || isSelected ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>{dayNum}</div>
              </div>
            );
          })}

          {/* Header divider */}
          <div className="col-span-full h-px bg-[var(--rule-faint)]" />

          {/* Meal type rows */}
          {availableMealTypes.map((mealType) => (
            <React.Fragment key={mealType}>
              {/* Row label */}
              <div className="flex items-start px-[12px] pt-[10px] pb-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">{mealType}</span>
              </div>
              {/* Day cells for this meal type */}
              {days.map((day, dayIdx) => {
                const todayFlag = isToday(new Date(day.date));
                const isSelected = selectedDay && new Date(selectedDay).toDateString() === new Date(day.date).toDateString();
                const mealsOfType = day.meals.filter((m) => m.mealType === mealType);
                const isLastCol = dayIdx === days.length - 1;
                return (
                  <div
                    key={`${mealType}-${day.date.toISOString()}`}
                    className={`p-[6px_4px] flex flex-col gap-[3px] min-h-[36px] ${
                      isSelected ? 'bg-[var(--accent-light)]' : todayFlag ? 'bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]' : ''
                    }`}
                    onClick={() => onDayClick?.(new Date(day.date))}
                  >
                    {mealsOfType.map((meal) => (
                      <div
                        key={meal.id}
                        className={`bg-[var(--bg-raised)] rounded-[6px] p-[4px_6px] transition-colors ${
                          editMode && selectedMealIds.has(meal.id) ? 'bg-[var(--error-light)]' : ''
                        }`}
                        style={{ boxShadow: 'var(--shadow-sm)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editMode) onToggleMealSelect?.(meal.id);
                        }}
                      >
                        {editMode && (
                          <input
                            type="checkbox"
                            checked={selectedMealIds.has(meal.id)}
                            onChange={() => onToggleMealSelect?.(meal.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 w-[12px] h-[12px] mb-[2px]"
                            aria-label={`Select ${meal.recipe?.name || meal.ingredient?.name}`}
                          />
                        )}
                        <div className="text-[10px] text-[var(--fg)] font-medium leading-[1.3] truncate">{meal.recipe?.name || meal.ingredient?.name}</div>
                        {meal.recipe && recipeCaloriesMap[meal.recipe.id] != null && (
                          <div className="font-mono text-[9px] text-[var(--muted)] mt-[1px]">
                            {Math.round(recipeCaloriesMap[meal.recipe.id] * (meal.servings ?? 1))} kcal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* + ADD row at bottom */}
          {!editMode && (
            <>
              <div className="col-span-full h-px bg-[var(--rule-faint)] mt-1" />
              <div />
              {days.map((day, dayIdx) => {
                const todayFlag = isToday(new Date(day.date));
                const isSelected = selectedDay && new Date(selectedDay).toDateString() === new Date(day.date).toDateString();
                const isLastCol = dayIdx === days.length - 1;
                return (
                  <div
                    key={`add-${day.date.toISOString()}`}
                    className="flex items-center justify-center p-[6px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddMealClick(new Date(day.date));
                    }}
                    role="button"
                    aria-label={`Add meal on ${day.dayOfWeek}`}
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] bg-[var(--bg-raised)] border border-[var(--rule)] px-[8px] py-[3px] rounded-[6px] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] hover:border-[var(--rule-strong)] transition-colors">+ Add</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {mealTypeDropdownOpen && selectedDate && !itemTypeTabOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto">
          <div
            className="w-full max-w-lg bg-[var(--bg-raised)] rounded-[var(--radius-lg,12px)] shadow-[var(--shadow-lg)] p-6 my-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--rule-faint)] pb-3 mb-4">
              <h3 className="font-sans text-[14px] font-medium text-[var(--fg)]">Select meal type</h3>
              <button
                className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition"
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
                  className="border border-[var(--rule-faint)] rounded-[6px] px-3 py-2 text-[11px] font-mono uppercase tracking-[0.1em] text-[var(--fg)] transition-colors duration-150 ease-out hover:bg-[var(--bg-subtle)]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            className="w-full max-w-2xl max-h-[90vh] bg-[var(--bg-raised)] rounded-[var(--radius-lg,12px)] shadow-[var(--shadow-lg)] flex flex-col animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--rule-faint)] p-6 shrink-0">
              <div className="flex gap-4">
                <button
                  onClick={() => setItemTypeTabOpen('recipe')}
                  className={`pb-1 text-[11px] font-mono uppercase tracking-[0.1em] transition-colors ${
                    itemTypeTabOpen === 'recipe'
                      ? 'border-b-2 border-[var(--accent)] text-[var(--fg)]'
                      : 'text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  Recipes
                </button>
                <button
                  onClick={() => setItemTypeTabOpen('ingredient')}
                  className={`pb-1 text-[11px] font-mono uppercase tracking-[0.1em] transition-colors ${
                    itemTypeTabOpen === 'ingredient'
                      ? 'border-b-2 border-[var(--accent)] text-[var(--fg)]'
                      : 'text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  Ingredients
                </button>
              </div>
              <button
                className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--fg)] transition"
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
                  {/* Search + servings controls */}
                  <div className="flex flex-wrap items-center gap-3 border border-[var(--rule-faint)] rounded-[8px] px-4 py-3 mb-3">
                    <div className="flex-1 flex items-center gap-2 min-w-[180px]">
                      <label className="font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)]" htmlFor="recipe-search">
                        Search
                      </label>
                      <input
                        id="recipe-search"
                        type="text"
                        placeholder="Find recipe..."
                        className="flex-1 border border-[var(--rule-faint)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
                        value={recipeSearchTerm}
                        onChange={(e) => setRecipeSearchTerm(e.target.value)}
                        aria-label="Search recipes"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)]" htmlFor="meal-servings">
                        Servings
                      </label>
                      <input
                        id="meal-servings"
                        type="number"
                        min={0.25}
                        step={0.25}
                        className="w-20 border border-[var(--rule-faint)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
                        value={selectedServings}
                        onChange={(e) => setSelectedServings(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Tag filter pills */}
                  <div className="flex flex-wrap gap-[6px] mb-4">
                    {availableRecipeTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`text-[9px] font-mono uppercase tracking-[0.1em] px-[8px] py-[3px] border transition-colors ${
                          recipeFilterTags.includes(tag)
                            ? 'border-[var(--fg)] text-[var(--fg)] bg-[var(--bg-selected)]'
                            : 'border-[var(--rule-faint)] text-[var(--muted)] hover:border-[var(--rule-strong)]'
                        }`}
                        onClick={() =>
                          setRecipeFilterTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                      >
                        {tag}
                      </button>
                    ))}
                    {recipeFilterTags.length > 0 && (
                      <button
                        type="button"
                        className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                        onClick={() => setRecipeFilterTags([])}
                      >
                        clear
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredRecipes.length === 0 ? (
                      <div className="col-span-full border border-dashed border-[var(--rule-faint)] px-4 py-6 text-center font-mono text-[11px] text-[var(--muted)]">
                        No recipes match this meal type
                      </div>
                    ) : (
                      filteredRecipes.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          className={`border rounded-[6px] px-3 py-2 text-left transition ${
                            recipe.isComplete === false
                              ? 'cursor-not-allowed border-[var(--error)] opacity-50 text-[var(--muted)]'
                              : pendingRecipeId === recipe.id
                              ? 'border-[var(--fg)] bg-[var(--bg-subtle)]'
                              : 'border-[var(--rule-faint)] hover:border-[var(--fg)] hover:bg-[var(--bg-subtle)]'
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
                              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--error)]">
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
                  <div className="flex flex-wrap gap-3 border border-[var(--rule-faint)] rounded-[8px] px-4 py-3 mb-4">
                    <div className="flex-1 flex items-center gap-2 min-w-max">
                      <label className="font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)]" htmlFor="ingredient-search">
                        Search
                      </label>
                      <input
                        id="ingredient-search"
                        type="text"
                        placeholder="Find ingredient..."
                        className="flex-1 border border-[var(--rule-faint)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
                        value={ingredientSearchTerm}
                        onChange={(e) => setIngredientSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)]" htmlFor="ingredient-quantity">
                        Quantity
                      </label>
                      <input
                        id="ingredient-quantity"
                        type="number"
                        min={0.01}
                        step={0.1}
                        className="w-20 border border-[var(--rule-faint)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-mono text-[9px] font-light uppercase tracking-[0.1em] text-[var(--muted)]" htmlFor="ingredient-unit">
                        Unit
                      </label>
                      <input
                        id="ingredient-unit"
                        type="text"
                        className="w-20 border border-[var(--rule-faint)] bg-[var(--bg)] px-2 py-1 font-mono text-[12px]"
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
                      <div className="col-span-full border border-dashed border-[var(--rule-faint)] px-4 py-6 text-center font-mono text-[11px] text-[var(--muted)]">
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
                              ? 'border-[var(--fg)] bg-[var(--bg-subtle)]'
                              : 'border-[var(--rule-faint)] hover:border-[var(--fg)] hover:bg-[var(--bg-subtle)]'
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

            <div className="border-t border-[var(--rule-faint)] p-6 shrink-0">
              {/* Also add to other people */}
              {otherPersonPlans.length > 0 && (
                <div className="mb-4">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)] mb-2">Also add to</div>
                  <div className="flex flex-col gap-1">
                    {otherPersonPlans.map((op) => (
                      <label key={op.planId} className="flex items-center gap-2 cursor-pointer w-fit">
                        <input
                          type="checkbox"
                          checked={alsoAddToPlanIds.has(op.planId)}
                          onChange={(e) => {
                            const next = new Set(alsoAddToPlanIds);
                            if (e.target.checked) next.add(op.planId);
                            else next.delete(op.planId);
                            setAlsoAddToPlanIds(next);
                          }}
                          className="w-[14px] h-[14px]"
                          aria-label={`Also add to ${op.name}'s plan`}
                        />
                        <span className="font-mono text-[10px] text-[var(--muted)]">
                          {op.name}&apos;s plan
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  className="text-[9px] font-mono uppercase tracking-[0.1em] border border-[var(--rule-faint)] px-5 py-[7px] text-[var(--muted)] hover:text-[var(--fg)] transition"
                  onClick={() => {
                    setItemTypeTabOpen(null);
                    setSelectedDayMeal(null);
                    setIngredientSearchTerm('');
                    setRecipeSearchTerm('');
                    setRecipeFilterTags([]);
                    setPendingRecipeId(null);
                    setPendingIngredientId(null);
                    setAlsoAddToPlanIds(new Set());
                  }}
                >
                  Cancel
                </button>
                <button
                  className="bg-[var(--accent)] text-[var(--accent-text)] rounded-[6px] px-5 py-[7px] text-[9px] font-mono uppercase tracking-[0.1em] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
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
        </div>
      )}
    </>
  );
};

export default MealPlanWeek;

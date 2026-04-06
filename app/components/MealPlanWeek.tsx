'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { dialog } from '@/lib/dialog';
import { clientCache } from '@/lib/clientCache';

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
  lowGoal?: number;
  highGoal?: number;
  status?: 'ok' | 'warning' | 'error';
}

interface Meal {
  id: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'side' | 'snack' | 'dessert' | 'beverage';
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
  mealLogCaloriesMap?: Record<number, number>;
  onRefreshIngredients?: () => void;
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
  mealLogCaloriesMap = {},
  onRefreshIngredients,
}) => {
  const router = useRouter();
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
  const [newFoodName, setNewFoodName] = useState('');
  const [creatingFood, setCreatingFood] = useState(false);
  const [draggedMealId, setDraggedMealId] = useState<number | null>(null);
  const [dragOverMealId, setDragOverMealId] = useState<number | null>(null);
  const [alsoAddToPlanIds, setAlsoAddToPlanIds] = useState<Set<number>>(new Set());

  // Mobile: single-day view state
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileDayIdx, setActiveMobileDayIdx] = useState(0);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Default active day to today when days load
  useEffect(() => {
    if (!days.length) return;
    const todayIdx = days.findIndex(d => isToday(new Date(d.date)));
    setActiveMobileDayIdx(todayIdx >= 0 ? todayIdx : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length > 0 ? days[0].date.toString() : '']);

  const availableMealTypes = ['breakfast', 'lunch', 'dinner', 'side', 'snack', 'dessert', 'beverage'];

  const handleCreateQuickFood = async () => {
    if (!newFoodName.trim()) return;
    setCreatingFood(true);
    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFoodName.trim(), isMealItem: true, defaultUnit: 'g' }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to create food');
        return;
      }
      toast.success(`${newFoodName.trim()} added`);
      setNewFoodName('');
      clientCache.delete('/api/ingredients?slim=true');
      onRefreshIngredients?.();
    } catch {
      toast.error('Failed to create food');
    } finally {
      setCreatingFood(false);
    }
  };

  const handleAddMealClick = (date: Date) => {
    setSelectedDate(date);
    setMealTypeDropdownOpen(true);
  };

  const handleSelectMealType = (mealType: string) => {
    if (!selectedDate) return;
    setSelectedDayMeal({ date: selectedDate, mealType });
    setMealTypeDropdownOpen(false);
    setItemTypeTabOpen('recipe');
    // Pre-select the meal type tag so the list is filtered but the user can toggle it
    setRecipeFilterTags([mealType.toLowerCase()]);
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
      setRecipeSearchTerm('');
      setRecipeFilterTags([]);
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
  const availableRecipeTags = ['breakfast', 'lunch', 'dinner', 'side', 'snack', 'dessert', 'beverage'];

  const filteredRecipes = useMemo(() => {
    let result = recipes;
    // Search filter
    if (recipeSearchTerm) {
      const term = recipeSearchTerm.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(term));
    }
    // Tag filter — initially set to the meal type when the modal opens,
    // but the user can toggle tags freely (deselect to see all, or pick a different category)
    if (recipeFilterTags.length > 0) {
      result = result.filter((r) => {
        if (!r.tags) return false;
        const tags = r.tags.split(',').map((t) => t.trim().toLowerCase());
        return recipeFilterTags.some((ft) => tags.includes(ft));
      });
    }
    return result;
  }, [recipes, recipeSearchTerm, recipeFilterTags]);

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
      {isMobile ? (
        /* ── Mobile: single-day view ── */
        <>
          {/* Day strip — tap any day to jump, swipe the content area to advance */}
          <div className="pl-day-strip" role="tablist" aria-label="Week days">
            {days.map((day, idx) => {
              const todayFlag = isToday(new Date(day.date));
              return (
                <button
                  key={idx}
                  role="tab"
                  className={`pl-day-strip-btn${todayFlag ? ' today' : ''}${idx === activeMobileDayIdx ? ' active' : ''}`}
                  onClick={() => {
                    setActiveMobileDayIdx(idx);
                    onDayClick?.(new Date(day.date));
                  }}
                  aria-selected={idx === activeMobileDayIdx}
                  aria-label={`${day.dayOfWeek} ${new Date(day.date).getDate()}`}
                >
                  <span className="pl-day-strip-name">{day.dayOfWeek.slice(0, 2)}</span>
                  <span className="pl-day-strip-num">{new Date(day.date).getDate()}</span>
                </button>
              );
            })}
          </div>

          {/* Single active day */}
          {days[activeMobileDayIdx] && (() => {
            const day = days[activeMobileDayIdx];
            const todayFlag = isToday(new Date(day.date));
            const dayNum = new Date(day.date).getDate();
            const dayKcal = getCalories(day.dayNutrients);
            const calorieNutrient = day.dayNutrients.find(n => n.displayName === 'Calories' || n.displayName === 'Energy');
            const calorieGoal = calorieNutrient?.highGoal ?? calorieNutrient?.lowGoal;
            const kcalPct = calorieGoal && dayKcal ? Math.min(Math.round((dayKcal / calorieGoal) * 100), 100) : 0;
            const mealsByType = availableMealTypes
              .map(type => ({
                type,
                label: type.charAt(0).toUpperCase() + type.slice(1),
                meals: day.meals.filter(m => m.mealType === type),
              }))
              .filter(g => g.meals.length > 0);

            return (
              <div
                role="tabpanel"
                className={`pl-mobile-day${todayFlag ? ' today' : ''}`}
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                  const delta = e.changedTouches[0].clientX - touchStartX.current;
                  if (Math.abs(delta) > 50) {
                    if (delta < 0 && activeMobileDayIdx < days.length - 1) {
                      setActiveMobileDayIdx(i => i + 1);
                    } else if (delta > 0 && activeMobileDayIdx > 0) {
                      setActiveMobileDayIdx(i => i - 1);
                    }
                  }
                }}
              >
                {/* Day header */}
                <div className="wk-day-header">
                  <div className="wk-day-name">{day.dayOfWeek}</div>
                  <div className="wk-day-num">{dayNum}</div>
                  <div className="wk-day-kcal">{dayKcal ? `${dayKcal} kcal` : '\u2014'}</div>
                  <div className="wk-day-bar">
                    <div className="wk-day-bar-fill" style={{ width: `${kcalPct}%` }} />
                  </div>
                </div>

                {/* Meal sections */}
                {mealsByType.map(group => (
                  <div key={group.type} className="wk-meal-section">
                    <div className="wk-meal-label">{group.label}</div>
                    {group.meals.map(meal => {
                      const mealName = meal.recipe?.name || meal.ingredient?.name || '?';
                      let kcal: number | null = null;
                      if (meal.recipe && recipeCaloriesMap[meal.recipe.id] != null) {
                        kcal = Math.round(recipeCaloriesMap[meal.recipe.id] * (meal.servings ?? 1));
                      } else if (meal.ingredient && mealLogCaloriesMap[meal.id] != null) {
                        kcal = mealLogCaloriesMap[meal.id];
                      }
                      return (
                        <div
                          key={meal.id}
                          className={`meal-chip${meal.recipe?.id ? ' meal-chip-recipe' : ''}${editMode && selectedMealIds.has(meal.id) ? ' bg-[var(--err-l)]' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editMode) {
                              onToggleMealSelect?.(meal.id);
                            } else if (meal.recipe?.id) {
                              router.push(`/recipes/${meal.recipe.id}`);
                            }
                          }}
                          role={editMode ? 'checkbox' : meal.recipe?.id ? 'link' : undefined}
                          aria-checked={editMode ? selectedMealIds.has(meal.id) : undefined}
                          aria-label={mealName}
                        >
                          {editMode && (
                            <input
                              type="checkbox"
                              checked={selectedMealIds.has(meal.id)}
                              onChange={() => onToggleMealSelect?.(meal.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: 12, height: 12, marginBottom: 2 }}
                              aria-label={`Select ${mealName}`}
                            />
                          )}
                          <span className="meal-chip-name">{mealName}</span>
                          {kcal != null && <span className="meal-chip-kcal">{kcal} kcal</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {mealsByType.length === 0 && (
                  <p className="pl-mobile-empty">No meals planned for this day.</p>
                )}

                {!editMode && (
                  <button
                    className="wk-add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddMealClick(new Date(day.date));
                    }}
                    aria-label={`Add meal on ${day.dayOfWeek}`}
                  >+ Add</button>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        /* ── Desktop: 7-column grid ── */
        <div className="wk-grid">
          {days.map((day, dayIdx) => {
            const todayFlag = isToday(new Date(day.date));
            const dayNum = new Date(day.date).getDate();
            const dayKcal = getCalories(day.dayNutrients);
            const calorieNutrient = day.dayNutrients.find(n => n.displayName === 'Calories' || n.displayName === 'Energy');
            const calorieGoal = calorieNutrient?.highGoal ?? calorieNutrient?.lowGoal;
            const kcalPct = calorieGoal && dayKcal ? Math.min(Math.round((dayKcal / calorieGoal) * 100), 100) : 0;

            // Group meals by type for this day
            const mealsByType = availableMealTypes
              .map(type => ({
                type,
                label: type.charAt(0).toUpperCase() + type.slice(1),
                meals: day.meals.filter(m => m.mealType === type),
              }))
              .filter(g => g.meals.length > 0);

            return (
              <div
                key={day.date.toISOString()}
                className={`wk-day-col ${todayFlag ? 'today' : ''}`}
                style={{ '--col-i': dayIdx } as React.CSSProperties}
                onClick={() => onDayClick?.(new Date(day.date))}
                role="button"
                tabIndex={0}
                aria-label={`${day.dayOfWeek} ${dayNum}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDayClick?.(new Date(day.date)); }}
              >
                {/* Day header */}
                <div className="wk-day-header">
                  <div className="wk-day-name">{day.dayOfWeek.slice(0, 3)}</div>
                  <div className="wk-day-num">{dayNum}</div>
                  <div className="wk-day-kcal">{dayKcal ? `${dayKcal} kcal` : '\u2014'}</div>
                  <div className="wk-day-bar">
                    <div className="wk-day-bar-fill" style={{ width: `${kcalPct}%` }} />
                  </div>
                </div>

                {/* Meal sections grouped by type */}
                {mealsByType.map(group => (
                  <div key={group.type} className="wk-meal-section">
                    <div className="wk-meal-label">{group.label}</div>
                    {group.meals.map(meal => {
                      const mealName = meal.recipe?.name || meal.ingredient?.name || '?';
                      let kcal: number | null = null;
                      if (meal.recipe && recipeCaloriesMap[meal.recipe.id] != null) {
                        kcal = Math.round(recipeCaloriesMap[meal.recipe.id] * (meal.servings ?? 1));
                      } else if (meal.ingredient && mealLogCaloriesMap[meal.id] != null) {
                        kcal = mealLogCaloriesMap[meal.id];
                      }
                      return (
                        <div
                          key={meal.id}
                          className={`meal-chip ${meal.recipe?.id ? 'meal-chip-recipe' : ''} ${editMode && selectedMealIds.has(meal.id) ? 'bg-[var(--err-l)]' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editMode) {
                              onToggleMealSelect?.(meal.id);
                            } else if (meal.recipe?.id) {
                              router.push(`/recipes/${meal.recipe.id}`);
                            }
                          }}
                          role={editMode ? 'checkbox' : meal.recipe?.id ? 'link' : undefined}
                          aria-checked={editMode ? selectedMealIds.has(meal.id) : undefined}
                          aria-label={mealName}
                          draggable={!editMode}
                          onDragStart={() => setDraggedMealId(meal.id)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverMealId(meal.id); }}
                          onDrop={() => handleDrop(day, meal.id)}
                          onDragEnd={() => { setDraggedMealId(null); setDragOverMealId(null); }}
                        >
                          {editMode && (
                            <input
                              type="checkbox"
                              checked={selectedMealIds.has(meal.id)}
                              onChange={() => onToggleMealSelect?.(meal.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: 12, height: 12, marginBottom: 2 }}
                              aria-label={`Select ${mealName}`}
                            />
                          )}
                          <span className="meal-chip-name">{mealName}</span>
                          {kcal != null && <span className="meal-chip-kcal">{kcal} kcal</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* + Add button per day */}
                {!editMode && (
                  <button
                    className="wk-add-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddMealClick(new Date(day.date));
                    }}
                    aria-label={`Add meal on ${day.dayOfWeek}`}
                  >+ Add</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mealTypeDropdownOpen && selectedDate && !itemTypeTabOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto"
          onClick={() => { setMealTypeDropdownOpen(false); setSelectedDate(null); }}
        >
          <div
            className="w-full max-w-lg bg-[var(--bg)] border border-[var(--rule)] p-6 my-4 animate-fade-in"
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

            <div className="grid grid-cols-2 gap-0">
              {availableMealTypes.map((mealType) => (
                <button
                  key={mealType}
                  type="button"
                  className="meal-chip text-left"
                  onClick={() => handleSelectMealType(mealType)}
                  aria-label={mealType}
                >
                  <span className="meal-chip-name">{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {itemTypeTabOpen && selectedDayMeal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:px-4"
          onClick={() => { setItemTypeTabOpen(null); setSelectedDayMeal(null); setIngredientSearchTerm(''); }}
        >
          <div
            className="w-full max-w-2xl max-h-[95dvh] sm:max-h-[90vh] bg-[var(--bg)] border-t sm:border border-[var(--rule)] flex flex-col animate-fade-in rounded-t-[12px] sm:rounded-t-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--rule-faint)] p-6 shrink-0">
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => setItemTypeTabOpen('recipe')}
                  className={`text-[11px] font-mono uppercase tracking-[0.1em] transition-colors pb-[3px] ${
                    itemTypeTabOpen === 'recipe'
                      ? 'text-[var(--fg)] shadow-[0_2px_0_var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  Recipes
                </button>
                <button
                  onClick={() => setItemTypeTabOpen('ingredient')}
                  className={`text-[11px] font-mono uppercase tracking-[0.1em] transition-colors pb-[3px] ${
                    itemTypeTabOpen === 'ingredient'
                      ? 'text-[var(--fg)] shadow-[0_2px_0_var(--accent)]'
                      : 'text-[var(--muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  Items
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
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="flex-1 flex items-center gap-2 min-w-[180px]">
                      <label className="pl-create-label" htmlFor="recipe-search">Search</label>
                      <input
                        id="recipe-search"
                        type="text"
                        placeholder="Find recipe..."
                        className="pl-create-date"
                        style={{ flex: 1 }}
                        value={recipeSearchTerm}
                        onChange={(e) => setRecipeSearchTerm(e.target.value)}
                        aria-label="Search recipes"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="pl-create-label" htmlFor="meal-servings">Servings</label>
                      <input
                        id="meal-servings"
                        type="number"
                        min={0.25}
                        step={0.25}
                        className="pl-create-date"
                        style={{ width: 60 }}
                        value={selectedServings}
                        onChange={(e) => setSelectedServings(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Tag filter chips */}
                  <div className="flex flex-wrap gap-[4px] mb-4">
                    {availableRecipeTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`pl-person-chip ${recipeFilterTags.includes(tag) ? 'on' : ''}`}
                        onClick={() =>
                          setRecipeFilterTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        aria-pressed={recipeFilterTags.includes(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                    {recipeFilterTags.length > 0 && (
                      <button
                        type="button"
                        className="pl-cancel-btn"
                        onClick={() => setRecipeFilterTags([])}
                      >
                        clear
                      </button>
                    )}
                  </div>

                  <div className="grid gap-0 md:grid-cols-2">
                    {filteredRecipes.length === 0 ? (
                      <div className="col-span-full py-6 text-center font-mono text-[11px] text-[var(--muted)]">
                        No recipes match this meal type
                      </div>
                    ) : (
                      filteredRecipes.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          className={`meal-chip text-left ${
                            recipe.isComplete === false
                              ? 'cursor-not-allowed opacity-50'
                              : pendingRecipeId === recipe.id
                              ? 'bg-[var(--bg-2)]'
                              : ''
                          }`}
                          onClick={
                            addingMealLoading || !recipe.isComplete
                              ? undefined
                              : () => setPendingRecipeId(recipe.id)
                          }
                          title={!recipe.isComplete ? 'Complete this recipe before adding to meal plan' : ''}
                          disabled={addingMealLoading}
                          aria-label={recipe.name}
                        >
                          <span className="meal-chip-name">{recipe.name}</span>
                          <span className="meal-chip-kcal">
                            {recipe.servingSize} {recipe.servingUnit}
                            {!recipe.isComplete && ' · Incomplete'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="flex-1 flex items-center gap-2 min-w-max">
                      <label className="pl-create-label" htmlFor="ingredient-search">Search</label>
                      <input
                        id="ingredient-search"
                        type="text"
                        placeholder="Find item..."
                        className="pl-create-date"
                        style={{ flex: 1 }}
                        value={ingredientSearchTerm}
                        onChange={(e) => setIngredientSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="pl-create-label" htmlFor="ingredient-quantity">Quantity</label>
                      <input
                        id="ingredient-quantity"
                        type="number"
                        min={0.01}
                        step={0.1}
                        className="pl-create-date"
                        style={{ width: 60 }}
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="pl-create-label" htmlFor="ingredient-unit">Unit</label>
                      <input
                        id="ingredient-unit"
                        type="text"
                        className="pl-create-date"
                        style={{ width: 60 }}
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        placeholder="g, ml, etc."
                      />
                    </div>
                  </div>

                  <div className="grid gap-0 md:grid-cols-2">
                    {ingredients.filter(ing =>
                      ing.isMealItem && ing.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())
                    ).length === 0 ? (
                      <div className="col-span-full py-6 text-center font-mono text-[11px] text-[var(--muted)]">
                        {ingredients.filter(ing => ing.isMealItem).length === 0 ? 'No items available' : 'No items match your search'}
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
                          className={`meal-chip text-left ${
                            pendingIngredientId === ingredient.id ? 'bg-[var(--bg-2)]' : ''
                          }`}
                          aria-label={ingredient.name}
                        >
                          <span className="meal-chip-name">{ingredient.name}</span>
                          <span className="meal-chip-kcal">
                            {ingredient.customUnitName
                              ? `${ingredient.customUnitAmount ?? 1} ${ingredient.customUnitName} = ${ingredient.customUnitGrams}g`
                              : `per ${ingredient.defaultUnit}`}
                          </span>
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
                  <div className="pl-create-label" style={{ marginBottom: 8 }}>Also add to</div>
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
                  className="pl-cancel-btn"
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
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  className="pl-create-btn"
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
                  aria-label="Add to plan"
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

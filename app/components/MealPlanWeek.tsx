'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { dialog } from '@/lib/dialog';
import { clientCache } from '@/lib/clientCache';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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
  personName?: string;
  onNavigatePrevWeek?: () => void;
  onNavigateNextWeek?: () => void;
  onOpenNutrition?: (date: Date) => void;
}

/* ── Drag-and-drop sub-components (desktop only) ── */

function DroppableDayCol({
  dateISO,
  todayFlag,
  dayIdx,
  selectedFlag,
  onClick,
  onKeyDown,
  'aria-label': ariaLabel,
  children,
}: {
  dateISO: string;
  todayFlag: boolean;
  dayIdx: number;
  selectedFlag?: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  'aria-label': string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dateISO });
  return (
    <div
      ref={setNodeRef}
      className={`wk-day-col${todayFlag ? ' today' : ''}${isOver ? ' wk-day-col--drop-target' : ''}${selectedFlag ? ' wk-day-col--selected' : ''}`}
      style={{ '--col-i': dayIdx } as React.CSSProperties}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      tabIndex={0}
      role="button"
    >
      {children}
    </div>
  );
}

function DraggableMealChip({
  meal,
  fromDateISO,
  mealName,
  kcal,
  editMode,
  isSelected,
  onToggleSelect,
  onClickRecipe,
}: {
  meal: Meal;
  fromDateISO: string;
  mealName: string;
  kcal: number | null;
  editMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClickRecipe: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meal.id,
    data: { meal, fromDate: fromDateISO },
  });

  const style: React.CSSProperties = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    opacity: isDragging ? 0.35 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        // Suppress iOS Safari long-press context menu (copy/share callout) on draggable chips
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: editMode ? undefined : 'none',
      }}
      className={`meal-chip${meal.recipe?.id ? ' meal-chip-recipe' : ''}${editMode && isSelected ? ' bg-[var(--bg-2)]' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (editMode) {
          onToggleSelect();
        } else if (meal.recipe?.id) {
          onClickRecipe();
        }
      }}
      onContextMenu={(e) => { if (!editMode) e.preventDefault(); }}
      role={editMode ? 'checkbox' : meal.recipe?.id ? 'link' : undefined}
      aria-checked={editMode ? isSelected : undefined}
      aria-label={mealName}
      {...(!editMode ? { ...attributes, ...listeners } : {})}
    >
      {editMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <span className="meal-chip-name">{mealName}</span>
      {kcal != null && <span className="meal-chip-kcal">{kcal} kcal</span>}
    </div>
  );
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
  personName,
  onNavigatePrevWeek,
  onNavigateNextWeek,
  onOpenNutrition,
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
  const [alsoAddToPlanIds, setAlsoAddToPlanIds] = useState<Set<number>>(new Set());
  const [sheetTouchBlocked, setSheetTouchBlocked] = useState(false);
  const [closingMealType, setClosingMealType] = useState(false);
  const [closingRecipePicker, setClosingRecipePicker] = useState(false);
  const [mealTypeContentVisible, setMealTypeContentVisible] = useState(false);
  const [addOverlayClosing, setAddOverlayClosing] = useState(false);
  const closeAddOverlay = () => {
    setAddOverlayClosing(true);
    setTimeout(() => {
      setMealTypeDropdownOpen(false);
      setItemTypeTabOpen(null);
      setSelectedDate(null);
      setSelectedDayMeal(null);
      setAddOverlayClosing(false);
    }, 280);
  };

  // Block all interaction on newly opened sheets by rendering a transparent
  // overlay div on top. This is a physical DOM blocker — no event handling
  // tricks needed. Removed after 500ms.
  const blockSheetTouches = () => {
    setSheetTouchBlocked(true);
    setTimeout(() => setSheetTouchBlocked(false), 500);
  };

  // Animate sheet out before unmounting (Emil: exit faster than enter)
  const closeMealTypeSheet = () => {
    setClosingMealType(true);
    setMealTypeContentVisible(false);
    setTimeout(() => {
      setClosingMealType(false);
      setMealTypeDropdownOpen(false);
      setSelectedDate(null);
    }, 180);
  };

  const closeRecipePickerSheet = () => {
    setClosingRecipePicker(true);
    setTimeout(() => {
      setClosingRecipePicker(false);
      setItemTypeTabOpen(null);
      setSelectedDayMeal(null);
      setIngredientSearchTerm('');
    }, 180);
  };

  // Ghost click buster: track last touchend time on +Add buttons to ignore
  // iOS Safari's synthetic click that fires ~300ms after touchend
  const lastAddMealTouchRef = useRef<number>(0);

  // Mobile: single-day view state
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileDayIdx, setActiveMobileDayIdx] = useState(0);
  const touchStartX = useRef<number>(0);
  const stripTouchStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
    blockSheetTouches();
    setMealTypeDropdownOpen(true);
    setMealTypeContentVisible(false);
    setTimeout(() => setMealTypeContentVisible(true), 350);
  };

  const handleSelectMealType = (mealType: string) => {
    if (!selectedDate) return;
    setSelectedDayMeal({ date: selectedDate, mealType });
    setMealTypeDropdownOpen(false);
    blockSheetTouches();
    setItemTypeTabOpen('recipe');
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
    if (!await dialog.confirm({ title: 'Remove this meal?', body: "This can't be undone.", confirmLabel: 'Remove', danger: true })) return;

    try {
      await onRemoveMeal(mealId);
    } catch (error) {
      console.error('Error removing meal:', error);
    }
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
          <div
            className="pl-day-strip"
            role="tablist"
            aria-label="Week days"
            onTouchStart={(e) => {
              stripTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - stripTouchStart.current.x;
              const dy = e.changedTouches[0].clientY - stripTouchStart.current.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                if (dx < 0) onNavigateNextWeek?.();
                else onNavigatePrevWeek?.();
              }
            }}
          >
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
                  {onOpenNutrition && (
                    <button
                      className="wk-day-nut-link"
                      onClick={() => onOpenNutrition(new Date(day.date))}
                      aria-label="View nutrition for this day"
                    >View Nutrition \u203a</button>
                  )}
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
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      lastAddMealTouchRef.current = Date.now();
                      handleAddMealClick(new Date(day.date));
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (Date.now() - lastAddMealTouchRef.current < 600) return;
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

            const selectedFlag = !!selectedDay && new Date(day.date).toDateString() === selectedDay.toDateString();
            // When a day is explicitly selected (panel open), suppress today's highlight unless today IS the selection
            const effectiveTodayFlag = todayFlag && (!selectedDay || selectedFlag);
            return (
              <DroppableDayCol
                key={day.date.toISOString()}
                dateISO={day.date.toISOString()}
                todayFlag={effectiveTodayFlag}
                dayIdx={dayIdx}
                selectedFlag={selectedFlag}
                onClick={() => onDayClick?.(new Date(day.date))}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onDayClick?.(new Date(day.date)); }}
                aria-label={`${day.dayOfWeek} ${dayNum}`}
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
                        <DraggableMealChip
                          key={meal.id}
                          meal={meal}
                          fromDateISO={day.date.toISOString()}
                          mealName={mealName}
                          kcal={kcal}
                          editMode={!!editMode}
                          isSelected={!!selectedMealIds?.has(meal.id)}
                          onToggleSelect={() => onToggleMealSelect?.(meal.id)}
                          onClickRecipe={() => router.push(`/recipes/${meal.recipe!.id}`)}
                        />
                      );
                    })}
                  </div>
                ))}

                {/* + Add button per day */}
                {!editMode && (
                  <button
                    className="wk-add-btn"
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      lastAddMealTouchRef.current = Date.now();
                      handleAddMealClick(new Date(day.date));
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (Date.now() - lastAddMealTouchRef.current < 600) return;
                      handleAddMealClick(new Date(day.date));
                    }}
                    aria-label={`Add meal on ${day.dayOfWeek}`}
                  >+ Add</button>
                )}
              </DroppableDayCol>
            );
          })}
        </div>
      )}

      {(mealTypeDropdownOpen || itemTypeTabOpen) && (selectedDate || selectedDayMeal) && createPortal(
        <div className={`pl-add-overlay${addOverlayClosing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label="Add meal">
          {/* Anchor row */}
          <div className="pl-add-anchor">
            {!itemTypeTabOpen ? (
              <button
                type="button"
                className="ed-btn-text"
                onClick={closeAddOverlay}
              >← Back to planner</button>
            ) : (
              <button
                type="button"
                className="ed-btn-text"
                onClick={() => {
                  // Step 2 ← Step 1
                  setItemTypeTabOpen(null);
                  setSelectedDayMeal(null);
                  setIngredientSearchTerm('');
                  setRecipeSearchTerm('');
                  setRecipeFilterTags([]);
                  setPendingRecipeId(null);
                  setPendingIngredientId(null);
                  setMealTypeDropdownOpen(true);
                }}
              >← Back</button>
            )}
            <span className="pl-add-sep" aria-hidden="true" />
            <span className="pl-add-label">Add meal</span>
            {itemTypeTabOpen && selectedDayMeal && (
              <>
                <span className="pl-add-sep" aria-hidden="true" />
                <button
                  type="button"
                  className="pl-add-crumb"
                  onClick={() => {
                    setItemTypeTabOpen(null);
                    setSelectedDayMeal(null);
                    setMealTypeDropdownOpen(true);
                  }}
                >{selectedDayMeal.mealType}</button>
              </>
            )}
            <div className="pl-add-anchor-right">
              {(() => {
                const d = selectedDayMeal?.date || selectedDate;
                if (!d) return null;
                const dStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
                return (
                  <span className="pl-add-meta">
                    {dStr}{personName ? ` · ${personName.toUpperCase()}` : ''}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Step 1 — pick a meal type */}
          {!itemTypeTabOpen && selectedDate && (
            <div key="step-1" className="pl-add-step pl-add-step--in pl-add-body">
              <div className="pl-add-eyebrow">§ Step one</div>
              <h1 className="pl-add-title">Pick a meal type.</h1>
              <ul className="pl-add-mtlist">
                {availableMealTypes.map((mealType, idx) => (
                  <li key={mealType}>
                    <button
                      type="button"
                      className="pl-add-mtrow"
                      onClick={() => handleSelectMealType(mealType)}
                    >
                      <span className="pl-add-mtnum">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="pl-add-mtname">{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</span>
                      <span className="pl-add-mtarrow" aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 2 — pick the recipe */}
          {itemTypeTabOpen && selectedDayMeal && (
          <div key="step-2" className="pl-add-step pl-add-step--in pl-add-body pl-add-body--step2">
            <div className="pl-add-eyebrow">§ Step two</div>
            <h1 className="pl-add-title">Pick a {selectedDayMeal.mealType}.</h1>

            <div className="ed-toggle pl-add-tabs">
              <button
                type="button"
                onClick={() => setItemTypeTabOpen('recipe')}
                className={itemTypeTabOpen === 'recipe' ? 'is-active' : ''}
              >Recipes</button>
              <button
                type="button"
                onClick={() => setItemTypeTabOpen('ingredient')}
                className={itemTypeTabOpen === 'ingredient' ? 'is-active' : ''}
              >Items</button>
            </div>

            <div className="pl-add-scroll">
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
                  <div className="flex flex-wrap gap-[10px] mb-4 items-center">
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

            <div className="border-t border-[var(--rule-faint)] pt-4 pb-4 flex items-center gap-4">
              {/* Also add to other people — left side */}
              {otherPersonPlans.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap flex-1">
                  <span className="pl-create-label">Also add to</span>
                  {otherPersonPlans.map((op) => (
                    <label key={op.planId} className="flex items-center gap-1.5 cursor-pointer">
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
                      <span className="font-mono text-[11px] text-[var(--muted)]">
                        {op.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {/* Buttons — right side */}
              <div className="flex gap-3 ml-auto">
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
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default MealPlanWeek;

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { dialog } from '@/lib/dialog';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import AddMealSheet from './AddMealSheet';

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
  onRemoveMeal: (mealId: number) => Promise<void>;
  onError?: (message: string) => void;
  isLoading?: boolean;
  selectedDay?: Date | null;
  onDayClick?: (date: Date) => void;
  editMode?: boolean;
  selectedMealIds?: Set<number>;
  onToggleMealSelect?: (id: number) => void;
  recipeCaloriesMap?: Record<number, number>;
  mealLogCaloriesMap?: Record<number, number>;
  personName?: string;
  personColor?: string;
  onNavigatePrevWeek?: () => void;
  onNavigateNextWeek?: () => void;
  onOpenNutrition?: (date: Date) => void;
  onMealAdded?: () => void;
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
  onRemoveMeal,
  onError,
  isLoading = false,
  selectedDay,
  onDayClick,
  editMode = false,
  selectedMealIds = new Set(),
  onToggleMealSelect,
  recipeCaloriesMap = {},
  mealLogCaloriesMap = {},
  personName,
  personColor,
  onNavigatePrevWeek,
  onNavigateNextWeek,
  onOpenNutrition,
  onMealAdded,
}) => {
  const router = useRouter();

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

  // Add Meal sheet (mobile)
  const [sheetDate, setSheetDate] = useState<Date | null>(null);

  const handleAddMealClick = (date: Date) => {
    if (isMobile) {
      setSheetDate(date);
    } else {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const weekStartStr = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getDate()).padStart(2, '0')}`;
      const personQ = personName ? `&person=${encodeURIComponent(personName)}` : '';
      router.push(`/meal-plans/add-meal?planId=${mealPlanId}&date=${dateStr}&weekStart=${weekStartStr}${personQ}`);
    }
  };

  const handleRemoveMeal = async (mealId: number) => {
    if (!await dialog.confirm({ title: 'Remove this meal?', body: "This can't be undone.", confirmLabel: 'REMOVE', danger: true })) return;

    try {
      await onRemoveMeal(mealId);
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

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
                  <div className="wk-day-kcal">{dayKcal ? `${dayKcal.toLocaleString()} kcal` : '\u2014'}</div>
                  <div className="wk-day-bar">
                    <div className="wk-day-bar-fill" style={{ width: `${kcalPct}%` }} />
                  </div>
                  {onOpenNutrition && (
                    <button
                      className="wk-day-nut-link"
                      onClick={() => onOpenNutrition(new Date(day.date))}
                      aria-label="View nutrition for this day"
                    >View Nutrition &#8250;</button>
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
                          className={`meal-chip${meal.recipe?.id ? ' meal-chip-recipe' : ''}${editMode && selectedMealIds.has(meal.id) ? ' bg-[var(--bg-2)]' : ''}`}
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
                  >+ ADD</button>
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
                  <div className="wk-day-kcal">{dayKcal ? `${dayKcal.toLocaleString()} kcal` : '\u2014'}</div>
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
                  >+ ADD</button>
                )}
              </DroppableDayCol>
            );
          })}
        </div>
      )}

      {/* Add Meal sheet — full two-step overlay (mobile only) */}
      {sheetDate && (
        <AddMealSheet
          planId={mealPlanId}
          date={sheetDate}
          weekStartDate={weekStartDate}
          onClose={() => setSheetDate(null)}
          onMealAdded={() => { setSheetDate(null); onMealAdded?.(); }}
        />
      )}

    </>
  );
};

export default MealPlanWeek;

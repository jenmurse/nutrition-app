'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import MealPlanWeek from './MealPlanWeek';

// Re-export the same prop types MealPlanWeek expects, plus our additions
type MealPlanWeekProps = React.ComponentProps<typeof MealPlanWeek>;

interface MealPlanDndWrapperProps extends MealPlanWeekProps {
  onMoveMeal: (mealId: number, toDateISO: string) => Promise<void>;
}

interface ActiveMeal {
  id: number;
  name: string;
  isRecipe: boolean;
}

export default function MealPlanDndWrapper({ onMoveMeal, ...weekProps }: MealPlanDndWrapperProps) {
  const [activeMeal, setActiveMeal] = useState<ActiveMeal | null>(null);

  // 8px activation distance prevents accidental drags when clicking chips
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { meal: { id: number; recipe?: { name: string }; ingredient?: { name: string } } } | undefined;
    if (!data) return;
    setActiveMeal({
      id: data.meal.id,
      name: data.meal.recipe?.name ?? data.meal.ingredient?.name ?? '?',
      isRecipe: !!data.meal.recipe,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveMeal(null);

    if (!over) return;

    // over.id is the ISO string of the target day column
    const toDateISO = over.id as string;
    const fromDate = (active.data.current as { fromDate: string } | undefined)?.fromDate;

    // Skip if dropped on the same day
    if (fromDate && new Date(toDateISO).toDateString() === new Date(fromDate).toDateString()) return;

    onMoveMeal(active.id as number, toDateISO);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <MealPlanWeek {...weekProps} />

      <DragOverlay dropAnimation={null}>
        {activeMeal ? (
          <div
            className={`meal-chip meal-chip--drag-overlay ${activeMeal.isRecipe ? 'meal-chip-recipe' : ''}`}
            style={{ pointerEvents: 'none', cursor: 'grabbing' }}
          >
            <span className="meal-chip-name">{activeMeal.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

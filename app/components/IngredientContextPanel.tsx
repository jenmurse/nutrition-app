"use client";

import React, { useState, useEffect } from "react";

type NutrientValue = {
  id: number;
  value: number;
  nutrient: { id: number; name: string; displayName: string; unit: string };
};

type Goal = {
  nutrientId: number;
  lowGoal?: number | null;
  highGoal?: number | null;
  nutrient: { displayName: string; unit: string };
};

interface IngredientContextPanelProps {
  nutrientValues: NutrientValue[];
  defaultUnit: string;
  customUnitName?: string | null;
  customUnitAmount?: number | null;
  customUnitGrams?: number | null;
  personId?: number;
  personName?: string;
}

/**
 * Shows ingredient nutrition as % of daily goals for the selected person.
 * Calculates per-serving values based on the ingredient's default/custom unit.
 */
export default function IngredientContextPanel({
  nutrientValues,
  defaultUnit,
  customUnitName,
  customUnitAmount,
  customUnitGrams,
  personId,
  personName,
}: IngredientContextPanelProps) {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (!personId) return;
    fetch(`/api/persons/${personId}/goals`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setGoals(Array.isArray(data) ? data : []))
      .catch(() => setGoals([]));
  }, [personId]);

  // Calculate serving info for display
  let servingLabel = "per 100g";
  let gramsPerServing = 100;

  if (customUnitName && customUnitGrams) {
    const amount = customUnitAmount || 1;
    servingLabel = `per ${amount} ${customUnitName} (${customUnitGrams}g)`;
    gramsPerServing = customUnitGrams;
  }

  if (!personId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-[11px] text-[var(--muted)] tracking-[0.02em] leading-relaxed py-4">
            Select a person in the nav to see nutrition goals.
          </div>
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-[11px] text-[var(--muted)] tracking-[0.02em] leading-relaxed py-4">
            No nutrition goals set for {personName || "this person"}. Configure them in Nutrition Goals.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-[0.1em] mb-4 pb-3 border-b border-[var(--rule)]">
          {personName ? `${personName}'s goals` : "Daily goals"} · {servingLabel}
        </div>

        {goals.map((goal) => {
          const nv = nutrientValues.find((n) => n.nutrient.id === goal.nutrientId);
          const valuePer100g = nv?.value || 0;
          const value = (valuePer100g / 100) * gramsPerServing;
          const target = goal.highGoal || goal.lowGoal || 0;
          const pct = target > 0 ? Math.round((value / target) * 100) : 0;
          const isHigh = pct > 80;
          const isOver = pct > 100;

          return (
            <div key={goal.nutrientId} className="mb-4">
              <div className="flex justify-between font-mono text-[9px] tracking-[0.1em] uppercase mb-[5px]">
                <span className="text-[var(--muted)]">{goal.nutrient.displayName}</span>
                <span
                  className={`font-medium ${
                    isOver
                      ? "text-[var(--error)]"
                      : isHigh
                      ? "text-[var(--warning)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {Math.round(value * 10) / 10} {goal.nutrient.unit}
                </span>
              </div>
              <div className="h-[3px] bg-[var(--rule)] relative mb-[4px]">
                <div
                  className={`h-full absolute top-0 left-0 ${
                    isOver
                      ? "bg-[var(--error)]"
                      : isHigh
                      ? "bg-[var(--warning)]"
                      : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div
                className={`font-sans text-[10px] tracking-[0.02em] ${
                  isOver ? "text-[var(--error)]" : "text-[var(--muted)]"
                }`}
              >
                {pct}% of {target} {goal.nutrient.unit} goal
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

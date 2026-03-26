"use client";

import React, { useState, useEffect } from "react";
import { clientCache } from "@/lib/clientCache";

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
  const [goalsLoading, setGoalsLoading] = useState(true);

  useEffect(() => {
    if (!personId) { setGoalsLoading(false); return; }
    const cacheKey = `/api/persons/${personId}/goals`;
    const cached = clientCache.get<Goal[]>(cacheKey);
    if (cached) { setGoals(cached); setGoalsLoading(false); return; }
    fetch(cacheKey)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        clientCache.set(cacheKey, list);
        setGoals(list);
      })
      .catch(() => setGoals([]))
      .finally(() => setGoalsLoading(false));
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
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[11px] text-[var(--muted)] tracking-[0.02em] leading-relaxed py-4">
            Select a person in the nav to see nutrition goals.
          </div>
        </div>
      </div>
    );
  }

  if (goalsLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-[5px]">
                <div className="flex justify-between">
                  <div className="h-[9px] w-16 bg-[var(--bg-subtle)] animate-loading rounded-[var(--radius-sm,4px)]" />
                  <div className="h-[9px] w-10 bg-[var(--bg-subtle)] animate-loading rounded-[var(--radius-sm,4px)]" />
                </div>
                <div className="h-[3px] w-full bg-[var(--rule)] animate-loading" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[11px] text-[var(--muted)] tracking-[0.02em] leading-relaxed py-4">
            No nutrition goals set for {personName || "this person"}. Configure them in Nutrition Goals.
          </div>
        </div>
      </div>
    );
  }

  const formatGoalVal = (val: number) => {
    const rounded = Math.round(val);
    return rounded >= 1000 ? rounded.toLocaleString() : String(rounded);
  };

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
          const isOver = pct > 100;
          const isWarn = !isOver && pct > 80;
          const unitSuffix = goal.nutrient.displayName.toLowerCase() === "calories" ? "" : ` ${goal.nutrient.unit}`;
          const overLabel = isOver ? " — over" : "";

          return (
            <div key={goal.nutrientId} className="mb-3">
              <div className="flex justify-between items-baseline mb-[5px]">
                <span className="font-mono text-[10px] text-[var(--fg)] uppercase tracking-[0.06em]">{goal.nutrient.displayName}</span>
                <span className={`font-mono text-[10px] tabular-nums ${isOver ? "text-[var(--error)]" : "text-[var(--muted)]"}`}>
                  {formatGoalVal(Math.round(value * 10) / 10)} / {formatGoalVal(target)}{unitSuffix}{overLabel}
                </span>
              </div>
              <div className="h-[4px] bg-[var(--bg-subtle)] rounded-[var(--radius-sm,4px)] overflow-hidden">
                <div
                  className={`h-full rounded-[var(--radius-sm,4px)] ${
                    isOver ? "bg-[var(--error)]" : isWarn ? "bg-[var(--warning)]" : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

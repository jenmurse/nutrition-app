"use client";

import React, { useState, useEffect } from "react";
import { clientCache } from "@/lib/clientCache";

type NutrientTotal = {
  nutrientId: number;
  displayName: string;
  value: number;
  unit: string;
};

type Goal = {
  nutrientId: number;
  lowGoal?: number | null;
  highGoal?: number | null;
  nutrient: { displayName: string; unit: string };
};

interface RecipeContextPanelProps {
  recipeId: number;
  totals: NutrientTotal[];
  personId?: number;
}

export default function RecipeContextPanel({
  recipeId,
  totals,
  personId,
}: RecipeContextPanelProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  // Fetch person's nutrition goals (with cache)
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <GoalsTab totals={totals} goals={goals} personId={personId} loading={goalsLoading} />
      </div>
    </div>
  );
}

/* ── Goals Tab ── */

function GoalsTab({
  totals,
  goals,
  personId,
  loading,
}: {
  totals: NutrientTotal[];
  goals: Goal[];
  personId?: number;
  loading?: boolean;
}) {
  if (!personId) {
    return (
      <div className="text-[11px] text-[var(--muted)] py-4">
        Select a person in the nav to see nutrition goals.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 pt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-[5px]">
            <div className="flex justify-between">
              <div className="h-[9px] w-16 bg-[var(--bg-subtle)] animate-loading" />
              <div className="h-[9px] w-10 bg-[var(--bg-subtle)] animate-loading" />
            </div>
            <div className="h-[3px] w-full bg-[var(--rule)] animate-loading" />
          </div>
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="text-[11px] text-[var(--muted)] tracking-[0.02em] leading-relaxed py-4">
        No nutrition goals set. Configure them in Nutrition Goals.
      </div>
    );
  }

  const formatGoalVal = (val: number) => {
    const rounded = Math.round(val);
    return rounded >= 1000 ? rounded.toLocaleString() : String(rounded);
  };

  return (
    <div>
      <div className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-[0.1em] mb-4 pb-3 border-b border-[var(--rule)]">
        Per serving · vs goals
      </div>
      {goals.map((goal) => {
        const total = totals.find((t) => t.nutrientId === goal.nutrientId);
        const value = total?.value || 0;
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
              <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
                {formatGoalVal(value)} / {formatGoalVal(target)}{unitSuffix}{overLabel}
              </span>
            </div>
            <div className="h-[4px] bg-[var(--bg-subtle)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)]"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}


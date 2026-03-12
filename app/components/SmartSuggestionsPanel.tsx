'use client';

import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// API response types (mirrors the day-analysis endpoint)
// ---------------------------------------------------------------------------

interface OverBudgetAlert {
  nutrientId: number;
  displayName: string;
  unit: string;
  current: number;
  highGoal: number;
  overBy: number;
  overByPct: number;
}

interface ContributorResult {
  mealLogId: number;
  name: string;
  mealType: string;
  amount: number;
  pct: number;
}

interface SwapCandidate {
  recipeId: number;
  name: string;
  savingAmounts: Record<number, number>;
  calorieDiff: number;
}

interface FillGapCandidate {
  id: number;
  name: string;
  calories: number;
  score: number;
  reason: string;
}

interface DayAnalysis {
  date: string;
  overBudget: OverBudgetAlert[];
  topContributors: Record<string, ContributorResult[]>;
  swapCandidates: Record<string, SwapCandidate[]>;
  fillGapCandidates: FillGapCandidate[];
  calorieNutrientId: number | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SmartSuggestionsPanelProps {
  mealPlanId: number;
  date: Date;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SmartSuggestionsPanel({
  mealPlanId,
  date,
  onClose,
}: SmartSuggestionsPanelProps) {
  const [analysis, setAnalysis] = useState<DayAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/meal-plans/${mealPlanId}/day-analysis?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAnalysis(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mealPlanId, dateStr]);

  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="mt-6 border bg-card rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
        <div>
          <h3 className="font-semibold text-sm">Smart Analysis</h3>
          <p className="text-[11px] text-muted-foreground">{dayLabel}</p>
        </div>
        <button
          className="text-xs text-muted-foreground hover:text-foreground transition"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {loading && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Analysing your day…
        </div>
      )}

      {error && (
        <div className="px-4 py-4 text-sm text-rose-500">Error: {error}</div>
      )}

      {!loading && !error && analysis && (
        <div className="divide-y">
          {/* ----------------------------------------------------------------
              Over-budget section
          ---------------------------------------------------------------- */}
          {analysis.overBudget.length === 0 ? (
            <div className="px-4 py-4 flex items-center gap-2 text-sm text-emerald-600">
              <span>✓</span>
              <span>All nutrients are within your goals for this day.</span>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                Over budget
              </h4>

              {analysis.overBudget.map((alert) => {
                const contributors = analysis.topContributors[String(alert.nutrientId)] ?? [];
                const topMealId = contributors[0]?.mealLogId;
                const swaps = topMealId != null ? (analysis.swapCandidates[String(topMealId)] ?? []) : [];

                return (
                  <div key={alert.nutrientId} className="space-y-2">
                    {/* Alert row */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium">{alert.displayName}</span>
                      <span className="text-xs text-rose-500">
                        +{Math.round(alert.overBy)}{alert.unit} over ({alert.overByPct}%)
                      </span>
                    </div>

                    {/* Top contributors */}
                    {contributors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Top contributors</p>
                        {contributors.slice(0, 3).map((c) => (
                          <div
                            key={c.mealLogId}
                            className="flex items-center justify-between rounded bg-muted/30 px-2 py-1"
                          >
                            <span className="text-xs truncate max-w-[60%]">{c.name}</span>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {Math.round(c.amount)}{alert.unit} · {c.pct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Swap suggestions */}
                    {swaps.length > 0 && contributors[0] && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          Try swapping <span className="font-medium text-foreground">{contributors[0].name}</span> for…
                        </p>
                        {swaps.map((swap) => {
                          const saving = swap.savingAmounts[alert.nutrientId];
                          const calNote =
                            swap.calorieDiff === 0
                              ? 'same calories'
                              : swap.calorieDiff > 0
                              ? `+${swap.calorieDiff} kcal`
                              : `${swap.calorieDiff} kcal`;

                          return (
                            <div
                              key={swap.recipeId}
                              className="rounded border border-muted bg-background px-3 py-2 space-y-0.5"
                            >
                              <div className="text-xs font-medium">{swap.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                Saves ~{Math.round(saving ?? 0)}{alert.unit} {alert.displayName.toLowerCase()} · {calNote}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ----------------------------------------------------------------
              Fill-the-gap section
          ---------------------------------------------------------------- */}
          {analysis.fillGapCandidates.length > 0 && (
            <div className="px-4 py-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What could I add?
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Recipes ranked by how well they fill your remaining calorie budget:
              </p>
              <div className="space-y-1.5">
                {analysis.fillGapCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="rounded border border-muted bg-background px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">{c.reason}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold">{c.calories} kcal</div>
                      <div className="text-[10px] text-muted-foreground">score {c.score}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!analysis.overBudget.length && !analysis.fillGapCandidates.length && (
            <div className="px-4 py-3 text-[11px] text-muted-foreground">
              No suggestions — your day looks well planned.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

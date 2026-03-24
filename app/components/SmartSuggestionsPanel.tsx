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

interface UnderBudgetAlert {
  nutrientId: number;
  displayName: string;
  unit: string;
  current: number;
  lowGoal: number;
  shortBy: number;
  shortByPct: number;
}

interface UnderBudgetSwapOption {
  mealLogId: number;
  mealName: string;
  swaps: Array<{
    recipeId: number;
    name: string;
    gainAmount: number;
    calorieDiff: number;
  }>;
}

interface DayAnalysis {
  date: string;
  overBudget: OverBudgetAlert[];
  underBudget: UnderBudgetAlert[];
  topContributors: Record<string, ContributorResult[]>;
  swapCandidates: Record<string, SwapCandidate[]>;
  underBudgetSwaps: Record<string, UnderBudgetSwapOption[]>;
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
  onSwapMeal?: (mealLogId: number, newRecipeId: number) => Promise<void>;
  onAddMeal?: (recipeId: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Sub-component: a single contributor row with expandable swap options
// ---------------------------------------------------------------------------

function ContributorWithSwaps({
  contributor: c,
  alert,
  swaps,
  onSwapMeal,
}: {
  contributor: ContributorResult;
  alert: OverBudgetAlert;
  swaps: SwapCandidate[];
  onSwapMeal?: (mealLogId: number, newRecipeId: number) => Promise<void>;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="border border-[var(--rule)]">
      <button
        className="w-full flex items-center justify-between px-3 py-[6px] text-left hover:bg-[var(--bg-subtle)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-[11px] truncate text-[var(--fg)]">{c.name}</span>
        <span className="text-[10px] text-[var(--muted)] shrink-0 ml-2">
          {Math.round(c.amount)}{alert.unit} · {c.pct}%
          {swaps.length > 0 && <span className="ml-1">{expanded ? '▴' : '▾'}</span>}
        </span>
      </button>
      {expanded && swaps.length > 0 && (
        <div className="border-t border-[var(--rule)] bg-[var(--bg-subtle)]">
          <div className="px-3 py-[4px] font-sans text-[11px] text-[var(--muted)]">Swap for:</div>
          {swaps.map((swap) => {
            const saving = swap.savingAmounts[alert.nutrientId];
            const calNote =
              swap.calorieDiff === 0 ? 'same cal'
              : swap.calorieDiff > 0 ? `+${swap.calorieDiff} cal`
              : `${swap.calorieDiff} cal`;
            return (
              <div key={swap.recipeId} className="flex items-center justify-between px-3 py-[5px] border-t border-[var(--rule)]">
                <div>
                  <div className="font-sans text-[11px] text-[var(--fg)]">{swap.name}</div>
                  <div className="font-sans text-[10px] text-[var(--muted)]">
                    Saves ~{Math.round(saving ?? 0)}{alert.unit} · {calNote}
                  </div>
                </div>
                {onSwapMeal && (
                  <button
                    className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--accent)] border border-[var(--accent)] px-2 py-[2px] hover:bg-[var(--accent-light)] transition-colors shrink-0 ml-2"
                    onClick={(e) => { e.stopPropagation(); onSwapMeal(c.mealLogId, swap.recipeId); }}
                    aria-label={`Swap ${c.name} for ${swap.name}`}
                  >
                    Swap
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {expanded && swaps.length === 0 && (
        <div className="border-t border-[var(--rule)] px-3 py-[4px] font-sans text-[11px] text-[var(--muted)]">
          No swap candidates found
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SmartSuggestionsPanel({
  mealPlanId,
  date,
  onClose,
  onSwapMeal,
  onAddMeal,
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
    <div className="mt-2">

      {loading && (
        <div className="px-4 py-8 text-center font-mono text-[11px] text-[var(--muted)] animate-loading">
          Analysing your day…
        </div>
      )}

      {error && (
        <div className="px-4 py-4 font-sans text-[11px] text-[var(--error)]">Error: {error}</div>
      )}

      {!loading && !error && analysis && (
        <div>
          {/* ----------------------------------------------------------------
              Over-budget section
          ---------------------------------------------------------------- */}
          {analysis.overBudget.length === 0 && (!analysis.underBudget || analysis.underBudget.length === 0) && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--accent)]">
              <span>✓</span>
              <span>All nutrients are within your goals for this day.</span>
            </div>
          )}

          {analysis.overBudget.length > 0 && (
            <div className="space-y-4 mt-6">
              <div className="text-[11px] font-medium text-[var(--error)]">
                Over Allocation
              </div>

              {analysis.overBudget.map((alert) => {
                const contributors = analysis.topContributors[String(alert.nutrientId)] ?? [];

                return (
                  <div key={alert.nutrientId} className="space-y-2">
                    {/* Alert row */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-medium">{alert.displayName}</span>
                      <span className="text-[10px] text-[var(--error)]">
                        +{Math.round(alert.overBy)}{alert.unit} over ({alert.overByPct}%)
                      </span>
                    </div>

                    {/* Each contributor with its own swap options */}
                    {contributors.length > 0 && (
                      <div className="space-y-2">
                        {contributors.slice(0, 3).map((c) => {
                          const swaps = analysis.swapCandidates[String(c.mealLogId)] ?? [];
                          return (
                            <ContributorWithSwaps
                              key={c.mealLogId}
                              contributor={c}
                              alert={alert}
                              swaps={swaps}
                              onSwapMeal={onSwapMeal}
                            />
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
              Under-budget section
          ---------------------------------------------------------------- */}
          {analysis.underBudget && analysis.underBudget.length > 0 && (
            <div className="space-y-4 mt-6">
              <div className="text-[11px] font-medium text-[var(--warning)]">
                Below minimum
              </div>

              {analysis.underBudget.map((deficit) => {
                const swapOptions = analysis.underBudgetSwaps?.[String(deficit.nutrientId)] ?? [];
                return (
                  <div key={deficit.nutrientId} className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-medium">{deficit.displayName}</span>
                      <span className="text-[10px] text-[var(--warning)]">
                        {deficit.shortBy}{deficit.unit} short ({deficit.shortByPct}%)
                      </span>
                    </div>

                    {swapOptions.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-sans text-[11px] text-[var(--muted)]">Swap to increase {deficit.displayName.toLowerCase()}:</p>
                        {swapOptions.map((opt) => (
                          <div key={opt.mealLogId} className="border border-[var(--rule)]">
                            <div className="px-3 py-[4px] font-sans text-[11px] text-[var(--muted)] bg-[var(--bg-subtle)]">
                              Instead of {opt.mealName}:
                            </div>
                            {opt.swaps.map((swap) => (
                              <div key={swap.recipeId} className="flex items-center justify-between px-3 py-[5px] border-t border-[var(--rule)]">
                                <div>
                                  <div className="font-sans text-[11px] text-[var(--fg)]">{swap.name}</div>
                                  <div className="font-sans text-[10px] text-[var(--muted)]">
                                    +{swap.gainAmount}{deficit.unit} · {swap.calorieDiff >= 0 ? `+${swap.calorieDiff}` : swap.calorieDiff} cal
                                  </div>
                                </div>
                                {onSwapMeal && (
                                  <button
                                    className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--accent)] border border-[var(--accent)] px-2 py-[2px] hover:bg-[var(--accent-light)] transition-colors shrink-0 ml-2"
                                    onClick={() => onSwapMeal(opt.mealLogId, swap.recipeId)}
                                    aria-label={`Swap ${opt.mealName} for ${swap.name}`}
                                  >
                                    Swap
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
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
            <div className="space-y-3 mt-6">
              <div className="font-sans text-[11px] text-[var(--muted)]">
                Recipes to help meet your daily goals:
              </div>
              <div className="space-y-1.5">
                {analysis.fillGapCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="border border-[var(--rule)] bg-[var(--bg)] px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-sans text-[11px] font-medium truncate text-[var(--fg)]">{c.name}</div>
                      <div className="font-sans text-[10px] text-[var(--muted)]">{c.calories} kcal</div>
                    </div>
                    {onAddMeal && (
                      <button
                        className="text-[9px] font-mono uppercase tracking-[0.1em] text-[var(--accent)] border border-[var(--accent)] px-2 py-[3px] hover:bg-[var(--accent-light)] transition-colors shrink-0"
                        onClick={() => onAddMeal(c.id)}
                        aria-label={`Add ${c.name}`}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!analysis.overBudget.length && !analysis.fillGapCandidates.length && (
            <div className="px-4 py-3 font-sans text-[11px] text-[var(--muted)] tracking-[0.02em]">
              No suggestions — your day looks well planned.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

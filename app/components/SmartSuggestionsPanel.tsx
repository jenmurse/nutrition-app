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
            <div style={{ marginTop: 20 }}>
              {analysis.overBudget.map((alert) => {
                const contributors = analysis.topContributors[String(alert.nutrientId)] ?? [];
                const contributorsWithSwaps = contributors.slice(0, 3)
                  .map((c) => ({ ...c, swaps: analysis.swapCandidates[String(c.mealLogId)] ?? [] }))
                  .filter((c) => c.swaps.length > 0);

                return (
                  <div key={alert.nutrientId} className="pl-over-section">
                    <div className="pl-over-title">
                      <span>{alert.displayName}</span>
                      <span className="pl-over-amount">
                        +{Math.round(alert.overBy)}{alert.unit} over ({alert.overByPct}%)
                      </span>
                    </div>

                    {contributorsWithSwaps.length > 0 && (
                      <>
                        <div className="pl-over-desc">Swap to reduce {alert.displayName.toLowerCase()}:</div>
                        {contributorsWithSwaps.map((c) => (
                          <div key={c.mealLogId} className="pl-swap-card">
                            <div className="pl-swap-instead">Instead of {c.name}:</div>
                            {c.swaps.map((swap) => {
                              const saving = swap.savingAmounts[alert.nutrientId];
                              const calNote =
                                swap.calorieDiff === 0 ? 'same cal'
                                : swap.calorieDiff > 0 ? `+${swap.calorieDiff} cal`
                                : `${swap.calorieDiff} cal`;
                              return (
                                <div key={swap.recipeId} className="pl-swap-row">
                                  <div>
                                    <div className="pl-swap-name">{swap.name}</div>
                                    <div className="pl-swap-savings">
                                      Saves ~{Math.round(saving ?? 0)}{alert.unit} · {calNote}
                                    </div>
                                  </div>
                                  {onSwapMeal && (
                                    <button
                                      className="pl-swap-btn"
                                      onClick={() => onSwapMeal(c.mealLogId, swap.recipeId)}
                                      aria-label={`Swap ${c.name} for ${swap.name}`}
                                    >
                                      Swap
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </>
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
            <div style={{ marginTop: 20 }}>
              {analysis.underBudget.map((deficit) => {
                const swapOptions = analysis.underBudgetSwaps?.[String(deficit.nutrientId)] ?? [];
                return (
                  <div key={deficit.nutrientId} className="pl-over-section">
                    <div className="pl-over-title">
                      <span>{deficit.displayName}</span>
                      <span className="pl-over-amount" style={{ color: 'var(--muted)' }}>
                        {deficit.shortBy}{deficit.unit} short ({deficit.shortByPct}%)
                      </span>
                    </div>

                    {swapOptions.length > 0 && (
                      <>
                        <div className="pl-over-desc">Swap to increase {deficit.displayName.toLowerCase()}:</div>
                        {swapOptions.map((opt) => (
                          <div key={opt.mealLogId} className="pl-swap-card">
                            <div className="pl-swap-instead">Instead of {opt.mealName}:</div>
                            {opt.swaps.map((swap) => (
                              <div key={swap.recipeId} className="pl-swap-row">
                                <div>
                                  <div className="pl-swap-name">{swap.name}</div>
                                  <div className="pl-swap-savings">
                                    +{swap.gainAmount}{deficit.unit} · {swap.calorieDiff >= 0 ? `+${swap.calorieDiff}` : swap.calorieDiff} cal
                                  </div>
                                </div>
                                {onSwapMeal && (
                                  <button
                                    className="pl-swap-btn"
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
                      </>
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
            <div className="pl-recs-section" style={{ marginTop: 20 }}>
              <div className="pl-recs-label">Recipes to help meet your daily goals:</div>
              {analysis.fillGapCandidates.map((c) => (
                <div key={c.id} className="pl-rec-card">
                  <div className="pl-rec-info">
                    <div className="pl-rec-name">{c.name}</div>
                    <div className="pl-rec-kcal">{c.calories} kcal</div>
                  </div>
                  {onAddMeal && (
                    <button
                      className="pl-add-btn"
                      onClick={() => onAddMeal(c.id)}
                      aria-label={`Add ${c.name}`}
                    >+ Add</button>
                  )}
                </div>
              ))}
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

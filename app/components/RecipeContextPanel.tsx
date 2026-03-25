"use client";

import React, { useState, useEffect, useCallback } from "react";
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

type AnalysisSection = {
  label: string;
  suggestions?: string[];
  notes?: string[];
};

type OptimizeData = {
  sections: AnalysisSection[];
};

type MealPrepData = {
  score: number;
  scoreLabel: string;
  sections: AnalysisSection[];
};

interface RecipeContextPanelProps {
  recipeId: number;
  totals: NutrientTotal[];
  personId?: number;
}

type Tab = "goals" | "optimize" | "mealprep";

export default function RecipeContextPanel({
  recipeId,
  totals,
  personId,
}: RecipeContextPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [optimize, setOptimize] = useState<OptimizeData | null>(null);
  const [mealPrep, setMealPrep] = useState<MealPrepData | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [analysisModel, setAnalysisModel] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

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

  // Fetch cached analysis
  const loadAnalysis = useCallback(async (force = false) => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setOptimize(data.optimize);
      setMealPrep(data.mealPrep);
      setAnalyzedAt(data.analyzedAt);
      setAnalysisModel(data.model);
      setStale(false);
    } catch (err: any) {
      setAnalysisError(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [recipeId]);

  // Auto-load cached analysis on mount
  useEffect(() => {
    loadAnalysis(false);
  }, [loadAnalysis]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "goals", label: "Goals" },
    { key: "optimize", label: "Optimize" },
    { key: "mealprep", label: "Meal Prep" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--rule)] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{ borderRadius: 0 }}
            className={`flex-1 h-[40px] font-mono text-[9px] tracking-[0.1em] uppercase text-center border-b-2 transition-colors flex items-center justify-center ${
              activeTab === tab.key
                ? "text-[var(--fg)] border-[var(--accent)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--fg)]"
            }`}
            aria-label={`${tab.label} tab`}
            aria-selected={activeTab === tab.key}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === "goals" && (
          <GoalsTab totals={totals} goals={goals} personId={personId} loading={goalsLoading} />
        )}

        {activeTab === "optimize" && (
          <AnalysisTab
            data={optimize}
            loading={analyzing}
            error={analysisError}
            analyzedAt={analyzedAt}
            model={analysisModel}
            stale={stale}
            onReanalyze={() => loadAnalysis(true)}
            emptyLabel="Run analysis to get optimization suggestions."
          />
        )}

        {activeTab === "mealprep" && (
          <MealPrepTab
            data={mealPrep}
            loading={analyzing}
            error={analysisError}
            analyzedAt={analyzedAt}
            model={analysisModel}
            stale={stale}
            onReanalyze={() => loadAnalysis(true)}
          />
        )}
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
              <div className="h-[9px] w-16 bg-[var(--bg-subtle)] animate-loading rounded-sm" />
              <div className="h-[9px] w-10 bg-[var(--bg-subtle)] animate-loading rounded-sm" />
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
              <span className="font-mono text-[10px] text-[var(--fg)]">{goal.nutrient.displayName}</span>
              <span className={`font-mono text-[10px] tabular-nums ${isOver ? "text-[var(--error)]" : "text-[var(--muted)]"}`}>
                {formatGoalVal(value)} / {formatGoalVal(target)}{unitSuffix}{overLabel}
              </span>
            </div>
            <div className="h-[4px] bg-[var(--bg-subtle)] rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm ${
                  isOver ? "bg-[var(--error)]" : isWarn ? "bg-[var(--warning)]" : "bg-[var(--accent)]"
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Analysis Tab (Optimize) ── */

function AnalysisTab({
  data,
  loading,
  error,
  analyzedAt,
  model,
  stale,
  onReanalyze,
  emptyLabel,
}: {
  data: OptimizeData | null;
  loading: boolean;
  error: string | null;
  analyzedAt: string | null;
  model: string | null;
  stale: boolean;
  onReanalyze: () => void;
  emptyLabel: string;
}) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="font-mono text-[10px] text-[var(--muted)] animate-loading">Analyzing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-3 px-3 border border-[var(--error-border)] bg-[var(--error-light)] text-[11px] text-[var(--error)]">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="text-[11px] text-[var(--muted)] tracking-[0.02em] mb-3">{emptyLabel}</div>
        <button
          onClick={onReanalyze}
          className="font-mono text-[9px] tracking-[0.1em] uppercase border border-[var(--accent)] text-[var(--accent)] px-4 py-2 bg-transparent hover:bg-[var(--accent)] hover:text-white transition-colors cursor-pointer"
          aria-label="Run AI analysis"
        >
          Analyze
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with date + re-analyze */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.1em]">
          {stale ? "Recipe changed" : analyzedAt ? `Analyzed ${model === "mock" ? "(mock)" : ""}` : ""}
        </span>
        <button
          onClick={onReanalyze}
          className="font-mono text-[9px] border border-[var(--rule)] text-[var(--muted)] px-2 py-[2px] bg-transparent hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors cursor-pointer"
          aria-label="Re-analyze recipe"
        >
          Re-analyze
        </button>
      </div>

      {/* Sections */}
      {data.sections.map((section, i) => (
        <div
          key={i}
          className={`mb-3 pb-3 ${i < data.sections.length - 1 ? "border-b border-[var(--rule)]" : ""}`}
        >
          <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mb-[6px]">
            {section.label}
          </div>
          {(section.suggestions || section.notes || []).map((item, j) => (
            <div
              key={j}
              className="text-[11px] leading-[1.6] text-[var(--fg)] pl-3 relative mb-[6px]"
            >
              <span className="absolute left-0 text-[var(--accent)]">·</span>
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Meal Prep Tab ── */

function MealPrepTab({
  data,
  loading,
  error,
  analyzedAt,
  model,
  stale,
  onReanalyze,
}: {
  data: MealPrepData | null;
  loading: boolean;
  error: string | null;
  analyzedAt: string | null;
  model: string | null;
  stale: boolean;
  onReanalyze: () => void;
}) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="font-mono text-[10px] text-[var(--muted)] animate-loading">Analyzing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-3 px-3 border border-[var(--error-border)] bg-[var(--error-light)] text-[11px] text-[var(--error)]">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="text-[11px] text-[var(--muted)] mb-3">Run analysis to assess meal prep candidacy.</div>
        <button
          onClick={onReanalyze}
          className="font-mono text-[9px] tracking-[0.1em] uppercase border border-[var(--accent)] text-[var(--accent)] px-4 py-2 bg-transparent hover:bg-[var(--accent)] hover:text-white transition-colors cursor-pointer"
          aria-label="Run AI analysis"
        >
          Analyze
        </button>
      </div>
    );
  }

  const filledStars = "★".repeat(data.score);
  const emptyStars = "★".repeat(5 - data.score);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-mono text-[9px] text-[var(--muted)] tracking-[0.1em]">
          {stale ? "Recipe changed" : analyzedAt ? `Analyzed ${model === "mock" ? "(mock)" : ""}` : ""}
        </span>
        <button
          onClick={onReanalyze}
          className="font-mono text-[9px] border border-[var(--rule)] text-[var(--muted)] px-2 py-[2px] bg-transparent hover:text-[var(--fg)] hover:border-[var(--rule-strong)] transition-colors cursor-pointer"
          aria-label="Re-analyze recipe"
        >
          Re-analyze
        </button>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-[6px] mb-3">
        <span className="text-[14px] text-[var(--accent)] tracking-[2px]">{filledStars}</span>
        <span className="text-[14px] text-[var(--rule-strong)] tracking-[2px]">{emptyStars}</span>
        <span className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-[0.1em]">
          {data.score} / 5 — {data.scoreLabel}
        </span>
      </div>

      {/* Sections */}
      {data.sections.map((section, i) => (
        <div
          key={i}
          className={`mb-3 pb-3 ${i < data.sections.length - 1 ? "border-b border-[var(--rule)]" : ""}`}
        >
          <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[var(--muted)] mb-[6px]">
            {section.label}
          </div>
          {(section.notes || section.suggestions || []).map((item, j) => (
            <div
              key={j}
              className="text-[11px] leading-[1.6] text-[var(--fg)] pl-3 relative mb-[6px]"
            >
              <span className="absolute left-0 text-[var(--accent)]">·</span>
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

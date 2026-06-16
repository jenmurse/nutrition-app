"use client";

import { useEffect, useMemo, useState } from "react";

// ── Types (mirror lib/mealOptimizer output + endpoint enrichment) ───────────
type GoalRow = {
  nutrientId: number;
  lowGoal: number | null;
  highGoal: number | null;
  nutrient: { displayName: string; unit: string; orderIndex?: number };
};

export type DayMealInput = {
  mealLogId: number;
  mealType: string;
  recipeId: number | null;
  name: string;
  kind: "recipe" | "ingredient" | "external";
};

type VarTarget = { nutrientId: number; current: number | null; proposed: number | null };
type VarMeal = {
  mealLogId: number | null;
  mealType: string;
  state: "kept" | "swapped" | "removed" | "added";
  name: string;
  fromName?: string;
  recipeId: number | null;
  locked?: boolean;
};
type Variation = {
  key: "balance" | "primary" | "closest";
  changes: number;
  swaps: number;
  removes: number;
  adds: number;
  meals: VarMeal[];
  targets: VarTarget[];
  totals: Record<number, number | null>;
};
type NutrientMeta = Record<
  number,
  { name: string; displayName: string; unit: string; lowGoal: number | null; highGoal: number | null }
>;
type OptimizeResponse = {
  date: string;
  targets: number[];
  scope: { swap: boolean; remove: boolean; add: boolean };
  nutrientMeta: NutrientMeta;
  baseline: { targets: VarTarget[]; totals: Record<number, number | null> };
  variations: Variation[];
  pruned: boolean;
  combosEvaluated: number;
  note?: string;
};

type Props = {
  mealPlanId: number;
  date: Date;
  personId: number;
  personName: string;
  dayMeals: DayMealInput[];
  onClose: () => void;
  onApplied: () => void;
  /** Mobile only: return to the ⋯ launcher hub (pop the sheet stack). */
  onBackToHub?: () => void;
};

const VARIATION_LABEL: Record<Variation["key"], string> = {
  balance: "Best balance",
  primary: "Best for {target}",
  closest: "Closest to today",
};

function isoLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

type Direction = "cap" | "min" | "band";
function direction(g: { lowGoal: number | null; highGoal: number | null }): Direction {
  if (g.lowGoal != null && g.highGoal != null) return "band";
  if (g.highGoal != null) return "cap";
  return "min";
}
const ARROW: Record<Direction, string> = { cap: "↓", min: "↑", band: "↕" };

function goalLabel(g: GoalRow): string {
  const u = g.nutrient.unit;
  const d = direction(g);
  if (d === "band") return `Land in ${g.lowGoal}–${g.highGoal} ${u}`;
  if (d === "cap") return `Stay under ${g.highGoal} ${u}`;
  return `Reach ${g.lowGoal} ${u} minimum`;
}

/** Met = green, violated = red (matches planner daily totals semantics). */
function meetsGoal(value: number | null, meta: NutrientMeta[number] | undefined): boolean {
  if (value == null || !meta) return false;
  const { lowGoal, highGoal } = meta;
  if (lowGoal != null && value < lowGoal) return false;
  if (highGoal != null && value > highGoal) return false;
  return true;
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

export default function DayOptimizer({
  mealPlanId,
  date,
  personId,
  personName,
  dayMeals,
  onClose,
  onApplied,
  onBackToHub,
}: Props) {
  const [step, setStep] = useState<"picker" | "results">("picker");
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  // Picker selections
  const [targets, setTargets] = useState<number[]>([]);
  const [locks, setLocks] = useState<Set<number>>(new Set());
  const [allowRemove, setAllowRemove] = useState(true);
  const [allowAdd, setAllowAdd] = useState(false);
  const [pool, setPool] = useState<"favorites" | "library">("favorites");

  // Results
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [selectedVar, setSelectedVar] = useState(0);
  const [applying, setApplying] = useState(false);

  const dayLabel = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const recipeMeals = dayMeals.filter((m) => m.kind === "recipe");

  // Fetch the person's goals (only nutrients with a goal can be targets).
  useEffect(() => {
    let cancelled = false;
    setGoalsLoading(true);
    fetch(`/api/persons/${personId}/goals`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: GoalRow[]) => {
        if (cancelled) return;
        setGoals(Array.isArray(data) ? data : []);
      })
      .catch(() => !cancelled && setGoals([]))
      .finally(() => !cancelled && setGoalsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [personId]);

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const atCap = targets.length >= 3;
  const toggleTarget = (id: number) => {
    setTargets((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };
  const toggleLock = (mealLogId: number) => {
    setLocks((prev) => {
      const next = new Set(prev);
      if (next.has(mealLogId)) next.delete(mealLogId);
      else next.add(mealLogId);
      return next;
    });
  };

  async function runOptimize() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/meal-plans/${mealPlanId}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: isoLocal(date),
          targets,
          scope: { remove: allowRemove, add: allowAdd },
          locks: Array.from(locks),
          candidatePool: pool,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Optimization failed");
      }
      const data: OptimizeResponse = await res.json();
      setResult(data);
      setSelectedVar(0);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setRunning(false);
    }
  }

  async function applyVariation() {
    if (!result) return;
    const variation = result.variations[selectedVar];
    if (!variation) return;
    setApplying(true);
    setError(null);
    try {
      const dateISO = isoLocal(date);
      for (const m of variation.meals) {
        if (m.state === "swapped" && m.mealLogId != null && m.recipeId != null) {
          await fetch(`/api/meal-plans/${mealPlanId}/meals/${m.mealLogId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeId: m.recipeId, servings: 1 }),
          });
        } else if (m.state === "removed" && m.mealLogId != null) {
          await fetch(`/api/meal-plans/${mealPlanId}/meals/${m.mealLogId}`, { method: "DELETE" });
        } else if (m.state === "added" && m.recipeId != null) {
          await fetch(`/api/meal-plans/${mealPlanId}/meals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeId: m.recipeId, date: dateISO, mealType: m.mealType, servings: 1 }),
          });
        }
      }
      onApplied();
      onClose();
    } catch {
      setError("Couldn't apply all changes. Please check the day and try again.");
    } finally {
      setApplying(false);
    }
  }

  const primaryName = targets[0] ? goals.find((g) => g.nutrientId === targets[0])?.nutrient.displayName ?? "" : "";
  const varLabel = (v: Variation) =>
    v.key === "primary" ? VARIATION_LABEL.primary.replace("{target}", primaryName.toLowerCase()) : VARIATION_LABEL[v.key];

  return (
    <>
      <div className="opt-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="opt-surface" role="dialog" aria-modal="true" aria-label="Optimize day">
        {/* Close (desktop only; mobile dismisses via scrim / back) */}
        <button className="opt-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Mobile sheet nav: handle + back affordance (no ✕ on mobile sheets) */}
        <div className="opt-mobile-nav">
          <button
            type="button"
            className="opt-back-btn"
            onClick={() => {
              if (step === "results") setStep("picker");
              else if (onBackToHub) onBackToHub();
              else onClose();
            }}
          >
            {step === "results" ? "Adjust options" : "Day actions"}
          </button>
        </div>

        {step === "picker" ? (
          <div className="opt-scroll">
            <div className="opt-head">
              <div className="opt-eyebrow">Optimize</div>
              <h1 className="opt-title">Optimize this day.</h1>
              <div className="opt-context"><span className="opt-dot" />{dayLabel}{personName ? ` · ${personName}` : ""}</div>
            </div>

            {/* 01 Goals */}
            <section className="opt-section">
              <div className="opt-section-head">
                <span className="opt-section-num">01</span>
                <span className="opt-section-title">Goals</span>
                <span className="opt-section-rule" />
              </div>
              <p className="opt-helper">
                {targets.length ? `${targets.length} of 3 selected` : "Pick up to 3 nutrients to optimize for."}
              </p>
              {goalsLoading ? (
                <p className="opt-helper">Loading goals…</p>
              ) : goals.length === 0 ? (
                <p className="opt-helper">No nutrition goals set for {personName || "this person"}. Set goals in Settings to optimize.</p>
              ) : (
                <>
                  <div className="opt-chips">
                    {goals.map((g) => {
                      const on = targets.includes(g.nutrientId);
                      return (
                        <button
                          key={g.nutrientId}
                          type="button"
                          className={`opt-chip${on ? " is-on" : ""}`}
                          onClick={() => toggleTarget(g.nutrientId)}
                          disabled={!on && atCap}
                        >
                          {g.nutrient.displayName}
                        </button>
                      );
                    })}
                  </div>
                  {targets.length > 0 && (
                    <div className="opt-directions">
                      {targets.map((t) => {
                        const g = goals.find((x) => x.nutrientId === t);
                        if (!g) return null;
                        return (
                          <div className="opt-dir-row" key={t}>
                            <span className="opt-dir-name">{g.nutrient.displayName}</span>
                            <span className="opt-dir-arrow">{ARROW[direction(g)]}</span>
                            <span className="opt-dir-target">{goalLabel(g)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* 02 Meals */}
            <section className="opt-section">
              <div className="opt-section-head">
                <span className="opt-section-num">02</span>
                <span className="opt-section-title">Meals</span>
                <span className="opt-section-rule" />
              </div>
              <p className="opt-helper">Lock anything you want kept. Everything else can be swapped{allowRemove ? " or removed" : ""}.</p>
              <div className="opt-meals">
                {recipeMeals.length === 0 ? (
                  <p className="opt-helper">No recipe meals on this day to optimize.</p>
                ) : (
                  recipeMeals.map((m) => {
                    const kept = locks.has(m.mealLogId);
                    return (
                      <div className="opt-meal-row" key={m.mealLogId}>
                        <div className="opt-meal-left">
                          <span className="opt-meal-type">{m.mealType}</span>
                          <span className="opt-meal-name">{m.name}</span>
                        </div>
                        <button
                          type="button"
                          className={`opt-lock${kept ? " is-kept" : ""}`}
                          onClick={() => toggleLock(m.mealLogId)}
                          aria-pressed={kept}
                          aria-label={`${kept ? "Unlock" : "Keep"} ${m.name}`}
                        >
                          <svg viewBox="0 0 14 16" width="14" height="16" aria-hidden="true">
                            <path className="lk-shackle" d="M4 7 V5 a3 3 0 0 1 6 0 V7" />
                            <rect className="lk-body" x="2" y="7" width="10" height="7.5" />
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="opt-scope">
                <div className="opt-sub-eyebrow">What can change</div>
                <label className="opt-toggle-row">
                  <input type="checkbox" checked={allowRemove} onChange={(e) => setAllowRemove(e.target.checked)} />
                  <span className="opt-toggle-text">
                    <span className="opt-t-label">Allow removing meals</span>
                    <span className="opt-t-help">The optimizer can drop a meal if the day is better without it.</span>
                  </span>
                </label>
                <label className="opt-toggle-row">
                  <input type="checkbox" checked={allowAdd} onChange={(e) => setAllowAdd(e.target.checked)} />
                  <span className="opt-toggle-text">
                    <span className="opt-t-label">Allow adding a side or snack</span>
                    <span className="opt-t-help">The optimizer can introduce one extra side or snack to hit your goals.</span>
                  </span>
                </label>
              </div>
            </section>

            {/* 03 Source */}
            <section className="opt-section">
              <div className="opt-section-head">
                <span className="opt-section-num">03</span>
                <span className="opt-section-title">Source</span>
                <span className="opt-section-rule" />
              </div>
              <p className="opt-helper">Where the optimizer looks for replacements.</p>
              <div className="opt-ed-toggle">
                <button type="button" className={pool === "favorites" ? "is-on" : ""} onClick={() => setPool("favorites")}>Favorites first</button>
                <button type="button" className={pool === "library" ? "is-on" : ""} onClick={() => setPool("library")}>Whole library</button>
              </div>
            </section>

            {error && <p className="opt-error">{error}</p>}

            <div className="opt-footer">
              <button type="button" className="ed-btn-text opt-cancel" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="ed-btn-primary"
                disabled={targets.length === 0 || recipeMeals.length === 0 || running}
                onClick={runOptimize}
              >
                {running ? "Optimizing…" : "Optimize →"}
              </button>
            </div>
          </div>
        ) : (
          <ResultsView
            result={result!}
            selectedVar={selectedVar}
            setSelectedVar={setSelectedVar}
            varLabel={varLabel}
            dayLabel={dayLabel}
            personName={personName}
            goals={goals}
            applying={applying}
            error={error}
            onBack={() => setStep("picker")}
            onApply={applyVariation}
          />
        )}
      </div>
    </>
  );
}

// ── Results view ─────────────────────────────────────────────────────────────
function ResultsView({
  result,
  selectedVar,
  setSelectedVar,
  varLabel,
  dayLabel,
  personName,
  goals,
  applying,
  error,
  onBack,
  onApply,
}: {
  result: OptimizeResponse;
  selectedVar: number;
  setSelectedVar: (i: number) => void;
  varLabel: (v: Variation) => string;
  dayLabel: string;
  personName: string;
  goals: GoalRow[];
  applying: boolean;
  error: string | null;
  onBack: () => void;
  onApply: () => void;
}) {
  const { nutrientMeta, baseline, variations, targets } = result;

  const optimizingFor = targets
    .map((t) => {
      const g = goals.find((x) => x.nutrientId === t);
      return g ? `${g.nutrient.displayName} ${ARROW[direction(g)]}` : "";
    })
    .filter(Boolean);

  if (result.note === "nothing-to-optimize" || variations.length === 0) {
    return (
      <div className="opt-scroll">
        <div className="opt-head">
          <div className="opt-eyebrow">Optimize</div>
          <h1 className="opt-title">Nothing to optimize.</h1>
          <div className="opt-context">Unlock a meal, or add recipe meals to this day, then try again.</div>
        </div>
        <div className="opt-footer">
          <button type="button" className="ed-btn-text opt-adjust" onClick={onBack}>← Adjust options</button>
        </div>
      </div>
    );
  }

  const selected = variations[selectedVar];

  return (
    <div className="opt-scroll">
      <div className="opt-head">
        <div className="opt-eyebrow">Optimize</div>
        <h1 className="opt-title">
          {variations.length === 1 ? "One way to optimize." : variations.length === 2 ? "Two ways to optimize." : "Three ways to optimize."}
        </h1>
        <div className="opt-results-subline">
          <span className="opt-optfor-label">Optimizing for</span>
          {optimizingFor.map((s, i) => (
            <span className="opt-optfor-chip" key={i}>{s}</span>
          ))}
          <span className="opt-context-inline"><span className="opt-dot" />{dayLabel}{personName ? ` · ${personName}` : ""}</span>
        </div>
      </div>

      {/* Today baseline */}
      <div className="opt-baseline">
        <span className="opt-b-label">Today</span>
        {baseline.targets.map((t) => {
          const meta = nutrientMeta[t.nutrientId];
          const ok = meetsGoal(t.current, meta);
          return (
            <span className="opt-b-metric" key={t.nutrientId}>
              <span className="opt-b-name">{meta?.displayName}</span>
              <span className={`opt-b-val ${ok ? "opt-green" : "opt-red"}`}>{fmt(t.current)} {meta?.unit}</span>
            </span>
          );
        })}
      </div>

      {/* Variation columns / cards */}
      <div className="opt-cols">
        {variations.map((v, i) => {
          const isSel = i === selectedVar;
          const summary = [
            v.swaps ? `${v.swaps} swap${v.swaps > 1 ? "s" : ""}` : "",
            v.removes ? `${v.removes} removed` : "",
            v.adds ? `${v.adds} added` : "",
          ].filter(Boolean).join(" · ") || "No changes";
          return (
            <div
              key={v.key + i}
              className={`opt-col${isSel ? " is-selected" : ""}`}
              onClick={() => setSelectedVar(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedVar(i); } }}
            >
              <span className="opt-check" aria-hidden="true">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <div className="opt-col-name">{varLabel(v)}</div>
              <div className="opt-col-sum">{summary}</div>

              <div className="opt-targets">
                {v.targets.map((tg) => {
                  const meta = nutrientMeta[tg.nutrientId];
                  const ok = meetsGoal(tg.proposed, meta);
                  const delta = tg.current != null && tg.proposed != null ? Math.round(tg.proposed - tg.current) : null;
                  return (
                    <div className="opt-tgt" key={tg.nutrientId}>
                      <div className="opt-tgt-top">
                        <span className="opt-tgt-label">{meta?.displayName}</span>
                        {delta != null && (
                          <span className="opt-tgt-delta">{delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`}</span>
                        )}
                      </div>
                      <div className={`opt-tgt-val ${ok ? "opt-green" : "opt-red"}`}>{fmt(tg.proposed)} <small>{meta?.unit}</small></div>
                    </div>
                  );
                })}
              </div>

              <div className="opt-meal-list">
                {v.meals.map((m, mi) => (
                  <div className={`opt-m-row${m.state === "removed" ? " is-removed" : ""}`} key={mi}>
                    <div className="opt-m-type">{m.mealType}</div>
                    <div className="opt-m-body">
                      <span className="opt-m-name">{m.name}</span>
                      {m.fromName && <span className="opt-m-was">was {m.fromName}</span>}
                    </div>
                    <span className={`opt-m-state is-${m.state}`}>
                      {m.state === "swapped" && "Swapped"}
                      {m.state === "removed" && "Removed"}
                      {m.state === "added" && "Added"}
                      {m.state === "kept" && m.locked && (
                        <svg viewBox="0 0 14 16" width="11" height="13" aria-label="Kept"><path className="lk-s" d="M4 7 V5 a3 3 0 0 1 6 0 V7" /><rect className="lk-b" x="2" y="7" width="10" height="7.5" /></svg>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="opt-error">{error}</p>}

      <div className="opt-footer opt-footer-results">
        <button type="button" className="ed-btn-text opt-adjust" onClick={onBack}>← Adjust options</button>
        <div className="opt-footer-right">
          <button type="button" className="ed-btn-primary" disabled={applying} onClick={onApply}>
            {applying ? "Applying…" : `Apply ${selected ? varLabel(selected).toLowerCase() : ""} →`}
          </button>
          <span className="opt-foot-note">Replaces this day&apos;s meals · save as a template afterward</span>
        </div>
      </div>
    </div>
  );
}

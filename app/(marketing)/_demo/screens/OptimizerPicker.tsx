// Scenario 02 state B — the real optimizer picker, inside the app window.
// Reuses the live .opt-* classes so it matches DayOptimizer exactly.

import { DAY_LABEL, DAY_MEALS, NUTRIENT_BY_ID, PERSON, TARGETS } from "../data";
import type { NutrientMeta } from "../data";

const CHIP_LABELS = [
  "Calories",
  "Fat",
  "Saturated Fat",
  "Sodium",
  "Carbs",
  "Sugar",
  "Added Sugar",
  "Protein",
  "Fiber",
];
const SELECTED = new Set(["Protein", "Sodium"]);

function arrow(m: NutrientMeta): string {
  if (m.lowGoal != null && m.highGoal != null) return "↕";
  if (m.highGoal != null) return "↓";
  return "↑";
}
function goalPhrase(m: NutrientMeta): string {
  if (m.lowGoal != null && m.highGoal != null) return `Land in ${m.lowGoal}–${m.highGoal} ${m.unit}`;
  if (m.highGoal != null) return `Stay under ${m.highGoal.toLocaleString()} ${m.unit}`;
  if (m.lowGoal != null) return `Reach ${m.lowGoal} ${m.unit} minimum`;
  return "";
}

export default function OptimizerPicker() {
  return (
    <div className="opt-scroll dm-optfit">
      <div className="opt-head">
        <div className="opt-eyebrow">Optimize</div>
        <h1 className="opt-title">Optimize this day.</h1>
        <div className="opt-context">
          <span className="opt-dot" />
          {DAY_LABEL} · {PERSON.name}
        </div>
      </div>

      <section className="opt-section">
        <div className="opt-section-head">
          <span className="opt-section-num">01</span>
          <span className="opt-section-title">Goals</span>
          <span className="opt-section-rule" />
        </div>
        <p className="opt-helper">{TARGETS.length} of 3 selected</p>
        <div className="opt-chips">
          {CHIP_LABELS.map((c) => (
            <span key={c} className={`opt-chip${SELECTED.has(c) ? " is-on" : ""}`}>
              {c}
            </span>
          ))}
        </div>
        <div className="opt-directions">
          {TARGETS.map((id) => {
            const m = NUTRIENT_BY_ID[id];
            return (
              <div className="opt-dir-row" key={id}>
                <span className="opt-dir-name">{m.displayName}</span>
                <span className="opt-dir-arrow">{arrow(m)}</span>
                <span className="opt-dir-target">{goalPhrase(m)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="opt-section">
        <div className="opt-section-head">
          <span className="opt-section-num">02</span>
          <span className="opt-section-title">Meals</span>
          <span className="opt-section-rule" />
        </div>
        <p className="opt-helper">Lock anything you want kept. Everything else can be swapped or removed.</p>
        <div className="opt-meals">
          {DAY_MEALS.map((m) => (
            <div className="opt-meal-row" key={m.mealLogId}>
              <div className="opt-meal-left">
                <span className="opt-meal-type">{m.mealType}</span>
                <span className="opt-meal-name">{m.name}</span>
              </div>
              <span className="opt-lock" aria-hidden="true">
                <svg viewBox="0 0 14 16" width="14" height="16">
                  <path className="lk-shackle" d="M4 7 V5 a3 3 0 0 1 6 0 V7" />
                  <rect className="lk-body" x="2" y="7" width="10" height="7.5" />
                </svg>
              </span>
            </div>
          ))}
        </div>
        <div className="opt-scope">
          <div className="opt-sub-eyebrow">What can change</div>
          <label className="opt-toggle-row">
            <input type="checkbox" defaultChecked />
            <span className="opt-toggle-text">
              <span className="opt-t-label">Allow removing meals</span>
              <span className="opt-t-help">The optimizer can drop a meal if the day is better without it.</span>
            </span>
          </label>
          <label className="opt-toggle-row">
            <input type="checkbox" />
            <span className="opt-toggle-text">
              <span className="opt-t-label">Allow adding a side or snack</span>
              <span className="opt-t-help">The optimizer can introduce one extra side or snack to hit your goals.</span>
            </span>
          </label>
        </div>
      </section>

      <section className="opt-section">
        <div className="opt-section-head">
          <span className="opt-section-num">03</span>
          <span className="opt-section-title">Source</span>
          <span className="opt-section-rule" />
        </div>
        <p className="opt-helper">Where the optimizer looks for replacements.</p>
        <div className="opt-ed-toggle">
          <span className="is-on">Favorites first</span>
          <span>Whole library</span>
        </div>
      </section>

      <div className="opt-footer">
        <span className="ed-btn-text opt-cancel">Cancel</span>
        <span className="ed-btn-primary">Optimize →</span>
      </div>
    </div>
  );
}

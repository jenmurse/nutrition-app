// Scenario 02 state C — the real optimizer results, inside the app window.
// Genuine output from the engine (see ../optimize), reusing the live .opt-*
// classes so it matches DayOptimizer exactly.

import {
  DEMO_RESULT,
  NUTRIENT_META,
  OPTIMIZING_FOR,
  changeSummary,
  meetsGoal,
  variationLabel,
} from "../optimize";

function fmt(n: number | null): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

export default function OptimizerResults() {
  const { baseline, variations } = DEMO_RESULT;

  return (
    <div className="opt-scroll dm-optfit">
      <div className="opt-head">
        <div className="opt-eyebrow">Optimize</div>
        <h1 className="opt-title">Three options to optimize.</h1>
        <div className="opt-results-subline">
          <span className="opt-optfor-label">Optimizing for</span>
          {OPTIMIZING_FOR.map((s, i) => (
            <span className="opt-optfor-chip" key={i}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="opt-baseline">
        <span className="opt-b-label">Today</span>
        {baseline.targets.map((t) => {
          const meta = NUTRIENT_META[t.nutrientId];
          const ok = meetsGoal(t.current, meta);
          return (
            <span className="opt-b-metric" key={t.nutrientId}>
              <span className="opt-b-name">{meta?.displayName}</span>
              <span className={`opt-b-val ${ok ? "opt-green" : "opt-red"}`}>
                {fmt(t.current)} {meta?.unit}
              </span>
            </span>
          );
        })}
      </div>

      <div className="opt-cols">
        {variations.map((v, i) => (
          <div key={v.key + i} className={`opt-col${i === 0 ? " is-selected" : ""}`}>
            <span className="opt-check" aria-hidden="true">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.8 7L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="opt-col-name">{variationLabel(v)}</div>
            <div className="opt-col-sum">{changeSummary(v)}</div>

            <div className="opt-targets">
              {v.targets.map((tg) => {
                const meta = NUTRIENT_META[tg.nutrientId];
                const ok = meetsGoal(tg.proposed, meta);
                const delta =
                  tg.current != null && tg.proposed != null
                    ? Math.round(tg.proposed - tg.current)
                    : null;
                return (
                  <div className="opt-tgt" key={tg.nutrientId}>
                    <div className="opt-tgt-top">
                      <span className="opt-tgt-label">{meta?.displayName}</span>
                      {delta != null && (
                        <span className="opt-tgt-delta">
                          {delta > 0 ? `↑ ${delta}` : `↓ ${Math.abs(delta)}`}
                        </span>
                      )}
                    </div>
                    <div className={`opt-tgt-val ${ok ? "opt-green" : "opt-red"}`}>
                      {fmt(tg.proposed)} <small>{meta?.unit}</small>
                    </div>
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
                    {m.state === "kept" && "Kept"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="opt-footer opt-footer-results">
        <span className="ed-btn-text opt-adjust">← Adjust options</span>
        <span className="ed-btn-primary opt-apply">Apply best balance →</span>
        <span className="opt-foot-note">Replaces this day&apos;s meals · save as a template afterward</span>
      </div>
    </div>
  );
}

// Scenario 01 — a recipe inside the app window, matching the real detail page:
// a left section-nav, a header with a food photo, then Ingredients (scale +
// prep notes) and Nutrition (per-serving value / goal + bar). `state` switches
// imported → edited → saved; changed ingredients/numbers render green.

import { RECIPE, RECIPE_SECTIONS, RECIPE_STATES } from "../recipe";

function pct(value: string, goal: string): number {
  const v = parseFloat(value.replace(/,/g, ""));
  const g = parseFloat(goal.replace(/,/g, ""));
  if (!g) return 0;
  return Math.min(100, Math.round((v / g) * 100));
}

export default function RecipeView({
  state,
  saved = false,
}: {
  state: "original" | "edited" | "saved";
  saved?: boolean;
}) {
  const { ingredients, nutrients } = RECIPE_STATES[state];

  return (
    <div className="rcp">
      <nav className="rcp-nav">
        {RECIPE_SECTIONS.map((s, i) => (
          <div key={s} className={`rcp-navitem${i === 0 ? " is-on" : ""}`}>
            <span className="rcp-navnum">0{i + 1}</span>
            <span className="rcp-navlabel">{s}</span>
          </div>
        ))}
      </nav>

      <div className="rcp-main">
        <div className="rcp-head">
          <div className="rcp-head-text">
            <span className="rcp-cat">{RECIPE.category}</span>
            <h1 className="rcp-title">{RECIPE.name}</h1>
            <span className="rcp-servings">
              {RECIPE.servings} servings
              {saved && <span className="rcp-saved"> · Saved to your library ✓</span>}
            </span>
            <div className="rcp-actions">
              <span className="rcp-btn">Edit</span>
              <span className="rcp-btn">Duplicate</span>
              <span className="rcp-btn">Delete</span>
            </div>
          </div>
          <div className="rcp-photo" aria-hidden="true">
            {/* SCREENSHOT SLOT: dish photo */}
            <span>Photo</span>
          </div>
        </div>

        <div className="rcp-cols">
          <section className="rcp-sec">
            <div className="rcp-sechead">
              <span className="rcp-secnum">01</span>
              <span className="rcp-sectitle">Ingredients</span>
            </div>
            <div className="rcp-scale">
              <span className="rcp-scale-label">Scale</span>
              <span className="rcp-scale-opt is-on">1×</span>
              <span className="rcp-scale-opt">2×</span>
              <span className="rcp-scale-opt">4×</span>
              <span className="rcp-scale-opt">6×</span>
            </div>
            {ingredients.map((ing, i) => (
              <div className={`rcp-ing${ing.changed ? " is-changed" : ""}`} key={i}>
                <span className="rcp-amt">{ing.amount}</span>
                <span className="rcp-ibody">
                  <span className="rcp-iname">{ing.name}</span>
                  {ing.note && <span className="rcp-inote">{ing.note}</span>}
                </span>
              </div>
            ))}
          </section>

          <section className="rcp-sec">
            <div className="rcp-sechead">
              <span className="rcp-secnum">02</span>
              <span className="rcp-sectitle">Nutrition</span>
            </div>
            <div className="rcp-nutlabel">Per serving · Vs goals</div>
            {nutrients.map((n) => (
              <div className={`rcp-nrow${n.changed ? " is-changed" : ""}`} key={n.name}>
                <span className="rcp-nname">{n.name}</span>
                <span className="rcp-nval">
                  {n.value}
                  <small>
                    {" "}
                    / {n.goal} {n.unit}
                  </small>
                </span>
                <span className="rcp-nbar">
                  <span className="rcp-nbar-fill" style={{ width: `${pct(n.value, n.goal)}%` }} />
                </span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

// Mobile recipe detail — single-column, scrollable. Shows the same recipe data
// as RecipeView but in a phone-width layout with PhoneFrame chrome.

import { RECIPE, RECIPE_STATES } from "../recipe";

export default function MobileRecipeView({ state = "original" }: { state?: "original" | "edited" | "saved" }) {
  const { ingredients, nutrients } = RECIPE_STATES[state];
  const isChanged = state !== "original";

  return (
    <div className="mrcp">
      <div className="mrcp-nav">
        <span className="mrcp-back">‹ Recipes</span>
      </div>

      <div className="mrcp-header">
        <span className="mrcp-cat">{RECIPE.category}</span>
        <h2 className="mrcp-title">{RECIPE.name}</h2>
        <span className="mrcp-servings">{RECIPE.servings} servings</span>
        <div className="mrcp-actions">
          <span className="mrcp-btn">Edit</span>
          <span className="mrcp-btn">Duplicate</span>
          <span className="mrcp-btn">Delete</span>
        </div>
      </div>

      <div className="mrcp-photo">
        <img className="mrcp-photo-img" src="/landing/food-dinner-tofu.jpg" alt="" />
      </div>

      <div className="mrcp-section">
        <div className="mrcp-sechead">
          <span className="mrcp-secnum">01</span>
          <span className="mrcp-sectitle">Ingredients</span>
          <span className="mrcp-secrule" />
        </div>
        <div className="mrcp-scale">
          <span className="mrcp-scale-label">Scale</span>
          <span className="mrcp-scale-opt is-on">1×</span>
          <span className="mrcp-scale-opt">2×</span>
          <span className="mrcp-scale-opt">4×</span>
        </div>
        {ingredients.map((ing) => (
          <div key={ing.name} className={`mrcp-ing${ing.changed ? " is-changed" : ""}`}>
            <span className="mrcp-amt">{ing.amount}</span>
            <div className="mrcp-ibody">
              <span className="mrcp-iname">{ing.name}</span>
              {ing.note && <span className="mrcp-inote">{ing.note}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mrcp-section">
        <div className="mrcp-sechead">
          <span className="mrcp-secnum">02</span>
          <span className="mrcp-sectitle">Nutrition</span>
          <span className="mrcp-secrule" />
        </div>
        <span className="mrcp-nutlabel">Per serving · Vs goals</span>
        {nutrients.map((nut) => (
          <div key={nut.name} className={`mrcp-nrow${nut.changed ? " is-changed" : ""}`}>
            <span className="mrcp-nname">{nut.name}</span>
            <span className="mrcp-nval">
              {nut.value} <small>/ {nut.goal} {nut.unit}</small>
            </span>
            <div className="mrcp-nbar">
              <span
                className="mrcp-nbar-fill"
                style={{ width: `${Math.min(100, (parseFloat(nut.value.replace(/,/g, "")) / parseFloat(nut.goal.replace(/,/g, ""))) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

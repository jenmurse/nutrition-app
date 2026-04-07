"use client";

import { useEffect, useState } from "react";

const BASE_INGREDIENTS = [
  { qty: "200 g", name: "Chicken Breast" },
  { qty: "1 tbsp", name: "Olive Oil" },
  { qty: "2 tbsp", name: "Lemon Juice" },
];

const NEW_INGREDIENT = { qty: "150 g", name: "Greek Yogurt" };

const BASE_NUTRITION = [
  { label: "Calories", value: 340, goal: 2000, unit: "" },
  { label: "Protein", value: 35, goal: 80, unit: "g" },
  { label: "Carbs", value: 4, goal: 250, unit: "g" },
  { label: "Fat", value: 18, goal: 65, unit: "g" },
  { label: "Fiber", value: 1, goal: 28, unit: "g" },
];

const UPDATED_NUTRITION = [
  { label: "Calories", value: 422, goal: 2000, unit: "" },
  { label: "Protein", value: 65, goal: 80, unit: "g" },
  { label: "Carbs", value: 12, goal: 250, unit: "g" },
  { label: "Fat", value: 19, goal: 65, unit: "g" },
  { label: "Fiber", value: 2, goal: 28, unit: "g" },
];

// Step 0 — base (3 ingredients, base nutrition)
// Step 1 — Greek Yogurt fades in
// Step 2 — nutrition bars animate to updated values
// Step 3 — settled
const STEP_DURATIONS = [3000, 1600, 2200, 2800];

export default function RecipeBuilderDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const advance = () => {
      setStep((prev) => {
        const next = (prev + 1) % 4;
        timeout = setTimeout(advance, STEP_DURATIONS[next]);
        return next;
      });
    };
    timeout = setTimeout(advance, STEP_DURATIONS[0]);
    return () => clearTimeout(timeout);
  }, []);

  const showNewIngredient = step >= 1;
  const nutrition = step >= 2 ? UPDATED_NUTRITION : BASE_NUTRITION;

  return (
    <div className="rbd-root" role="img" aria-label="Recipe viewer demo showing live nutrition updates">
      {/* Recipe header */}
      <div className="rbd-page-header">
        <div className="rbd-recipe-meta">2 servings · 25 min prep</div>
        <div className="rbd-recipe-title">Lemon Herb Chicken</div>
      </div>

      {/* Ingredients + Nutrition 2-col */}
      <div className="rbd-two-col">

        {/* Ingredients */}
        <div>
          <div className="rbd-section-head">
            <span className="rbd-section-num">01</span>
            <span className="rbd-section-label">Ingredients</span>
            <span className="rbd-section-rule" />
          </div>
          <ul className="rbd-ing-list">
            {BASE_INGREDIENTS.map((ing) => (
              <li key={ing.name} className="rbd-ing-row">
                <span className="rbd-ing-qty">{ing.qty}</span>
                <span className="rbd-ing-name">{ing.name}</span>
              </li>
            ))}
            <li className={`rbd-ing-row rbd-ing-new${showNewIngredient ? " rbd-ing-new--in" : ""}`}>
              <span className="rbd-ing-qty">{NEW_INGREDIENT.qty}</span>
              <span className="rbd-ing-name">{NEW_INGREDIENT.name}</span>
            </li>
          </ul>
        </div>

        {/* Nutrition */}
        <div>
          <div className="rbd-section-head">
            <span className="rbd-section-num">02</span>
            <span className="rbd-section-label">Nutrition</span>
            <span className="rbd-section-rule" />
          </div>
          <div className="rbd-nut-meta">Per serving · vs goals</div>
          <div className="rbd-nut-list">
            {nutrition.map((n) => {
              const pct = Math.min((n.value / n.goal) * 100, 100);
              return (
                <div key={n.label} className="rbd-nut-row">
                  <div className="rbd-nut-head">
                    <span className="rbd-nut-label">{n.label}</span>
                    <span className="rbd-nut-value">
                      {n.value}{n.unit}
                      <span className="rbd-nut-goal"> / {n.goal}{n.unit}</span>
                    </span>
                  </div>
                  <div className="rbd-bar-track">
                    <div className="rbd-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

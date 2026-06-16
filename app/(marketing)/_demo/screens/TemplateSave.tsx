// Scenario 03 beat B — save-as-template sheet overlaid on a dimmed planner.
// The clean week (Sun highlighted) shows behind; the sheet sits right-center.

import Planner from "./Planner";
import { week03 } from "../week";

const MEALS = [
  { mt: "Breakfast", name: "Weekend eggs & avocado" },
  { mt: "Lunch",     name: "Lunch salad w/ salmon" },
  { mt: "Dinner",    name: "Sesame Miso Cannellini Beans" },
  { mt: "Snack",     name: "Apple & almond butter" },
  { mt: "Dessert",   name: "Lemon bars" },
];

export default function TemplateSave() {
  return (
    <div className="tsd">
      <div className="tsd-backdrop">
        <Planner days={week03("clean")} dateRange="Mar 16–22" />
      </div>
      <div className="tsd-sheet">
        <div className="tsd-head">
          <span className="tsd-title">Save as template</span>
          <span className="tsd-sub">5 meals · Sunday Mar 16</span>
        </div>
        <div className="tsd-field">
          <span className="tsd-label">Name</span>
          <div className="tsd-input">
            <span>Workout Day</span>
            <span className="tsd-cursor" />
          </div>
        </div>
        <div className="tsd-meals">
          {MEALS.map((m) => (
            <div key={m.mt} className="tsd-meal">
              <span className="tsd-mt">{m.mt}</span>
              <span className="tsd-mn">{m.name}</span>
            </div>
          ))}
        </div>
        <div className="tsd-save">Save template</div>
      </div>
    </div>
  );
}

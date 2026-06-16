// Mobile optimizer picker — bottom sheet showing target selection and meal locks.

const NUTRIENTS = [
  "CALORIES", "FAT", "SAT FAT", "SODIUM", "CARBS",
  "SUGAR", "ADDED SUGAR", "PROTEIN", "FIBER",
];
const SELECTED = new Set(["PROTEIN", "SODIUM"]);

const GOALS = [
  { name: "PROTEIN", dir: "↕", target: "LAND IN 105–120 G" },
  { name: "SODIUM",  dir: "↓", target: "STAY UNDER 1800 MG" },
];

const MEALS = [
  { type: "BREAKFAST", name: "Morning Shake – Chocolate Almond Butter" },
  { type: "LUNCH",     name: "Lunch Salad w/Salmon" },
  { type: "DINNER",    name: "One-pan Fish & Chickpeas" },
  { type: "SNACK",     name: "Black Bean Avocado Brownies" },
  { type: "DESSERT",   name: "Tahini Chocolate Chip Cookies" },
];

function LockIcon() {
  return (
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="mopt-lock">
      <rect x="0.75" y="5.75" width="9.5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2.5 5.5V4C2.5 2.619 3.619 1.5 5 1.5H6C7.381 1.5 8.5 2.619 8.5 4V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function MobileOptimizerPicker() {
  return (
    <div className="mopt">
      <div className="mopt-handle" />
      <div className="mopt-nav">‹ Day actions</div>
      <div className="mopt-rule" />

      <div className="mopt-eyebrow">OPTIMIZE</div>
      <div className="mopt-title">Optimize this day.</div>
      <div className="mopt-meta">
        <span className="mopt-dot" />
        TUE, JUN 16 · JEN
      </div>

      <div className="mopt-sechead">
        <span className="mopt-secnum">01</span>
        <span className="mopt-sectitle">Goals</span>
        <span className="mopt-secrule" />
      </div>
      <div className="mopt-seccount">2 of 3 selected</div>

      <div className="mopt-tabs">
        {NUTRIENTS.map((n) => (
          <span key={n} className={`mopt-tab${SELECTED.has(n) ? " is-on" : ""}`}>{n}</span>
        ))}
      </div>

      <div className="mopt-goals">
        {GOALS.map((g) => (
          <div key={g.name} className="mopt-goal">
            <span className="mopt-goal-name">{g.name}</span>
            <span className="mopt-goal-dir">{g.dir}</span>
            <span className="mopt-goal-target">{g.target}</span>
          </div>
        ))}
      </div>

      <div className="mopt-sechead">
        <span className="mopt-secnum">02</span>
        <span className="mopt-sectitle">Meals</span>
        <span className="mopt-secrule" />
      </div>
      <div className="mopt-secsub">Lock anything you want kept. Everything else can be swapped or removed.</div>

      <div className="mopt-meals">
        {MEALS.map((m) => (
          <div key={m.type} className="mopt-meal">
            <div className="mopt-meal-body">
              <span className="mopt-mt">{m.type}</span>
              <span className="mopt-mn">{m.name}</span>
            </div>
            <LockIcon />
          </div>
        ))}
      </div>

      <div className="mopt-cta">OPTIMIZE →</div>
    </div>
  );
}

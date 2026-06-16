// Mobile optimizer results — three variation cards, first selected.

const VARIATIONS = [
  {
    label: "Best balance",
    swaps: 4,
    metrics: [
      { name: "SODIUM",  value: "721",   unit: "mg", delta: "↓ 1,050", status: "ok" },
      { name: "PROTEIN", value: "109",   unit: "g",  delta: "↓ 10",    status: "ok" },
    ],
    meals: [
      { type: "BREAKFAST", name: "Morning Shake – Choc Almond Butter", tag: null, was: null },
      { type: "DESSERT",   name: "Black Bean Avocado Brownies",         tag: "SWAPPED", was: "Tahini Choc Chip Cookies" },
      { type: "DINNER",    name: "One-pan Indian Style Fish",           tag: "SWAPPED", was: "One-pan Fish & Chickpeas" },
      { type: "LUNCH",     name: "Tuna 'Pancake' w/Egg",               tag: "SWAPPED", was: "Lunch Salad w/Salmon" },
      { type: "SNACK",     name: "Chickpea Choc Chip Blondies",         tag: "SWAPPED", was: "Black Bean Avocado Brownies" },
    ],
    selected: true,
  },
  {
    label: "Best for sodium",
    swaps: 5,
    metrics: [
      { name: "SODIUM",  value: "587",   unit: "mg", delta: "↓ 1,184", status: "ok" },
      { name: "PROTEIN", value: "95",    unit: "g",  delta: "↓ 24",    status: "off" },
    ],
    meals: [
      { type: "BREAKFAST", name: "Overnight Oats",                     tag: "SWAPPED", was: "Morning Shake" },
      { type: "DESSERT",   name: "Black Bean Avocado Brownies",         tag: "SWAPPED", was: "Tahini Choc Chip Cookies" },
      { type: "DINNER",    name: "Roasted Turmeric Cauliflower",        tag: "SWAPPED", was: "One-pan Fish & Chickpeas" },
      { type: "LUNCH",     name: "Tuna 'Pancake' w/Egg",               tag: "SWAPPED", was: "Lunch Salad w/Salmon" },
      { type: "SNACK",     name: "Chickpea Choc Chip Blondies",         tag: "SWAPPED", was: "Black Bean Avocado Brownies" },
    ],
    selected: false,
  },
  {
    label: "Closest to today",
    swaps: 1,
    metrics: [
      { name: "SODIUM",  value: "1,276", unit: "mg", delta: "↓ 495", status: "ok" },
      { name: "PROTEIN", value: "107",   unit: "g",  delta: "↓ 12",  status: "ok" },
    ],
    meals: [
      { type: "BREAKFAST", name: "Morning Shake – Choc Almond Butter", tag: null, was: null },
      { type: "DESSERT",   name: "Tahini Choc Chip Cookies",           tag: null, was: null },
      { type: "DINNER",    name: "One-pan Indian Style Fish",          tag: "SWAPPED", was: "One-pan Fish & Chickpeas" },
      { type: "LUNCH",     name: "Lunch Salad w/Salmon",              tag: null, was: null },
      { type: "SNACK",     name: "Black Bean Avocado Brownies",        tag: null, was: null },
    ],
    selected: false,
  },
];

export default function MobileOptimizerResults() {
  return (
    <div className="mres">
      <div className="mres-handle" />
      <div className="mres-nav">‹ Adjust options</div>

      <div className="mres-eyebrow">OPTIMIZE</div>
      <div className="mres-title">Three ways to optimize.</div>
      <div className="mres-targets">
        <span className="mres-tfor">OPTIMIZING FOR</span>
        <span className="mres-tval">SODIUM ↓</span>
        <span className="mres-tval">PROTEIN ↑</span>
        <span className="mres-tdot" />
        <span className="mres-tmeta">TUE, JUN 16 · JEN</span>
      </div>
      <div className="mres-today">
        <span className="mres-today-l">TODAY</span>
        <span className="mres-today-v">SODIUM <strong>1,771 mg</strong></span>
        <span className="mres-today-v">PROTEIN <strong>119 g</strong></span>
      </div>

      <div className="mres-cards">
        {VARIATIONS.map((v) => (
          <div key={v.label} className={`mres-card${v.selected ? " is-selected" : ""}`}>
            <div className="mres-card-head">
              <div>
                <span className="mres-card-label">{v.label}</span>
                <span className="mres-card-swaps">{v.swaps} swaps</span>
              </div>
              <span className={`mres-radio${v.selected ? " is-on" : ""}`} />
            </div>

            <div className="mres-metrics">
              {v.metrics.map((m) => (
                <div key={m.name} className="mres-metric">
                  <div className="mres-metric-head">
                    <span className="mres-metric-name">{m.name}</span>
                    <span className="mres-metric-delta">{m.delta}</span>
                  </div>
                  <span className={`mres-metric-val is-${m.status}`}>{m.value} <small>{m.unit}</small></span>
                </div>
              ))}
            </div>

            <div className="mres-card-meals">
              {v.meals.map((m) => (
                <div key={m.type} className="mres-cmeal">
                  <span className="mres-cmt">{m.type}</span>
                  <div className="mres-cmain">
                    <span className="mres-cmn">{m.name}</span>
                    {m.tag && <span className="mres-ctag">{m.tag}</span>}
                    {m.was && <span className="mres-cwas">was {m.was}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mres-cta">APPLY BEST BALANCE →</div>
      <div className="mres-ctasub">Replaces this day's meals · save as a template afterward</div>
    </div>
  );
}

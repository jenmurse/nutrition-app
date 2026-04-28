type Day = {
  d: string;
  n: string;
  kcal: string;
  meals: Array<{ t: string; n: string; k: string }>;
  on?: boolean;
};

const DAYS: Day[] = [
  {
    d: "Sun", n: "19", kcal: "1,824",
    meals: [
      { t: "Breakfast", n: "Overnight Oats", k: "363 kcal" },
      { t: "Lunch", n: "Trout Salad", k: "498 kcal" },
      { t: "Dinner", n: "Roasted Cauliflower and Lentils", k: "764 kcal" },
      { t: "Snack", n: "Protein Blondies", k: "199 kcal" },
    ],
  },
  {
    d: "Mon", n: "20", kcal: "1,540",
    meals: [
      { t: "Breakfast", n: "Overnight Oats", k: "363 kcal" },
      { t: "Lunch", n: "Trout Salad", k: "498 kcal" },
      { t: "Dinner", n: "Pan-seared Salmon", k: "561 kcal" },
      { t: "Side", n: "Mushrooms and Leeks", k: "118 kcal" },
    ],
  },
  {
    d: "Tue", n: "21", kcal: "1,602",
    meals: [
      { t: "Breakfast", n: "Overnight Oats", k: "363 kcal" },
      { t: "Lunch", n: "Tuna Salad", k: "596 kcal" },
      { t: "Dinner", n: "Noodle Bowl", k: "528 kcal" },
      { t: "Dessert", n: "Protein Blondies", k: "115 kcal" },
    ],
  },
  {
    d: "Wed", n: "22", kcal: "1,617",
    meals: [
      { t: "Breakfast", n: "Overnight Oats", k: "363 kcal" },
      { t: "Lunch", n: "Salmon Salad", k: "578 kcal" },
      { t: "Dinner", n: "Noodle Bowl", k: "676 kcal" },
    ],
  },
  {
    d: "Thu", n: "23", kcal: "1,522", on: true,
    meals: [
      { t: "Breakfast", n: "Overnight Oats", k: "363 kcal" },
      { t: "Lunch", n: "Trout Salad", k: "498 kcal" },
      { t: "Dinner", n: "Pan-seared Salmon", k: "561 kcal" },
      { t: "Dessert", n: "Protein Blondies", k: "115 kcal" },
    ],
  },
  {
    d: "Fri", n: "24", kcal: "1,720",
    meals: [
      { t: "Breakfast", n: "Overnight Oats", k: "363 kcal" },
      { t: "Lunch", n: "Salmon Salad", k: "578 kcal" },
      { t: "Dinner", n: "Roasted Cauliflower and Lentils", k: "662 kcal" },
      { t: "Snack", n: "Protein Blondies", k: "117 kcal" },
    ],
  },
  {
    d: "Sat", n: "25", kcal: "1,680",
    meals: [
      { t: "Breakfast", n: "Overnight Oats", k: "363 kcal" },
      { t: "Lunch", n: "Trout Salad", k: "498 kcal" },
      { t: "Dinner", n: "Pan-seared Salmon", k: "561 kcal" },
      { t: "Side", n: "Mushrooms and Leeks", k: "118 kcal" },
      { t: "Dessert", n: "Protein Blondies", k: "140 kcal" },
    ],
  },
];

const OPT_TABLE = [
  { nut: "Calories", old: "729 kcal", neu: "661 kcal", chg: "↓ 68 kcal", chgNone: false },
  { nut: "Fat", old: "21.3 g", neu: "20.9 g", chg: "—", chgNone: true },
  { nut: "Sodium", old: "217 mg", neu: "233 mg", chg: "—", chgNone: true },
  { nut: "Sugar", old: "10.9 g", neu: "7.75 g", chg: "↓ 3.2 g ✓", chgNone: false },
  { nut: "Protein", old: "49.2 g", neu: "48.4 g", chg: "—", chgNone: true },
  { nut: "Fiber", old: "17.0 g", neu: "15.4 g", chg: "—", chgNone: true },
];

export default function ChapterWeek() {
  return (
    <section className="ch" id="week">
      <div className="ch-head">
        <div>
          <span className="n">02 · The Week</span>
        </div>
        <div className="rt">Planner + AI</div>
      </div>

      <div className="ch-split reverse wide-viz">
        <div className="ch-text r">
          <h3 className="ch-h">
            One week.
            <br />
            Every person.
            <br />
            The whole <em>matrix.</em>
          </h3>

          <p className="ch-p">
            Good Measure was built for how people actually cook, whether it&apos;s for one person or a household. My husband and I cook out of the same kitchen but we have different bodies and different goals, so every person in the household has their own plan, their own targets, their own week — running against the shared recipe library. Drag a meal onto Tuesday; it counts for one person. Each plan stands on its own, and the shopping list builds itself from there.
          </p>

          <p className="ch-p">
            The AI part is the one I&apos;m most proud of. Good Measure connects to Claude (or any MCP-compatible agent) so you can hand it a goal — &ldquo;more protein at breakfast,&rdquo; &ldquo;keep Thursday under 1,800 calories, don&apos;t touch dinner&rdquo; — and it reads your whole week, suggests swaps from your actual pantry, and writes the changes back. Instead of optimizing a single recipe in isolation, it sees the matrix.
          </p>
        </div>

        <div className="ch-vis">
          <div className="ch-vis-sticky">
            <div className="iface">
              <div className="iface-top">
                <div className="lg">Good Measure</div>
                <div className="iface-tabs">
                  <span className="on">Planner</span>
                  <span>Recipes</span>
                  <span>Pantry</span>
                </div>
                <div>Apr 19–25</div>
              </div>

              <div className="plan">
                <div className="plan-strip" aria-hidden="true">
                  {DAYS.map((d) => (
                    <div key={d.n} className={`plan-strip-day${d.on ? " on" : ""}`}>
                      <span className="sn">{d.d}</span>
                      {d.n}
                    </div>
                  ))}
                </div>
                {DAYS.map((d) => (
                  <div key={d.n} className={`plan-col${d.on ? " on" : ""}`}>
                    <div className="plan-day">
                      <span className="d">{d.d}</span>
                      <span className="n">{d.n}</span>
                    </div>
                    <div className="plan-kcal">
                      {d.kcal}
                      <br />
                      kcal
                    </div>
                    {d.meals.map((m, i) => (
                      <div key={i} className="plan-meal">
                        <div className="t">{m.t}</div>
                        <div className="n">{m.n}</div>
                        <div className="k">{m.k}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="ch-caption">
              <span>Fig. 03 · Week</span>
              <span>A single person&apos;s plan</span>
            </div>

            <div className="iface">
              <div className="iface-top">
                <div className="lg">Good Measure</div>
                <div className="iface-tabs">
                  <span>Planner</span>
                  <span className="on">Recipes</span>
                  <span>Pantry</span>
                </div>
                <div>Optimization Notes</div>
              </div>

              <div className="opt">
                <div className="opt-h">
                  <div className="ttl">
                    Current Best Version <span className="check">✓</span>
                  </div>
                  <div className="tag">AI · claude</div>
                </div>

                <div className="opt-eyebrow">Changes from original (id:25)</div>

                <p className="opt-note">
                  <span className="swap">
                    Cherry tomatoes 200g <span className="arr">→</span> Canned diced, no salt (200g).
                  </span>{" "}
                  Better sauce body, lower natural sugar, consistent year-round. Saves ~2g sugar per serving.
                </p>

                <p className="opt-note">
                  <span className="swap">
                    Onion: 200g <span className="arr">→</span> 100g.
                  </span>{" "}
                  Halved from original. Onion is the primary sugar driver here. Ginger, garlic, and spices carry the flavor. Saves ~3g sugar per serving.
                </p>

                <p className="opt-note">
                  <b>Cashew milk retained.</b> Fairlife Fat-Free was trialled in id:107 but pushed sugar to 12.7g and sodium to 513mg per serving. Cashew remains correct for this recipe.
                </p>

                <div className="opt-eyebrow" style={{ marginTop: 18 }}>
                  Nutrition Comparison (per serving)
                </div>

                <div className="opt-table">
                  <div className="opt-trow hd">
                    <span className="nut">Nutrient</span>
                    <span>Original id:25</span>
                    <span>This version</span>
                    <span>Change</span>
                  </div>
                  {OPT_TABLE.map((row, i) => (
                    <div
                      key={row.nut}
                      className="opt-trow"
                      style={i === OPT_TABLE.length - 1 ? { borderBottom: "none" } : undefined}
                    >
                      <span className="nut">{row.nut}</span>
                      <span className="old">{row.old}</span>
                      <span className="new">{row.neu}</span>
                      <span className={`chg${row.chgNone ? " none" : ""}`}>{row.chg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ch-caption">
              <span>Fig. 04 · Optimize</span>
              <span>Editorial notes, not just numbers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

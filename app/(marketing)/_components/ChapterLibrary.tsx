type PanItem = {
  cat: string;
  name: string;
  serv: string;
  rows: Array<[string, string]>;
};

const PAN: PanItem[] = [
  {
    cat: "Nuts & Seeds",
    name: "Almond butter",
    serv: "2 Tbsp · 32 g",
    rows: [["kcal", "197"], ["fat", "18 g"], ["carbs", "6 g"], ["protein", "7 g"]],
  },
  {
    cat: "Baking",
    name: "Almond flour",
    serv: "¼ cup · 28 g",
    rows: [["kcal", "160"], ["fat", "14 g"], ["carbs", "6 g"], ["protein", "6 g"]],
  },
  {
    cat: "Produce",
    name: "Avocado",
    serv: "1 medium · 150 g",
    rows: [["kcal", "240"], ["fat", "22 g"], ["carbs", "13 g"], ["protein", "3 g"]],
  },
  {
    cat: "Pantry",
    name: "Black beans",
    serv: "½ cup · 120 g",
    rows: [["kcal", "114"], ["fat", "0.5 g"], ["carbs", "20 g"], ["protein", "8 g"]],
  },
];

const INGREDIENTS: Array<[string, string]> = [
  ["1 cup", "Almond flour"],
  ["2.25 cup", "Oats, raw"],
  ["1.25 cup", "Cashew milk"],
  ["0.25 cup", "Maple syrup"],
  ["1 tsp", "Almond extract"],
  ["4 Tbsp", "Butter"],
];

const NUTRITION: Array<{ l: string; v: string; cls?: string }> = [
  { l: "Calories", v: "380" },
  { l: "Fat", v: "14 g", cls: "lo" },
  { l: "Carbs", v: "56 g" },
  { l: "Sugar", v: "12 g", cls: "hi" },
  { l: "Protein", v: "11 g" },
  { l: "Fiber", v: "7 g", cls: "lo" },
];

export default function ChapterLibrary() {
  return (
    <section className="ch" id="library">
      <div className="ch-head">
        <div>
          <span className="n">§ The Library</span>
        </div>
        <div className="rt">Pantry + Recipes</div>
      </div>

      <div className="ch-split">
        <div className="ch-text r">
          <h3 className="ch-h">
            Every ingredient, to the gram.
            <br />
            Every recipe, calculated.
          </h3>

          <p className="ch-p">
            Every ingredient you cook with lives in a pantry you build once, with
            full nutrition from the USDA when it exists and from the package in
            front of you when it doesn&apos;t. Import a recipe or create one from
            scratch. Recipes draw from the pantry, so the numbers follow the
            ingredients. Change two tablespoons of olive oil to one and the recipe
            details update. Nutrition is calculated, not estimated.
          </p>
        </div>

        <div className="ch-vis">
          <div className="ch-vis-sticky">
            <div className="iface">
              <div className="iface-top">
                <div className="lg">Good Measure</div>
                <div className="iface-tabs">
                  <span>Planner</span>
                  <span>Recipes</span>
                  <span className="on">Pantry</span>
                </div>
                <div>224 items</div>
              </div>

              <div className="pan-grid">
                {PAN.map((p) => (
                  <div key={p.name} className="pan-cell">
                    <div className="pan-cat">{p.cat}</div>
                    <div className="pan-name">{p.name}</div>
                    <div className="pan-serv">{p.serv}</div>
                    <div className="pan-rows">
                      {p.rows.map(([l, v]) => (
                        <div key={l} className="pan-row">
                          <span className="l">{l}</span>
                          <span className="v">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ch-caption">
              <span>Fig. 01 · Pantry</span>
              <span>Measured to the gram</span>
            </div>

            <div className="iface">
              <div className="iface-top">
                <div className="lg">Good Measure</div>
                <div className="iface-tabs">
                  <span>Planner</span>
                  <span className="on">Recipes</span>
                  <span>Pantry</span>
                </div>
                <div>Dessert</div>
              </div>

              <div className="rec">
                <div className="rec-head">
                  <div className="rec-ttl">Almond Croissant Bars</div>
                  <div className="rec-meta">
                    <span className="r1">9 Servings</span>
                    <span className="r2">per-serving values</span>
                  </div>
                </div>

                <div className="rec-body">
                  <div className="rec-col">
                    <div className="rec-h">Ingredients</div>
                    {INGREDIENTS.map(([q, n]) => (
                      <div key={n} className="rec-ing">
                        <span className="q">{q}</span>
                        <span className="n">{n}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rec-div" />

                  <div className="rec-col">
                    <div className="rec-h">Nutrition</div>
                    <div className="rec-nut">
                      {NUTRITION.map((n) => (
                        <div key={n.l} className={`rec-nrow${n.cls ? ` ${n.cls}` : ""}`}>
                          <span className="l">{n.l}</span>
                          <span className="bar" aria-hidden="true" />
                          <span className="v">{n.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ch-caption">
              <span>Fig. 02 · Recipe</span>
              <span>Calculated, not estimated</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

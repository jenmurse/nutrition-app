import LandingFigure from "./LandingFigure";

export default function ChapterOptimization() {
  return (
    <section className="ch" id="optimization">
      <div className="ch-head">
        <div>
          <span className="n">§ The Optimization</span>
        </div>
      </div>

      <div className="ch-split">
        <div className="ch-text r">
          <h3 className="ch-h">
            Set a goal.
            <br />
            Get a new version.
          </h3>

          <p className="ch-p">
            Good Measure connects to any MCP-compatible AI assistant. Hand it a
            goal such as &ldquo;lower the sodium on Monday&apos;s dinner&rdquo;
            or &ldquo;more fiber across the week,&rdquo; and it works from your
            real pantry and recipes, not a generic database. It returns specific
            swaps with the math attached. Cut the miso paste from 4 tsp to 2 tsp.
            Swap to no-salt cannellini beans. Drop the recipe from 1,858mg sodium
            to about 950mg. You approve the change and Good Measure writes the new
            version into your library. You can optimize a single recipe or a whole
            week, and because Good Measure talks to the agent you don&apos;t have
            to do any of the fussy edits.
          </p>
        </div>

        <div className="ch-vis">
          <div className="ch-vis-sticky">
            <LandingFigure
              slug="fig-05-optimization"
              alt="Good Measure optimization notes — AI-suggested swaps with before/after nutrition comparison"
              caption="Fig. 05 · Optimization Notes"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

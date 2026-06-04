import LandingFigure from "./LandingFigure";

export default function ChapterLibrary() {
  return (
    <section className="ch" id="library">
      <div className="ch-head">
        <div>
          <span className="n">§ The Library</span>
        </div>
      </div>

      <div className="ch-split">
        <div className="ch-text r">
          <h3 className="ch-h">
            Every ingredient, to the gram.
            <br />
            Every recipe,<br className="mob-br" /> calculated.
          </h3>

          <p className="ch-p">
            Every ingredient you cook with lives in a pantry. Common staples are
            there from day one — over a hundred USDA-sourced items so most
            recipes match against something real on first import. You add
            anything specific to how you cook, with full nutrition from the
            USDA when it exists, and from the package in front of you when it
            doesn&apos;t. Recipes draw from the pantry, so the numbers follow
            the ingredients. Change two tablespoons of olive oil to one and the
            recipe details update automatically.
          </p>
        </div>

        <div className="ch-vis">
          <div className="ch-vis-sticky">
            <LandingFigure
              slug="fig-01-pantry"
              alt="Good Measure pantry — grid of ingredients with full nutrition per serving"
              caption="Fig. 01 · Pantry"
            />

            <LandingFigure
              slug="fig-02-recipe"
              alt="Good Measure recipe — ingredients and nutrition for Almond Croissant Bars"
              caption="Fig. 02 · Recipe"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

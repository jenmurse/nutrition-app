import LandingFigure from "./LandingFigure";

export default function ChapterWeek() {
  return (
    <section className="ch" id="week">
      <div className="ch-head">
        <div>
          <span className="n">§ The Week</span>
        </div>
      </div>

      <div className="ch-split reverse">
        <div className="ch-text r">
          <h3 className="ch-h">
            One week.
            <br />
            Every person.
            <br />
            The whole matrix.
          </h3>

          <p className="ch-p">
            Good Measure was built for people who want more control over what they
            cook, whether it&apos;s for one person or a household. My husband and I
            cook from the same kitchen but we have different needs and goals.
            Every person in the household has their own plan and their own targets
            running against the shared recipe and pantry library. You can add a
            meal for one person or the entire household.
          </p>

          <p className="ch-p">
            Once the week is planned, the shopping list writes itself. Every
            ingredient from every recipe, grouped by where you&apos;ll find it in
            the store. Quantities are scaled to the servings you&apos;re actually
            making, down to the gram. Check things off as you shop. Share the list
            with whoever&apos;s going.
          </p>

          <p className="ch-p">
            When a day pulls clean — calories right, protein on, fiber where it
            should be — save it as a template. Apply it to any future day with
            one click, or build a rotation from the handful of days that
            consistently work.
          </p>
        </div>

        <div className="ch-vis">
          <div className="ch-vis-sticky">
            <LandingFigure
              slug="fig-03-planner"
              alt="Good Measure weekly planner — seven days of meals with calorie totals per person"
              caption="Fig. 03 · Weekly Plan"
            />

            <LandingFigure
              slug="fig-04-shopping"
              alt="Good Measure shopping list — produce, meat, and dairy grouped by store section"
              caption="Fig. 04 · Shopping list"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

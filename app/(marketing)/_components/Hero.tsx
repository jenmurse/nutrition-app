export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-meta">
        <div className="c">Good Measure</div>
        <div className="rt">A nutrition &amp; meal planning tool</div>
      </div>

      <h1 className="hero-type r">
        Measure what matters.
      </h1>

      <div className="hero-bottom r d1">
        <p className="hero-lede">
          For years I ran my household with two tools. A spreadsheet for nutrition,
          a recipe app for dinner. Neither one knew about the other. Good Measure
          is the version of that setup where the two halves finally talk. Your
          pantry, your recipes, your week. Calculated to the gram, planned as a
          system, optimized with AI.
        </p>
        <div className="hero-ctas">
          <a href="/login?signup=1" className="btn">
            Get Started <span className="arr" aria-hidden="true">↗</span>
          </a>
          <a href="#manifesto" className="btn ghost js-see-how">
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

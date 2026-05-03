export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-meta">
        <div className="c">§ Nutrition &amp; Meal Planning Tool</div>
      </div>

      <h1 className="hero-type r">
        Measure<br />what matters.
      </h1>

      <div className="hero-bottom r d1">
        <p className="hero-lede">
          For years I ran my meal planning and recipe creation with two tools, a
          spreadsheet for nutrition and an app for recipes. They lived independently
          from each other. Good Measure is the version of that setup where the two
          halves overlap. Your pantry, your recipes, your week of meals. All
          calculated to the gram, planned as a system, and optimized with AI.
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

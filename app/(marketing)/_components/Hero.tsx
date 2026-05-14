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
          Most nutrition apps log what you eat. Most recipe apps store what you cook. Good Measure puts the two together. A single tool for your pantry, your recipes, and your week of meals. One ingredient library, nutrition calculated to the gram, and plans optimized with AI.
        </p>
        <div className="hero-ctas">
          <a href="/waitlist" className="btn">
            Join waitlist <span className="arr" aria-hidden="true">↗</span>
          </a>
          <a href="#library" className="btn ghost js-see-how">
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

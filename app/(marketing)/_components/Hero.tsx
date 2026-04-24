export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-meta">
        <div className="c">Good Measure</div>
        <div className="rt">A nutrition &amp; meal planning tool</div>
      </div>

      <h1 className="hero-type r">
        <span>A nutrition app</span>
        <span className="thin">for people who</span>
        <span>
          <em>actually</em> cook.
        </span>
      </h1>

      <div className="hero-bottom r d1">
        <p className="hero-lede">
          For years I ran my household on two tools: a spreadsheet for nutrition, a recipe app for dinner. Neither one knew about the other.{" "}
          <strong>Good Measure is the version of that setup where the two halves finally talk.</strong> Your pantry, your recipes, your week — measured to the gram, planned as a system, optimized by an AI that reads the whole week instead of one meal at a time.
        </p>
        <div className="hero-ctas">
          <a href="/login" className="btn">
            Get Started <span className="arr" aria-hidden="true">↗</span>
          </a>
          <a href="#manifesto" className="btn ghost">
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

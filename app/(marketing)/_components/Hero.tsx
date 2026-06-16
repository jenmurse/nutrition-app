import Link from "next/link";

export default function Hero() {
  return (
    <section className="ln-hero">
      <span className="ln-hero-eyebrow">A nutrition &amp; meal-planning tool</span>
      <h1>
        Measure
        <br />
        what matters.
      </h1>
      <div className="ln-hero-bottom">
        <p className="ln-hero-sub">
          Most nutrition apps log what you eat. Most recipe apps store what you cook. Good Measure puts the two together. Everything you cook lives in one library, the nutrition calculates to the gram, and when a day needs work, one tap fixes it.
        </p>
        <div className="ln-hero-ctas">
          <a className="ed-btn-outline" href="#scn01">See how it works ↓</a>
          <Link className="ed-btn-primary" href="/invite">I have an invite →</Link>
        </div>
      </div>
    </section>
  );
}

export default function Close() {
  return (
    <section className="close">
      <div className="close-head">
        <div>
          <span className="n">§ Invitation</span>
        </div>
      </div>

      <div className="close-grid">
        <h3 className="close-h cl-h">
          If this sounds like how you want to cook, I&apos;d like you to try it.
        </h3>

        <div className="close-body">
          <p className="cl-body">
            I built Good Measure for myself first, and I cook from it every day.
            Now it&apos;s here for you to try.
          </p>
          <div className="close-sig cl-sig">— Jen Murse, Good Measure</div>
          <div className="close-cta cl-cta">
            <a href="/login?signup=1" className="btn">
              Get Started <span className="arr" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

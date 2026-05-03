export default function Close() {
  return (
    <section className="close">
      <div className="close-head">
        <div>
          <span className="n">§ Invitation</span>
        </div>
      </div>

      <div className="close-col">
        <h2 className="close-h cl-h">
          Cook by the gram.<br />Plan by the week.
        </h2>
        <div className="close-body">
          <p className="cl-body">
            I built Good Measure for myself first, and I cook with it every day.
            Now it&apos;s here for you to try.
          </p>
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

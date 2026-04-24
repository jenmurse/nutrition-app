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
          If this sounds like how you&apos;d want to cook, I&apos;d like you to try it.
        </h3>

        <div className="close-body">
          <p className="cl-body">
            Good Measure is early, and it&apos;s mine first — I cook from it every day.
            I&apos;m sharing it now with people who want more control over what ends up
            on the plate, and who don&apos;t mind that it&apos;s still finding its shape.
            If that&apos;s you, come in.
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

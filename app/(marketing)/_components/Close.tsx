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
            I built Good Measure for myself and I use it every day. If you have
            been looking for something that can give you more control over what you
            eat, it&apos;s here for you to try. Right now it&apos;s invite-only for friends and family.
          </p>
          <div className="close-cta cl-cta" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a href="/invite" className="btn">
              I have an invite <span className="arr" aria-hidden="true">↗</span>
            </a>
            <a href="/waitlist" className="btn ghost">
              Join waitlist
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

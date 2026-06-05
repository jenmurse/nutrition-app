import Link from "next/link";

export default function Close({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <section className="ln-close">
      <span className="ln-eyebrow">{eyebrow}</span>
      <h2>{headline}</h2>
      <div className="ln-close-grid">
        <div>
          <p>{body}</p>
        </div>
        <div className="ln-close-ctas">
          <Link className="ed-btn-outline" href="/waitlist">Join waitlist</Link>
          <Link className="ed-btn-primary" href="/invite">I have an invite →</Link>
        </div>
      </div>
    </section>
  );
}

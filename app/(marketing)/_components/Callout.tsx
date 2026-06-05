export default function Callout({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <section className="ln-callout">
      <div>
        <span className="ln-eyebrow">{eyebrow}</span>
        <h3>{headline}</h3>
      </div>
      <div className="ln-callout-right">
        <p>{body}</p>
      </div>
    </section>
  );
}

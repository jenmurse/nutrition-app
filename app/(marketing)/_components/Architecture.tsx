export default function Architecture({
  eyebrow,
  headline,
  body,
}: {
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <section className="ln-why">
      <span className="ln-eyebrow">{eyebrow}</span>
      <h2>{headline}</h2>
      <p>{body}</p>
    </section>
  );
}

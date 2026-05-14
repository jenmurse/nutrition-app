const CLAIMS = [
  { n: "01", label: "Calculated, not estimated" },
  { n: "02", label: "Measured to the gram" },
  { n: "03", label: "Planned by the week" },
  { n: "04", label: "Optimized by goal" },
];

export default function Ticker() {
  return (
    <div className="claims">
      {CLAIMS.map(({ n, label }) => (
        <span key={n} className="claims-item">
          <span className="claims-n" aria-hidden="true">{n}</span>
          {label}
        </span>
      ))}
    </div>
  );
}

const CLAIMS = [
  "Calculated, not estimated",
  "Measured to the gram",
  "Planned by the week",
  "Optimized by goal",
];

export default function Ticker() {
  return (
    <div className="claims">
      {CLAIMS.map((label) => (
        <span key={label} className="claims-item">{label}</span>
      ))}
    </div>
  );
}

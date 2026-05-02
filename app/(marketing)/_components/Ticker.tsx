const PHRASES = [
  "Calculated, not estimated",
  "Measured to the gram",
  "Planned by the week",
  "Optimized by goal",
];

export default function Ticker() {
  const doubled = [...PHRASES, ...PHRASES];
  return (
    <div className="tick" aria-hidden="true">
      <div className="tick-track">
        {doubled.map((p, i) => (
          <span key={i}>{p}</span>
        ))}
      </div>
    </div>
  );
}

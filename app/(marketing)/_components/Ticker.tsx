const PHRASES = [
  "Measured to the gram",
  "Calculated, not estimated",
  "Optimized by AI",
  "Built for people who cook",
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

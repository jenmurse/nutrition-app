type Tile = { label: string; hint: string };

export default function Interstitial({ tiles }: { tiles: Tile[] }) {
  return (
    <section className="ln-interstitial">
      <div className="ln-interstitial-grid">
        {tiles.map((t, i) => (
          /* SCREENSHOT SLOT: food photo for interstitial tile "${t.label}" */
          <div key={i} className="ln-interstitial-tile">
            <span className="ln-lbl">{t.label}</span>
            <div className="ln-hint" dangerouslySetInnerHTML={{ __html: t.hint }} />
          </div>
        ))}
      </div>
    </section>
  );
}

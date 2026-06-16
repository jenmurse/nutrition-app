type Tile = { label: string; hint: string; src?: string; alt?: string };

export default function Interstitial({ tiles }: { tiles: Tile[] }) {
  return (
    <section className="ln-interstitial">
      <div className="ln-interstitial-grid">
        {tiles.map((t, i) => (
          /* SCREENSHOT SLOT: food photo for interstitial tile "${t.label}" */
          <div key={i} className="ln-interstitial-tile">
            {t.src ? (
              <img className="ln-tile-img" src={t.src} alt={t.alt ?? t.label} />
            ) : (
              <>
                <div className="ln-hint" dangerouslySetInnerHTML={{ __html: t.hint }} />
                <span className="ln-lbl">{t.label}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

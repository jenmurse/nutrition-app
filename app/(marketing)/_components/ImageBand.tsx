type Tile = { label: string; hint: string; src?: string; alt?: string };

export default function ImageBand({ tiles }: { tiles: Tile[] }) {
  return (
    <section className="ln-imgband">
      <div className="ln-imgband-grid">
        {tiles.map((t, i) => (
          <div key={i} className="ln-imgband-tile">
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

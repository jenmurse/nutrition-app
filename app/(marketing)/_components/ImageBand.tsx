type Tile = { label: string; hint: string };

export default function ImageBand({ tiles }: { tiles: Tile[] }) {
  return (
    <section className="ln-imgband">
      <div className="ln-imgband-grid">
        {tiles.map((t, i) => (
          /* SCREENSHOT SLOT: food photo for tile "${t.label}" */
          <div key={i} className="ln-imgband-tile">
            <span className="ln-lbl">{t.label}</span>
            <div className="ln-hint" dangerouslySetInnerHTML={{ __html: t.hint }} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* Renders a landing figure as an image inside the .iface frame.
   Swaps desktop ↔ mobile asset at 760px breakpoint via <picture>. */

type Props = {
  /** filename stem under /public/landing — e.g. "fig-01-pantry" */
  slug: string;
  /** alt text for the image */
  alt: string;
  /** caption text — e.g. "Fig. 01 · Pantry" */
  caption: string;
};

export default function LandingFigure({ slug, alt, caption }: Props) {
  return (
    <>
      <div className="iface iface-img" aria-hidden="false">
        <picture>
          <source
            media="(max-width: 760px)"
            srcSet={`/landing/${slug}-mobile.png`}
          />
          <img src={`/landing/${slug}-desktop.png`} alt={alt} draggable={false} />
        </picture>
      </div>
      <div className="ch-caption">
        <span>{caption}</span>
      </div>
    </>
  );
}

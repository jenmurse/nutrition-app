"use client";

// A sticky scenario: the scenario head, then a two-column track — beats scroll
// on one side while a single big app-window stays pinned on the other and
// cross-fades through the beats' visuals as they become active. Compact (one
// pinned stage, not N stacked sections) and focused.
//
// On mobile the sticky stage is hidden; each beat renders its own mobileVisual
// inline above the beat text.

import { useEffect, useRef, useState, type ReactNode } from "react";

type Beat = { eyebrow: string; heading: string; body: string; prompt?: string; visual: ReactNode; mobileVisual?: ReactNode };

export default function StickyScene({
  id,
  num,
  headline,
  lede,
  beats,
}: {
  id: string;
  num: string;
  headline: string;
  lede: string;
  beats: Beat[];
}) {
  const [active, setActive] = useState(0);
  const [reached, setReached] = useState(false);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = beatRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(Number((e.target as HTMLElement).dataset.beat));
            setReached(true);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [beats.length]);

  return (
    <section className="ln-scn ss" id={id} data-reached={reached || undefined}>
      <div className="ln-scn-head">
        <span className="ln-scn-num">{num}</span>
        <h2>{headline}</h2>
        <p className="ln-lede">{lede}</p>
      </div>

      <div className="ss-track">
        {/* Desktop: sticky cross-fading stage */}
        <div className="ss-stagecol">
          <div className="ss-stage">
            {beats.map((b, i) => (
              <div
                key={i}
                className={`ss-state${i === active ? " is-active" : ""}`}
              >
                {b.visual}
              </div>
            ))}
          </div>
        </div>

        <div className="ss-beats">
          {beats.map((b, i) => (
            <div
              key={i}
              ref={(el) => {
                beatRefs.current[i] = el;
              }}
              className="ss-beat"
              data-beat={i}
            >
              {/* Mobile: inline visual per beat */}
              {b.mobileVisual && (
                <div className="ss-beat-vis">{b.mobileVisual}</div>
              )}
              <span className="ln-eyebrow">{b.eyebrow}</span>
              <h3>{b.heading}</h3>
              <p>{b.body}</p>
              {b.prompt && <div className="ss-prompt">{b.prompt}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

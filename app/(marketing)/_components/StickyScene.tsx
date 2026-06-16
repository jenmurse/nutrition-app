"use client";

// A sticky scenario: the scenario head, then a two-column track — beats scroll
// on one side while a single big app-window stays pinned on the other and
// cross-fades through the beats' visuals as they become active. Compact (one
// pinned stage, not N stacked sections) and focused.

import { useEffect, useRef, useState, type ReactNode } from "react";

type Beat = { eyebrow: string; heading: string; body: string; visual: ReactNode };

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
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stateRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = beatRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.beat));
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [beats.length]);

  // Scroll-linked camera: set --cam (0→1) on each state from how centered its
  // beat is, so visuals that read var(--cam) (the planner) push in as you reach
  // them. Applied via style mutation (no React re-render of the big planner DOM).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const vh = window.innerHeight;
      const vc = vh / 2;
      beatRefs.current.forEach((bel, i) => {
        const stEl = stateRefs.current[i];
        if (!bel || !stEl) return;
        const r = bel.getBoundingClientRect();
        const center = r.top + r.height / 2;
        // Two-phase camera scan, driven by how far the beat is scrolled up past
        // center (full at 0). Phase 1 (zoom, p 0→0.5): push into the Tuesday
        // column on the meals. Phase 2 (pan, p 0.5→1): scan down the column to the
        // nutrition totals. Both hold at 1, so it cross-fades zoomed (no reverse).
        const p = Math.max(0, Math.min(1, (vc - center) / (vh * 0.32)));
        const zoom = Math.min(1, p / 0.4);
        const pan = Math.max(0, (p - 0.4) / 0.6);
        stEl.style.setProperty("--zoom", zoom.toFixed(3));
        stEl.style.setProperty("--pan", pan.toFixed(3));
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    // Capture phase so we catch scroll from whatever element actually scrolls
    // (the marketing page scrolls inside a nested container, not the window).
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [beats.length]);

  return (
    <section className="ln-scn ss" id={id}>
      <div className="ln-scn-head">
        <span className="ln-scn-num">{num}</span>
        <h2>{headline}</h2>
        <p className="ln-lede">{lede}</p>
      </div>

      <div className="ss-track">
        <div className="ss-stagecol">
          <div className="ss-stage">
            {beats.map((b, i) => (
              <div
                key={i}
                ref={(el) => {
                  stateRefs.current[i] = el;
                }}
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
              <span className="ln-eyebrow">{b.eyebrow}</span>
              <h3>{b.heading}</h3>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

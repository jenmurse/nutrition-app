"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

type Beat = {
  step: string;
  tag: string;
  heading: string;
  body: string;
  prompt?: string;
};

export default function Scenario({
  id,
  num,
  headline,
  lede,
  beats,
  states,
}: {
  id: string;
  num: string;
  headline: string;
  lede: string;
  beats: Beat[];
  /** Parallel array to beats — the placeholder/screenshot JSX shown
   *  in the sticky stage (desktop) and inline beat-shot (mobile). */
  states: ReactNode[];
}) {
  const [active, setActive] = useState(0);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shotRefs = useRef<(HTMLDivElement | null)[]>([]);

  if (beats.length !== states.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `Scenario ${id}: beats (${beats.length}) and states (${states.length}) length mismatch`
    );
  }

  // Desktop: which beat is centered → which stage state is active
  useEffect(() => {
    const els = beatRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.beat);
            setActive(i);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [beats.length]);

  // Mobile beat-shot reveal
  useEffect(() => {
    const els = shotRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      },
      { threshold: 0.2 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [beats.length]);

  return (
    <section className="ln-scn" id={id}>
      <div className="ln-scn-head">
        <span className="ln-scn-num">{num}</span>
        <h2>{headline}</h2>
        <p className="ln-lede">{lede}</p>
      </div>

      <div className="ln-scn-track">
        <div className="ln-stage-col">
          <div className="ln-stage">
            {states.map((node, i) => (
              <div
                key={i}
                className={`ln-state${i === active ? " is-active" : ""}`}
              >
                <span className="ln-state-tag">
                  <span className="ln-step">{beats[i]?.step}</span> {beats[i]?.tag}
                </span>
                {node}
              </div>
            ))}
          </div>
        </div>

        <div className="ln-beats-col">
          {beats.map((b, i) => (
            <div
              key={i}
              ref={(el) => { beatRefs.current[i] = el; }}
              className="ln-beat"
              data-beat={i}
            >
              <span className="ln-beat-tag">
                <span className="ln-step">{b.step}</span> {b.tag}
              </span>
              <h3>{b.heading}</h3>
              <p>{b.body}</p>
              {b.prompt && <div className="ln-prompt">{b.prompt}</div>}
              <div
                ref={(el) => { shotRefs.current[i] = el; }}
                className="ln-beat-shot"
              >
                <span className="ln-state-tag">
                  <span className="ln-step">{b.step}</span> {b.tag}
                </span>
                {states[i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

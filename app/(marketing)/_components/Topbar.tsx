"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Sticky topbar. Hidden chrome (no CTAs, no hairline, larger wordmark)
 * while the hero is in view. Full chrome once scrolled past — wordmark
 * shrinks, CTAs fade in, hairline appears. Observer watches `.ln-hero`.
 */
export default function Topbar() {
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".ln-hero");
    if (!hero) return;
    const obs = new IntersectionObserver(
      ([entry]) => setEngaged(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  return (
    <div className={`ln-topbar${engaged ? " is-engaged" : ""}`}>
      <div className="ln-wm">Good Measure</div>
      <div className={`ln-topbar-right${engaged ? " is-visible" : ""}`}>
        <Link className="ln-nav-link" href="/invite">Have a code? →</Link>
        <Link className="ln-nav-link" href="/login">Sign in →</Link>
      </div>
    </div>
  );
}

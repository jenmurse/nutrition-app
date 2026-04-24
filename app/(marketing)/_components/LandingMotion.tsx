"use client";

import { useEffect } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   LANDING MOTION LAYER
   All animations respect prefers-reduced-motion.
   Scroll-triggered via .mkt scroll event (not IntersectionObserver) so
   it works correctly with .mkt as the scroll container.
   ─────────────────────────────────────────────────────────────────────────
*/

/* Is el visible within the .mkt scroll container? */
function inView(el: HTMLElement, container: HTMLElement, margin = 0.08): boolean {
  const elTop = el.getBoundingClientRect().top;
  const containerH = container.getBoundingClientRect().height;
  return elTop < containerH * (1 - margin) && elTop + el.offsetHeight > 0;
}

/* Smooth scroll with custom duration and cubic-out easing */
function smoothScrollTo(container: HTMLElement, targetY: number, duration: number) {
  const startY = container.scrollTop;
  const delta = targetY - startY;
  const startTime = performance.now();
  const tick = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    container.scrollTop = startY + delta * eased;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Count up a numeric value in an element */
function countUp(el: HTMLElement, finalText: string, duration: number) {
  const match = finalText.match(/^([↓↑]?\s*)([\d.]+)(.*)/);
  if (!match) return;
  const [, prefix, numStr, suffix] = match;
  const final = parseFloat(numStr);
  if (isNaN(final)) return;
  const decimals = (numStr.split(".")[1] ?? "").length;
  const startTime = performance.now();
  const tick = (now: number) => {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${prefix}${(final * eased).toFixed(decimals)}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = finalText;
  };
  requestAnimationFrame(tick);
}

export default function LandingMotion() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced motion: make everything visible immediately
    if (prefersReduced) {
      document
        .querySelectorAll<HTMLElement>(
          ".mkt .r, .mkt .ml, .mkt .pql, .mkt .cl-h, .mkt .cl-body, .mkt .cl-sig, .mkt .cl-cta"
        )
        .forEach((el) => el.classList.add("in"));
      return;
    }

    const container = document.querySelector<HTMLElement>(".mkt");
    if (!container) return;

    // ── "See how it works" custom scroll ──
    const seeHow = document.querySelector<HTMLElement>(".mkt .js-see-how");
    if (seeHow) {
      seeHow.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.querySelector<HTMLElement>(".mkt .manifesto");
        if (!target) return;
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scrollTarget = container.scrollTop + (targetRect.top - containerRect.top) - 64;
        smoothScrollTo(container, scrollTarget, 800);
      });
    }

    // ── Scroll-triggered reveals ──

    // Tracks whether each reveal has already fired (avoids re-firing)
    const revealed = new WeakSet<Element>();

    function checkReveals() {
      // 2. Basic .r reveals
      document.querySelectorAll<HTMLElement>(".mkt .r:not(.in)").forEach((el) => {
        if (inView(el, container) && !revealed.has(el)) {
          revealed.add(el);
          el.classList.add("in");
        }
      });

      // 3. Manifesto lines
      const maniLines = document.querySelectorAll<HTMLElement>(".mkt .manifesto .ml:not(.in)");
      if (maniLines.length && !revealed.has(maniLines[0])) {
        if (inView(maniLines[0], container, 0.15)) {
          revealed.add(maniLines[0]);
          Array.from(maniLines).forEach((line, i) => {
            const isPayoff = line.classList.contains("pay");
            setTimeout(() => line.classList.add("in"), i * 120 + (isPayoff ? 60 : 0));
          });
        }
      }

      // 4. Pull-quote lines
      const pqLines = document.querySelectorAll<HTMLElement>(".mkt .pql:not(.in)");
      if (pqLines.length && !revealed.has(pqLines[0])) {
        if (inView(pqLines[0], container, 0.1)) {
          revealed.add(pqLines[0]);
          Array.from(pqLines).forEach((line, i) => {
            setTimeout(() => line.classList.add("in"), i * 200);
          });
        }
      }

      // 5. Figure captions
      document.querySelectorAll<HTMLElement>(".mkt .ch-caption").forEach((caption) => {
        if (revealed.has(caption)) return;
        const figure = caption.previousElementSibling as HTMLElement | null;
        if (figure && inView(figure, container, 0)) {
          revealed.add(caption);
          setTimeout(() => {
            caption.style.opacity = "1";
            caption.style.transform = "translateY(0)";
          }, 200);
        }
      });

      // 6. Optimization table count-up
      const table = document.querySelector<HTMLElement>(".mkt .opt-table");
      if (table && !revealed.has(table) && inView(table, container, 0.05)) {
        revealed.add(table);
        const dataRows = Array.from(
          table.querySelectorAll<HTMLElement>(".opt-trow:not(.hd)")
        );
        // Snapshot originals before hiding
        const originals = dataRows.map((row) =>
          Array.from(row.querySelectorAll("span")).map((c) => c.textContent ?? "")
        );
        dataRows.forEach((row) => {
          row.style.opacity = "0";
          row.style.transform = "translateY(10px)";
          row.style.transition = "opacity 400ms ease, transform 400ms ease";
        });
        setTimeout(() => {
          dataRows.forEach((row, rowIdx) => {
            const isPayoff = rowIdx === 0 || rowIdx === 3;
            setTimeout(() => {
              row.style.opacity = "1";
              row.style.transform = "translateY(0)";
              Array.from(row.querySelectorAll("span")).forEach((cell, ci) => {
                if (ci > 0) countUp(cell as HTMLElement, originals[rowIdx][ci], isPayoff ? 1400 : 1000);
              });
            }, rowIdx * 80);
          });
        }, 50);
      }

      // 7. Close section
      const clH = document.querySelector<HTMLElement>(".mkt .cl-h:not(.in)");
      if (clH && !revealed.has(clH) && inView(clH, container, 0.1)) {
        revealed.add(clH);
        clH.classList.add("in");
        ([
          [".mkt .cl-body", 200],
          [".mkt .cl-sig", 420],
          [".mkt .cl-cta", 580],
        ] as [string, number][]).forEach(([sel, delay]) => {
          setTimeout(() => {
            document.querySelector<HTMLElement>(sel)?.classList.add("in");
          }, delay);
        });
      }
    }

    // ── Figure parallax (desktop only) ──
    if (window.matchMedia("(min-width: 1100px)").matches) {
      container.addEventListener("scroll", () => {
        document.querySelectorAll<HTMLElement>(".mkt .ch").forEach((ch) => {
          const sticky = ch.querySelector<HTMLElement>(".ch-vis-sticky");
          if (!sticky) return;
          const rect = ch.getBoundingClientRect();
          const scrolled = -rect.top;
          sticky.style.transform = scrolled > 0 && rect.bottom > 0
            ? `translateY(${scrolled * 0.05}px)`
            : "";
        });
      }, { passive: true });
    }

    // ── Set initial hidden state for captions ──
    document.querySelectorAll<HTMLElement>(".mkt .ch-caption").forEach((c) => {
      c.style.opacity = "0";
      c.style.transform = "translateY(8px)";
      c.style.transition = "opacity 500ms ease, transform 500ms ease";
    });

    // ── Run once on mount for above-fold elements, then on scroll ──
    checkReveals();
    container.addEventListener("scroll", checkReveals, { passive: true });

    return () => {
      container.removeEventListener("scroll", checkReveals);
    };
  }, []);

  return null;
}

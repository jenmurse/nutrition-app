"use client";

import { useEffect, useRef } from "react";

/**
 * Custom cursor — single dot that expands on interactive elements.
 * Matches portfolio site behaviour: grows + uses accent color with
 * mix-blend-mode: multiply on hover over links/buttons.
 * Only renders on pointer:fine devices (no touch).
 */
export default function CustomCursor() {
  const curRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const cur = curRef.current;
    if (!cur) return;

    const onMove = (e: MouseEvent) => {
      cur.style.left = `${e.clientX}px`;
      cur.style.top = `${e.clientY}px`;
    };

    const getAccent = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5A9B6A';

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const isInteractive = el.closest("a[href], button, [role='button'], input, select, textarea, label");
      if (isInteractive) {
        cur.style.background = getAccent();
        cur.classList.add("on-link");
      } else {
        cur.style.background = '';
        cur.classList.remove("on-link");
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
    };
  }, []);

  return (
    <div
      ref={curRef}
      aria-hidden="true"
      className="cursor-el cursor-dot fixed pointer-events-none z-[10001]"
    />
  );
}

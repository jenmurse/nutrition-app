"use client";

import { useEffect, useRef } from "react";

/**
 * Editorial custom cursor — dot + ring that follows the mouse.
 * Ring expands on interactive elements, shows "View" label on cards.
 * Only renders on pointer:fine devices (no touch).
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only on devices with a fine pointer (mouse/trackpad)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    // Hide default cursor
    document.body.style.cursor = "none";

    let mx = 0, my = 0;
    let rx = 0, ry = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;
    };

    // Smooth ring follow
    let raf: number;
    const follow = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      label.style.left = `${rx}px`;
      label.style.top = `${ry + 24}px`;
      raf = requestAnimationFrame(follow);
    };

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const isBtn = el.closest("button, a, [role='button'], input, select, textarea, label");
      const isCard = el.closest("[data-cursor='card']");
      if (isCard) {
        ring.style.width = "56px";
        ring.style.height = "56px";
        ring.style.borderColor = "var(--accent)";
        dot.style.background = "var(--accent)";
        label.style.opacity = "1";
      } else if (isBtn) {
        ring.style.width = "40px";
        ring.style.height = "40px";
        ring.style.borderColor = "var(--fg)";
        dot.style.background = "var(--fg)";
        label.style.opacity = "0";
      } else {
        ring.style.width = "32px";
        ring.style.height = "32px";
        ring.style.borderColor = "var(--fg)";
        dot.style.background = "var(--fg)";
        label.style.opacity = "0";
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    raf = requestAnimationFrame(follow);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="fixed pointer-events-none z-[9998]"
        style={{
          width: 5, height: 5,
          background: "var(--fg)",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          transition: "background 0.2s",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="fixed pointer-events-none z-[9997]"
        style={{
          width: 32, height: 32,
          border: "1.5px solid var(--fg)",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1), border-color 0.2s",
        }}
      />
      <div
        ref={labelRef}
        aria-hidden="true"
        className="fixed pointer-events-none z-[9997]"
        style={{
          transform: "translate(-50%, -50%)",
          fontFamily: "'DM Mono', monospace",
          fontSize: 7,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: "var(--accent)",
          opacity: 0,
          transition: "opacity 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        View
      </div>
    </>
  );
}

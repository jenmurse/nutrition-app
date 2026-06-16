"use client";

// Scales a fixed-size app-window canvas to the full width of its column and lets
// it float (soft shadow, no surrounding box) so the product is the big hero of
// its section. Height follows the scaled canvas so the section sizes to it.
//
// autoHeight: instead of a fixed canvas height, let the content define its own
// height (height: auto) and measure it, so the frame fits the content exactly —
// no cutoff, no trailing whitespace. Used for the mobile phone screens.

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export default function FloatWindow({
  children,
  w = 980,
  h = 720,
  autoHeight = false,
}: {
  children: ReactNode;
  w?: number;
  h?: number;
  autoHeight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  const [measuredH, setMeasuredH] = useState(h);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      if (cw) setScale(cw / w);
      if (autoHeight && canvasRef.current) {
        // offsetHeight is the unscaled layout height (transform doesn't affect it).
        setMeasuredH(canvasRef.current.offsetHeight);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (autoHeight && canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [w, autoHeight]);

  const effH = autoHeight ? measuredH : h;

  return (
    <div ref={ref} className="fw" style={{ height: effH * scale }}>
      <div
        ref={canvasRef}
        className="fw-canvas"
        style={{ width: w, height: autoHeight ? "auto" : h, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

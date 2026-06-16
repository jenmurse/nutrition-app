"use client";

// Scales a fixed-size app-window canvas to the full width of its column and lets
// it float (soft shadow, no surrounding box) so the product is the big hero of
// its section. Height follows the scaled canvas so the section sizes to it.

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export default function FloatWindow({
  children,
  w = 980,
  h = 720,
}: {
  children: ReactNode;
  w?: number;
  h?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      if (cw) setScale(cw / w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  return (
    <div ref={ref} className="fw" style={{ height: h * scale }}>
      <div
        className="fw-canvas"
        style={{ width: w, height: h, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

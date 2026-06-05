"use client";

import { useEffect } from "react";

const WHITE = "#FFFFFF";

/**
 * Adds data-marketing to <html> while the landing page is mounted,
 * which lets globals.css restore native document scroll over the
 * app-shell's overflow-hidden body + main. Also flips the marketing
 * register (white palette) AND the meta theme-color so the iOS Safari
 * status-bar / notch zone matches. All three are removed on unmount so
 * navigating into the app restores normal behavior.
 */
export default function MarketingScrollFix() {
  useEffect(() => {
    document.documentElement.dataset.marketing = "";
    document.documentElement.dataset.register = "marketing";

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content") ?? WHITE;
    if (meta) meta.setAttribute("content", WHITE);

    return () => {
      delete document.documentElement.dataset.marketing;
      delete document.documentElement.dataset.register;
      if (meta) meta.setAttribute("content", previous);
    };
  }, []);
  return null;
}

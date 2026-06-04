"use client";
import { useEffect } from "react";

const CREAM = "#F5F4EF";
const WHITE = "#FFFFFF";

/**
 * Sets data-register="editorial" on <html> while mounted so the
 * cream background bleeds into iOS safe-area zones, AND swaps the
 * meta theme-color from white → cream so iOS Safari's status-bar /
 * notch zone matches.
 *
 * Both are reset on unmount so navigating into the app restores the
 * white working register.
 */
export default function EditorialBackground() {
  useEffect(() => {
    document.documentElement.dataset.register = "editorial";

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content") ?? WHITE;
    if (meta) meta.setAttribute("content", CREAM);

    return () => {
      delete document.documentElement.dataset.register;
      if (meta) meta.setAttribute("content", previous);
    };
  }, []);
  return null;
}

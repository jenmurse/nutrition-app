"use client";
import { useEffect } from "react";

const WHITE = "#FFFFFF";

/**
 * Sets data-register on <html> while mounted so the background bleeds
 * into iOS safe-area zones, AND swaps the meta theme-color so iOS
 * Safari's status-bar / notch zone matches.
 *
 * Pass register="editorial" (cream) for onboarding.
 * Default is "marketing" (white) for auth/invite/waitlist.
 *
 * Both are reset on unmount so navigating into the app restores the
 * white working register.
 */
export default function EditorialBackground({
  register = "marketing",
}: {
  register?: "editorial" | "marketing";
}) {
  useEffect(() => {
    const themeColor = register === "editorial" ? "#F5F4EF" : WHITE;
    document.documentElement.dataset.register = register;

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content") ?? WHITE;
    if (meta) meta.setAttribute("content", themeColor);

    return () => {
      delete document.documentElement.dataset.register;
      if (meta) meta.setAttribute("content", previous);
    };
  }, []);
  return null;
}

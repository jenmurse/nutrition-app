"use client";
import { useEffect } from "react";

/**
 * Ensures the iOS Safari status-bar / notch zone stays white on
 * surfaces that use client-side navigation (login, invite, onboarding).
 * Resets to previous value on unmount.
 */
export default function EditorialBackground() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content") ?? "#FFFFFF";
    if (meta) meta.setAttribute("content", "#FFFFFF");
    return () => { if (meta) meta.setAttribute("content", previous); };
  }, []);
  return null;
}

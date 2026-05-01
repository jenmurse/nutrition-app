"use client";
import { useEffect } from "react";

/**
 * Sets data-register="editorial" on <html> while mounted so the
 * cream background bleeds into iOS safe-area zones. Removed on unmount
 * so navigating into the app restores the white working register.
 */
export default function EditorialBackground() {
  useEffect(() => {
    document.documentElement.dataset.register = "editorial";
    return () => { delete document.documentElement.dataset.register; };
  }, []);
  return null;
}

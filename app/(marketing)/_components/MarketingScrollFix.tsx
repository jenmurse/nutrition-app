"use client";

import { useEffect } from "react";

/**
 * Adds data-marketing to <html> while the landing page is mounted,
 * which lets globals.css restore native document scroll over the
 * app-shell's overflow-hidden body + main. Removed on unmount so
 * navigating into the app restores normal behavior.
 */
export default function MarketingScrollFix() {
  useEffect(() => {
    document.documentElement.dataset.marketing = "";
    document.documentElement.dataset.register = "editorial";
    return () => {
      delete document.documentElement.dataset.marketing;
      delete document.documentElement.dataset.register;
    };
  }, []);
  return null;
}

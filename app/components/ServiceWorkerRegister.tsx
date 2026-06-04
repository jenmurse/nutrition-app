"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and renders a tiny offline indicator.
 *
 * Visual: a thin banner across the top when navigator.onLine is false.
 * Editorial tone: factual, not alarming. The app is still usable for
 * anything the user has already loaded; the banner just communicates
 * that fresh data won't arrive until they reconnect.
 *
 * Auto-hides when the connection comes back.
 */
export default function ServiceWorkerRegister() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Only register in production. Dev hot-reload + service workers fight.
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("Service worker registration failed:", err);
        });
    }

    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "var(--fg)",
        color: "var(--bg)",
        padding: "8px 16px",
        fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
        fontSize: 9,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        textAlign: "center",
        lineHeight: 1.4,
      }}
    >
      Offline — showing your last-loaded data. Changes will fail until you reconnect.
    </div>
  );
}

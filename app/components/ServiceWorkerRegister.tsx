"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and renders an offline indicator.
 *
 * Detection strategy:
 *   - navigator.onLine + online/offline events (cheap, fast on most browsers)
 *   - Periodic ping every 20s to /api/health (catches iOS Safari + standalone
 *     PWA cases where navigator.onLine reports incorrectly)
 *   - Cache-busting ping URL so the SW can't return a stale cached 200
 *
 * Editorial tone: factual, not alarming. Banner auto-hides on reconnect.
 */
export default function ServiceWorkerRegister() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("Service worker registration failed:", err));
    }

    // ── Active probe — the truth source on iOS Safari ─────────────
    let cancelled = false;
    let pingTimer: ReturnType<typeof setTimeout> | null = null;

    const ping = async () => {
      try {
        const res = await fetch(`/api/health?ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };

    const schedule = (delay: number) => {
      if (pingTimer) clearTimeout(pingTimer);
      pingTimer = setTimeout(async () => {
        await ping();
        if (!cancelled) schedule(20000); // ping every 20s
      }, delay);
    };

    // Initial check immediate, then poll
    ping();
    schedule(20000);

    // ── Cheap event listeners as additional signals ─────────────
    const handleOnline = () => {
      setOnline(true);
      ping(); // verify the browser isn't lying
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // ── Re-probe when the tab becomes visible (PWA wake) ────────
    const handleVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      cancelled = true;
      if (pingTimer) clearTimeout(pingTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  if (online) return null;

  // Flow-positioned banner (not fixed) — sits above the nav inside .app-shell
  // and pushes everything down by its height. Includes safe-area-inset-top
  // padding so on iOS standalone PWAs it clears the notch/dynamic island.
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "var(--fg)",
        color: "var(--bg)",
        paddingTop: `calc(env(safe-area-inset-top, 0px) + 8px)`,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        fontFamily: "var(--font-mono), 'DM Mono', ui-monospace, monospace",
        fontSize: 9,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        textAlign: "center",
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      Offline — showing your last-loaded data. Changes will fail until you reconnect.
    </div>
  );
}

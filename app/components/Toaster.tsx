"use client";

import { useEffect, useState } from "react";
import { toast, type ToastMessage } from "@/lib/toast";

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => toast.subscribe(setToasts), []);

  // Separate success and error toasts
  const successes = toasts.filter((t) => t.type === "success");
  const errors = toasts.filter((t) => t.type === "error" || t.type === "info");
  const active = toasts.length > 0;
  const hasError = errors.length > 0;
  const hasSuccess = successes.length > 0 && !hasError;

  if (!active) return null;

  return (
    <>
      {/* Top bar sweep — green for success, red for error */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 48,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 9999,
          pointerEvents: "none",
          background: hasError ? "var(--error, #b94a48)" : "var(--accent)",
          transformOrigin: "left",
          animation: "toastSweep 400ms cubic-bezier(0.4,0,0.2,1) forwards",
        }}
      />

      {/* Error text — bottom status bar, only shown for errors */}
      {hasError && (
        <div
          aria-live="assertive"
          aria-atomic="true"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            pointerEvents: "none",
            borderTop: "1px solid var(--rule)",
            background: "var(--bg)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "toastFadeIn 250ms ease forwards",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--error, #b94a48)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.05em",
              color: "var(--muted)",
            }}
          >
            {errors[errors.length - 1].message}
          </span>
        </div>
      )}

      {/* Screen-reader announcement for successes */}
      {hasSuccess && (
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {successes[successes.length - 1].message}
        </div>
      )}
    </>
  );
}

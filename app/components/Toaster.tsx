"use client";

import { useEffect, useRef, useState } from "react";
import { toast, type ToastMessage } from "@/lib/toast";

export default function Toaster() {
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const [hiding, setHiding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return toast.subscribe((toasts) => {
      if (toasts.length === 0) return;
      // Show the latest toast, replacing any current one
      const next = toasts[toasts.length - 1];
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setHiding(false);
      setCurrent(next);

      // Auto-dismiss: success after 4s, info after 4s, error never auto-dismisses
      if (next.type !== "error") {
        timerRef.current = setTimeout(() => dismiss(), 4000);
      }
    });
  }, []);

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHiding(true);
    hideTimerRef.current = setTimeout(() => {
      setCurrent(null);
      setHiding(false);
    }, 210);
  }

  if (!current) return null;

  const typeClass =
    current.type === "success" ? "notif-success" :
    current.type === "error"   ? "notif-error"   :
    "notif-info";

  return (
    <>
      {/* Screen-reader announcement */}
      <div
        aria-live={current.type === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        className="sr-only"
      >
        {current.message}
      </div>

      {/* Notification bar — fixed below nav, full width */}
      <div
        className={`notif-bar ${typeClass}${hiding ? " notif-hiding" : ""}`}
        role="status"
        style={{
          position: "fixed",
          top: "var(--nav-h)",
          left: 0,
          right: 0,
          zIndex: 200,
        }}
      >
        <div className="notif-bar-text">
          <div className="notif-bar-dot" aria-hidden="true" />
          <span>{current.message}</span>
        </div>
        <div className="notif-bar-right">
          <button
            className="notif-bar-dismiss"
            onClick={dismiss}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  );
}

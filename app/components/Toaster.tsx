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
      const next = toasts[toasts.length - 1];
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setHiding(false);
      setCurrent(next);
      timerRef.current = setTimeout(() => dismiss(), 4000);
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
      <div
        aria-live={current.type === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        className="sr-only"
      >
        {current.message}
      </div>

      <div
        className={`notif-bar ${typeClass}${hiding ? " notif-hiding" : ""}`}
        role="status"
        style={{
          position: "fixed",
          bottom: "24px",
          left: 0,
          right: 0,
          marginInline: "auto",
          width: "fit-content",
          zIndex: 400,
        }}
      >
        <div className="notif-bar-text">
          <div className="notif-bar-dot" aria-hidden="true" />
          <span>{current.message}</span>
        </div>
        {current.undo && (
          <div className="notif-bar-right">
            <button
              className="notif-bar-undo"
              onClick={() => { current.undo!(); dismiss(); }}
              aria-label="Undo"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </>
  );
}

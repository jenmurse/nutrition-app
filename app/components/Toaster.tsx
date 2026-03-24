"use client";

import { useEffect, useState } from "react";
import { toast, type ToastMessage } from "@/lib/toast";

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => toast.subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 border font-sans text-[13px] shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            t.type === "error"
              ? "bg-[var(--bg-raised)] border-[var(--error,#b94a48)] text-[var(--fg)]"
              : t.type === "success"
              ? "bg-[var(--bg-raised)] border-[var(--accent)] text-[var(--fg)]"
              : "bg-[var(--bg-raised)] border-[var(--rule)] text-[var(--fg)]"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              t.type === "error"
                ? "bg-[var(--error,#b94a48)]"
                : t.type === "success"
                ? "bg-[var(--accent)]"
                : "bg-[var(--muted)]"
            }`}
            aria-hidden="true"
          />
          {t.message}
        </div>
      ))}
    </div>
  );
}

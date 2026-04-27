"use client";

import { useEffect, useState } from "react";
import { dialog, type DialogState } from "@/lib/dialog";

export default function ConfirmModal() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => dialog.subscribe(setState), []);

  if (!state) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-message"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30"
      onClick={() => dialog._resolve(false)}
      onKeyDown={(e) => { if (e.key === "Escape") dialog._resolve(false); }}
    >
      <div
        className="bg-[var(--bg)] border border-[var(--rule)] w-[90%] max-w-[480px] animate-fade-in"
        style={{ padding: "32px 28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          id="confirm-message"
          className="font-sans text-[13px] text-[var(--fg)] leading-[1.6] mb-6"
        >
          {state.message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => dialog._resolve(false)}
            autoFocus
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--fg)] bg-transparent border-0 cursor-pointer transition-colors active:scale-[0.97]"
            style={{ padding: "8px 14px" }}
          >
            Cancel
          </button>
          <button
            onClick={() => dialog._resolve(true)}
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg)] bg-transparent border border-[var(--rule)] hover:border-[var(--fg)] cursor-pointer transition-colors active:scale-[0.97]"
            style={{ padding: "8px 14px" }}
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

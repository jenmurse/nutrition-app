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
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40"
      onKeyDown={(e) => { if (e.key === "Escape") dialog._resolve(false); }}
    >
      <div className="bg-[var(--bg-raised)] shadow-[var(--shadow-lg)] rounded-[var(--radius-lg,12px)] max-w-sm w-full mx-4 p-6 animate-fade-in">
        <p
          id="confirm-message"
          className="font-sans text-[13px] text-[var(--fg)] leading-relaxed mb-6"
        >
          {state.message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => dialog._resolve(false)}
            autoFocus
            className="px-4 py-[7px] font-mono text-[9px] uppercase tracking-[0.08em] rounded-[6px] border border-[var(--rule)] bg-[var(--bg-raised)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] hover:border-[var(--rule-strong)] cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => dialog._resolve(true)}
            className={`px-4 py-[7px] font-mono text-[9px] uppercase tracking-[0.08em] rounded-[6px] border cursor-pointer transition-colors ${
              state.danger
                ? "border-0 bg-[var(--error-light)] text-[var(--error)] hover:bg-[var(--error)] hover:text-white"
                : "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] hover:opacity-90"
            }`}
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

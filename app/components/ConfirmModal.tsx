"use client";

import { useEffect, useState } from "react";
import { dialog, type DialogState } from "@/lib/dialog";

export default function ConfirmModal() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => dialog.subscribe(setState), []);

  if (!state) return null;

  const eyebrowColor = state.danger
    ? "var(--status-error-ink)"
    : "var(--muted)";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-message"
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={() => dialog._resolve(false)}
      onKeyDown={(e) => { if (e.key === "Escape") dialog._resolve(false); }}
    >
      <div
        className="animate-fade-in"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--fg)",
          borderRadius: 0,
          width: "90%",
          maxWidth: "440px",
          padding: "32px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: eyebrowColor,
            marginBottom: "16px",
          }}
        >
          § {state.confirmLabel ?? "Confirm"}
        </div>

        {/* Message */}
        <p
          id="confirm-message"
          style={{
            fontFamily: "var(--sans)",
            fontSize: "13px",
            fontWeight: 400,
            color: "var(--fg-2)",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          {state.message}
        </p>

        {/* Actions — confirm on right, cancel on left */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={() => dialog._resolve(false)}
            autoFocus
            className="ed-btn"
          >
            Cancel
          </button>
          <button
            onClick={() => dialog._resolve(true)}
            className="ed-btn primary"
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

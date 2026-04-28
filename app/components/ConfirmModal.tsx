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
      aria-labelledby="confirm-title"
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
        {/* Title */}
        <h2
          id="confirm-title"
          style={{
            fontFamily: "var(--sans)",
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--fg)",
            lineHeight: 1.2,
            marginBottom: state.body ? "12px" : "28px",
          }}
        >
          {state.title}
        </h2>

        {/* Body */}
        {state.body && (
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: "13px",
              fontWeight: 400,
              color: "var(--fg-2)",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            {state.body}
          </p>
        )}

        {/* Actions */}
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

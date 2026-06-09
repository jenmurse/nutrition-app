"use client";

import type { MealProposal, MacroDelta } from "@/lib/chat/proposals";
import { useChat } from "./ChatProvider";
import { clientCache } from "@/lib/clientCache";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  side: "Side",
  dessert: "Dessert",
  beverage: "Beverage",
};

const MACRO_LABELS: Record<string, string> = {
  calories: "Cal",
  protein: "Protein",
  fiber: "Fiber",
  sodium: "Sodium",
};

const MACRO_UNITS: Record<string, string> = {
  calories: "",
  protein: "g",
  fiber: "g",
  sodium: "mg",
};

/** Format a date string (YYYY-MM-DD) as "Mon Jun 9". */
function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function MacroDeltaRow({ deltas }: { deltas: MacroDelta }) {
  const entries = (Object.keys(deltas) as (keyof MacroDelta)[])
    .filter((k) => deltas[k] !== undefined && deltas[k] !== 0);
  if (entries.length === 0) return null;
  return (
    <div className="ck-macros">
      {entries.map((k) => {
        const v = deltas[k]!;
        const isPositive = v > 0;
        // For sodium (a capped nutrient), positive is bad; for protein/fiber/calories, positive is usually good.
        // We use semantic colors: green = good change, red = bad change, neutral = mixed.
        // Keep it simple: positive deltas are green, negative are red — the confirm prose explains the context.
        return (
          <div key={k} className="ck-macro">
            <span className="ck-macro-label">{MACRO_LABELS[k] ?? k}</span>
            <span className={`ck-macro-val ${isPositive ? "delta-up" : "delta-down"}`}>
              {isPositive ? "+" : ""}{v}{MACRO_UNITS[k] ?? ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface ConfirmCardProps {
  messageId: string;
  proposal: MealProposal;
  status: "pending" | "applied" | "cancelled";
}

export default function ConfirmCard({ messageId, proposal, status }: ConfirmCardProps) {
  const { applyProposal, cancelProposal, isStreaming } = useChat();

  const label = MEAL_TYPE_LABELS[proposal.mealType] ?? proposal.mealType;
  const personLabel = proposal.personName;
  const dateLabel = fmtDate(proposal.date);

  // Eyebrow: § PROPOSED CHANGE · Jen · Mon Jun 9
  const eyebrow = `§ Proposed change · ${personLabel} · ${dateLabel}`;

  if (status === "applied") {
    return (
      <div className="ck-ack">
        Applied — {personLabel}&rsquo;s {label.toLowerCase()} updated.{" "}
        {proposal.type !== "remove" && (
          <a href="/planner">View in planner →</a>
        )}
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="ck-ack">
        Got it — no change made.
      </div>
    );
  }

  const titleMap: Record<MealProposal["type"], string> = {
    add: `Add to ${personLabel}'s ${label.toLowerCase()}`,
    swap: `Swap ${personLabel}'s ${label.toLowerCase()}`,
    remove: `Remove from ${personLabel}'s ${label.toLowerCase()}`,
    update_servings: `Update ${personLabel}'s ${label.toLowerCase()} servings`,
  };

  return (
    <div className="ck-card">
      <div className="ck-card-head">
        <div className="ck-card-eyebrow">{eyebrow}</div>
        <div className="ck-card-title">{titleMap[proposal.type]}</div>
      </div>

      <div className="ck-card-body">
        {/* Add */}
        {proposal.type === "add" && proposal.to && (
          <div className="ck-row">
            <div className="ck-row-left">
              <div className="ck-row-eyebrow">{label}</div>
              <div className="ck-row-name">{proposal.to.name}</div>
            </div>
            <span className="ck-row-meta">
              {proposal.to.servings !== 1 ? `${proposal.to.servings}× serving` : "1 serving"}
            </span>
          </div>
        )}

        {/* Swap */}
        {proposal.type === "swap" && proposal.from && proposal.to && (
          <div className="ck-row">
            <div className="ck-row-left" style={{ flex: 1 }}>
              <div className="ck-row-eyebrow">{label}</div>
              <div className="ck-swap-line">
                <span className="ck-swap-from">{proposal.from.name}</span>
                <span className="ck-swap-arrow">→</span>
                <span className="ck-swap-to">{proposal.to.name}</span>
              </div>
            </div>
            <span className="ck-row-meta">
              {proposal.to.servings !== 1 ? `${proposal.to.servings}× serving` : "1 serving"}
            </span>
          </div>
        )}

        {/* Remove */}
        {proposal.type === "remove" && proposal.from && (
          <div className="ck-row">
            <div className="ck-row-left">
              <div className="ck-row-eyebrow">{label}</div>
              <div className="ck-row-name" style={{ textDecoration: "line-through", color: "var(--muted)" }}>
                {proposal.from.name}
              </div>
            </div>
          </div>
        )}

        {/* Update servings */}
        {proposal.type === "update_servings" && proposal.from && proposal.to && (
          <div className="ck-row">
            <div className="ck-row-left">
              <div className="ck-row-eyebrow">{label}</div>
              <div className="ck-row-name">{proposal.from.name}</div>
            </div>
            <div className="ck-swap-line">
              <span className="ck-swap-from">{proposal.from.servings}×</span>
              <span className="ck-swap-arrow">→</span>
              <span className="ck-swap-to">{proposal.to.servings}×</span>
            </div>
          </div>
        )}

        {proposal.macroDeltas && <MacroDeltaRow deltas={proposal.macroDeltas} />}
      </div>

      <div className="ck-card-foot">
        <button
          type="button"
          className="ck-btn-cancel"
          onClick={() => cancelProposal(messageId)}
          disabled={isStreaming}
        >
          Cancel
        </button>
        <button
          type="button"
          className="ck-btn-apply"
          onClick={() => applyProposal(messageId)}
          disabled={isStreaming}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

"use client";

import type { MealProposal, BulkMealProposal, MacroDelta } from "@/lib/chat/proposals";
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
      <div className="ck-macros-label">Change to your day</div>
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
  /** DB-assigned id — passed explicitly so apply/cancel don't rely on stale closures. */
  dbId?: number;
  proposal: MealProposal | BulkMealProposal;
  status: "pending" | "applied" | "cancelled";
}

export default function ConfirmCard({ messageId, dbId, proposal, status }: ConfirmCardProps) {
  const { applyProposal, applyBulkProposal, cancelProposal, isStreaming } = useChat();
  const isBulk = proposal.type === "fill_week" || proposal.type === "apply_template";

  // Single-card fields — only meaningful for MealProposal (not bulk)
  const single = !isBulk ? (proposal as MealProposal) : null;
  const label = single ? (MEAL_TYPE_LABELS[single.mealType] ?? single.mealType) : "";
  const personLabel = proposal.personName;
  const dateLabel = single ? fmtDate(single.date) : "";
  const eyebrow = `§ Proposed change · ${personLabel} · ${dateLabel}`;

  const ackLabel = isBulk
    ? (proposal.type === "fill_week" ? "Plan applied." : "Template applied.")
    : (single?.type === "remove" ? "removed." : single?.type === "add" ? "added." : single?.type === "swap" ? "swapped." : "updated.");

  if (status === "applied") {
    // Include the affected day in the URL so the planner (mobile especially,
    // which shows one day at a time) lands on the day where the change
    // happened. Desktop ignores the param and renders the whole week.
    // For fill_week we use the first item's date as the landing point.
    const affectedDate = single?.date
      ?? (isBulk && proposal.type === "apply_template" ? (proposal as BulkMealProposal).targetDate : undefined)
      ?? (isBulk && proposal.type === "fill_week" ? (proposal as BulkMealProposal).items?.[0]?.date : undefined);
    const plannerUrl = affectedDate ? `/planner?day=${affectedDate}` : "/planner";
    return (
      <div className="ck-ack">
        Applied &mdash; {isBulk ? ackLabel : `${personLabel}'s ${label.toLowerCase()} ${ackLabel}`}{" "}
        <a href={plannerUrl} onClick={() => { window.location.href = plannerUrl; return false; }}>
          View in planner &rarr;
        </a>
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

  // ── Bulk confirm-card (fill_week / apply_template) ──
  if (isBulk) {
    const bulk = proposal as BulkMealProposal;
    const bulkEyebrow = bulk.type === "apply_template"
      ? `§ Apply template · ${bulk.personName} · ${bulk.targetWeekday ?? ""} ${bulk.targetDate ?? ""}`
      : `§ Proposed plan · ${bulk.personName}`;
    const bulkTitle = bulk.type === "apply_template"
      ? `Apply "${bulk.templateName}" ${bulk.mode === "replace" ? "(replace)" : "(append)"}`
      : `${bulk.items.length} meals${bulk.weekLabel ? ` · ${bulk.weekLabel}` : ""}`;
    return (
      <div className="ck-card">
        <div className="ck-card-head">
          <div className="ck-card-eyebrow">{bulkEyebrow}</div>
          <div className="ck-card-title">{bulkTitle}</div>
        </div>
        <div className="ck-card-body">
          {bulk.items.map((item, i) => (
            <div key={i} className="ck-row">
              <div className="ck-row-left">
                <div className="ck-row-eyebrow">{item.weekday} · {MEAL_TYPE_LABELS[item.mealType] ?? item.mealType}</div>
                <div className="ck-row-name">{item.name}</div>
              </div>
              <span className="ck-row-meta">
                {item.macros?.cal ? `${item.macros.cal}cal` : ""}{item.macros?.protein ? ` · ${item.macros.protein}g pro` : ""}
              </span>
            </div>
          ))}
          {bulk.summaryMacros && (
            <div className="ck-macros">
              <div className="ck-macros-label">Avg per meal</div>
              {bulk.summaryMacros.avgCalPerDay !== undefined && (
                <div className="ck-macro"><span className="ck-macro-label">Cal</span><span className="ck-macro-val">{bulk.summaryMacros.avgCalPerDay}</span></div>
              )}
              {bulk.summaryMacros.avgProteinPerDay !== undefined && (
                <div className="ck-macro"><span className="ck-macro-label">Protein</span><span className="ck-macro-val">{bulk.summaryMacros.avgProteinPerDay}g</span></div>
              )}
              {bulk.summaryMacros.maxSodium !== undefined && (
                <div className="ck-macro"><span className="ck-macro-label">Max Na</span><span className="ck-macro-val">{bulk.summaryMacros.maxSodium}mg</span></div>
              )}
            </div>
          )}
        </div>
        <div className="ck-card-foot">
          <span className="ck-card-note">Not right? Cancel and adjust.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="ck-btn-cancel" onClick={() => cancelProposal(messageId)} disabled={isStreaming}>Cancel</button>
            <button type="button" className="ck-btn-apply" onClick={() => applyBulkProposal(messageId, dbId)} disabled={isStreaming}>
              {bulk.type === "apply_template" ? "Apply" : "Add all"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Single confirm-card (Gate 2) ──
  const singleProposal = proposal as MealProposal;
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
        <div className="ck-card-title">{titleMap[singleProposal.type]}</div>
      </div>

      <div className="ck-card-body">
        {/* Add */}
        {singleProposal.type === "add" && singleProposal.to && (
          <div className="ck-row">
            <div className="ck-row-left">
              <div className="ck-row-eyebrow">{label}</div>
              <div className="ck-row-name">{singleProposal.to.name}</div>
            </div>
            <span className="ck-row-meta">
              {singleProposal.to.servings !== 1 ? `${singleProposal.to.servings}× serving` : "1 serving"}
            </span>
          </div>
        )}

        {/* Swap */}
        {singleProposal.type === "swap" && singleProposal.from && singleProposal.to && (
          <div className="ck-row">
            <div className="ck-row-left" style={{ flex: 1 }}>
              <div className="ck-row-eyebrow">{label}</div>
              <div className="ck-swap-line">
                <span className="ck-swap-from">{singleProposal.from.name}</span>
                <span className="ck-swap-arrow">→</span>
                <span className="ck-swap-to">{singleProposal.to.name}</span>
              </div>
            </div>
            <span className="ck-row-meta">
              {singleProposal.to.servings !== 1 ? `${singleProposal.to.servings}× serving` : "1 serving"}
            </span>
          </div>
        )}

        {/* Remove */}
        {singleProposal.type === "remove" && singleProposal.from && (
          <div className="ck-row">
            <div className="ck-row-left">
              <div className="ck-row-eyebrow">{label}</div>
              <div className="ck-row-name" style={{ textDecoration: "line-through", color: "var(--muted)" }}>
                {singleProposal.from.name}
              </div>
            </div>
          </div>
        )}

        {/* Update servings */}
        {singleProposal.type === "update_servings" && singleProposal.from && singleProposal.to && (
          <div className="ck-row">
            <div className="ck-row-left">
              <div className="ck-row-eyebrow">{label}</div>
              <div className="ck-row-name">{singleProposal.from.name}</div>
            </div>
            <div className="ck-swap-line">
              <span className="ck-swap-from">{singleProposal.from.servings}×</span>
              <span className="ck-swap-arrow">→</span>
              <span className="ck-swap-to">{singleProposal.to.servings}×</span>
            </div>
          </div>
        )}

        {singleProposal.macroDeltas && <MacroDeltaRow deltas={singleProposal.macroDeltas} />}
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
          onClick={() => applyProposal(messageId, dbId)}
          disabled={isStreaming}
        >
          {singleProposal.type === "add" ? "Add" :
           singleProposal.type === "swap" ? "Swap" :
           singleProposal.type === "remove" ? "Remove" :
           "Update"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type {
  MealProposal,
  BulkMealProposal,
  MacroDelta,
  RecipeSaveProposal,
  RecipeMacros,
} from "@/lib/chat/proposals";
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
  proposal: MealProposal | BulkMealProposal | RecipeSaveProposal;
  status: "pending" | "applied" | "cancelled";
}

export default function ConfirmCard({ messageId, dbId, proposal, status }: ConfirmCardProps) {
  // Recipe-save cards are a distinct shape from meal-plan cards; render via
  // their own component so the iteration UX and macro layout stay isolated.
  if (proposal.type === "save_recipe") {
    return (
      <SaveRecipeCard
        messageId={messageId}
        dbId={dbId}
        proposal={proposal}
        status={status}
      />
    );
  }
  return <MealCard messageId={messageId} dbId={dbId} proposal={proposal} status={status} />;
}

function MealCard({ messageId, dbId, proposal, status }: ConfirmCardProps) {
  const { applyProposal, applyBulkProposal, cancelProposal, isStreaming } = useChat();
  // Narrow type for the meal-card path
  if (proposal.type === "save_recipe") return null; // type guard — handled above
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

// ────────────────────────────────────────────────────────────────────────────
//  SaveRecipeCard — confirm-card for propose_save_recipe
// ────────────────────────────────────────────────────────────────────────────
// Option B layout per briefs/mockup-save-recipe-card.html:
//   - headline 4-macro strip (before → after, color-coded by impact)
//   - expandable ingredient diff (closed by default; persists per-card)
//   - footer note differs by mode (Replace warns about overwrite)
// ────────────────────────────────────────────────────────────────────────────

interface SaveRecipeCardProps {
  messageId: string;
  dbId?: number;
  proposal: RecipeSaveProposal;
  status: "pending" | "applied" | "cancelled";
}

function SaveRecipeCard({ messageId, dbId, proposal, status }: SaveRecipeCardProps) {
  const { applyProposal, cancelProposal, isStreaming } = useChat();
  const [expanded, setExpanded] = useState(false);

  if (status === "applied") {
    return (
      <div className="ck-ack">
        Saved &mdash; &ldquo;{proposal.name}&rdquo;{" "}
        <a
          href="/recipes"
          onClick={(e) => {
            // For "replace" we land on the source recipe id. For "new" (either
            // from edit or from-scratch) we don't know the new id until the
            // response, so land on the list.
            const url = proposal.mode === "replace" && proposal.sourceRecipeId
              ? `/recipes/${proposal.sourceRecipeId}`
              : "/recipes";
            e.preventDefault();
            window.location.href = url;
          }}
        >
          {proposal.mode === "replace" ? "View recipe →" : "View in recipes →"}
        </a>
      </div>
    );
  }
  if (status === "cancelled") {
    return <div className="ck-ack">Got it — no change made.</div>;
  }

  const isReplace = proposal.mode === "replace";
  const fromScratch = proposal.sourceRecipeId == null;
  const addCount = proposal.diff.filter((d) => d.kind === "add").length;
  const removeCount = proposal.diff.filter((d) => d.kind === "remove").length;
  const changeCount = proposal.diff.filter((d) => d.kind === "change").length;
  const totalChanges = proposal.diff.length;
  // Summary line shape changes for from-scratch: "14 ingredients" reads
  // better than "14 added" when there's no source to compare against.
  const changeSummary = fromScratch
    ? `${proposal.ingredients.length} ingredient${proposal.ingredients.length === 1 ? "" : "s"}`
    : [
        removeCount > 0 ? `${removeCount} removed` : null,
        addCount > 0 ? `${addCount} added` : null,
        changeCount > 0 ? `${changeCount} modified` : null,
      ].filter(Boolean).join(" · ");

  // Eyebrow varies by scenario
  const eyebrowText = isReplace
    ? `§ Save recipe · replace · ${totalChanges} ingredient change${totalChanges === 1 ? "" : "s"}`
    : fromScratch
      ? `§ Save recipe · new · from scratch · ${proposal.ingredients.length} ingredients`
      : `§ Save recipe · new${totalChanges > 0 ? ` · ${totalChanges} ingredient change${totalChanges === 1 ? "" : "s"}` : ""}`;

  return (
    <div className="ck-card ck-recipe-card">
      <div className="ck-card-head">
        <div className="ck-card-eyebrow">{eyebrowText}</div>
        <div className="ck-card-title">
          {isReplace
            ? `Replace "${proposal.sourceRecipeName ?? "recipe"}"`
            : `Save "${proposal.name}"`}
          <span className={`ck-recipe-pill ${isReplace ? "replace" : "new"}`}>
            {isReplace ? "Replace" : "New"}
          </span>
        </div>
      </div>

      <div className="ck-card-body">
        {/* Macros: before → after (5 columns including sugar) */}
        <div className="ck-recipe-macros">
          <RecipeMacroCell label="Cal"     before={proposal.sourceMacros.cal}     after={proposal.proposedMacros.cal} />
          <RecipeMacroCell label="Protein" before={proposal.sourceMacros.protein} after={proposal.proposedMacros.protein} unit="g" higherIsBetter />
          <RecipeMacroCell label="Fiber"   before={proposal.sourceMacros.fiber}   after={proposal.proposedMacros.fiber} unit="g" higherIsBetter />
          <RecipeMacroCell label="Sodium"  before={proposal.sourceMacros.sodium}  after={proposal.proposedMacros.sodium} unit="mg" lowerIsBetter />
          <RecipeMacroCell label="Sugar"   before={proposal.sourceMacros.sugar}   after={proposal.proposedMacros.sugar} unit="g" lowerIsBetter />
        </div>

        {/* Expand line */}
        <button
          type="button"
          className="ck-recipe-expand"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className="ck-recipe-expand-summary">
            {fromScratch ? (
              <span className="ck-recipe-expand-num">{changeSummary}</span>
            ) : (
              <>
                <span className="ck-recipe-expand-num">
                  {totalChanges === 0 ? "No changes" : `${totalChanges} change${totalChanges === 1 ? "" : "s"}`}
                </span>
                {changeSummary && <span style={{ color: "var(--muted)", marginLeft: 8 }}>· {changeSummary}</span>}
              </>
            )}
          </span>
          <span className="ck-recipe-expand-action">
            {expanded ? "Hide ingredients ↑" : "View ingredients ↓"}
          </span>
        </button>

        {/* Diff sections (open state) */}
        {expanded && (
          <div className="ck-recipe-diff">
            {removeCount > 0 && (
              <div className="ck-diff-section">
                <div className="ck-diff-section-label">Removed ({removeCount})</div>
                {proposal.diff.filter((d) => d.kind === "remove").map((d) => (
                  <div key={`r-${d.ingredientId}`} className="ck-diff-line ck-diff-rem">
                    <span className="glyph">−</span>
                    <span className="ck-diff-name">{d.name}</span>
                    <span className="ck-diff-qty">{d.from?.quantity} {d.from?.unit}</span>
                  </div>
                ))}
              </div>
            )}
            {changeCount > 0 && (
              <div className="ck-diff-section">
                <div className="ck-diff-section-label">Changed ({changeCount})</div>
                {proposal.diff.filter((d) => d.kind === "change").map((d) => (
                  <div key={`c-${d.ingredientId}`} className="ck-diff-line ck-diff-chg">
                    <span className="glyph">±</span>
                    <span className="ck-diff-name">{d.name}</span>
                    <span className="ck-diff-qty">
                      <span className="from">{d.from?.quantity} {d.from?.unit}</span>
                      {" → "}
                      <span className="to">{d.to?.quantity} {d.to?.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {addCount > 0 && (
              <div className="ck-diff-section">
                <div className="ck-diff-section-label">Added ({addCount})</div>
                {proposal.diff.filter((d) => d.kind === "add").map((d) => (
                  <div key={`a-${d.ingredientId}`} className="ck-diff-line ck-diff-add">
                    <span className="glyph">+</span>
                    <span className="ck-diff-name">{d.name}</span>
                    <span className="ck-diff-qty">{d.to?.quantity} {d.to?.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ck-card-foot">
        <span className="ck-card-note">
          {isReplace ? "Original recipe will be overwritten." : "Not right? Cancel and adjust."}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="ck-btn-cancel" onClick={() => cancelProposal(messageId)} disabled={isStreaming}>
            Cancel
          </button>
          <button type="button" className="ck-btn-apply" onClick={() => applyProposal(messageId, dbId)} disabled={isStreaming}>
            {isReplace ? "Replace" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** One macro cell with before → after, color-coded by directional impact. */
function RecipeMacroCell({
  label, before, after, unit = "",
  higherIsBetter = false,
  lowerIsBetter = false,
}: {
  label: string;
  before?: number;
  after?: number;
  unit?: string;
  higherIsBetter?: boolean;
  lowerIsBetter?: boolean;
}) {
  if (after === undefined && before === undefined) {
    return (
      <div className="ck-macro">
        <div className="ck-macro-label">{label}</div>
        <div className="ck-macro-val" style={{ color: "var(--muted)" }}>—</div>
      </div>
    );
  }
  const hasBoth = before !== undefined && after !== undefined;
  const delta = hasBoth ? (after! - before!) : 0;
  let semClass = "";
  if (hasBoth && delta !== 0) {
    if (higherIsBetter) semClass = delta > 0 ? "delta-up" : "delta-down";
    else if (lowerIsBetter) semClass = delta < 0 ? "delta-up" : "delta-down";
  }
  return (
    <div className="ck-macro">
      <div className="ck-macro-label">{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, fontVariantNumeric: "tabular-nums" }}>
        {before !== undefined && (
          <span style={{ color: "var(--muted)", fontSize: 11, textDecoration: hasBoth ? "line-through" : "none" }}>
            {before}{unit}
          </span>
        )}
        {hasBoth && <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>→</span>}
        {after !== undefined && (
          <span className={`ck-macro-val ${semClass}`}>{after}{unit}</span>
        )}
      </div>
    </div>
  );
}

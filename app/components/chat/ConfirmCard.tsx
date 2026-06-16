"use client";

import { useState } from "react";
import type {
  MealProposal,
  BulkMealProposal,
  MacroDelta,
  RecipeSaveProposal,
  RecipeMacros,
  DayTemplateSaveProposal,
  RecipeNotesSaveProposal,
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
  proposal: MealProposal | BulkMealProposal | RecipeSaveProposal | DayTemplateSaveProposal | RecipeNotesSaveProposal;
  status: "pending" | "applied" | "cancelled";
  /** Id from a successful apply (e.g. new recipe id) — for the ack deep-link. */
  appliedResultId?: number;
}

export default function ConfirmCard({ messageId, dbId, proposal, status, appliedResultId }: ConfirmCardProps) {
  // Recipe-save cards are a distinct shape from meal-plan cards; render via
  // their own component so the iteration UX and macro layout stay isolated.
  if (proposal.type === "save_recipe") {
    return (
      <SaveRecipeCard
        messageId={messageId}
        dbId={dbId}
        proposal={proposal}
        status={status}
        appliedResultId={appliedResultId}
      />
    );
  }
  if (proposal.type === "save_day_template") {
    return (
      <SaveDayTemplateCard
        messageId={messageId}
        dbId={dbId}
        proposal={proposal}
        status={status}
      />
    );
  }
  if (proposal.type === "save_recipe_notes") {
    return (
      <SaveRecipeNotesCard
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
  if (proposal.type === "save_recipe" || proposal.type === "save_day_template" || proposal.type === "save_recipe_notes") return null; // handled above
  const isBulk = proposal.type === "fill_week" || proposal.type === "apply_template";

  // Single-card fields — only meaningful for MealProposal (not bulk)
  const single = !isBulk ? (proposal as MealProposal) : null;
  const label = single ? (MEAL_TYPE_LABELS[single.mealType] ?? single.mealType) : "";
  const personLabel = proposal.personName;
  const dateLabel = single ? fmtDate(single.date) : "";
  const eyebrow = `Proposed change · ${personLabel} · ${dateLabel}`;

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
      ? `Apply template · ${bulk.personName} · ${bulk.targetWeekday ?? ""} ${bulk.targetDate ?? ""}`
      : `Proposed plan · ${bulk.personName}`;
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
  appliedResultId?: number;
}

function SaveRecipeCard({ messageId, dbId, proposal, status, appliedResultId }: SaveRecipeCardProps) {
  const { applyProposal, cancelProposal, isStreaming } = useChat();
  const [expanded, setExpanded] = useState(false);

  if (status === "applied") {
    // Land on the specific recipe when we know its id:
    //   - replace → the source id (it was overwritten in place)
    //   - new → the id captured from the POST response (appliedResultId)
    // Fall back to the recipes list when neither is available (e.g. after a
    // refresh, where appliedResultId isn't persisted).
    const recipeId = proposal.mode === "replace"
      ? proposal.sourceRecipeId
      : appliedResultId;
    const url = recipeId ? `/recipes/${recipeId}` : "/recipes";
    return (
      <div className="ck-ack">
        Saved &mdash; &ldquo;{proposal.name}&rdquo;{" "}
        <a
          href={url}
          onClick={(e) => { e.preventDefault(); window.location.href = url; }}
        >
          {recipeId ? "View recipe →" : "View in recipes →"}
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
    ? `Save recipe · replace · ${totalChanges} ingredient change${totalChanges === 1 ? "" : "s"}`
    : fromScratch
      ? `Save recipe · new · from scratch · ${proposal.ingredients.length} ingredients`
      : `Save recipe · new${totalChanges > 0 ? ` · ${totalChanges} ingredient change${totalChanges === 1 ? "" : "s"}` : ""}`;

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
        {/* Full nutrient panel — all 9, before → after, color-coded.
            Unchanged rows dim; the optimized nutrient gets a coral rule. */}
        <div className="ck-recipe-nut-panel">
          {RECIPE_NUTRIENTS.map((n) => (
            <RecipeNutrientRow
              key={n.key}
              label={n.label}
              unit={n.unit}
              before={proposal.sourceMacros[n.key]}
              after={proposal.proposedMacros[n.key]}
              direction={n.direction}
              isTarget={proposal.targetNutrient === n.key}
            />
          ))}
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

// The 9 tracked nutrients in display order, with units and directionality.
// direction: "ceiling" = lower is better (sat fat, sodium...), "floor" = higher
// is better (protein, fiber), "neutral" = no semantic color (calories, carbs).
const RECIPE_NUTRIENTS: Array<{
  key: keyof RecipeMacros;
  label: string;
  unit: string;
  direction: "ceiling" | "floor" | "neutral";
}> = [
  { key: "cal",        label: "Calories",     unit: "",   direction: "neutral" },
  { key: "fat",        label: "Fat",          unit: "g",  direction: "ceiling" },
  { key: "satFat",     label: "Saturated Fat",unit: "g",  direction: "ceiling" },
  { key: "sodium",     label: "Sodium",       unit: "mg", direction: "ceiling" },
  { key: "carbs",      label: "Carbs",        unit: "g",  direction: "neutral" },
  { key: "sugar",      label: "Sugar",        unit: "g",  direction: "ceiling" },
  { key: "addedSugar", label: "Added Sugar",  unit: "g",  direction: "ceiling" },
  { key: "protein",    label: "Protein",      unit: "g",  direction: "floor" },
  { key: "fiber",      label: "Fiber",        unit: "g",  direction: "floor" },
];

/** One nutrient row in the full panel — before → after, color-coded, dims when unchanged. */
function RecipeNutrientRow({
  label, unit, before, after, direction, isTarget,
}: {
  label: string;
  unit: string;
  before?: number;
  after?: number;
  direction: "ceiling" | "floor" | "neutral";
  isTarget: boolean;
}) {
  // No data at all → skip rendering entirely (keeps the panel honest).
  if (before === undefined && after === undefined) return null;

  const hasBoth = before !== undefined && after !== undefined;
  const changed = hasBoth && before !== after;
  const delta = hasBoth ? after! - before! : 0;

  let semClass = "";
  if (changed && direction !== "neutral") {
    const improved = direction === "ceiling" ? delta < 0 : delta > 0;
    semClass = improved ? "ok" : "err";
  }

  const rowClass = [
    "ck-nut-row",
    !changed ? "unchanged" : "",
    isTarget ? "target" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rowClass}>
      <span className="ck-nut-label">{label}</span>
      <span className="ck-nut-flow">
        {changed && before !== undefined && (
          <>
            <span className="ck-nut-before">{before}{unit}</span>
            <span className="ck-nut-arrow">→</span>
          </>
        )}
        <span className={`ck-nut-after ${semClass}`}>
          {(after ?? before)}{unit}
        </span>
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  SaveDayTemplateCard — confirm-card for propose_save_day_template
// ────────────────────────────────────────────────────────────────────────────
// Mirrors the apply-template card: meal rows + day-total macros. The difference
// is it SAVES a new template rather than applying one to a day.
// ────────────────────────────────────────────────────────────────────────────

interface SaveDayTemplateCardProps {
  messageId: string;
  dbId?: number;
  proposal: DayTemplateSaveProposal;
  status: "pending" | "applied" | "cancelled";
}

function SaveDayTemplateCard({ messageId, dbId, proposal, status }: SaveDayTemplateCardProps) {
  const { applyProposal, cancelProposal, isStreaming } = useChat();

  if (status === "applied") {
    return (
      <div className="ck-ack">
        Saved &mdash; template &ldquo;{proposal.name}&rdquo;{" "}
        <a
          href="/planner"
          onClick={(e) => { e.preventDefault(); window.location.href = "/planner"; }}
        >
          View in planner &rarr;
        </a>
      </div>
    );
  }
  if (status === "cancelled") {
    return <div className="ck-ack">Got it — no template saved.</div>;
  }

  const attribution = proposal.personName ?? "household";

  return (
    <div className="ck-card">
      <div className="ck-card-head">
        <div className="ck-card-eyebrow">
          Save template · {attribution} · {proposal.items.length} meal{proposal.items.length === 1 ? "" : "s"}
        </div>
        <div className="ck-card-title">Save &ldquo;{proposal.name}&rdquo;</div>
      </div>
      <div className="ck-card-body">
        {proposal.items.map((item, i) => (
          <div key={i} className="ck-row">
            <div className="ck-row-left">
              <div className="ck-row-eyebrow">{MEAL_TYPE_LABELS[item.mealType] ?? item.mealType}</div>
              <div className="ck-row-name">{item.name}</div>
            </div>
            <span className="ck-row-meta">
              {item.macros?.cal ? `${item.macros.cal}cal` : ""}{item.macros?.protein ? ` · ${item.macros.protein}g pro` : ""}
            </span>
          </div>
        ))}
        {proposal.summaryMacros && (
          <div className="ck-macros">
            <div className="ck-macros-label">Day total</div>
            {proposal.summaryMacros.avgCalPerDay !== undefined && (
              <div className="ck-macro"><span className="ck-macro-label">Cal</span><span className="ck-macro-val">{proposal.summaryMacros.avgCalPerDay}</span></div>
            )}
            {proposal.summaryMacros.avgProteinPerDay !== undefined && (
              <div className="ck-macro"><span className="ck-macro-label">Protein</span><span className="ck-macro-val">{proposal.summaryMacros.avgProteinPerDay}g</span></div>
            )}
            {proposal.summaryMacros.maxSodium !== undefined && (
              <div className="ck-macro"><span className="ck-macro-label">Sodium</span><span className="ck-macro-val">{proposal.summaryMacros.maxSodium}mg</span></div>
            )}
          </div>
        )}
      </div>
      <div className="ck-card-foot">
        <span className="ck-card-note">Not right? Cancel and adjust.</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="ck-btn-cancel" onClick={() => cancelProposal(messageId)} disabled={isStreaming}>Cancel</button>
          <button type="button" className="ck-btn-apply" onClick={() => applyProposal(messageId, dbId)} disabled={isStreaming}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  SaveRecipeNotesCard — confirm-card for propose_save_recipe_notes
// ────────────────────────────────────────────────────────────────────────────
// Small card: recipe name + a preview of each note type being set. The notes
// themselves are markdown; we show a plain-text preview (truncated) so the user
// can confirm the gist before saving.
// ────────────────────────────────────────────────────────────────────────────

interface SaveRecipeNotesCardProps {
  messageId: string;
  dbId?: number;
  proposal: RecipeNotesSaveProposal;
  status: "pending" | "applied" | "cancelled";
}

function SaveRecipeNotesCard({ messageId, dbId, proposal, status }: SaveRecipeNotesCardProps) {
  const { applyProposal, cancelProposal, isStreaming } = useChat();

  if (status === "applied") {
    return (
      <div className="ck-ack">
        Saved &mdash; notes on &ldquo;{proposal.recipeName}&rdquo;{" "}
        <a
          href={`/recipes/${proposal.recipeId}`}
          onClick={(e) => { e.preventDefault(); window.location.href = `/recipes/${proposal.recipeId}`; }}
        >
          View recipe &rarr;
        </a>
      </div>
    );
  }
  if (status === "cancelled") {
    return <div className="ck-ack">Got it — no notes saved.</div>;
  }

  const types = [
    proposal.optimizationNotes ? "Optimization" : null,
    proposal.mealPrepNotes ? "Meal prep" : null,
  ].filter(Boolean).join(" + ");

  return (
    <div className="ck-card">
      <div className="ck-card-head">
        <div className="ck-card-eyebrow">Save notes · {types}</div>
        <div className="ck-card-title">Notes for &ldquo;{proposal.recipeName}&rdquo;</div>
      </div>
      <div className="ck-card-body">
        {proposal.optimizationNotes && (
          <div className="ck-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
            <div className="ck-row-eyebrow">Optimization</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--fg-2)", whiteSpace: "pre-wrap" }}>
              {previewMarkdown(proposal.optimizationNotes)}
            </div>
          </div>
        )}
        {proposal.mealPrepNotes && (
          <div className="ck-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
            <div className="ck-row-eyebrow">Meal prep</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--fg-2)", whiteSpace: "pre-wrap" }}>
              {previewMarkdown(proposal.mealPrepNotes)}
            </div>
          </div>
        )}
      </div>
      <div className="ck-card-foot">
        <span className="ck-card-note">Not right? Cancel and adjust.</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="ck-btn-cancel" onClick={() => cancelProposal(messageId)} disabled={isStreaming}>Cancel</button>
          <button type="button" className="ck-btn-apply" onClick={() => applyProposal(messageId, dbId)} disabled={isStreaming}>Save</button>
        </div>
      </div>
    </div>
  );
}

/** Strip markdown syntax to a plain preview, capped so the card stays compact. */
function previewMarkdown(md: string): string {
  const plain = md
    .replace(/^#+\s*/gm, "")        // headers
    .replace(/[*_`>]/g, "")          // emphasis / code / quote marks
    .replace(/^\s*[-•]\s*/gm, "• ")  // normalize bullets
    .trim();
  return plain.length > 320 ? plain.slice(0, 320).trimEnd() + "…" : plain;
}

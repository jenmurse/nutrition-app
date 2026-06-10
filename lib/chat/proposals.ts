/**
 * Proposal types for Gate 2 — propose-then-confirm writes.
 *
 * The model calls propose_* tools, which return MealProposal objects.
 * The server streams these as `{type:"proposal", data:MealProposal}` events.
 * The client renders them as confirm-cards; APPLY fires the execute params
 * against the existing meal-plan API endpoints.
 *
 * The model CANNOT execute writes. It can only return proposals. The human
 * tap on APPLY is the only thing that fires a write.
 */

export type MealProposalType = "add" | "swap" | "remove" | "update_servings";

/** One side of a swap — what's there now or what replaces it. */
export interface MealProposalSide {
  mealLogId?: number;       // present for the "from" side (existing log)
  recipeId?: number;
  ingredientId?: number;
  externalLabel?: string;   // for eating-out entries
  name: string;             // human-readable, for display
  servings: number;
}

/** Net macro change from this proposal. Positive = more, negative = less. */
export interface MacroDelta {
  calories?: number;
  protein?: number;
  fiber?: number;
  sodium?: number;
}

/** What the client POSTs / PATCHes / PUTs / DELETEs on APPLY. */
export interface ProposalExecute {
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;   // e.g. "/api/meal-plans/123/meals/456"
  body?: Record<string, unknown>;
}

/** One row in a bulk confirm-card. */
export interface BulkItem {
  date: string;       // YYYY-MM-DD
  weekday: string;    // "Monday"
  mealType: string;
  name: string;
  servings: number;
  macros?: { cal?: number; protein?: number; fiber?: number; sodium?: number };
}

/** Summary macro totals across all items in a bulk proposal. */
export interface BulkSummaryMacros {
  avgCalPerDay?: number;
  avgProteinPerDay?: number;
  maxSodium?: number;
}

export interface BulkMealProposal {
  type: "fill_week" | "apply_template";
  personId: number;
  personName: string;
  // For fill_week
  weekLabel?: string;
  // For apply_template
  templateName?: string;
  targetDate?: string;
  targetWeekday?: string;
  mode?: "replace" | "append";
  items: BulkItem[];
  summaryMacros?: BulkSummaryMacros;
  // fill_week: N individual POSTs
  executeAll?: ProposalExecute[];
  // apply_template: one POST
  execute?: ProposalExecute;
}

export interface MealProposal {
  type: MealProposalType;
  personId: number;
  personName: string;
  planId: number;
  date: string;      // YYYY-MM-DD
  mealType: string;  // "breakfast" | "lunch" | "dinner" | "snack" | "side" | "dessert"
  from?: MealProposalSide;   // existing meal (swap / remove / update_servings)
  to?: MealProposalSide;     // replacement or addition (add / swap / update_servings)
  macroDeltas?: MacroDelta;
  execute: ProposalExecute;
}

// ────────────────────────────────────────────────────────────────────────────
// Recipe save proposals (propose_save_recipe)
// ────────────────────────────────────────────────────────────────────────────

/** One ingredient row inside a recipe save proposal — the "what should be in the recipe" list. */
export interface RecipeProposalIngredient {
  ingredientId: number;
  name: string;     // for display
  quantity: number;
  unit: string;
  notes?: string;
}

/** A single line in the ingredient diff between the source recipe and the proposed save. */
export interface RecipeDiffLine {
  kind: "add" | "remove" | "change";
  ingredientId: number;
  name: string;
  // For "add": only "to" is set. For "remove": only "from". For "change": both.
  from?: { quantity: number; unit: string };
  to?:   { quantity: number; unit: string };
}

/** Per-serving macros — both source (if editing) and proposed. */
export interface RecipeMacros {
  cal?: number;
  protein?: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

/**
 * Returned by propose_save_recipe. Renders as the Save Recipe confirm-card
 * (Option B layout from briefs/mockup-save-recipe-card.html — compact summary
 * with expandable ingredient diff).
 *
 * Three save modes — sourceRecipeId determines which is in play:
 *
 * mode="new" + sourceRecipeId set:   editing an existing recipe ("save as
 *                                    new"). Diff is computed vs source;
 *                                    before/after macros shown side-by-side.
 * mode="new" + sourceRecipeId null:  brand-new recipe from scratch
 *                                    ("design me a lemon brownie"). No diff,
 *                                    macros show "after" only.
 * mode="replace":                    overwrite sourceRecipeId. Destructive —
 *                                    UI flags it. sourceRecipeId required.
 */
export interface RecipeSaveProposal {
  type: "save_recipe";
  mode: "new" | "replace";
  /** Source recipe id — null when creating from scratch (mode must be "new" in that case). */
  sourceRecipeId: number | null;
  sourceRecipeName: string | null;
  /** Final recipe name. For "new" from a source, should reflect the modification
   * (e.g. "Salmon Bowl (Lower Sodium)"). For from-scratch, describes the new dish. */
  name: string;
  servingSize: number;
  tags?: string;
  /** Updated instructions, if the model is changing or providing them. */
  instructions?: string;
  /** Final ingredient list — what the recipe will have after save. */
  ingredients: RecipeProposalIngredient[];
  /** Computed diff vs source. Empty array when from-scratch (no source). */
  diff: RecipeDiffLine[];
  /** Per-serving macros for source (when applicable) and proposed. */
  sourceMacros: RecipeMacros;
  proposedMacros: RecipeMacros;
  /** APPLY hits POST /api/recipes (new) or PUT /api/recipes/[id] (replace). */
  execute: ProposalExecute;
}

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

/** What the client POSTs / PATCHes / DELETEs on APPLY. */
export interface ProposalExecute {
  method: "POST" | "PATCH" | "DELETE";
  url: string;   // e.g. "/api/meal-plans/123/meals/456"
  body?: Record<string, unknown>;
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

import { prisma } from "@/lib/db";

/**
 * Account entitlement tier. Stored on `Household.plan`.
 *
 *  - "free" — single person, manual planning, capped day optimizer. No MCP/AI,
 *             no household, no templates.
 *  - "pro"  — everything. The paid tier ($7/mo · $60/yr) at native launch.
 *  - "comp" — same unlocks as pro, but no charge. Friends-and-family (current phase).
 *
 * This is the ONE flag every feature gate reads — app UI, MCP tool handlers,
 * and (later) RLS. Never compare plan strings inline anywhere else; go through
 * `entitlementsFor()` so the tier boundary lives in a single place.
 *
 * Today every household is "comp", so all gates are open. They only start
 * biting when signups default to "free" at native launch.
 */
export type Plan = "free" | "pro" | "comp";

export interface Entitlements {
  household: boolean; // multi-person households
  unlimitedOptimizer: boolean; // uncapped day-optimizer runs
  dayTemplates: boolean; // save/apply day templates
  mcp: boolean; // MCP connection + recipe Optimization/Meal-Prep tabs
}

const PRO: Entitlements = {
  household: true,
  unlimitedOptimizer: true,
  dayTemplates: true,
  mcp: true,
};

const FREE: Entitlements = {
  household: false,
  unlimitedOptimizer: false,
  dayTemplates: false,
  mcp: false,
};

/** Map a plan to what it unlocks. comp and pro unlock identically; comp is just unpaid. */
export function entitlementsFor(plan: Plan): Entitlements {
  return plan === "free" ? FREE : PRO;
}

/** Free-tier lifetime cap on day-optimizer runs. Ignored for pro/comp. */
export const FREE_OPTIMIZER_RUN_CAP = 5;

/** Convenience predicate for the MCP server's enforcement layer. */
export function planAllowsMcp(plan: Plan): boolean {
  return entitlementsFor(plan).mcp;
}

/**
 * Fetch a household's plan when it isn't already in hand (e.g. the MCP path,
 * which resolves a household from a token without loading the row). Defaults
 * to "comp" if the household is missing — fail open during the comp phase.
 */
export async function getHouseholdPlan(householdId: number): Promise<Plan> {
  const hh = await prisma.household.findUnique({
    where: { id: householdId },
    select: { plan: true },
  });
  return (hh?.plan as Plan) ?? "comp";
}

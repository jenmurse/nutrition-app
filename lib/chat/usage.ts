/**
 * Chat usage logging.
 *
 * Called once per /api/chat call after the final stream event. Writes one
 * row to ApiUsageLog with the actual token counts Anthropic reported plus a
 * precomputed cost in USD so dashboards and rate-limit checks don't have to
 * redo the math every read.
 *
 * Pricing is hardcoded per-model. Update PRICING when the model changes.
 * The rates are per 1M tokens, USD, as of build time (see docs/COSTS.md
 * § AI / Claude costs for the source). If Anthropic's pricing changes,
 * existing rows are NOT retroactively updated — they reflect the cost
 * accrued at the time of the call.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

interface ModelPricing {
  inputPerM: number;
  cacheReadPerM: number;
  cacheCreatePerM: number;
  outputPerM: number;
}

const PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-6": {
    inputPerM: 3.0,
    cacheReadPerM: 0.3,
    cacheCreatePerM: 3.75,
    outputPerM: 15.0,
  },
  "claude-opus-4-8": {
    inputPerM: 5.0,
    cacheReadPerM: 0.5,
    cacheCreatePerM: 6.25,
    outputPerM: 25.0,
  },
  "claude-haiku-4-5": {
    inputPerM: 1.0,
    cacheReadPerM: 0.1,
    cacheCreatePerM: 1.25,
    outputPerM: 5.0,
  },
  "claude-3-5-haiku-20241022": {
    inputPerM: 0.8,
    cacheReadPerM: 0.08,
    cacheCreatePerM: 1.0,
    outputPerM: 4.0,
  },
};

/**
 * Compute USD cost from a Usage block. Returns 0 if the model isn't in PRICING
 * (no crash — just no cost attributed, fixable in the dashboard later).
 */
export function computeCostUsd(model: string, usage: Anthropic.Usage): number {
  const p = PRICING[model];
  if (!p) return 0;
  const input = (usage.input_tokens ?? 0) * p.inputPerM;
  const cacheRead = (usage.cache_read_input_tokens ?? 0) * p.cacheReadPerM;
  const cacheCreate = (usage.cache_creation_input_tokens ?? 0) * p.cacheCreatePerM;
  const output = (usage.output_tokens ?? 0) * p.outputPerM;
  return (input + cacheRead + cacheCreate + output) / 1_000_000;
}

/**
 * Persist one chat call to ApiUsageLog. Best-effort — errors are caught
 * and logged; we never fail the user request because logging failed.
 *
 * `usages` is an array because one /api/chat call can fire multiple model
 * calls (the tool-use loop). We sum them into one row tagged feature="chat"
 * so cost per turn is one number, not N.
 */
export async function logChatUsage(args: {
  personId: number;
  householdId: number;
  model: string;
  usages: Anthropic.Usage[];
}): Promise<void> {
  const { personId, householdId, model, usages } = args;
  if (usages.length === 0) return;

  let inputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let outputTokens = 0;
  let cost = 0;
  for (const u of usages) {
    inputTokens += u.input_tokens ?? 0;
    cacheReadTokens += u.cache_read_input_tokens ?? 0;
    cacheCreationTokens += u.cache_creation_input_tokens ?? 0;
    outputTokens += u.output_tokens ?? 0;
    cost += computeCostUsd(model, u);
  }

  try {
    await prisma.apiUsageLog.create({
      data: {
        personId,
        householdId,
        provider: "anthropic",
        model,
        feature: "chat",
        inputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        outputTokens,
        estimatedCostUsd: cost,
      },
    });
  } catch (err) {
    console.error("Failed to log chat usage:", err);
  }
}

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
  /** 5-minute ephemeral cache write (1.25x base). */
  cacheWrite5mPerM: number;
  /** 1-hour ephemeral cache write (2x base). We use ttl:"1h", so most of our
   * writes bill at this rate. The cost computation undercounted before because
   * it applied only the 5m rate to all cache-creation tokens. */
  cacheWrite1hPerM: number;
  outputPerM: number;
}

const PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-6": {
    inputPerM: 3.0,
    cacheReadPerM: 0.3,
    cacheWrite5mPerM: 3.75,
    cacheWrite1hPerM: 6.0,
    outputPerM: 15.0,
  },
  "claude-opus-4-8": {
    inputPerM: 5.0,
    cacheReadPerM: 0.5,
    cacheWrite5mPerM: 6.25,
    cacheWrite1hPerM: 10.0,
    outputPerM: 25.0,
  },
  "claude-haiku-4-5": {
    inputPerM: 1.0,
    cacheReadPerM: 0.1,
    cacheWrite5mPerM: 1.25,
    cacheWrite1hPerM: 2.0,
    outputPerM: 5.0,
  },
  // Used by recipe analyze + ai/analyze (legacy model id, still works on the API)
  "claude-sonnet-4-20250514": {
    inputPerM: 3.0,
    cacheReadPerM: 0.3,
    cacheWrite5mPerM: 3.75,
    cacheWrite1hPerM: 6.0,
    outputPerM: 15.0,
  },
};

/**
 * Compute USD cost from a Usage block. Returns 0 if the model isn't in PRICING.
 *
 * Cache writes are split into 5-minute and 1-hour tiers (the usage object
 * reports them separately under cache_creation). We bill each at its own rate.
 * If the breakdown isn't present (older API shape), we fall back to pricing the
 * whole cache_creation_input_tokens total at the 1h rate — accurate because we
 * set ttl:"1h" on our cache breakpoint.
 */
export function computeCostUsd(model: string, usage: Anthropic.Usage): number {
  const p = PRICING[model];
  if (!p) return 0;
  const input = (usage.input_tokens ?? 0) * p.inputPerM;
  const cacheRead = (usage.cache_read_input_tokens ?? 0) * p.cacheReadPerM;

  // Prefer the 5m/1h breakdown when the API provides it.
  const breakdown = (usage as { cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } }).cache_creation;
  let cacheCreate: number;
  if (breakdown && (breakdown.ephemeral_5m_input_tokens != null || breakdown.ephemeral_1h_input_tokens != null)) {
    cacheCreate =
      (breakdown.ephemeral_5m_input_tokens ?? 0) * p.cacheWrite5mPerM +
      (breakdown.ephemeral_1h_input_tokens ?? 0) * p.cacheWrite1hPerM;
  } else {
    // Fallback: price the total at the 1h rate (we use ttl:"1h").
    cacheCreate = (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite1hPerM;
  }

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
  /** Verbatim user prompt that started the turn — surfaced in /api/admin/usage. */
  userMessage?: string;
  /** Tool names called this turn, in order. */
  toolsUsed?: string[];
  /** System prompt version, e.g. "V9". */
  promptVersion?: string;
}): Promise<void> {
  const { personId, householdId, model, usages, userMessage, toolsUsed, promptVersion } = args;
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
        userMessage: userMessage?.slice(0, 500),  // truncate so admin payload stays small
        toolsUsed: toolsUsed?.length ? toolsUsed.join(",") : null,
        promptVersion,
      },
    });
  } catch (err) {
    console.error("Failed to log chat usage:", err);
  }
}

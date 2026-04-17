import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

// Anthropic pricing per million tokens (as of mid-2025)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "default": { input: 3.0, output: 15.0 },
};

/**
 * GET /api/settings/usage
 * Returns aggregate token usage and estimated cost
 */
export const GET = withAuth(async (auth) => {
  const logs = await prisma.apiUsageLog.findMany({
    where: { householdId: auth.householdId },
    orderBy: { createdAt: "desc" },
  });

  const totalInputTokens = logs.reduce((s, l) => s + l.inputTokens, 0);
  const totalOutputTokens = logs.reduce((s, l) => s + l.outputTokens, 0);
  const callCount = logs.length;

  // Compute cost per log entry using the model's rate
  const estimatedCostUsd = logs.reduce((sum, log) => {
    const rate = PRICING[log.model] ?? PRICING["default"];
    return sum + (log.inputTokens / 1_000_000) * rate.input
               + (log.outputTokens / 1_000_000) * rate.output;
  }, 0);

  return NextResponse.json({
    totalInputTokens,
    totalOutputTokens,
    callCount,
    estimatedCostUsd: Math.round(estimatedCostUsd * 10000) / 10000, // 4 decimal places
  });
}, "Failed to load usage");

/**
 * DELETE /api/settings/usage
 * Clear the usage log
 */
export const DELETE = withAuth(async (auth) => {
  await prisma.apiUsageLog.deleteMany({ where: { householdId: auth.householdId } });
  return NextResponse.json({ success: true });
}, "Failed to clear usage log");

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
export async function GET() {
  try {
    const logs = await prisma.apiUsageLog.findMany({
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
  } catch (error) {
    console.error("GET /api/settings/usage error:", error);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/usage
 * Clear the usage log
 */
export async function DELETE() {
  try {
    await prisma.apiUsageLog.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/settings/usage error:", error);
    return NextResponse.json({ error: "Failed to clear usage log" }, { status: 500 });
  }
}

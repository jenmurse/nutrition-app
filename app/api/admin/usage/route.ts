/**
 * GET /api/admin/usage?days=30&feature=all
 *
 * Returns Anthropic usage stats for the last N days across ALL features
 * (chat, recipe_analyze, ai_analyze, etc.) so the total matches what
 * Anthropic's dashboard bills.
 *
 * Query params:
 *   - days: lookback window (default 30, max 365)
 *   - feature: 'all' (default) | 'chat' | 'recipe_analyze' | 'ai_analyze'
 *
 * Auth: x-admin-password header (same as /api/admin/waitlist).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daysParam = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const featureFilter = req.nextUrl.searchParams.get("feature") ?? "all";

  const rows = await prisma.apiUsageLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(featureFilter !== "all" ? { feature: featureFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: { person: { select: { name: true } } },
  });

  // Summary
  let totalCost = 0;
  let totalInput = 0;
  let totalCacheRead = 0;
  let totalCacheCreate = 0;
  let totalOutput = 0;
  for (const r of rows) {
    totalCost += r.estimatedCostUsd;
    totalInput += r.inputTokens;
    totalCacheRead += r.cacheReadTokens;
    totalCacheCreate += r.cacheCreationTokens;
    totalOutput += r.outputTokens;
  }
  const totalInputTokensAll = totalInput + totalCacheRead + totalCacheCreate;
  const cacheHitRate = totalInputTokensAll > 0
    ? Math.round((totalCacheRead / totalInputTokensAll) * 100)
    : 0;

  // By day (UTC date)
  const dayMap = new Map<string, { cost: number; turns: number }>();
  for (const r of rows) {
    const day = r.createdAt.toISOString().slice(0, 10);
    const entry = dayMap.get(day) ?? { cost: 0, turns: 0 };
    entry.cost += r.estimatedCostUsd;
    entry.turns += 1;
    dayMap.set(day, entry);
  }
  const byDay = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, cost: round4(v.cost), turns: v.turns }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // By person
  const personMap = new Map<string, { cost: number; turns: number }>();
  for (const r of rows) {
    const key = r.person?.name ?? `person_${r.personId}`;
    const entry = personMap.get(key) ?? { cost: 0, turns: 0 };
    entry.cost += r.estimatedCostUsd;
    entry.turns += 1;
    personMap.set(key, entry);
  }
  const byPerson = Array.from(personMap.entries())
    .map(([name, v]) => ({ name, cost: round4(v.cost), turns: v.turns }))
    .sort((a, b) => b.cost - a.cost);

  // By feature
  const featureMap = new Map<string, { cost: number; turns: number }>();
  for (const r of rows) {
    const key = r.feature || "unknown";
    const entry = featureMap.get(key) ?? { cost: 0, turns: 0 };
    entry.cost += r.estimatedCostUsd;
    entry.turns += 1;
    featureMap.set(key, entry);
  }
  const byFeature = Array.from(featureMap.entries())
    .map(([feature, v]) => ({ feature, cost: round4(v.cost), turns: v.turns }))
    .sort((a, b) => b.cost - a.cost);

  // Recent turns (last 50) — annotated so you can see what actually happened
  // in each turn: prompt, tools fired, cache state, and cost.
  const recent = rows.slice(0, 50).map((r) => {
    // Cache state derived from the token mix:
    //   COLD  — first turn in a cache window (wrote new cache, no reads)
    //   WARM  — fully cached (reads only, no writes)
    //   MIXED — cache existed but new content was added on top
    let cacheState: "COLD" | "WARM" | "MIXED" = "COLD";
    if (r.cacheReadTokens > 0 && r.cacheCreationTokens === 0) cacheState = "WARM";
    else if (r.cacheReadTokens > 0 && r.cacheCreationTokens > 0) cacheState = "MIXED";
    return {
      id: r.id,
      createdAt: r.createdAt,
      person: r.person?.name ?? `person_${r.personId}`,
      model: r.model,
      feature: r.feature || "unknown",
      promptVersion: r.promptVersion ?? null,
      userMessage: r.userMessage ?? null,
      tools: r.toolsUsed ? r.toolsUsed.split(",") : [],
      cacheState,
      inputTokens: r.inputTokens,
      cacheReadTokens: r.cacheReadTokens,
      cacheCreationTokens: r.cacheCreationTokens,
      outputTokens: r.outputTokens,
      costUsd: round4(r.estimatedCostUsd),
    };
  });

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    summary: {
      totalCostUsd: round4(totalCost),
      turns: rows.length,
      avgCostPerTurn: rows.length > 0 ? round4(totalCost / rows.length) : 0,
      cacheHitRate: `${cacheHitRate}%`,
      tokens: {
        input: totalInput,
        cacheRead: totalCacheRead,
        cacheWrite: totalCacheCreate,
        output: totalOutput,
      },
    },
    byDay,
    byPerson,
    byFeature,
    recent,
  });
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

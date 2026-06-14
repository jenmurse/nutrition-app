/**
 * Backfill estimatedCostUsd on ApiUsageLog rows using the corrected cache-write
 * pricing (5m vs 1h).
 *
 * Background: cost was originally computed with the 5-minute cache-write rate
 * ($3.75/MTok on Sonnet) hardcoded, but we use ttl:"1h" caching ($6/MTok). Every
 * cache-write token was undercounted ~1.6x, so the /admin/usage dashboard read
 * lower than Anthropic's actual bill. The live path is fixed; this corrects the
 * historical rows.
 *
 * We only stored the TOTAL cacheCreationTokens, not the 5m/1h split, so this
 * reprices the whole cache-creation total at the 1h rate (the same fallback the
 * fixed computeCostUsd uses when no breakdown is present). That's an
 * approximation — slightly high for any tokens that were actually 5m writes —
 * but much closer to reality than the old number. Anthropic's billing CSV
 * remains the exact source of truth.
 *
 * Reuses the exact PRICING + math from lib/chat/usage.ts by constructing a
 * synthetic Usage object from the stored token columns.
 *
 * Flags:
 *   --report   Default. Show before/after totals; write nothing.
 *   --write    Apply the recomputed costs.
 *
 * Usage:
 *   npx tsx scripts/backfill-chat-cost.ts            # report only
 *   npx tsx scripts/backfill-chat-cost.ts --write    # apply
 */

import { PrismaClient } from "@prisma/client";
import type Anthropic from "@anthropic-ai/sdk";
import { computeCostUsd } from "../lib/chat/usage";

const prisma = new PrismaClient();
const DO_WRITE = process.argv.includes("--write");

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

async function main() {
  const rows = await prisma.apiUsageLog.findMany({
    select: {
      id: true,
      model: true,
      inputTokens: true,
      cacheReadTokens: true,
      cacheCreationTokens: true,
      outputTokens: true,
      estimatedCostUsd: true,
    },
    orderBy: { id: "asc" },
  });

  let oldTotal = 0;
  let newTotal = 0;
  let changed = 0;
  const updates: Array<{ id: number; cost: number }> = [];

  for (const r of rows) {
    // Build a synthetic Usage from the stored columns. No cache_creation
    // breakdown → computeCostUsd falls back to the 1h rate on the total.
    const usage = {
      input_tokens: r.inputTokens,
      output_tokens: r.outputTokens,
      cache_read_input_tokens: r.cacheReadTokens,
      cache_creation_input_tokens: r.cacheCreationTokens,
    } as Anthropic.Usage;

    const recomputed = round4(computeCostUsd(r.model, usage));
    oldTotal += r.estimatedCostUsd;
    newTotal += recomputed;
    if (recomputed !== round4(r.estimatedCostUsd)) {
      changed++;
      updates.push({ id: r.id, cost: recomputed });
    }
  }

  console.log(`Rows scanned:        ${rows.length}`);
  console.log(`Rows changing:       ${changed}`);
  console.log(`Old total cost:      $${oldTotal.toFixed(4)}`);
  console.log(`Recomputed total:    $${newTotal.toFixed(4)}`);
  console.log(`Delta:               $${(newTotal - oldTotal).toFixed(4)} (${oldTotal > 0 ? Math.round(((newTotal - oldTotal) / oldTotal) * 100) : 0}% higher)`);

  if (!DO_WRITE) {
    console.log(`\n(report only — re-run with --write to apply)`);
    return;
  }

  // Apply in a transaction.
  await prisma.$transaction(
    updates.map((u) =>
      prisma.apiUsageLog.update({
        where: { id: u.id },
        data: { estimatedCostUsd: u.cost },
      }),
    ),
  );
  console.log(`\n✓ Updated ${updates.length} rows.`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

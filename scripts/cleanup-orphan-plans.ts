// Clean up orphan meal plans (personId = null). These were created by an older
// bug where a plan got made without a person. Empty orphans (0 meals) are junk
// and safe to delete; orphans WITH meals are flagged for manual review, never
// auto-deleted (they may hold data worth re-attributing).
//
// Dry-run (default): npx tsx --env-file=.env.local scripts/cleanup-orphan-plans.ts
// Delete empties:    npx tsx --env-file=.env.local scripts/cleanup-orphan-plans.ts --delete
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DELETE = process.argv.includes("--delete");

async function run() {
  const orphans = await prisma.mealPlan.findMany({
    where: { personId: null },
    include: { _count: { select: { mealLogs: true } } },
    orderBy: { weekStartDate: "asc" },
  });

  const empty = orphans.filter((p) => p._count.mealLogs === 0);
  const nonEmpty = orphans.filter((p) => p._count.mealLogs > 0);

  console.log(`\n${orphans.length} orphan plans (no person): ${empty.length} empty, ${nonEmpty.length} with meals.\n`);

  if (nonEmpty.length > 0) {
    console.log("⚠️  Orphans WITH meals — NOT deleting (review manually):");
    for (const p of nonEmpty) {
      console.log(`    plan #${p.id} · week ${p.weekStartDate.toISOString().slice(0, 10)} · ${p._count.mealLogs} meals`);
    }
    console.log("");
  }

  if (empty.length === 0) {
    console.log("No empty orphans to delete.");
    await prisma.$disconnect();
    return;
  }

  const ids = empty.map((p) => p.id);
  console.log(`Empty orphans${DELETE ? " (deleting)" : " (dry-run — pass --delete to remove)"}:`);
  for (const p of empty) {
    console.log(`    plan #${p.id} · week ${p.weekStartDate.toISOString().slice(0, 10)}`);
  }

  if (DELETE) {
    // Remove dependent nutrition goals first, then the plans.
    await prisma.nutritionGoal.deleteMany({ where: { mealPlanId: { in: ids } } });
    const res = await prisma.mealPlan.deleteMany({ where: { id: { in: ids } } });
    console.log(`\nDeleted ${res.count} empty orphan plans.`);
  } else {
    console.log(`\nWould delete ${ids.length} plans. Re-run with --delete to apply.`);
  }

  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });

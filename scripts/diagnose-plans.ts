// Diagnostic: list meal plans per person per week, flag duplicates.
// Run: npx tsx --env-file=.env.local scripts/diagnose-plans.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const persons = await prisma.person.findMany({ select: { id: true, name: true } });
  const nameById = new Map(persons.map((p) => [p.id, p.name]));

  const plans = await prisma.mealPlan.findMany({
    orderBy: [{ personId: "asc" }, { weekStartDate: "asc" }],
    include: { _count: { select: { mealLogs: true } } },
  });

  console.log(`\n${plans.length} meal plans total.\n`);

  // Group by person+week to find duplicates
  const key = (p: { personId: number | null; weekStartDate: Date }) =>
    `${p.personId ?? "none"}|${p.weekStartDate.toISOString().slice(0, 10)}`;
  const groups = new Map<string, typeof plans>();
  for (const p of plans) {
    const k = key(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }

  for (const [, group] of groups) {
    const p0 = group[0];
    const who = p0.personId ? nameById.get(p0.personId) ?? `person ${p0.personId}` : "(no person)";
    const week = p0.weekStartDate.toISOString().slice(0, 10);
    const dup = group.length > 1 ? "  ⚠️ DUPLICATE" : "";
    console.log(`${who} — week ${week}${dup}`);
    for (const p of group) {
      console.log(`    plan #${p.id} · ${p._count.mealLogs} meals · created ${p.createdAt.toISOString()}`);
    }
  }

  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });

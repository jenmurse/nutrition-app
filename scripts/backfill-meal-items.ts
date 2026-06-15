/**
 * Backfill Ingredient.isMealItem for ONE household, correcting the seeding bug
 * that flagged ALL starter-pantry items as meal items.
 *
 * For each ingredient in the target household whose name matches a curated
 * starter item, set isMealItem to that item's curated value (true only for the
 * ~20 standalone meal items). Ingredients NOT in the starter list (custom items
 * the user added) are LEFT UNTOUCHED — we only correct seeded rows.
 *
 * SCOPED ON PURPOSE: this is targeted at a single household (e.g. Angie's),
 * because other households (e.g. Jen's) had their isMealItem set manually and
 * are already correct. Never run this household-wide without targeting.
 *
 * Targeting (one required):
 *   --household <id>        target by household id
 *   --person "<name>"       target the active household of the person with this name
 *
 * Modes:
 *   --report   Default. Show what would change; write nothing.
 *   --write    Apply.
 *
 * Usage:
 *   npx tsx scripts/backfill-meal-items.ts --person "Angie"
 *   npx tsx scripts/backfill-meal-items.ts --person "Angie" --write
 *   npx tsx scripts/backfill-meal-items.ts --household 5 --write
 */

import { PrismaClient } from "@prisma/client";
import { STARTER_PANTRY, STARTER_MEAL_ITEM_NAMES } from "../lib/starter-pantry";

const prisma = new PrismaClient();
const DO_WRITE = process.argv.includes("--write");

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function resolveHouseholdId(): Promise<number | null> {
  const hh = argValue("--household");
  if (hh) {
    const n = Number(hh);
    return Number.isFinite(n) ? n : null;
  }
  const personName = argValue("--person");
  if (personName) {
    const person = await prisma.person.findFirst({
      where: { name: { equals: personName, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (!person) {
      console.error(`No person named "${personName}" found.`);
      return null;
    }
    const member = await prisma.householdMember.findFirst({
      where: { personId: person.id, active: true },
      select: { householdId: true },
    });
    if (!member) {
      console.error(`Person "${person.name}" has no active household.`);
      return null;
    }
    console.log(`Resolved person "${person.name}" → household ${member.householdId}`);
    return member.householdId;
  }
  return null;
}

async function main() {
  const householdId = await resolveHouseholdId();
  if (householdId == null) {
    console.error("Specify --household <id> or --person \"<name>\". Aborting (won't touch all households).");
    process.exit(1);
  }

  const starterNames = new Set(STARTER_PANTRY.map((s) => s.name));

  const ingredients = await prisma.ingredient.findMany({
    where: { householdId },
    select: { id: true, name: true, isMealItem: true },
    orderBy: { name: "asc" },
  });

  const changes: Array<{ id: number; name: string; from: boolean; to: boolean }> = [];
  let untouchedCustom = 0;
  let alreadyCorrect = 0;

  for (const ing of ingredients) {
    if (!starterNames.has(ing.name)) {
      untouchedCustom++; // custom item — leave alone
      continue;
    }
    const shouldBe = STARTER_MEAL_ITEM_NAMES.has(ing.name);
    if (ing.isMealItem === shouldBe) {
      alreadyCorrect++;
      continue;
    }
    changes.push({ id: ing.id, name: ing.name, from: ing.isMealItem, to: shouldBe });
  }

  console.log(`\nHousehold ${householdId} — ${ingredients.length} ingredients`);
  console.log(`  Custom (not starter, untouched): ${untouchedCustom}`);
  console.log(`  Already correct:                 ${alreadyCorrect}`);
  console.log(`  Will change:                     ${changes.length}`);

  const turningOff = changes.filter((c) => c.from && !c.to);
  const turningOn = changes.filter((c) => !c.from && c.to);
  if (turningOff.length) {
    console.log(`\n  → Hiding from picker (${turningOff.length}): ${turningOff.map((c) => c.name).join(", ")}`);
  }
  if (turningOn.length) {
    console.log(`\n  → Showing in picker (${turningOn.length}): ${turningOn.map((c) => c.name).join(", ")}`);
  }

  if (!DO_WRITE) {
    console.log(`\n(report only — re-run with --write to apply)`);
    return;
  }

  await prisma.$transaction(
    changes.map((c) =>
      prisma.ingredient.update({ where: { id: c.id }, data: { isMealItem: c.to } }),
    ),
  );
  console.log(`\n✓ Updated ${changes.length} ingredients in household ${householdId}.`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

/**
 * Dev tool — clears a Person and all their related data by email.
 * Refuses to run in production. Used for testing the auth/onboarding flow.
 *
 * Usage:
 *   npx tsx scripts/dev/wipe-user.ts hello@example.com
 *
 * Note: this script does NOT rely on cascade deletes — production FK behavior
 * stays restrictive on purpose so accidental Person deletes fail loudly.
 * As the schema grows, audit the FK list and add new related tables here.
 */
import { prisma } from "@/lib/db";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.");
  process.exit(1);
}

async function wipeUser(email: string) {
  await prisma.$transaction(async (tx) => {
    const person = await tx.person.findFirst({ where: { email } });
    if (!person) {
      console.log(`No person found for ${email}`);
      return;
    }

    // Invites — delete both ones this person created and ones targeting them
    await tx.householdInvite.deleteMany({
      where: { OR: [{ createdBy: person.id }, { forPersonId: person.id }] },
    });

    // Membership rows
    await tx.householdMember.deleteMany({ where: { personId: person.id } });

    // Per-person plans + their nested logs/goals
    const plans = await tx.mealPlan.findMany({ where: { personId: person.id } });
    for (const plan of plans) {
      await tx.nutritionGoal.deleteMany({ where: { mealPlanId: plan.id } });
      await tx.mealLog.deleteMany({ where: { mealPlanId: plan.id } });
    }
    await tx.mealPlan.deleteMany({ where: { personId: person.id } });

    // Per-person nutrition goals + favorites
    await tx.globalNutritionGoal.deleteMany({ where: { personId: person.id } });
    await tx.recipeFavorite.deleteMany({ where: { personId: person.id } });

    // Finally, the person
    await tx.person.delete({ where: { id: person.id } });
    console.log(`Wiped ${email} (Person id=${person.id})`);
  });
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/dev/wipe-user.ts <email>");
  process.exit(1);
}

wipeUser(email)
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

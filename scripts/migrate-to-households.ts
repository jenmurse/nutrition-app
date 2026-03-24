/**
 * One-time migration: Add household structure to existing data
 *
 * 1. Queries Supabase auth.users to get existing user UUIDs
 * 2. Updates Person records with supabaseId and email
 * 3. Creates a Household for the existing users
 * 4. Creates HouseholdMember records
 * 5. Backfills householdId on all scoped tables
 *
 * Prerequisites:
 *   1. DATABASE_URL in .env.local must point to Supabase
 *   2. prisma db push must have been run (new schema applied)
 *   3. SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 *
 * Run:
 *   npx tsx scripts/migrate-to-households.ts
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Get all Supabase auth users
  console.log("Fetching Supabase auth users...");
  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers();

  if (error) throw new Error(`Failed to list users: ${error.message}`);
  if (!users || users.length === 0) throw new Error("No auth users found");

  console.log(`Found ${users.length} auth users:`);
  for (const u of users) {
    console.log(`  - ${u.email} (${u.id})`);
  }

  // Step 2: Get existing Person records
  const persons = await prisma.person.findMany({ orderBy: { id: "asc" } });
  console.log(
    `\nFound ${persons.length} existing persons:`,
    persons.map((p) => p.name)
  );

  // Step 3: Match auth users to persons by email or name
  // Prompt for mapping if ambiguous
  const personUpdates: { personId: number; supabaseId: string; email: string }[] = [];

  for (const person of persons) {
    // Try to find a matching auth user
    const match = users.find(
      (u) =>
        u.email?.toLowerCase().includes(person.name.toLowerCase()) ||
        person.name.toLowerCase().includes(u.email?.split("@")[0].toLowerCase() || "")
    );

    if (match) {
      console.log(`  Matched: ${person.name} → ${match.email}`);
      personUpdates.push({
        personId: person.id,
        supabaseId: match.id,
        email: match.email || "",
      });
    } else {
      console.log(
        `  WARNING: No match for person "${person.name}". Assigning first unmatched user.`
      );
      const unmatched = users.find(
        (u) => !personUpdates.some((pu) => pu.supabaseId === u.id)
      );
      if (unmatched) {
        console.log(`  Assigning: ${person.name} → ${unmatched.email}`);
        personUpdates.push({
          personId: person.id,
          supabaseId: unmatched.id,
          email: unmatched.email || "",
        });
      } else {
        console.log(`  SKIPPED: No auth user available for ${person.name}`);
      }
    }
  }

  // Step 4: Update Person records with supabaseId and email
  console.log("\nUpdating Person records...");
  for (const update of personUpdates) {
    await prisma.person.update({
      where: { id: update.personId },
      data: { supabaseId: update.supabaseId, email: update.email },
    });
    console.log(`  Updated person ${update.personId} with supabaseId`);
  }

  // Step 5: Create Household
  const householdName =
    persons.length > 1
      ? `${persons.map((p) => p.name).join(" & ")}'s Kitchen`
      : `${persons[0]?.name || "My"}'s Kitchen`;

  console.log(`\nCreating household: "${householdName}"...`);
  const household = await prisma.household.create({
    data: { name: householdName },
  });
  console.log(`  Created household ${household.id}`);

  // Step 6: Create HouseholdMember records
  console.log("\nCreating household memberships...");
  for (let i = 0; i < personUpdates.length; i++) {
    await prisma.householdMember.create({
      data: {
        personId: personUpdates[i].personId,
        householdId: household.id,
        active: true,
        role: i === 0 ? "owner" : "member",
      },
    });
    console.log(
      `  Added person ${personUpdates[i].personId} as ${i === 0 ? "owner" : "member"}`
    );
  }

  // Step 7: Backfill householdId on all scoped tables
  console.log("\nBackfilling householdId on scoped tables...");

  const ingredientCount = await prisma.ingredient.updateMany({
    where: { householdId: null },
    data: { householdId: household.id },
  });
  console.log(`  Ingredients: ${ingredientCount.count} rows`);

  const recipeCount = await prisma.recipe.updateMany({
    where: { householdId: null },
    data: { householdId: household.id },
  });
  console.log(`  Recipes: ${recipeCount.count} rows`);

  const mealPlanCount = await prisma.mealPlan.updateMany({
    where: { householdId: null },
    data: { householdId: household.id },
  });
  console.log(`  MealPlans: ${mealPlanCount.count} rows`);

  const goalCount = await prisma.globalNutritionGoal.updateMany({
    where: { householdId: null },
    data: { householdId: household.id },
  });
  console.log(`  GlobalNutritionGoals: ${goalCount.count} rows`);

  const settingCount = await prisma.systemSetting.updateMany({
    where: { householdId: null },
    data: { householdId: household.id },
  });
  console.log(`  SystemSettings: ${settingCount.count} rows`);

  const usageCount = await prisma.apiUsageLog.updateMany({
    where: { householdId: null },
    data: { householdId: household.id },
  });
  console.log(`  ApiUsageLogs: ${usageCount.count} rows`);

  console.log("\n✓ Migration complete!");
  console.log(`  Household: ${household.name} (id: ${household.id})`);
  console.log(`  Members: ${personUpdates.length}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

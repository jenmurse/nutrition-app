import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { prisma } from "@/lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";

export async function DELETE() {
  const auth = await getAuthenticatedHousehold();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { personId, supabaseId, householdId } = auth;

  const memberCount = await prisma.householdMember.count({ where: { householdId } });
  const isSoleMember = memberCount <= 1;

  await prisma.$transaction(async (tx) => {
    // Delete invites created by this person (no cascade on creator relation)
    await tx.householdInvite.deleteMany({ where: { createdBy: personId } });

    // Delete person-scoped nutrition goals
    await tx.globalNutritionGoal.deleteMany({ where: { personId } });

    // Delete meal plans (cascades MealLogs and NutritionGoals)
    await tx.mealPlan.deleteMany({ where: { personId } });

    if (isSoleMember) {
      // Delete all household data — nothing left to preserve
      await tx.recipe.deleteMany({ where: { householdId } });
      await tx.ingredient.deleteMany({ where: { householdId } });
      await tx.household.delete({ where: { id: householdId } });
    }

    // Delete person (cascades HouseholdMember, RecipeFavorite, HouseholdInvite.forPerson)
    await tx.person.delete({ where: { id: personId } });
  });

  // Delete Supabase auth user (must happen after DB cleanup)
  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await supabaseAdmin.auth.admin.deleteUser(supabaseId);

  return NextResponse.json({ ok: true });
}

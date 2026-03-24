import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export type AuthResult =
  | { personId: number; supabaseId: string; householdId: number; role: string }
  | { error: string; status: number };

/**
 * Resolves the authenticated Supabase user to their Person record and active household.
 * Call at the top of every household-scoped API route.
 */
export async function getAuthenticatedHousehold(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const person = await prisma.person.findUnique({
    where: { supabaseId: user.id },
    include: {
      householdMembers: {
        where: { active: true },
        include: { household: true },
        take: 1,
      },
    },
  });

  if (!person || person.householdMembers.length === 0) {
    return { error: "No household found", status: 403 };
  }

  const membership = person.householdMembers[0];
  return {
    personId: person.id,
    supabaseId: user.id,
    householdId: membership.householdId,
    role: membership.role,
  };
}

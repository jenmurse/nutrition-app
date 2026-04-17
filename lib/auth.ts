import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export type AuthResult =
  | { personId: number; supabaseId: string; householdId: number; role: string }
  | { error: string; status: number };

/**
 * Resolves the authenticated Supabase user to their Person record and active household.
 * Call at the top of every household-scoped API route.
 *
 * Reads x-supabase-user-id header set by middleware to skip the redundant
 * supabase.auth.getUser() call (middleware already verified the session).
 */
export async function getAuthenticatedHousehold(): Promise<AuthResult> {
  // Try to read user ID from middleware header (avoids redundant Supabase auth call)
  const headerStore = await headers();
  let supabaseId = headerStore.get("x-supabase-user-id");

  if (!supabaseId) {
    // Fallback: full auth check (for non-middleware paths or if header missing)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized", status: 401 };
    }
    supabaseId = user.id;
  }

  const person = await prisma.person.findUnique({
    where: { supabaseId },
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
    supabaseId,
    householdId: membership.householdId,
    role: membership.role,
  };
}


import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/households — list the current user's households
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const person = await prisma.person.findUnique({
      where: { supabaseId: user.id },
      include: {
        householdMembers: {
          include: { household: true },
          orderBy: { joinedAt: "desc" },
        },
      },
    });

    if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });

    const households = person.householdMembers.map((m) => ({
      id: m.household.id,
      name: m.household.name,
      active: m.active,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return NextResponse.json(households);
  } catch (error) {
    console.error("Error fetching households:", error);
    return NextResponse.json({ error: "Failed to fetch households" }, { status: 500 });
  }
}

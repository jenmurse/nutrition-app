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

    const households = await Promise.all(
      person.householdMembers.map(async (m) => {
        const members = await prisma.householdMember.findMany({
          where: { householdId: m.household.id, active: true },
          select: { personId: true, role: true },
        });
        return {
          id: m.household.id,
          name: m.household.name,
          active: m.active,
          role: m.role,
          joinedAt: m.joinedAt,
          members,
        };
      })
    );

    return NextResponse.json(households);
  } catch (error) {
    console.error("Error fetching households:", error);
    return NextResponse.json({ error: "Failed to fetch households" }, { status: 500 });
  }
}

/**
 * PATCH /api/households — rename the active household
 */
export async function PATCH(request: Request) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const household = await prisma.household.update({
      where: { id: auth.householdId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ id: household.id, name: household.name });
  } catch (error) {
    console.error("Error renaming household:", error);
    return NextResponse.json({ error: "Failed to rename household" }, { status: 500 });
  }
}

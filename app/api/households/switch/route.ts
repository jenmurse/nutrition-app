import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/households/switch — switch active household
 * Body: { householdId: number }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const person = await prisma.person.findUnique({
      where: { supabaseId: user.id },
    });
    if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 });

    const { householdId } = await request.json();
    if (!householdId) return NextResponse.json({ error: "householdId required" }, { status: 400 });

    // Verify person is a member of the target household
    const membership = await prisma.householdMember.findUnique({
      where: { personId_householdId: { personId: person.id, householdId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this household" }, { status: 403 });
    }

    // Deactivate all, then activate the target
    await prisma.householdMember.updateMany({
      where: { personId: person.id },
      data: { active: false },
    });
    await prisma.householdMember.update({
      where: { id: membership.id },
      data: { active: true },
    });

    return NextResponse.json({ ok: true, householdId });
  } catch (error) {
    console.error("Error switching household:", error);
    return NextResponse.json({ error: "Failed to switch household" }, { status: 500 });
  }
}

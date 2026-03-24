import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Auto-provision: ensure Person, Household, HouseholdMember exist
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await provisionUser(user, inviteToken);
    }
  } catch (err) {
    console.error("Auto-provision error:", err);
    // Don't block login on provisioning errors
  }

  return NextResponse.redirect(`${origin}/`);
}

async function provisionUser(
  user: { id: string; email?: string; user_metadata?: Record<string, any> },
  inviteToken: string | null
) {
  // Check if Person record exists for this Supabase user
  let person = await prisma.person.findUnique({
    where: { supabaseId: user.id },
    include: { householdMembers: { where: { active: true } } },
  });

  // Handle invite token
  let invite = null;
  if (inviteToken) {
    invite = await prisma.householdInvite.findUnique({
      where: { token: inviteToken },
      include: { household: true },
    });
    // Validate invite: not used, not expired
    if (invite && (invite.usedAt || invite.expiresAt < new Date())) {
      invite = null; // Treat as no invite
    }
  }

  if (!person) {
    // New user — create Person record
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "New User";

    person = await prisma.person.create({
      data: {
        supabaseId: user.id,
        email: user.email || null,
        name: displayName,
      },
      include: { householdMembers: { where: { active: true } } },
    });

    if (invite) {
      // Join inviter's household
      await prisma.householdMember.create({
        data: {
          personId: person.id,
          householdId: invite.householdId,
          active: true,
          role: "member",
        },
      });
      await prisma.householdInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedBy: person.id },
      });
    } else {
      // Create their own household
      const household = await prisma.household.create({
        data: { name: `${displayName}'s Kitchen` },
      });
      await prisma.householdMember.create({
        data: {
          personId: person.id,
          householdId: household.id,
          active: true,
          role: "owner",
        },
      });
    }
  } else if (invite) {
    // Existing user with a valid invite — switch households
    // Deactivate current household memberships
    await prisma.householdMember.updateMany({
      where: { personId: person.id, active: true },
      data: { active: false },
    });

    // Check if already a member of invite's household
    const existingMembership = await prisma.householdMember.findUnique({
      where: {
        personId_householdId: {
          personId: person.id,
          householdId: invite.householdId,
        },
      },
    });

    if (existingMembership) {
      await prisma.householdMember.update({
        where: { id: existingMembership.id },
        data: { active: true },
      });
    } else {
      await prisma.householdMember.create({
        data: {
          personId: person.id,
          householdId: invite.householdId,
          active: true,
          role: "member",
        },
      });
    }

    await prisma.householdInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedBy: person.id },
    });
  }
  // Existing user without invite — nothing to do, they already have a household
}

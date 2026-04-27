import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const redirectBase =
    forwardedHost && process.env.NODE_ENV !== "development"
      ? `https://${forwardedHost}`
      : origin;

  const cookieStore = await cookies();
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  let redirectUrl = `${redirectBase}/home`;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] code exchange error:", error);
      return NextResponse.redirect(`${redirectBase}/login?error=auth`);
    }

    const user = data.user ?? data.session?.user ?? null;
    console.log("[auth/callback] user id:", user?.id ?? "NULL", "email:", user?.email ?? "NULL");

    if (user) {
      try {
        const needsOnboarding = await provisionUser(user, inviteToken);
        console.log("[auth/callback] needsOnboarding:", needsOnboarding, "-> redirecting to:", needsOnboarding ? "/onboarding" : "/home");
        if (needsOnboarding) {
          redirectUrl = `${redirectBase}/onboarding`;
        }
      } catch (err) {
        console.error("[auth/callback] provisionUser threw:", err);
        // Provisioning failed — send to onboarding so the user isn't stranded at /home with no person record
        redirectUrl = `${redirectBase}/onboarding`;
      }
    } else {
      console.error("[auth/callback] exchangeCodeForSession returned no user (session:", data.session?.user?.id ?? "NULL", ")");
    }
  }

  const response = NextResponse.redirect(redirectUrl);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}

// Returns true if the user needs to go through onboarding.
async function provisionUser(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  inviteToken: string | null
): Promise<boolean> {
  let person = await prisma.person.findUnique({
    where: { supabaseId: user.id },
    include: { householdMembers: { where: { active: true } } },
  });

  let invite = null;
  if (inviteToken) {
    invite = await prisma.householdInvite.findUnique({
      where: { token: inviteToken },
      include: { household: true },
    });
    if (invite && (invite.usedAt || invite.expiresAt < new Date())) {
      invite = null;
    }
  }

  // Email fallback — guard against Supabase issuing a new UID for the same email
  if (!person && user.email) {
    const byEmail = await prisma.person.findFirst({
      where: { email: user.email },
      include: { householdMembers: { where: { active: true } } },
    });
    if (byEmail) {
      person = await prisma.person.update({
        where: { id: byEmail.id },
        data: { supabaseId: user.id },
        include: { householdMembers: { where: { active: true } } },
      });
    }
  }

  if (!person) {
    // New user — create Person, Household, and HouseholdMember
    const displayName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split("@")[0] ||
      "New User";

    person = await prisma.person.create({
      data: {
        supabaseId: user.id,
        email: user.email || null,
        name: displayName,
        onboardingComplete: false,
      },
      include: { householdMembers: { where: { active: true } } },
    });

    if (invite) {
      await prisma.householdMember.create({
        data: { personId: person.id, householdId: invite.householdId, active: true, role: "member" },
      });
      await prisma.householdInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedBy: person.id },
      });
    } else {
      const household = await prisma.household.create({
        data: { name: `${displayName}\u2019s Kitchen` },
      });
      await prisma.householdMember.create({
        data: { personId: person.id, householdId: household.id, active: true, role: "owner" },
      });
    }

    return true; // new user always needs onboarding
  }

  if (invite) {
    // Existing user joining a new household
    await prisma.householdMember.updateMany({
      where: { personId: person.id, active: true },
      data: { active: false },
    });

    const existingMembership = await prisma.householdMember.findUnique({
      where: { personId_householdId: { personId: person.id, householdId: invite.householdId } },
    });

    if (existingMembership) {
      await prisma.householdMember.update({
        where: { id: existingMembership.id },
        data: { active: true },
      });
    } else {
      await prisma.householdMember.create({
        data: { personId: person.id, householdId: invite.householdId, active: true, role: "member" },
      });
    }

    await prisma.householdInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), usedBy: person.id },
    });
  }

  // Existing user with no active household — rebuild and re-onboard
  if (!invite && person.householdMembers.length === 0) {
    const displayName = person.name || user.email?.split("@")[0] || "User";
    const household = await prisma.household.create({
      data: { name: `${displayName}\u2019s Kitchen` },
    });
    await prisma.householdMember.create({
      data: { personId: person.id, householdId: household.id, active: true, role: "owner" },
    });
    await prisma.person.update({
      where: { id: person.id },
      data: { onboardingComplete: false },
    });
    return true;
  }

  return !person.onboardingComplete;
}

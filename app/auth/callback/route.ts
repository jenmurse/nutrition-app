import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");

  // On Vercel the internal URL origin may differ from the external host —
  // use x-forwarded-host when present to build the correct redirect URL.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const redirectBase =
    forwardedHost && process.env.NODE_ENV !== "development"
      ? `https://${forwardedHost}`
      : origin;

  const cookieStore = await cookies();

  // Collect cookies that exchangeCodeForSession wants to set so we can
  // attach them explicitly to the redirect response. NextResponse.redirect()
  // creates a fresh Response — cookies written via the next/headers cookie
  // store don't automatically transfer to it, causing the session to be
  // missing when the middleware checks the next request.
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          // Write to the cookie store so getUser() works in this same request
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
          // Also capture for the redirect response
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  // Determine redirect target: onboarding for new users, home for returning
  let redirectUrl = `${redirectBase}/home`;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth code exchange error:", error);
      return NextResponse.redirect(`${redirectBase}/login?error=auth`);
    }

    // Use the user from the exchange result directly — calling getUser() after
    // exchangeCodeForSession doesn't reliably see the newly set session cookies
    // within the same request, so it can return null even on success.
    const user = data.user;
    if (user) {
      try {
        await provisionUser(user, inviteToken);

        const person = await prisma.person.findUnique({
          where: { supabaseId: user.id },
          select: { onboardingComplete: true },
        });
        if (person && !person.onboardingComplete) {
          redirectUrl = `${redirectBase}/onboarding`;
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        // Don't block — fall through to /home
      }
    }
  }

  // Build the redirect and attach the session cookies so the browser has
  // them when it follows the redirect (fixing the first-login bounce to /login).
  const response = NextResponse.redirect(redirectUrl);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}

async function provisionUser(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
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

  // If no match by supabaseId, also try by email (guards against Supabase
  // issuing a new auth UID for the same email, e.g. after re-signup)
  if (!person && user.email) {
    const byEmail = await prisma.person.findFirst({
      where: { email: user.email },
      include: { householdMembers: { where: { active: true } } },
    });
    if (byEmail) {
      // Re-link the existing Person to the new Supabase UID
      person = await prisma.person.update({
        where: { id: byEmail.id },
        data: { supabaseId: user.id },
        include: { householdMembers: { where: { active: true } } },
      });
    }
  }

  if (!person) {
    // Genuinely new user — create Person record
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
        data: { name: `${displayName}\u2019s Kitchen` },
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
    await prisma.householdMember.updateMany({
      where: { personId: person.id, active: true },
      data: { active: false },
    });

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

  // Existing user without invite — ensure they have an active household
  if (!invite && person.householdMembers.length === 0) {
    const displayName = person.name || user.email?.split("@")[0] || "User";
    const household = await prisma.household.create({
      data: { name: `${displayName}\u2019s Kitchen` },
    });
    await prisma.householdMember.create({
      data: {
        personId: person.id,
        householdId: household.id,
        active: true,
        role: "owner",
      },
    });
    await prisma.person.update({
      where: { id: person.id },
      data: { onboardingComplete: false },
    });
  }
}

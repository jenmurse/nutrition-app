import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";
import { getAuthenticatedHousehold } from "@/lib/auth";
import { themeHex } from "@/lib/themes";

export async function GET() {
  const auth = await getAuthenticatedHousehold();
  // Authenticated Supabase user with no Person row yet (e.g. provisioning gap):
  // return an empty list with onboardingComplete:false so the client routes them
  // to /onboarding instead of stranding them on /home.
  if ("error" in auth) {
    if (auth.status === 403) {
      return NextResponse.json({
        persons: [],
        currentPersonId: null,
        onboardingComplete: false,
      });
    }
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const persons = await prisma.person.findMany({
    where: { householdMembers: { some: { householdId: auth.householdId } } },
    orderBy: { id: "asc" },
  });
  const currentPerson = persons.find((p) => p.id === auth.personId);
  return NextResponse.json({
    persons,
    currentPersonId: auth.personId,
    onboardingComplete: currentPerson?.onboardingComplete ?? true,
  });
}

/**
 * POST /api/persons — create a household member.
 * Body: { name, theme?, trackedOnly? }
 *  - name (required)
 *  - theme (optional, defaults to "sage")
 *  - trackedOnly (optional, defaults to false). When false, the caller is
 *    expected to follow up with POST /api/households/invite { forPersonId }
 *    to auto-generate an invite for this person. The orchestration is left to
 *    the caller (onboarding wizard, Settings UI) so this endpoint stays focused.
 */
export const POST = withAuth(async (auth, request: Request) => {
  const { name, theme, trackedOnly } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const resolvedTheme = theme ?? 'sage';
  const person = await prisma.person.create({
    data: {
      name: name.trim(),
      theme: resolvedTheme,
      color: themeHex(resolvedTheme),
      trackedOnly: Boolean(trackedOnly),
      onboardingComplete: true, // added members aren't onboarding themselves
    },
  });

  // Link the new person to the current household
  await prisma.householdMember.create({
    data: {
      householdId: auth.householdId,
      personId: person.id,
      role: "member",
    },
  });

  return NextResponse.json(person, { status: 201 });
});

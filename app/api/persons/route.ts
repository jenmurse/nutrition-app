import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";
import { themeHex } from "@/lib/themes";

export const GET = withAuth(async (auth) => {
  const persons = await prisma.person.findMany({
    where: { householdMembers: { some: { householdId: auth.householdId } } },
    orderBy: { id: "asc" },
  });
  // Include the authenticated user's own personId and onboarding status
  const currentPerson = persons.find((p) => p.id === auth.personId);
  return NextResponse.json({
    persons,
    currentPersonId: auth.personId,
    onboardingComplete: currentPerson?.onboardingComplete ?? true,
  });
});

export const POST = withAuth(async (auth, request: Request) => {
  const { name, theme } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const resolvedTheme = theme ?? 'sage';
  const person = await prisma.person.create({
    data: { name: name.trim(), theme: resolvedTheme, color: themeHex(resolvedTheme) },
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

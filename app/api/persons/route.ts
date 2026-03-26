import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";
import { themeHex } from "@/lib/themes";

export async function GET() {
  const auth = await getAuthenticatedHousehold();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const persons = await prisma.person.findMany({
    where: { householdMembers: { some: { householdId: auth.householdId } } },
    orderBy: { id: "asc" },
  });
  // Include the authenticated user's own personId so the client can default to it
  return NextResponse.json({ persons, currentPersonId: auth.personId });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedHousehold();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
}

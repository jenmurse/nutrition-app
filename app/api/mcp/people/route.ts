import { NextResponse } from 'next/server';
import { getMcpAuth } from '@/lib/mcp-auth';
import { prisma } from '@/lib/db';

/** GET — list people in the authenticated household */
export async function GET(request: Request) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const members = await prisma.householdMember.findMany({
    where: { householdId: auth.householdId, active: true },
    select: {
      role: true,
      person: { select: { id: true, name: true, color: true } },
    },
    orderBy: { person: { name: 'asc' } },
  });

  const people = members.map((m) => ({
    id: m.person.id,
    name: m.person.name,
    color: m.person.color,
    role: m.role,
  }));

  return NextResponse.json(people, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=60' },
  });
}

import { NextResponse } from 'next/server';
import { getAuthenticatedHousehold } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

// Token key is scoped per-person so each household member has their own independent token
function tokenKey(personId: number) {
  return `mcpApiToken_${personId}`;
}

/** GET — returns whether a token exists for the current person (never exposes the raw value) */
export async function GET() {
  const auth = await getAuthenticatedHousehold();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const setting = await prisma.systemSetting.findFirst({
    where: { key: tokenKey(auth.personId), householdId: auth.householdId },
  });

  return NextResponse.json({ hasToken: !!setting });
}

/** POST — generates a new token for the current person, returns it once */
export async function POST() {
  const auth = await getAuthenticatedHousehold();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const token = `gm_${randomBytes(24).toString('hex')}`;
  const key = tokenKey(auth.personId);

  await prisma.systemSetting.upsert({
    where: { key_householdId: { key, householdId: auth.householdId } },
    create: { key, value: token, householdId: auth.householdId },
    update: { value: token },
  });

  return NextResponse.json({ token });
}

/** DELETE — revokes the current person's token */
export async function DELETE() {
  const auth = await getAuthenticatedHousehold();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await prisma.systemSetting.deleteMany({
    where: { key: tokenKey(auth.personId), householdId: auth.householdId },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { getAuthenticatedHousehold } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

/** GET — returns whether a token exists (never exposes the raw value) */
export async function GET() {
  const auth = await getAuthenticatedHousehold();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const setting = await prisma.systemSetting.findFirst({
    where: { key: 'mcpApiToken', householdId: auth.householdId },
  });

  return NextResponse.json({ hasToken: !!setting });
}

/** POST — generates a new token, returns it once (never stored in plaintext on client) */
export async function POST() {
  const auth = await getAuthenticatedHousehold();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const token = `gm_${randomBytes(24).toString('hex')}`;

  await prisma.systemSetting.upsert({
    where: { key_householdId: { key: 'mcpApiToken', householdId: auth.householdId } },
    create: { key: 'mcpApiToken', value: token, householdId: auth.householdId },
    update: { value: token },
  });

  return NextResponse.json({ token });
}

/** DELETE — revokes the token */
export async function DELETE() {
  const auth = await getAuthenticatedHousehold();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await prisma.systemSetting.deleteMany({
    where: { key: 'mcpApiToken', householdId: auth.householdId },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { getMcpAuth } from '@/lib/mcp-auth';
import { prisma } from '@/lib/db';

/** GET ?q=query — search household ingredients by name */
export async function GET(request: Request) {
  const auth = await getMcpAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  const ingredients = await prisma.ingredient.findMany({
    where: {
      householdId: auth.householdId,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    select: {
      id: true,
      name: true,
      defaultUnit: true,
      source: true,
      nutrientValues: {
        select: {
          value: true,
          nutrient: { select: { displayName: true, unit: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
    take: 50,
  });

  return NextResponse.json(ingredients);
}

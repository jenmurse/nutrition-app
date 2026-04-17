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
      // Full nutrient data only when searching — list view returns id+name+unit only
      ...(q ? {
        nutrientValues: {
          select: {
            value: true,
            nutrient: { select: { displayName: true, unit: true } },
          },
          // Only fetch the calorie entry — it's the only value the MCP tool displays
          where: {
            nutrient: { displayName: { contains: 'Calori', mode: 'insensitive' } },
          },
        },
      } : {}),
    },
    orderBy: { name: 'asc' },
    take: q ? 50 : 200,
  });

  return NextResponse.json(ingredients, {
    headers: { 'Cache-Control': 'private, max-age=600, stale-while-revalidate=120' },
  });
}

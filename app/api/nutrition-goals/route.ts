import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/nutrition-goals?personId=1
 * Return saved global nutrition goals by nutrient id, scoped to a person.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personIdParam = searchParams.get('personId');
    const personId = personIdParam ? parseInt(personIdParam, 10) : null;

    const rows = await prisma.globalNutritionGoal.findMany({
      where: { personId },
    });
    const goals = rows.reduce<Record<number, { lowGoal?: number; highGoal?: number }>>(
      (acc, row) => {
        acc[row.nutrientId] = {
          lowGoal: row.lowGoal ?? undefined,
          highGoal: row.highGoal ?? undefined,
        };
        return acc;
      },
      {}
    );

    return NextResponse.json({ goals }, { status: 200 });
  } catch (error) {
    console.error('Error fetching nutrition goals:', error);
    return NextResponse.json(
      { error: 'Failed to load nutrition goals' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/nutrition-goals
 * Update global nutrition goal defaults, scoped to a person.
 * Body: { personId?: number, goals: { [nutrientId]: { lowGoal?, highGoal? } } }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { goals, personId } = body;

    if (!goals) {
      return NextResponse.json(
        { error: 'goals object is required' },
        { status: 400 }
      );
    }

    // Validate goals format
    for (const nutrientId of Object.keys(goals)) {
      const goal = goals[nutrientId];
      if (
        typeof goal !== 'object' ||
        (goal.lowGoal !== undefined && typeof goal.lowGoal !== 'number') ||
        (goal.highGoal !== undefined && typeof goal.highGoal !== 'number')
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid goals format. Each goal should have optional lowGoal and highGoal numbers',
          },
          { status: 400 }
        );
      }
    }

    const pid: number | null = personId ?? null;
    const entries = Object.entries(goals) as Array<[string, { lowGoal?: number; highGoal?: number }]>;
    await prisma.$transaction(
      entries.map(([nutrientId, goal]) =>
        prisma.globalNutritionGoal.upsert({
          where: { nutrientId_personId: { nutrientId: Number(nutrientId), personId: pid } },
          create: {
            nutrientId: Number(nutrientId),
            personId: pid,
            lowGoal: goal.lowGoal ?? null,
            highGoal: goal.highGoal ?? null,
          },
          update: {
            lowGoal: goal.lowGoal ?? null,
            highGoal: goal.highGoal ?? null,
          },
        })
      )
    );

    return NextResponse.json({ message: 'Nutrition goals saved', goals }, { status: 200 });
  } catch (error) {
    console.error('Error updating nutrition goals:', error);
    return NextResponse.json(
      { error: 'Failed to update nutrition goals' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/nutrition-goals
 * Update global nutrition goal defaults
 * Currently, goals are managed per meal plan. This endpoint validates the goals
 * but actual storage happens when creating/updating a meal plan.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { goals } = body;

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

    // For now, we just validate and return success
    // Actual goal storage happens per meal plan
    return NextResponse.json(
      {
        message:
          'Nutrition goals are managed per meal plan. Create or update a meal plan with these goals.',
        goals,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating nutrition goals:', error);
    return NextResponse.json(
      { error: 'Failed to update nutrition goals' },
      { status: 500 }
    );
  }
}

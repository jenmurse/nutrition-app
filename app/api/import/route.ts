import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiUtils';
import { prisma } from '@/lib/db';

interface ImportedNutrient { nutrientId: number; value: number }
interface ImportedIngredient {
  id: number; name: string; fdcId?: string; source?: string; defaultUnit?: string;
  customUnitName?: string | null; customUnitAmount?: number | null; customUnitGrams?: number | null;
  isMealItem?: boolean; nutrients?: ImportedNutrient[];
}
interface ImportedRecipeIngredient {
  ingredientId: number; quantity: number; unit: string;
  conversionGrams?: number | null; notes?: string | null;
}
interface ImportedRecipe {
  id: number; name: string; servingSize: number; servingUnit?: string;
  instructions?: string; sourceApp?: string | null; isComplete?: boolean; tags?: string;
  prepTime?: number | null; cookTime?: number | null; image?: string | null;
  optimizeAnalysis?: string | null; mealPrepAnalysis?: string | null;
  analysisModel?: string | null; analyzedAt?: string | null;
  ingredients?: ImportedRecipeIngredient[];
}
interface ImportedMealLog {
  date: string; mealType: string; recipeId?: number | null; ingredientId?: number | null;
  quantity?: number | null; unit?: string | null; servings?: number; notes?: string | null;
  position?: number;
}
interface ImportedNutritionGoal { nutrientId: number; lowGoal?: number | null; highGoal?: number | null }
interface ImportedMealPlan {
  id: number; weekStartDate: string; personId?: number | null;
  mealLogs?: ImportedMealLog[]; nutritionGoals?: ImportedNutritionGoal[];
}
interface ImportedPerson { id: number; name: string; color?: string }
interface ImportedGlobalGoal {
  nutrientId: number; personId?: number | null; lowGoal?: number | null; highGoal?: number | null;
}
interface ImportPayload {
  version: number;
  householdName?: string;
  persons?: ImportedPerson[];
  ingredients?: ImportedIngredient[];
  recipes?: ImportedRecipe[];
  mealPlans?: ImportedMealPlan[];
  globalNutritionGoals?: ImportedGlobalGoal[];
}

export const POST = withAuth(async (auth, request: Request) => {
  let body: ImportPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.version || !Array.isArray(body.ingredients)) {
    return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Clear existing household data (cascade handles children)
      await tx.mealPlan.deleteMany({ where: { householdId: auth.householdId } });
      await tx.recipe.deleteMany({ where: { householdId: auth.householdId } });
      await tx.ingredient.deleteMany({ where: { householdId: auth.householdId } });
      await tx.globalNutritionGoal.deleteMany({ where: { householdId: auth.householdId } });

      // 2. Build person ID map: match by name to existing household members
      const existingPersons = await tx.person.findMany({
        where: { householdMembers: { some: { householdId: auth.householdId, active: true } } },
        select: { id: true, name: true },
      });
      const personIdMap: Record<number, number> = {};
      for (const imported of body.persons ?? []) {
        const match = existingPersons.find(
          (p) => p.name.toLowerCase() === imported.name.toLowerCase()
        );
        if (match) {
          personIdMap[imported.id] = match.id;
        } else {
          // Create new person and add to household
          const newPerson = await tx.person.create({
            data: { name: imported.name, color: imported.color ?? '#6B9E7B' },
          });
          await tx.householdMember.create({
            data: { personId: newPerson.id, householdId: auth.householdId, role: 'member', active: true },
          });
          personIdMap[imported.id] = newPerson.id;
        }
      }

      // 3. Re-create ingredients
      const ingredientIdMap: Record<number, number> = {};
      for (const ing of body.ingredients ?? []) {
        const { id, nutrients, ...ingData } = ing;
        const newIng = await tx.ingredient.create({
          data: { ...ingData, householdId: auth.householdId },
        });
        ingredientIdMap[id] = newIng.id;
        for (const nv of nutrients ?? []) {
          await tx.ingredientNutrient.create({
            data: { ingredientId: newIng.id, nutrientId: nv.nutrientId, value: nv.value },
          });
        }
      }

      // 4. Re-create recipes
      const recipeIdMap: Record<number, number> = {};
      for (const recipe of body.recipes ?? []) {
        const { id, ingredients: recipeIngs } = recipe;
        const newRecipe = await tx.recipe.create({
          data: {
            householdId: auth.householdId,
            name: recipe.name,
            servingSize: recipe.servingSize,
            servingUnit: recipe.servingUnit ?? 'servings',
            instructions: recipe.instructions ?? '',
            sourceApp: recipe.sourceApp ?? null,
            isComplete: recipe.isComplete ?? true,
            tags: recipe.tags ?? '',
            prepTime: recipe.prepTime ?? null,
            cookTime: recipe.cookTime ?? null,
            image: recipe.image ?? null,
            optimizeAnalysis: recipe.optimizeAnalysis ?? null,
            mealPrepAnalysis: recipe.mealPrepAnalysis ?? null,
            analysisModel: recipe.analysisModel ?? null,
            analyzedAt: recipe.analyzedAt ? new Date(recipe.analyzedAt) : null,
          },
        });
        recipeIdMap[id] = newRecipe.id;
        for (const ri of recipeIngs ?? []) {
          const newIngId = ingredientIdMap[ri.ingredientId];
          if (newIngId) {
            await tx.recipeIngredient.create({
              data: {
                recipeId: newRecipe.id,
                ingredientId: newIngId,
                quantity: ri.quantity,
                unit: ri.unit,
                conversionGrams: ri.conversionGrams ?? null,
                notes: ri.notes ?? null,
              },
            });
          }
        }
      }

      // 5. Re-create meal plans
      for (const mp of body.mealPlans ?? []) {
        const { id, mealLogs, nutritionGoals, personId, ...mpData } = mp;
        const newMp = await tx.mealPlan.create({
          data: {
            ...mpData,
            householdId: auth.householdId,
            weekStartDate: new Date(mpData.weekStartDate),
            personId: personId != null ? (personIdMap[personId] ?? null) : null,
          },
        });
        for (const ng of nutritionGoals ?? []) {
          await tx.nutritionGoal.create({
            data: {
              mealPlanId: newMp.id,
              nutrientId: ng.nutrientId,
              lowGoal: ng.lowGoal ?? null,
              highGoal: ng.highGoal ?? null,
            },
          });
        }
        for (const meal of mealLogs ?? []) {
          await tx.mealLog.create({
            data: {
              mealPlanId: newMp.id,
              date: new Date(meal.date),
              mealType: meal.mealType,
              servings: meal.servings ?? 1,
              position: meal.position ?? 0,
              recipeId: meal.recipeId != null ? (recipeIdMap[meal.recipeId] ?? null) : null,
              ingredientId: meal.ingredientId != null ? (ingredientIdMap[meal.ingredientId] ?? null) : null,
              quantity: meal.quantity ?? null,
              unit: meal.unit ?? null,
              notes: meal.notes ?? null,
            },
          });
        }
      }

      // 6. Re-create global nutrition goals
      for (const gg of body.globalNutritionGoals ?? []) {
        await tx.globalNutritionGoal.create({
          data: {
            householdId: auth.householdId,
            nutrientId: gg.nutrientId,
            personId: gg.personId != null ? (personIdMap[gg.personId] ?? null) : null,
            lowGoal: gg.lowGoal ?? null,
            highGoal: gg.highGoal ?? null,
          },
        });
      }
    }, { timeout: 30000 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed — see server logs for details' }, { status: 500 });
  }
});

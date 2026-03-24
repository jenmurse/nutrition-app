import {
  calculateRecipeNutrition,
  calculateDailyNutrition,
  applyNutrientGoals,
  getWeeklyNutritionSummary,
} from '@/lib/nutritionCalculations';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    recipe: {
      findUnique: jest.fn(),
    },
    mealLog: {
      findMany: jest.fn(),
    },
    nutrient: {
      findMany: jest.fn(),
    },
    mealPlan: {
      findUnique: jest.fn(),
    },
    globalNutritionGoal: {
      findMany: jest.fn(),
    },
  },
}));

describe('Nutrition Calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRecipeNutrition', () => {
    it('should calculate total and per-serving nutrition for a recipe', async () => {
      const mockRecipe = {
        id: 1,
        name: 'Grilled Chicken Salad',
        servingSize: 2,
        servingUnit: 'servings',
        ingredients: [
          {
            id: 1,
            recipeId: 1,
            ingredientId: 1,
            quantity: 100,
            unit: 'g',
            conversionGrams: 100,
            notes: null,
            ingredient: {
              id: 1,
              name: 'Chicken Breast',
              nutrientValues: [
                {
                  id: 1,
                  ingredientId: 1,
                  nutrientId: 1,
                  value: 165, // 165 kcal per 100g
                  nutrient: { id: 1, name: 'calories', displayName: 'Calories', unit: 'kcal', orderIndex: 1 },
                },
                {
                  id: 2,
                  ingredientId: 1,
                  nutrientId: 2,
                  value: 3.6, // 3.6g fat per 100g
                  nutrient: { id: 2, name: 'fat', displayName: 'Fat', unit: 'g', orderIndex: 2 },
                },
              ],
            },
          },
        ],
      };

      const mockNutrients = [
        { id: 1, name: 'calories', displayName: 'Calories', unit: 'kcal', orderIndex: 1 },
        { id: 2, name: 'fat', displayName: 'Fat', unit: 'g', orderIndex: 2 },
      ];

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValueOnce(mockRecipe);
      (prisma.nutrient.findMany as jest.Mock).mockResolvedValueOnce(mockNutrients);

      const result = await calculateRecipeNutrition(1);

      expect(result.recipeName).toBe('Grilled Chicken Salad');
      expect(result.totalNutrients).toHaveLength(2);
      expect(result.totalNutrients[0].value).toBe(165); // 165 kcal for 100g chicken
      expect(result.perServingNutrients[0].value).toBe(82.5); // 165 / 2 servings
    });

    it('should throw error if recipe not found', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(calculateRecipeNutrition(999)).rejects.toThrow(
        'Recipe with id 999 not found'
      );
    });
  });

  describe('calculateDailyNutrition', () => {
    it('should sum nutrition from all meals in a day', async () => {
      const mockMealLogs = [
        {
          id: 1,
          mealPlanId: 1,
          date: new Date('2026-02-08'),
          mealType: 'breakfast',
          recipeId: 1,
          recipe: { id: 1, name: 'Oatmeal', servingSize: 1, servingUnit: 'bowl' },
        },
      ];

      const mockNutrients = [
        { id: 1, name: 'calories', displayName: 'Calories', unit: 'kcal', orderIndex: 1 },
      ];

      (prisma.mealLog.findMany as jest.Mock).mockResolvedValueOnce(mockMealLogs);
      (prisma.nutrient.findMany as jest.Mock).mockResolvedValue(mockNutrients);
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        name: 'Oatmeal',
        servingSize: 1,
        servingUnit: 'bowl',
        ingredients: [],
      });

      const result = await calculateDailyNutrition(1, new Date('2026-02-08'));

      expect(result.dayOfWeek).toBe('Saturday');
      expect(result.totalNutrients).toHaveLength(1);
    });
  });

  describe('applyNutrientGoals', () => {
    it('should mark nutrients as ok when within goals', () => {
      const nutrients = [
        {
          nutrientId: 1,
          nutrientName: 'calories',
          displayName: 'Calories',
          unit: 'kcal',
          value: 2000,
        },
      ];

      const goals = {
        1: { lowGoal: 1800, highGoal: 2500 },
      };

      const result = applyNutrientGoals(nutrients, goals);

      expect(result[0].status).toBe('ok');
      expect(result[0].lowGoal).toBe(1800);
      expect(result[0].highGoal).toBe(2500);
    });

    it('should mark nutrients as warning when below low goal', () => {
      const nutrients = [
        {
          nutrientId: 1,
          nutrientName: 'calories',
          displayName: 'Calories',
          unit: 'kcal',
          value: 1500,
        },
      ];

      const goals = {
        1: { lowGoal: 1800, highGoal: 2500 },
      };

      const result = applyNutrientGoals(nutrients, goals);

      expect(result[0].status).toBe('warning');
    });

    it('should mark nutrients as error when above high goal', () => {
      const nutrients = [
        {
          nutrientId: 1,
          nutrientName: 'calories',
          displayName: 'Calories',
          unit: 'kcal',
          value: 3000,
        },
      ];

      const goals = {
        1: { lowGoal: 1800, highGoal: 2500 },
      };

      const result = applyNutrientGoals(nutrients, goals);

      expect(result[0].status).toBe('error');
    });

    it('should handle missing goals gracefully', () => {
      const nutrients = [
        {
          nutrientId: 1,
          nutrientName: 'calories',
          displayName: 'Calories',
          unit: 'kcal',
          value: 2000,
        },
      ];

      const goals = {}; // No goal for nutrient 1

      const result = applyNutrientGoals(nutrients, goals);

      expect(result[0]).toBe(nutrients[0]); // No changes
    });
  });

  describe('getWeeklyNutritionSummary', () => {
    it('should return nutrition data for all 7 days of the week', async () => {
      const mockMealPlan = {
        id: 1,
        weekStartDate: new Date('2026-02-08'),
        nutritionGoals: [
          {
            nutrientId: 1,
            mealPlanId: 1,
            lowGoal: 1800,
            highGoal: 2500,
            nutrient: { id: 1, name: 'calories', displayName: 'Calories', unit: 'kcal', orderIndex: 1 },
          },
        ],
      };

      const mockNutrients = [
        { id: 1, name: 'calories', displayName: 'Calories', unit: 'kcal', orderIndex: 1 },
      ];

      (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValueOnce(mockMealPlan);
      (prisma.mealLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.nutrient.findMany as jest.Mock).mockResolvedValue(mockNutrients);
      ((prisma as any).globalNutritionGoal.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getWeeklyNutritionSummary(1);

      expect(result.mealPlanId).toBe(1);
      expect(result.dailyNutritions).toHaveLength(7);
      expect(result.dailyNutritions[0].dayOfWeek).toBe('Saturday');
    });

    it('should throw error if meal plan not found', async () => {
      (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(getWeeklyNutritionSummary(999)).rejects.toThrow(
        'Meal plan with id 999 not found'
      );
    });
  });
});

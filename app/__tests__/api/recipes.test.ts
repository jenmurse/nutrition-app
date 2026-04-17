jest.mock('@/lib/auth', () => ({
  getAuthenticatedHousehold: jest.fn().mockResolvedValue({
    personId: 1, supabaseId: 'test-uuid', householdId: 1, role: 'owner',
  }),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ingredient: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    recipeIngredient: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    recipeFavorite: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/unitConversion', () => ({
  convertToGrams: jest.fn(() => 100),
  getIngredientDensity: jest.fn(() => 1),
}))

import { GET as getRecipes, POST as createRecipe } from '@/app/api/recipes/route'
import { prisma } from '@/lib/db'

describe('Recipes API - GET /api/recipes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return all recipes', async () => {
    const mockRecipes = [
      {
        id: 1,
        name: 'Chicken Stir Fry',
        servingSize: 2,
        servingUnit: 'servings',
        instructions: 'Cook chicken and vegetables',
        sourceApp: 'Pestle',
        isComplete: true,
        createdAt: new Date('2026-02-09T05:31:19.378Z'),
        updatedAt: new Date('2026-02-09T05:31:19.378Z'),
        ingredients: [
          {
            id: 1,
            recipeId: 1,
            ingredientId: 1,
            quantity: 200,
            unit: 'g',
            conversionGrams: 200,
            notes: null,
            originalText: null,
            ingredient: {
              id: 1,
              name: 'Chicken breast',
              nutrientValues: [],
            },
          },
        ],
      },
    ]

    ;(prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes)
    ;(prisma.recipeFavorite.findMany as jest.Mock).mockResolvedValue([])

    const response = await getRecipes(new Request('http://localhost:3000/api/recipes'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe(1)
    expect(data[0].name).toBe('Chicken Stir Fry')
    expect(data[0].isFavorited).toBe(false)
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { householdId: 1 }, orderBy: { name: 'asc' } })
    )
  })

  it('should return empty array when no recipes exist', async () => {
    ;(prisma.recipe.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.recipeFavorite.findMany as jest.Mock).mockResolvedValue([])

    const response = await getRecipes(new Request('http://localhost:3000/api/recipes'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should mark favorited recipes correctly', async () => {
    const mockRecipes = [
      {
        id: 1,
        name: 'Favorited Recipe',
        servingSize: 1,
        servingUnit: 'serving',
        instructions: '',
        sourceApp: null,
        isComplete: true,
        ingredients: [],
      },
      {
        id: 2,
        name: 'Unfavorited Recipe',
        servingSize: 1,
        servingUnit: 'serving',
        instructions: '',
        sourceApp: null,
        isComplete: true,
        ingredients: [],
      },
    ]

    ;(prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes)
    ;(prisma.recipeFavorite.findMany as jest.Mock).mockResolvedValue([{ recipeId: 1 }])

    const response = await getRecipes(new Request('http://localhost:3000/api/recipes'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].isFavorited).toBe(true)
    expect(data[1].isFavorited).toBe(false)
  })

  it('should compute per-serving nutrient totals', async () => {
    const mockRecipes = [
      {
        id: 1,
        name: 'Protein Bowl',
        servingSize: 2,
        servingUnit: 'servings',
        instructions: '',
        sourceApp: null,
        isComplete: true,
        ingredients: [
          {
            conversionGrams: 100,
            ingredient: {
              nutrientValues: [
                {
                  value: 31.0, // per 100g
                  nutrient: { id: 203, displayName: 'Protein', unit: 'g' },
                },
              ],
            },
          },
        ],
      },
    ]

    ;(prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes)
    ;(prisma.recipeFavorite.findMany as jest.Mock).mockResolvedValue([])

    const response = await getRecipes(new Request('http://localhost:3000/api/recipes'))
    const data = await response.json()

    expect(response.status).toBe(200)
    // 31 * 100 / 100 = 31g total, / 2 servings = 15.5 per serving
    const proteinTotal = data[0].totals.find((t: { nutrientId: number }) => t.nutrientId === 203)
    expect(proteinTotal).toBeDefined()
    expect(proteinTotal.value).toBe(15.5)
  })
})

describe('Recipes API - POST /api/recipes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create recipe with ingredients', async () => {
    const requestBody = {
      name: 'Pasta Carbonara',
      servingSize: 4,
      servingUnit: 'servings',
      instructions: 'Boil pasta, mix with sauce',
      sourceApp: null,
      isComplete: true,
      ingredients: [
        {
          ingredientId: 1,
          quantity: 400,
          unit: 'g',
          notes: 'uncooked',
          originalText: null,
          conversionGrams: 400,
        },
      ],
    }

    const mockCreated = {
      id: 1,
      name: requestBody.name,
      servingSize: requestBody.servingSize,
      servingUnit: requestBody.servingUnit,
      instructions: requestBody.instructions,
      sourceApp: requestBody.sourceApp,
      isComplete: requestBody.isComplete,
      createdAt: new Date(),
      updatedAt: new Date(),
      ingredients: [{ id: 1, ...requestBody.ingredients[0], recipeId: 1 }],
    }

    ;(prisma.recipe.create as jest.Mock).mockResolvedValue({ id: 1, ...requestBody })
    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([{ id: 1, name: 'Pasta', defaultUnit: 'g' }])
    ;(prisma.recipeIngredient.createMany as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockCreated)

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createRecipe(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe(1)
    expect(data.name).toBe('Pasta Carbonara')
    expect(prisma.recipe.create).toHaveBeenCalled()
    expect(prisma.recipeIngredient.createMany).toHaveBeenCalled()
  })

  it('should create recipe with no ingredients', async () => {
    const requestBody = {
      name: 'Empty Recipe',
      servingSize: 1,
      servingUnit: 'serving',
      instructions: 'No ingredients yet',
      ingredients: [],
    }

    ;(prisma.recipe.create as jest.Mock).mockResolvedValue({ id: 2, ...requestBody })
    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue({ id: 2, ...requestBody, ingredients: [] })

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createRecipe(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.recipeIngredient.create).not.toHaveBeenCalled()
  })

  it('should reject recipe without name', async () => {
    const requestBody = {
      servingSize: 4,
      ingredients: [],
    }

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createRecipe(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Name required' })
  })

  it('should set default values', async () => {
    const requestBody = {
      name: 'Simple Recipe',
    }

    ;(prisma.recipe.create as jest.Mock).mockResolvedValue({
      id: 3,
      name: 'Simple Recipe',
      servingSize: 1,
      servingUnit: 'servings',
      instructions: '',
      sourceApp: null,
      isComplete: true,
    })
    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 3,
      ...requestBody,
      servingSize: 1,
      servingUnit: 'servings',
      instructions: '',
      sourceApp: null,
      isComplete: true,
      ingredients: [],
    })

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createRecipe(request)

    expect(response.status).toBe(200)
    expect(prisma.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          servingSize: 1,
          servingUnit: 'servings',
          instructions: '',
        }),
      })
    )
  })

  it('should handle missing ingredient error', async () => {
    const requestBody = {
      name: 'Recipe',
      ingredients: [{ ingredientId: 999, quantity: 100, unit: 'g' }],
    }

    ;(prisma.recipe.create as jest.Mock).mockResolvedValue({ id: 4, ...requestBody })
    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createRecipe(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Failed to create recipe')
  })
})

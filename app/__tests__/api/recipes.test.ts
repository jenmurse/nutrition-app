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
    },
    recipeIngredient: {
      create: jest.fn(),
      deleteMany: jest.fn(),
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

    const response = await getRecipes()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe(1)
    expect(data[0].name).toBe('Chicken Stir Fry')
    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      include: {
        ingredients: { include: { ingredient: { include: { nutrientValues: { include: { nutrient: true } } } } } },
      },
      orderBy: { name: 'asc' },
    })
  })

  it('should return empty array when no recipes exist', async () => {
    ;(prisma.recipe.findMany as jest.Mock).mockResolvedValue([])

    const response = await getRecipes()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
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
    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue({ id: 1, name: 'Pasta', defaultUnit: 'g' })
    ;(prisma.recipeIngredient.create as jest.Mock).mockResolvedValue(undefined)
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
    expect(prisma.recipeIngredient.create).toHaveBeenCalled()
  })

  it('should create recipe with incomplete ingredients', async () => {
    const requestBody = {
      name: 'Unknown Recipe',
      servingSize: 1,
      servingUnit: 'serving',
      instructions: 'Mix ingredients',
      isComplete: false,
      ingredients: [
        {
          ingredientId: null,
          quantity: 2,
          unit: 'tbsp',
          originalText: 'mystery ingredient',
          conversionGrams: null,
        },
      ],
    }

    ;(prisma.recipe.create as jest.Mock).mockResolvedValue({ id: 2, ...requestBody })
    ;(prisma.recipeIngredient.create as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue({ id: 2, ...requestBody, ingredients: [] })

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createRecipe(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.recipeIngredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingredientId: null,
          originalText: 'mystery ingredient',
        }),
      })
    )
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
          isComplete: true,
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

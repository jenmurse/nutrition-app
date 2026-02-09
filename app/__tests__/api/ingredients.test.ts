jest.mock('@/lib/db', () => ({
  prisma: {
    ingredient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ingredientNutrient: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    recipeIngredient: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

import { GET as getIngredients, POST as createIngredient } from '@/app/api/ingredients/route'
import { prisma } from '@/lib/db'

describe('Ingredients API - GET /api/ingredients', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return all ingredients with nutrient values', async () => {
    const mockIngredients = [
      {
        id: 1,
        name: 'chicken breast',
        fdcId: '123456',
        defaultUnit: 'g',
        customUnitName: null,
        customUnitAmount: null,
        customUnitGrams: null,
        customUnitMeasurement: null,
        nutrientValues: [
          {
            id: 1,
            ingredientId: 1,
            nutrientId: 203,
            value: 31.0,
            nutrient: { id: 203, displayName: 'Protein', unit: 'g', orderIndex: 8 },
          },
        ],
      },
    ]

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue(mockIngredients)

    const response = await getIngredients()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockIngredients)
    expect(prisma.ingredient.findMany).toHaveBeenCalledWith({
      include: {
        nutrientValues: {
          include: { nutrient: true },
        },
      },
      orderBy: { name: 'asc' },
    })
  })

  it('should return empty array when no ingredients exist', async () => {
    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const response = await getIngredients()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should handle database errors', async () => {
    ;(prisma.ingredient.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'))

    const response = await getIngredients()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch ingredients' })
  })
})

describe('Ingredients API - POST /api/ingredients', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create ingredient with basic fields', async () => {
    const requestBody = {
      name: 'Tomato',
      defaultUnit: 'g',
      nutrientValues: [
        { nutrientId: 208, value: 18 },
        { nutrientId: 204, value: 0.2 },
      ],
    }

    const mockCreated = {
      id: 1,
      name: 'Tomato',
      fdcId: null,
      defaultUnit: 'g',
      customUnitName: null,
      customUnitAmount: null,
      customUnitGrams: null,
      customUnitMeasurement: null,
      nutrientValues: [
        {
          id: 1,
          ingredientId: 1,
          nutrientId: 208,
          value: 18,
          nutrient: { id: 208, displayName: 'Energy', unit: 'kcal', orderIndex: 0 },
        },
        {
          id: 2,
          ingredientId: 1,
          nutrientId: 204,
          value: 0.2,
          nutrient: { id: 204, displayName: 'Total lipid (fat)', unit: 'g', orderIndex: 1 },
        },
      ],
    }

    ;(prisma.ingredient.create as jest.Mock).mockResolvedValue({ id: 1, ...requestBody })
    ;(prisma.ingredientNutrient.createMany as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue(mockCreated)

    const request = new Request('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createIngredient(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockCreated)
    expect(prisma.ingredient.create).toHaveBeenCalled()
    expect(prisma.ingredientNutrient.createMany).toHaveBeenCalled()
  })

  it('should create ingredient with custom unit', async () => {
    const requestBody = {
      name: 'Garlic clove',
      defaultUnit: 'other',
      customUnitName: 'clove',
      customUnitAmount: 1,
      customUnitGrams: 3,
      customUnitMeasurement: 'weight',
      nutrientValues: [],
    }

    ;(prisma.ingredient.create as jest.Mock).mockResolvedValue({ id: 2, ...requestBody })
    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue({
      id: 2,
      ...requestBody,
      nutrientValues: [],
    })

    const request = new Request('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createIngredient(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.ingredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Garlic clove',
          customUnitName: 'clove',
          customUnitAmount: 1,
          customUnitGrams: 3,
        }),
      })
    )
  })

  it('should reject request without name', async () => {
    const requestBody = {
      defaultUnit: 'g',
      nutrientValues: [],
    }

    const request = new Request('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createIngredient(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Name is required' })
  })

  it('should handle database errors during creation', async () => {
    ;(prisma.ingredient.create as jest.Mock).mockRejectedValue(new Error('DB Error'))

    const request = new Request('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })

    const response = await createIngredient(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to create ingredient' })
  })

  it('should create ingredient without nutrient values', async () => {
    const requestBody = {
      name: 'Water',
      defaultUnit: 'ml',
    }

    ;(prisma.ingredient.create as jest.Mock).mockResolvedValue({ id: 3, ...requestBody })
    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue({
      id: 3,
      ...requestBody,
      nutrientValues: [],
    })

    const request = new Request('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await createIngredient(request)

    expect(response.status).toBe(200)
    expect(prisma.ingredientNutrient.createMany).not.toHaveBeenCalled()
  })
})

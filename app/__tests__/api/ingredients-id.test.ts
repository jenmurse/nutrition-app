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
    },
  },
}))

import { GET as getIngredient, PUT as updateIngredient, DELETE as deleteIngredient } from '@/app/api/ingredients/[id]/route'
import { prisma } from '@/lib/db'

describe('Ingredients API - GET /api/ingredients/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return ingredient by id', async () => {
    const mockIngredient = {
      id: 1,
      name: 'Chicken breast',
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
    }

    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue(mockIngredient)

    const response = await getIngredient(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockIngredient)
    expect(prisma.ingredient.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { nutrientValues: { include: { nutrient: true } } },
    })
  })

  it('should return 404 for non-existent ingredient', async () => {
    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue(null)

    const response = await getIngredient(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '999' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Not found' })
  })

  it('should handle database errors', async () => {
    ;(prisma.ingredient.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'))

    const response = await getIngredient(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch ingredient' })
  })
})

describe('Ingredients API - PUT /api/ingredients/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update ingredient', async () => {
    const updateData = {
      name: 'Grilled Chicken',
      defaultUnit: 'g',
      nutrientValues: [{ nutrientId: 203, value: 32.0 }],
    }

    const mockUpdated = {
      id: 1,
      ...updateData,
      fdcId: '123456',
      customUnitName: null,
      customUnitAmount: null,
      customUnitGrams: null,
      customUnitMeasurement: null,
      nutrientValues: [
        {
          id: 1,
          ingredientId: 1,
          nutrientId: 203,
          value: 32.0,
          nutrient: { id: 203, displayName: 'Protein', unit: 'g', orderIndex: 8 },
        },
      ],
    }

    ;(prisma.ingredient.update as jest.Mock).mockResolvedValue({ id: 1, ...updateData })
    ;(prisma.ingredientNutrient.deleteMany as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.ingredientNutrient.createMany as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue(mockUpdated)

    const request = new Request('http://localhost:3000', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await updateIngredient(request, {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.ingredient.update).toHaveBeenCalled()
    expect(prisma.ingredientNutrient.deleteMany).toHaveBeenCalledWith({ where: { ingredientId: 1 } })
  })

  it('should handle nutrient value replacement', async () => {
    const updateData = {
      name: 'Chicken',
      defaultUnit: 'g',
      nutrientValues: [
        { nutrientId: 208, value: 165 },
        { nutrientId: 204, value: 3.6 },
        { nutrientId: 203, value: 31.0 },
      ],
    }

    ;(prisma.ingredient.update as jest.Mock).mockResolvedValue({ id: 1, ...updateData })
    ;(prisma.ingredientNutrient.deleteMany as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.ingredientNutrient.createMany as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.ingredient.findUnique as jest.Mock).mockResolvedValue({ id: 1, ...updateData, nutrientValues: [] })

    const request = new Request('http://localhost:3000', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await updateIngredient(request, {
      params: Promise.resolve({ id: '1' }),
    } as any)

    expect(response.status).toBe(200)
    expect(prisma.ingredientNutrient.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ ingredientId: 1, nutrientId: 208, value: 165 }),
      ]),
    })
  })
})

describe('Ingredients API - DELETE /api/ingredients/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete ingredient and cascade delete related records', async () => {
    ;(prisma.ingredientNutrient.deleteMany as jest.Mock).mockResolvedValue({ count: 5 })
    ;(prisma.recipeIngredient.deleteMany as jest.Mock).mockResolvedValue({ count: 2 })
    ;(prisma.ingredient.delete as jest.Mock).mockResolvedValue({ id: 1, name: 'Chicken' })

    const response = await deleteIngredient(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(prisma.ingredientNutrient.deleteMany).toHaveBeenCalledWith({ where: { ingredientId: 1 } })
    expect(prisma.recipeIngredient.deleteMany).toHaveBeenCalledWith({ where: { ingredientId: 1 } })
    expect(prisma.ingredient.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('should handle delete errors', async () => {
    ;(prisma.ingredientNutrient.deleteMany as jest.Mock).mockRejectedValue(new Error('DB Error'))

    const response = await deleteIngredient(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to delete' })
  })
})

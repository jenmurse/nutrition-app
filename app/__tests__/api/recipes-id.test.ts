jest.mock('@/lib/db', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    recipeIngredient: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

import { GET as getRecipe, PUT as updateRecipe, DELETE as deleteRecipe } from '@/app/api/recipes/[id]/route'
import { prisma } from '@/lib/db'

describe('Recipes API - GET /api/recipes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return recipe with calculated nutrient totals', async () => {
    const mockRecipe = {
      id: 1,
      name: 'Chicken Stir Fry',
      servingSize: 2,
      servingUnit: 'servings',
      instructions: 'Cook chicken',
      sourceApp: null,
      isComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
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
        },
      ],
    }

    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe)

    const response = await getRecipe(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe.id).toBe(1)
    expect(data.recipe.name).toBe('Chicken Stir Fry')
    expect(data.totals).toBeDefined()
    expect(Array.isArray(data.totals)).toBe(true)
  })

  it('should calculate nutrient totals correctly', async () => {
    const mockRecipe = {
      id: 1,
      ingredients: [
        {
          ingredient: {
            nutrientValues: [
              {
                nutrient: { id: 203, displayName: 'Protein', unit: 'g', orderIndex: 8 },
                value: 31.0, // per 100g
              },
            ],
          },
          conversionGrams: 200, // 200g of ingredient
        },
      ],
    }

    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe)

    const response = await getRecipe(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    // 31 * 200 / 100 = 62g protein total
    expect(data.totals).toEqual([
      expect.objectContaining({
        nutrientId: 203,
        value: 62, // (31 * 200) / 100
      }),
    ])
  })

  it('should return 404 for non-existent recipe', async () => {
    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null)

    const response = await getRecipe(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '999' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Not found' })
  })
})

describe('Recipes API - PUT /api/recipes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update recipe', async () => {
    const updateData = {
      name: 'Updated Recipe',
      servingSize: 3,
      servingUnit: 'servings',
      instructions: 'New instructions',
      isComplete: true,
      ingredients: [
        {
          ingredientId: 1,
          quantity: 300,
          unit: 'g',
          conversionGrams: 300,
          notes: 'Updated note',
        },
      ],
    }

    ;(prisma.recipe.update as jest.Mock).mockResolvedValue({ id: 1, ...updateData })
    ;(prisma.recipeIngredient.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.recipeIngredient.create as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      ...updateData,
      ingredients: [{ id: 1, ...updateData.ingredients[0], recipeId: 1 }],
    })

    const request = new Request('http://localhost:3000', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await updateRecipe(request, {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.recipe.update).toHaveBeenCalled()
    expect(prisma.recipeIngredient.deleteMany).toHaveBeenCalledWith({ where: { recipeId: 1 } })
  })

  it('should skip ingredients with null ingredientId during update', async () => {
    const updateData = {
      name: 'Incomplete Recipe',
      servingSize: 1,
      servingUnit: 'serving',
      instructions: '',
      isComplete: false,
      ingredients: [
        {
          ingredientId: null,
          quantity: 1,
          unit: 'tbsp',
        },
      ],
    }

    ;(prisma.recipe.update as jest.Mock).mockResolvedValue({ id: 1, ...updateData })
    ;(prisma.recipeIngredient.deleteMany as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.recipe.findUnique as jest.Mock).mockResolvedValue({ id: 1, ...updateData, ingredients: [] })

    const request = new Request('http://localhost:3000', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await updateRecipe(request, {
      params: Promise.resolve({ id: '1' }),
    } as any)

    expect(response.status).toBe(200)
    // Ingredients with null ingredientId are skipped
    expect(prisma.recipeIngredient.create).not.toHaveBeenCalled()
  })
})

describe('Recipes API - DELETE /api/recipes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete recipe', async () => {
    ;(prisma.recipe.delete as jest.Mock).mockResolvedValue({ id: 1, name: 'Deleted Recipe' })

    const response = await deleteRecipe(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ ok: true })
    expect(prisma.recipe.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('should handle delete errors', async () => {
    ;(prisma.recipe.delete as jest.Mock).mockRejectedValue(new Error('DB Error'))

    const response = await deleteRecipe(new Request('http://localhost:3000'), {
      params: Promise.resolve({ id: '1' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to delete' })
  })
})

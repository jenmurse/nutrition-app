jest.mock('@/lib/db', () => ({
  prisma: {
    nutrient: {
      findMany: jest.fn(),
    },
  },
}))

import { GET as getNutrients } from '@/app/api/nutrients/route'
import { GET as searchUSDA } from '@/app/api/usda/search/route'
import { GET as fetchUSDA } from '@/app/api/usda/fetch/[fdcId]/route'
import { prisma } from '@/lib/db'

global.fetch = jest.fn()

describe('Nutrients API - GET /api/nutrients', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return all nutrients ordered by index', async () => {
    const mockNutrients = [
      { id: 208, displayName: 'Energy', unit: 'kcal', orderIndex: 0 },
      { id: 204, displayName: 'Total lipid (fat)', unit: 'g', orderIndex: 1 },
      { id: 203, displayName: 'Protein', unit: 'g', orderIndex: 8 },
    ]

    ;(prisma.nutrient.findMany as jest.Mock).mockResolvedValue(mockNutrients)

    const response = await getNutrients()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockNutrients)
    expect(prisma.nutrient.findMany).toHaveBeenCalledWith({ orderBy: { orderIndex: 'asc' } })
  })

  it('should return empty array when no nutrients exist', async () => {
    ;(prisma.nutrient.findMany as jest.Mock).mockResolvedValue([])

    const response = await getNutrients()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should handle database errors', async () => {
    ;(prisma.nutrient.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'))

    const response = await getNutrients()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch nutrients' })
  })
})

describe('USDA API - GET /api/usda/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should search for foods by query', async () => {
    const mockUSDAResponse = {
      foods: [
        {
          fdcId: '123456',
          description: 'Tomato, raw',
          dataType: 'Foundation',
          foodNutrients: [],
        },
        {
          fdcId: '123457',
          description: 'Tomato sauce',
          dataType: 'Branded',
          foodNutrients: [],
        },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUSDAResponse),
    })

    const url = new URL('http://localhost:3000?query=tomato')
    const request = new Request(url)

    const response = await searchUSDA(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.foods.length).toBe(1) // Only non-branded
    expect(data.foods[0].dataType).not.toBe('Branded')
  })

  it('should filter out branded foods', async () => {
    const mockUSDAResponse = {
      foods: [
        { fdcId: '1', description: 'Apple', dataType: 'Foundation' },
        { fdcId: '2', description: 'Brand X Apple Juice', dataType: 'Branded' },
        { fdcId: '3', description: 'Apple Pie Filling', dataType: 'SR Legacy' },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUSDAResponse),
    })

    const url = new URL('http://localhost:3000?query=apple')
    const request = new Request(url)

    const response = await searchUSDA(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.foods).toHaveLength(2)
    expect(data.foods.every((f: any) => f.dataType !== 'Branded')).toBe(true)
  })

  it('should require query parameter', async () => {
    const url = new URL('http://localhost:3000')
    const request = new Request(url)

    const response = await searchUSDA(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'query param required' })
  })

  it('should accept both q and query parameters', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ foods: [] }),
    })

    const url = new URL('http://localhost:3000?q=chicken')
    const request = new Request(url)

    const response = await searchUSDA(request)

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('should handle USDA API errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ message: 'Invalid API key' }),
    })

    const url = new URL('http://localhost:3000?query=test')
    const request = new Request(url)

    const response = await searchUSDA(request)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data).toEqual(
      expect.objectContaining({
        error: 'USDA lookup failed',
      })
    )
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const url = new URL('http://localhost:3000?query=test')
    const request = new Request(url)

    const response = await searchUSDA(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('USDA lookup error')
  })
})

describe('USDA API - GET /api/usda/fetch/[fdcId]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch food details with portions', async () => {
    const mockUSDAFood = {
      fdcId: '123456',
      description: 'Garlic, raw',
      foodNutrients: [
        { nutrient: { id: 208 }, value: 149 },
        { nutrient: { id: 203 }, value: 6.3 },
      ],
      foodPortions: [
        {
          portionDescription: '1 clove',
          gramWeight: 3,
          measureUnitAbbr: 'clove',
        },
        {
          portionDescription: '1 cup chopped',
          gramWeight: 136,
          measureUnitAbbr: 'cup',
        },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUSDAFood),
    })

    const response = await fetchUSDA(new Request('http://localhost:3000'), {
      params: Promise.resolve({ fdcId: '123456' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.foodPortions).toHaveLength(2)
    expect(data.foodPortions[0]).toMatchObject({
      portionDescription: '1 clove',
      gramWeight: 3,
    })
  })

  it('should require fdcId parameter', async () => {
    const response = await fetchUSDA(new Request('http://localhost:3000'), {
      params: Promise.resolve({ fdcId: '' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'fdcId required' })
  })

  it('should return food without portions', async () => {
    const mockFood = {
      fdcId: '789',
      description: 'Water',
      foodNutrients: [],
      // no foodPortions
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockFood),
    })

    const response = await fetchUSDA(new Request('http://localhost:3000'), {
      params: Promise.resolve({ fdcId: '789' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.foodPortions || []).toEqual([])
  })

  it('should handle USDA fetch errors', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    })

    const response = await fetchUSDA(new Request('http://localhost:3000'), {
      params: Promise.resolve({ fdcId: 'invalid' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data).toEqual({ error: 'USDA fetch failed' })
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'))

    const response = await fetchUSDA(new Request('http://localhost:3000'), {
      params: Promise.resolve({ fdcId: '123' }),
    } as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('USDA fetch error')
  })
})

jest.mock('@/lib/db', () => ({
  prisma: {
    ingredient: {
      findMany: jest.fn(),
    },
  },
}))

import { POST as importPestle } from '@/app/api/recipes/import/pestle/route'
import { prisma } from '@/lib/db'

describe('Pestle Import API - POST /api/recipes/import/pestle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should parse basic pestle markdown', async () => {
    const markdown = `# Pasta Carbonara
**Servings** 4

## Ingredients
- 400 g pasta
- 200 g bacon
- 3 eggs

## Instructions
1. Boil pasta
2. Fry bacon
3. Mix together`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Pasta Carbonara')
    expect(data.servingSize).toBe(4)
    expect(data.servingUnit).toBe('servings')
    expect(data.sourceApp).toBe('Pestle')
    expect(data.ingredients).toHaveLength(3)
  })

  it('should parse ingredients with quantities and units', async () => {
    const markdown = `# Recipe
## Ingredients
- 2 cups flour
- 1.5 tsp salt
- 0.75 cup sugar
- 2 eggs`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ingredients[0]).toMatchObject({
      quantity: 2,
      unit: 'cup',
      nameGuess: 'flour',
    })
    expect(data.ingredients[1]).toMatchObject({
      quantity: 1.5,
      unit: 'tsp',
      nameGuess: 'salt',
    })
    expect(data.ingredients[2]).toMatchObject({
      quantity: 0.75,
      unit: 'cup',
      nameGuess: 'sugar',
    })
    expect(data.ingredients[3]).toMatchObject({
      quantity: 2,
      unit: '',
      nameGuess: 'eggs',
    })
  })

  it('should handle unicode fractions', async () => {
    const markdown = `# Recipe
## Ingredients
- ½ cup milk
- ¼ tsp pepper
- ¾ cup water`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ingredients[0].quantity).toBe(0.5)
    expect(data.ingredients[1].quantity).toBe(0.25)
    expect(data.ingredients[2].quantity).toBe(0.75)
  })

  it('should match existing ingredients', async () => {
    const markdown = `# Chicken Stir Fry
## Ingredients
- 200 g chicken breast
- 1 cup broccoli
- 2 tbsp soy sauce`

    const mockIngredients = [
      { id: 1, name: 'Chicken breast' },
      { id: 2, name: 'Broccoli' },
      { id: 3, name: 'Soy sauce' },
    ]

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue(mockIngredients)

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ingredients[0]).toMatchObject({
      nameGuess: 'chicken breast',
      ingredientId: 1,
    })
    expect(data.ingredients[1]).toMatchObject({
      nameGuess: 'broccoli',
      ingredientId: 2,
    })
    expect(data.isComplete).toBe(true) // All ingredients matched
  })

  it('should handle partial matches', async () => {
    const markdown = `# Mixed Recipe
## Ingredients
- 100 g chicken
- 50 g unknown ingredient
- 1 cup milk`

    const mockIngredients = [
      { id: 1, name: 'Chicken breast' },
      { id: 2, name: 'Milk' },
    ]

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue(mockIngredients)

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isComplete).toBe(false) // Not all matched
    expect(data.ingredients[0].ingredientId).toBe(1) // chicken matched
    expect(data.ingredients[1].ingredientId).toBeNull() // unknown unmatched
    expect(data.ingredients[2].ingredientId).toBe(2) // milk matched
  })

  it('should parse ingredient sections', async () => {
    const markdown = `# Recipe
## Ingredients
### Dough
- 2 cups flour
- 1 tsp salt

### Filling
- 1 cup sugar
- 2 eggs`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ingredients[0].section).toBe('Dough')
    expect(data.ingredients[1].section).toBe('Dough')
    expect(data.ingredients[2].section).toBe('Filling')
    expect(data.ingredients[3].section).toBe('Filling')
  })

  it('should extract instructions', async () => {
    const markdown = `# Recipe
## Ingredients
- 1 cup flour

## Instructions
1. Mix flour with water
2. Knead dough
3. Let rest for 1 hour`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.instructions).toContain('Mix flour with water')
    expect(data.instructions).toContain('Knead dough')
  })

  it('should handle recipes with no ingredients', async () => {
    const markdown = `# Recipe

## Instructions
Just mix things together`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ingredients).toHaveLength(0)
  })

  it('should handle recipes with no title', async () => {
    const markdown = `## Ingredients
- 1 egg`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Untitled Recipe')
  })

  it('should reject requests without markdown', async () => {
    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Markdown required' })
  })

  it('should reject empty markdown', async () => {
    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown: '   ' }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Markdown required' })
  })

  it('should handle complex ingredient names', async () => {
    const markdown = `# Recipe
## Ingredients
- 2 tbsp olive oil (extra virgin, optional)
- 1 cup fresh spinach (chopped)
- 3 cloves garlic (minced)`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Olive oil' },
      { id: 2, name: 'Spinach' },
      { id: 3, name: 'Garlic' },
    ])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should still match despite parenthetical modifiers
    expect(data.ingredients[0].nameGuess.toLowerCase()).toContain('olive')
  })

  it('should default to 1 serving when not specified', async () => {
    const markdown = `# Recipe
## Ingredients
- 1 egg`

    ;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue([])

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.servingSize).toBe(1)
  })

  it('should handle database errors', async () => {
    ;(prisma.ingredient.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'))

    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ markdown: '# Test' }),
    })

    const response = await importPestle(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to parse Pestle markdown' })
  })
})

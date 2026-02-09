# API Tests Documentation

## Overview

Comprehensive test suites have been created for all API endpoints in the nutrition app. The tests use Jest as the testing framework with mocked Prisma database calls.

## Test Coverage

### 1. Ingredients API (`/api/ingredients`)
- **GET** - Fetch all ingredients with nutrient values
- **POST** - Create new ingredient with optional custom units and nutrients
- **PUT** - Update ingredient and replace nutrient values
- **DELETE** - Delete ingredient and cascade delete related records

**Test File**: `app/__tests__/api/ingredients.test.ts`  
**Test File**: `app/__tests__/api/ingredients-id.test.ts`

**Test Cases**: 14 scenarios covering:
- Successful CRUD operations
- Nutrient value handling
- Custom unit configuration
- Default values
- Error handling
- Cascade deletion
- Database errors

### 2. Recipes API (`/api/recipes`)
- **GET** - Fetch all recipes
- **POST** - Create new recipe with ingredients (including incomplete/unresolved ones)
- **PUT** - Update recipe and replace ingredients
- **DELETE** - Delete recipe

**Test File**: `app/__tests__/api/recipes.test.ts`  
**Test File**: `app/__tests__/api/recipes-id.test.ts`

**Test Cases**: 13 scenarios covering:
- Recipe creation with ingredients
- Incomplete recipe handling
- Nutrient total calculations
- Null ingredient handling (for unresolved ingredients)
- Default values
- Validation (recipe name required)
- Unit conversion integration

### 3. Nutrients API (`/api/nutrients`)
- **GET** - Fetch all nutrients ordered by display order

**Test File**: `app/__tests__/api/nutrients-and-usda.test.ts`

**Test Cases**: 3 scenarios covering:
- Fetching nutrients by order
- Empty nutrient list
- Database errors

### 4. USDA API (`/api/usda/search` and `/api/usda/fetch`)
- **GET /search** - Search USDA FoodData Central
- **GET /fetch/[fdcId]** - Fetch detailed food information with portions

**Test File**: `app/__tests__/api/nutrients-and-usda.test.ts`

**Test Cases**: 10 scenarios covering:
- Food search by query
- Branded food filtering
- Query parameter validation (supports both `q` and `query`)
- Portion/serving size extraction
- USDA API error handling
- Network error handling
- Food without portions

### 5. Pestle Import API (`/api/recipes/import/pestle`)
- **POST** - Parse Pestle markdown recipe files and auto-match ingredients

**Test File**: `app/__tests__/api/pestle-import.test.ts`

**Test Cases**: 15 scenarios covering:
- Basic markdown parsing
- Ingredient quantity parsing (whole numbers, decimals, fractions)
- Unicode fraction support (½, ¾, etc.)
- Unit normalization (tsp, tbsp, cup, oz, g, etc.)
- Ingredient matching with existing database
- Partial/incomplete recipe detection
- Ingredient sections parsing
- Instructions extraction
- Serving size extraction
- Complex ingredient names with parentheticals
- Edge cases (no title, no ingredients, no instructions)
- Validation and error handling
- Database errors

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- app/__tests__/api/ingredients.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="should create ingredient"
```

## Test Structure

Each test file follows this pattern:

```typescript
describe('API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle scenario X', async () => {
    // Setup mocks
    // Call API
    // Assert response
  })
})
```

## Mock Configuration

### Prisma Client Mock
The `jest.setup.ts` file mocks all Prisma database operations including:
- `prisma.ingredient.*` (findMany, findUnique, create, update, delete)
- `prisma.recipe.*` (findMany, findUnique, create, update, delete)
- `prisma.nutrient.findMany`
- `prisma.ingredientNutrient.*` (createMany, deleteMany)
- `prisma.recipeIngredient.*` (deleteMany, create)

### Global Fetch Mock
The `fetch` function is mocked globally to test USDA API integration without making real network requests.

## Key Testing Patterns

### 1. Request/Response Testing
```typescript
const request = new Request('http://localhost:3000', {
  method: 'POST',
  body: JSON.stringify(data),
})
const response = await apiHandler(request)
const data = await response.json()
expect(response.status).toBe(200)
```

### 2. Database Mock Setup
```typescript
const mockData = { /* ... */ }
;(prisma.ingredient.findMany as jest.Mock).mockResolvedValue(mockData)
```

### 3. Error Testing
```typescript
;(prisma.ingredient.create as jest.Mock).mockRejectedValue(new Error('DB Error'))
```

### 4. Dynamic Route Parameters
```typescript
const response = await apiHandler(request, {
  params: Promise.resolve({ id: '1' }),
} as any)
```

## Coverage Summary

| Category | Tests | Coverage |
|----------|-------|----------|
| Ingredients CRUD | 14 | ✓ |
| Recipes CRUD | 13 | ✓ |
| Nutrients | 3 | ✓ |
| USDA Search | 6 | ✓ |
| USDA Fetch | 4 | ✓ |
| Pestle Import | 15 | ✓ |
| **Total** | **55 tests** | **✓** |

## Test Coverage by Scenario Type

### Happy Path
- ✓ Successful ingredient creation with nutrients
- ✓ Successful recipe creation with multiple ingredients
- ✓ Successful USDA food search
- ✓ Successful Pestle markdown parsing and ingredient matching

### Error Handling
- ✓ Missing required fields (name, query, fdcId, markdown)
- ✓ Database errors (500 responses)
- ✓ USDA API errors (502 responses)
- ✓ Network errors
- ✓ Not found errors (404)

### Edge Cases
- ✓ Empty results
- ✓ Null/undefined values
- ✓ Cascade deletions
- ✓ Partial matches
- ✓ Unicode fractions
- ✓ Complex ingredient names
- ✓ Missing optional fields

### Data Validation
- ✓ Quantity parsing (whole, decimal, fractions)
- ✓ Unit normalization
- ✓ Ingredient name normalization
- ✓ Nutrient value calculations
- ✓ Serving size extraction

## Extending Tests

To add tests for new API endpoints:

1. Create a new test file in `app/__tests__/api/`
2. Import the API handler and required mocks
3. Use the established patterns above
4. Run `npm test` to execute all suite including new tests

## Notes

- Tests use TypeScript for type safety
- All database queries are mocked to avoid test database dependencies
- Network calls (USDA API) are mocked to ensure fast, deterministic tests
- Tests are independent and can run in any order
- Coverage reports help identify untested code paths

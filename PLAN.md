# Nutrition Tracking App - Project Plan

## Overview

Build a React/Next.js web app to track recipes and meal plans with nutritional data. Recipes can be manually entered or imported from Pestle (markdown). Ingredients link to a local database and can be enriched via USDA FoodData Central API. Unit conversions (cups→grams) are automatic. Weekly meal planning shows daily nutritional totals against your health goals.

---

## Technology Stack

- **Frontend**: Next.js 16 with React (App Router)
- **Database**: Supabase PostgreSQL with Prisma ORM (session pooler)
- **Auth**: Supabase Auth (email/password, Google OAuth planned)
- **Hosting**: Vercel (production: v0-nutrition-app-nu.vercel.app)
- **APIs**: USDA FoodData Central (nutrition lookup), direct markdown parsing (Pestle imports)
- **Libraries**:
  - `convert-units` (unit conversion)
  - `marked` (markdown parsing)
  - `@supabase/ssr` (auth for Next.js SSR)

---

## Tracked Nutritional Values

- Calories
- Fat
- Saturated Fat
- Sodium
- Carbs
- Sugar
- Protein
- Fiber

**All stored as per 100g of ingredient for standardization.**

---

## Phase 1: Project Setup & Data Layer

### Tasks

1. Initialize Next.js project with TypeScript configuration
2. Set up Prisma ORM with SQLite database
3. Create database schema in `schema.prisma` with these tables:

```
Ingredients
├── id (primary key)
├── name (string)
├── fdcId (string, optional, for USDA reference)
├── defaultUnit (string, e.g., "g", "ml")
├── createdAt (datetime)
└── updatedAt (datetime)

IngredientNutrients
├── id (primary key)
├── ingredientId (foreign key to Ingredients)
├── nutrientId (foreign key to Nutrients)
└── value (decimal, per 100g)

Recipes
├── id (primary key)
├── name (string)
├── servingSize (decimal)
├── servingUnit (string, e.g., "servings", "g")
├── instructions (text, markdown format)
├── sourceApp (string, optional, e.g., "Pestle")
├── createdAt (datetime)
└── updatedAt (datetime)

RecipeIngredients
├── id (primary key)
├── recipeId (foreign key)
├── ingredientId (foreign key)
├── quantity (decimal)
├── unit (string, e.g., "cup", "tsp", "g")
├── conversionGrams (decimal, cached gram equivalent)
└── notes (text, optional)

MealPlans
├── id (primary key)
├── weekStartDate (date)
├── createdAt (datetime)
└── updatedAt (datetime)

MealLog
├── id (primary key)
├── mealPlanId (foreign key)
├── date (date)
├── mealType (enum: "breakfast", "lunch", "dinner", "snack")
├── recipeId (foreign key)
├── notes (text, optional)
└── createdAt (datetime)

Nutrients
├── id (primary key)
├── name (string, e.g., "calories", "fat", "satFat")
├── displayName (string, e.g., "Calories", "Saturated Fat")
├── unit (string, e.g., "kcal", "g", "mg")
└── orderIndex (integer, for display order)

NutrientGoals
├── id (primary key)
├── nutrientId (foreign key to Nutrients)
├── lowGoal (decimal, minimum daily intake)
└── highGoal (decimal, maximum daily intake)
```

**Note**: The `Nutrients` table will be pre-populated with the following 8 nutrients during initial setup:
- Calories (kcal)
- Fat (g)
- Saturated Fat (g)
- Sodium (mg)
- Carbs (g)
- Sugar (g)
- Protein (g)
- Fiber (g)

---

## Phase 2: Ingredient Management

### Tasks

4. Create API routes in `app/api/ingredients/`:
   - `GET /ingredients` - List all stored ingredients
   - `POST /ingredients` - Create new ingredient manually
   - `GET /ingredients/[id]` - Get ingredient details
   - `PUT /ingredients/[id]` - Update ingredient nutrition values
   - `DELETE /ingredients/[id]` - Remove ingredient

5. Create USDA nutrition lookup in `app/api/usda/`:
   - `POST /usda/search?query=` - Search USDA API for ingredient by name
   - `GET /usda/fetch/[fdcId]` - Fetch full nutrition data for ingredient
   - Cache results in Ingredients table with `fdcId` for future lookups

6. Build ingredient UI in `app/components/IngredientForm.tsx`:
   - Manual entry fields for all 8 nutrition values (stored per 100g)
   - "Lookup on Internet" button that calls USDA API and populates fields
   - Unit dropdown (g, oz, cup, tsp, tbsp, ml, etc.)
   - Form validation to ensure values are reasonable

---

## Phase 3: Recipe Management

### Tasks

7. Create recipe API routes in `app/api/recipes/`:
   - `POST /recipes` - Create new recipe
   - `GET /recipes` - List all recipes
   - `GET /recipes/[id]` - Get recipe with all ingredients and calculated totals
   - `PUT /recipes/[id]` - Update recipe
   - `DELETE /recipes/[id]` - Delete recipe

8. Build Pestle importer in `app/api/recipes/import`:
   - `POST /recipes/import/pestle` - Accept markdown file
   - Parse markdown with `marked` library to extract ingredients and instructions
   - Match each ingredient to existing database entries OR create new ones
   - Return preview for user confirmation before saving

9. Create recipe builder UI in `app/components/RecipeBuilder.tsx`:
   - Ingredient picker from existing ingredients
   - Quantity + unit input fields
   - Auto-calculate gram equivalents using `convert-units` below each field
   - Calculate & display total nutritional values for recipe
   - Pestle import button that triggers file upload
   - Instructions editor (markdown or plain text)

---

## Phase 4: Unit Conversion System

### Tasks

10. Create conversion utility in `lib/unitConversion.ts`:
    - Helper function to convert any cooking unit to grams (cups, tsp, oz, tbsp → g)
    - For liquids: convert to ml equivalents
    - Use `convert-units` library as base
    - Create lookup table for common ingredients (density mapping: water=1g/ml, oil=0.92g/ml, etc.)
    - Function to display both standard and gram units side-by-side
    - Support for plural units (cups vs cup, tsp vs teaspoon)

---

## Phase 5: Nutritional Calculation Engine

### Tasks

11. Create calculation utility in `lib/nutritionCalculations.ts`:
    - Function to calculate total nutrition for recipe (sum all ingredients × quantity)
    - Function to calculate daily totals from meal log (breakfast+lunch+dinner+snacks)
    - Function to compare daily totals against nutrient goals
    - Return color-coded status (green=within range, yellow=warning, red=out of range)

---

## Phase 6: Meal Planning & Tracking

### Tasks

12. Create meal planning API in `app/api/meal-plans/`:
    - `POST /meal-plans` - Create weekly meal plan with goal limits
    - `GET /meal-plans` - List meal plans
    - `GET /meal-plans/[id]` - Get full meal plan with daily calculations
    - `PUT /meal-plans/[id]` - Update goal limits per nutrient
    - `POST /meal-plans/[id]/meals` - Add recipe to meal (date + meal type)
    - `DELETE /meal-plans/[id]/meals/[mealId]` - Remove recipe from meal

13. Build meal planning UI in `app/components/MealPlanWeek.tsx`:
    - Week view with 7 day columns
    - Each day shows 4 meal types (breakfast/lunch/dinner/snacks)
    - Add recipe button per meal that opens recipe picker modal
    - Display daily nutrition totals below each day
    - Highlight days + nutrients that exceed high goal (red) or miss low goal (yellow)

14. Create daily summary view in `app/components/DailySummary.tsx`:
    - Show all 8 nutrients with value vs. low/high goal ranges
    - Progress bars for each nutrient
    - Visual indicators (✓ green, ⚠ yellow, ✗ red) for status

---

## Phase 7: UI & Polish

**Design Approach**: Modern and minimal aesthetic. Clean typography, ample whitespace, subtle colors, and intuitive interactions with clear data visualization.

### Tasks

15. Build main layouts in `app/layout.tsx` and pages:
    - **Dashboard** (`app/page.tsx`) - Current week view + quick stats
    - **Recipes** (`app/recipes/page.tsx`) - List, create, import
    - **Ingredients** (`app/ingredients/page.tsx`) - Manage ingredient database
    - **Settings** (`app/settings/page.tsx`) - Set daily nutrient goals
    - **Meal Plans** (`app/meal-plans/page.tsx`) - Create and manage weekly plans

---

## Key Features

### Ingredient Management
- **Manual Entry**: Add ingredients with nutrition values per 100g
- **USDA Lookup**: Search and import real nutrition data from USDA FoodData Central
- **Existing Database**: Match imported ingredients to existing database entries
- **Editable**: Change any nutrition value after import

### Recipe Management
- **From Scratch**: Build recipes by selecting from ingredient database
- **Pestle Import**: Import recipes from Pestle App markdown exports
- **Auto-Calculation**: Total nutrition calculated automatically
- **Serving Size**: Track nutrition per serving and total recipe

### Unit Conversion
- **Automatic**: cups, tsp, oz, tbsp, ml all converted to grams
- **Density-Aware**: Different densities for water, oil, flour, etc.
- **Display**: Show both standard units and gram equivalents

### Meal Planning
- **Weekly View**: See 7 days with breakfast/lunch/dinner/snacks
- **Daily Goals**: Set low/high targets for each nutrient
- **Goal Highlighting**: Visual indicators for:
  - ✓ Green: Within range
  - ⚠ Yellow: Below low goal
  - ✗ Red: Above high goal
- **Historical Tracking**: Store past meal plans for reference

---

## Data Flow

```
1. Create/Import Ingredients
   ├── Manual entry with nutrition values per 100g
   └── USDA lookup to populate nutrition values

2. Create Recipes
   ├── Select ingredients from database
   ├── Enter quantity + unit
   ├── System converts to grams
   └── System calculates total nutrition

3. Plan Weekly Meals
   ├── Create meal plan (set start date)
   ├── Set nutrient goals (low/high for each nutrient)
   ├── Add recipes to meals (breakfast/lunch/dinner/snack)
   ├── System calculates daily totals
   └── System highlights days with out-of-range nutrients

4. Track Progress
   ├── View meal plan with daily summaries
   ├── See which nutrients are on target
   └── Identify problem days (too much sodium, not enough fiber, etc.)
```

---

## Testing Checklist

### Unit Conversion Testing
- [ ] Verify 1 cup flour converts to ~125g
- [ ] Verify 1 tsp salt converts to ~6g
- [ ] Verify 1 cup liquid converts to ~240ml
- [ ] Test plural unit names (cups vs cup)

### Recipe Calculation Testing
- [ ] Create sample recipe (e.g., salad with 50g lettuce + 30g olive oil)
- [ ] Verify totals match ingredient nutrition × quantity
- [ ] Test with imported Pestle recipe
- [ ] Verify serving size calculation

### Goal Tracking Testing
- [ ] Set daily sodium limit to 2300mg (low goal)
- [ ] Add recipes totaling 2500mg sodium
- [ ] Verify sodium field shows red warning on that day
- [ ] Verify nutrition summary highlights out-of-range nutrients
- [ ] Test multiple nutrients out of range simultaneously

### API Testing
- [ ] USDA lookup for common ingredient (e.g., "chicken breast")
- [ ] Verify all 8 nutrient values populate correctly
- [ ] Test markdown parsing with actual Pestle export
- [ ] Test ingredient matching during import

### UI Testing
- [ ] Recipe builder ingredient picker functionality
- [ ] Meal plan weekly view navigation
- [ ] Daily summary progress bars
- [ ] Settings form for goal adjustment

---

## Tech Decisions Summary

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Database** | Supabase PostgreSQL with Prisma | Type-safe ORM, managed hosting, connection pooling |
| **Nutrition Source** | USDA FoodData Central API | Most comprehensive, free, no rate limits concerns |
| **Markdown Parsing** | `marked` library | Simple, fast for Pestle exports |
| **Unit Conversion** | `convert-units` library | Comprehensive cooking unit support |
| **Storage Model** | Per 100g normalized | Consistent calculations, easy to scale quantities |
| **Display Model** | Original units + grams | Familiar to user, precise conversion |
| **Caching** | Store USDA data locally | Minimize API calls, improve performance |
| **Auth** | Supabase Auth (email/password) | Closed beta — invite-only, single household |

---

## Environment Setup

- Node.js 18+
- npm or yarn
- VS Code (optional)
- Free USDA API key from data.gov

---

## File Structure (After Implementation)

```
nutrition-app/
├── app/
│   ├── api/
│   │   ├── ingredients/
│   │   │   ├── route.ts (GET, POST)
│   │   │   └── [id]/route.ts (GET, PUT, DELETE)
│   │   ├── recipes/
│   │   │   ├── route.ts (GET, POST)
│   │   │   ├── [id]/route.ts (GET, PUT, DELETE)
│   │   │   └── import/
│   │   │       └── pestle/route.ts (POST)
│   │   ├── meal-plans/
│   │   │   ├── route.ts (GET, POST)
│   │   │   └── [id]/route.ts (GET, PUT)
│   │   └── usda/
│   │       ├── search/route.ts (GET)
│   │       └── fetch/[fdcId]/route.ts (GET)
│   ├── components/
│   │   ├── IngredientForm.tsx
│   │   ├── RecipeBuilder.tsx
│   │   ├── MealPlanWeek.tsx
│   │   └── DailySummary.tsx
│   ├── ingredients/
│   │   └── page.tsx
│   ├── recipes/
│   │   └── page.tsx
│   ├── meal-plans/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx (Dashboard)
│   └── globals.css
├── lib/
│   ├── unitConversion.ts
│   ├── nutritionCalculations.ts
│   └── db.ts (Prisma client)
├── prisma/
│   └── schema.prisma
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
└── PLAN.md (this file)
```

---

## Next Steps

- [ ] Google OAuth setup (Supabase Authentication → Providers)
- [ ] Logo / favicon / OG text
- [ ] Landing page
- [ ] Onboarding flow
- [ ] USDA shared ingredient library
- [ ] MCP server for this app
- [ ] Per-user data isolation (when expanding beyond single household)


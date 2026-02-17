# 🥗 Nutrition App

A modern nutrition tracking application that integrates with the USDA FoodData Central API to help you track ingredients and recipes with detailed nutritional information.

## 🌟 Features

- **Ingredient Management**
  - Create custom ingredients with nutritional data
  - Lookup ingredients via USDA FoodData Central
  - Support for custom units (g, ml, tsp, tbsp, cup, other)
  - Food-specific gram mappings for volume units (e.g., "3/4 cup yogurt = 170g")
  - Track 8 key nutrients: calories, fat, saturated fat, sodium, carbs, sugar, protein, fiber
  - Inline editing in 3-panel layout

- **Recipe Management**
  - Create and edit recipes with multiple ingredients
  - Import recipes from Pestle markdown format
  - Smart ingredient matching with token-based fuzzy matching
  - Support for incomplete recipes (unresolved ingredients)
  - Automatic nutrient total calculation per serving
  - Inline editing in 3-panel layout

- **Meal Plans**
  - Create weekly meal plans
  - Assign recipes to specific days and meals
  - Track daily nutritional totals
  - Visual weekly calendar view

- **Nutrition Goals**
  - Set daily min/max targets for all nutrients
  - Reset to USDA-recommended defaults
  - Configure via Settings panel

- **Smart Features**
  - Portion size support from USDA (e.g., "1 clove", "1 cup")
  - Per-100g nutritional data normalization
  - Branded food filtering (shows generic nutrition data)
  - Ingredient auto-matching when importing recipes
  - 3-panel layout with inline editing throughout

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.1.6 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4.1.18 + CSS Modules (hybrid approach)
- **Database**: SQLite with Prisma ORM 5.22.0
- **API**: USDA FoodData Central API v1
- **Testing**: Jest 29+ with TypeScript support
- **Build**: Turbopack (Next.js Turbo mode)

## 🏗️ Architecture & Design Patterns

### 3-Panel Layout Pattern
All major pages (Ingredients, Recipes, Meal Plans, Settings) use a consistent 3-panel layout:
- **Left Panel**: Navigation sidebar (192px width)
- **Center Panel**: Main content area (flex: 1)
- **Right Panel**: Contextual actions/info (320px width)

This layout provides:
- Consistent navigation and UX across the app
- Space for inline editing without page navigation
- Contextual help and actions always visible

### Inline Editing Pattern
Pages use state-based inline editing instead of navigation to separate pages:
- List view shows items with Edit buttons
- Clicking Edit loads item data and switches to edit mode
- Edit mode renders form component in center panel
- "Back to list" returns to list view
- Maintains 3-panel layout throughout

### Nutrient Data Normalization
**All nutrient values are stored per 100g in the database**, regardless of how they're entered:
- Conversion formula: `(value / servingSize) * 100`
- Example: 170g yogurt with 12g protein → stores `(12 / 170) * 100 = 7.06g per 100g`
- Enables accurate calculations across different quantities and units
- Recipe totals calculated as: `(nutrient_per_100g × ingredient_grams) / 100`

### Custom Unit System
Ingredients support flexible unit definitions with automatic conversions:

**Default units**: `g`, `ml`, `tsp`, `tbsp`, `cup`, `other`

**Volume conversions** (US standard):
- 1 tsp = 5ml
- 1 tbsp = 15ml
- 1 cup = 240ml

**Food-specific gram mappings**:
- Volume units can store optional `gramsPerUnit` for specific foods
- Example: "3/4 cup Greek yogurt = 170g"
- Falls back to ml-based conversion if no custom mapping
- Enables accurate tracking for foods with varying densities

**Conversion logic** (see `lib/unitConversion.ts`):
```typescript
function getAmountInGrams(ingredient) {
  if (unit === 'g') return amount;
  if (unit === 'ml') return amount; // treats ml as g
  if (['tsp','tbsp','cup'].includes(unit)) {
    // Use custom mapping if available, else convert via ml
    return customUnitGrams ? 
      (amount * customUnitGrams) : 
      (amount * VOLUME_TO_ML[unit]);
  }
  if (unit === 'other') return conversionGrams;
}
```

### Styling Architecture
Hybrid approach combining **Tailwind utility classes** with **CSS Modules**:
- Tailwind: Layout, spacing, responsive design
- CSS Modules: Component-specific styling with theme variables
- Theme system uses CSS variables in `globals.css`:
  - `--background`, `--foreground`, `--muted`, `--muted-foreground`
  - `--border`, `--input`, `--primary`, etc.
- Consistent design tokens across all pages:
  - 12px base font size for inputs/labels
  - Flat borders (border-radius: 0)
  - 8px gaps, 10-12px padding
  - Muted backgrounds for input fields

## 📦 Project Structure

```
nutrition-app/
├── app/
│   ├── api/                          # API routes
│   │   ├── ingredients/              # Ingredient CRUD
│   │   ├── recipes/                  # Recipe CRUD
│   │   ├── meal-plans/               # Meal plan CRUD
│   │   ├── nutrients/                # Nutrient lookup
│   │   ├── nutrition-goals/          # Goals management
│   │   ├── usda/                     # USDA API integration
│   │   │   ├── search/               # Food search
│   │   │   └── fetch/[fdcId]/        # Food details
│   │   └── recipes/import/pestle/    # Pestle import
│   ├── components/                   # React components
│   │   ├── IngredientForm.tsx        # Ingredient creation/USDA lookup
│   │   ├── RecipeBuilder.tsx         # Recipe creation/editing
│   │   ├── MealPlanWeek.tsx          # Weekly meal calendar
│   │   ├── DailySummary.tsx          # Daily nutrient totals
│   │   └── NumberInputHandler.tsx    # Number input component
│   ├── ingredients/                  # Ingredient pages
│   │   ├── page.tsx                  # List + inline edit (3-panel)
│   │   └── create/page.tsx           # Create new
│   ├── recipes/                      # Recipe pages
│   │   ├── page.tsx                  # List + inline edit (3-panel)
│   │   └── create/page.tsx           # Create + Pestle import
│   ├── meal-plans/                   # Meal plan pages
│   │   └── page.tsx                  # Weekly view (3-panel)
│   ├── settings/                     # Settings pages
│   │   ├── page.tsx                  # Nutrition goals (3-panel)
│   │   └── settings.module.css       # Settings-specific styles
│   ├── globals.css                   # Global styles + theme variables
│   ├── layout.tsx                    # Root layout + navigation
│   └── page.tsx                      # Home page
├── lib/
│   ├── db.ts                         # Prisma client
│   ├── unitConversion.ts             # Unit conversion logic
│   └── nutritionCalculations.ts      # Nutrient calculation helpers
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Database seeding
├── app/__tests__/api/                # API tests (57 tests)
│   ├── ingredients.test.ts
│   ├── ingredients-id.test.ts
│   ├── recipes.test.ts
│   ├── recipes-id.test.ts
│   ├── meal-plans.test.ts
│   ├── nutrients-and-usda.test.ts
│   └── pestle-import.test.ts
├── jest.config.js                    # Jest configuration
├── jest.setup.ts                     # Jest setup
├── TESTS.md                          # Testing documentation
└── README.md                         # This file
```

### Key File Responsibilities

#### `/app/ingredients/page.tsx`
- **Pattern**: List view with inline editing
- **Features**: CRUD operations, USDA lookup, custom unit configuration
- **Layout**: 3-panel (nav | list/edit | ingredient details)
- **Key Logic**: `getAmountInGrams()` for unit conversions with custom mappings

#### `/app/recipes/page.tsx`
- **Pattern**: List view with inline editing
- **Features**: Recipe CRUD, nutrient totals, incomplete recipe handling
- **Layout**: 3-panel (nav | list/edit | recipe info)
- **Edit Flow**: `handleEditClick()` loads recipe and switches to edit mode

#### `/app/meal-plans/page.tsx`
- **Pattern**: Single view with inline editing
- **Features**: Weekly calendar, daily summaries on demand, recipe assignment
- **Layout**: 3-panel (nav | calendar + daily summary | sidebar)
- **Interaction**: Click "View Nutrition" on any day to show summary below calendar

#### `/app/settings/page.tsx`
- **Pattern**: Summary view with inline editing
- **Features**: Nutrition goal configuration, reset to defaults
- **Layout**: 3-panel (nav | goals form | goals summary)
- **Key Logic**: Min/max ranges for all 8 nutrients

#### `/app/components/RecipeBuilder.tsx`
- Shared component for recipe create/edit
- Ingredient search and selection
- Quantity/unit input for each ingredient
- Real-time nutrient total calculation
- Incomplete ingredient handling

#### `/lib/unitConversion.ts`
- `VOLUME_TO_ML`: Volume unit conversions (tsp/tbsp/cup → ml)
- `getAmountInGrams()`: Converts any unit to grams using custom mappings or volume conversion
- Used by all nutrient calculation functions

#### `/lib/nutritionCalculations.ts`
- `calculateRecipeNutrients()`: Sums nutrients from all ingredients
- `calculateDailyNutrients()`: Aggregates nutrients across meals
- Always works with per-100g normalized values

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nutrition-app
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` with your USDA API key:
```bash
# Get a free API key from: https://fdc.nal.usda.gov/api-key-signup.html
USDA_API_KEY=your_api_key_here
```

4. Set up the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📝 Available Scripts

### Development

```bash
# Start dev server in foreground
npm run dev

# Start dev server in background (writes to .next-dev.log)
npm run dev:start

# Stop background dev server
npm run dev:stop

# Restart background dev server
npm run dev:restart

# Follow background server logs
npm run dev:logs
```

### Building & Running

```bash
# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## ⚙️ Environment Variables

Key environment variables in `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `USDA_API_KEY` | Yes | USDA FoodData Central API key |

Get your free API key: https://fdc.nal.usda.gov/api-key-signup.html

## 🗄️ Database Schema

### Ingredient
- Stores custom ingredients with nutritional data
- Supports custom units (tsp, tbsp, cup, other)
- Stores `gramsPerUnit` for food-specific unit conversions
- Links to USDA foods via `fdcId`

### Recipe
- Collection of ingredients with quantities
- Tracks `isComplete` flag for incomplete recipes
- Stores source app (e.g., "Pestle")
- Servings field for per-serving nutrient calculation

### RecipeIngredient
- Maps ingredients to recipes
- Stores `originalText` for unmatched ingredients
- Stores `conversionGrams` for unit conversion
- Supports null `ingredientId` for incomplete recipes

### IngredientNutrient
- Stores per-100g normalized nutritional values
- 8 core nutrients tracked
- Enables consistent calculations across all quantities

### Nutrient
- Reference table for all tracked nutrients
- Includes USDA nutrient numbers for API mapping
- Defines min/max default goals

### NutritionGoal
- User-defined daily min/max targets per nutrient
- Single row configuration table
- Used by meal plans for goal tracking

### MealPlan
- Weekly meal planning
- Links to recipes with specific day/meal assignments

### Meal
- Individual meal entries (breakfast, lunch, dinner, snack)
- Stores day of week and recipe reference
- Links to MealPlan

## 📊 API Endpoints

### Ingredients
- `GET /api/ingredients` - List all ingredients
- `POST /api/ingredients` - Create ingredient (supports custom unit gram mappings)
- `GET /api/ingredients/[id]` - Get ingredient details
- `PUT /api/ingredients/[id]` - Update ingredient (supports custom unit updates)
- `DELETE /api/ingredients/[id]` - Delete ingredient

### Recipes
- `GET /api/recipes` - List all recipes
- `POST /api/recipes` - Create recipe
- `GET /api/recipes/[id]` - Get recipe with nutrient totals per serving
- `PUT /api/recipes/[id]` - Update recipe
- `DELETE /api/recipes/[id]` - Delete recipe

### Meal Plans
- `GET /api/meal-plans` - List all meal plans
- `POST /api/meal-plans` - Create meal plan
- `GET /api/meal-plans/[id]` - Get meal plan with all meals and daily totals
- `PUT /api/meal-plans/[id]` - Update meal plan
- `DELETE /api/meal-plans/[id]` - Delete meal plan
- `POST /api/meal-plans/[id]/meals` - Add meal to plan
- `PUT /api/meal-plans/[id]/meals/[mealId]` - Update meal
- `DELETE /api/meal-plans/[id]/meals/[mealId]` - Delete meal

### Nutrition Goals
- `GET /api/nutrition-goals` - Get current nutrition goals
- `PUT /api/nutrition-goals` - Update nutrition goals
- `POST /api/nutrition-goals/reset` - Reset to USDA defaults

### USDA Integration
- `GET /api/usda/search?query=...` - Search for foods
- `GET /api/usda/fetch/[fdcId]` - Get food details with portions
- `GET /api/nutrients` - List all nutrients with default goals

### Pestle Import
- `POST /api/recipes/import/pestle` - Parse and import Pestle markdown

## 🧪 Testing

The project includes comprehensive test coverage with 57 tests across all API endpoints:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- app/__tests__/api/ingredients.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create ingredient"

# Generate coverage report
npm run test:coverage
```

See [TESTS.md](TESTS.md) for detailed testing documentation.

## 🔄 Data Flow

### Creating an Ingredient
1. User fills ingredient form
2. Optional: Search USDA for comparable foods
3. Optional: Select portion size to auto-fill unit
4. Enter or populate nutrient values
5. Save to database

### Creating a Recipe
1. User enters recipe details
2. Add ingredients by:
   - Selecting existing ingredients, or
   - Entering ingredient name (tries to auto-match)
3. For unmatched ingredients:
   - Recipe saved as incomplete
   - User can click "Create new ingredient" to resolve
4. System calculates total nutrients by:
   - (nutrient_per_100g × ingredient_grams) / 100

### Importing from Pestle
1. Upload Pestle markdown file
2. System parses:
   - Recipe name, servings
   - Ingredients (quantity, unit, name)
   - Instructions
3. Auto-matches ingredients using token-based scoring
4. Creates recipe pre-filled with matched data
5. User can resolve unmatched ingredients before saving

## 🎯 Key Features Deep Dive

### Custom Unit System with Food-Specific Mappings
**Supported Units**: `g`, `ml`, `tsp`, `tbsp`, `cup`, `other`

**Volume Conversions** (US standard):
- 1 tsp = 5ml → ~5g (density-dependent)
- 1 tbsp = 15ml → ~15g (density-dependent)
- 1 cup = 240ml → ~240g (density-dependent)

**Food-Specific Gram Mappings**:
For foods with non-water density, you can define custom gram conversions:
- Example: "3/4 cup Greek yogurt = 170g" (stored as `gramsPerUnit: 226.67`)
- Example: "1 tbsp olive oil = 13.5g" (stored as `gramsPerUnit: 13.5`)
- Ingredient stores unit type (`tsp`/`tbsp`/`cup`) + optional `gramsPerUnit`

**Conversion Priority**:
1. If `gramsPerUnit` is defined → use it
2. Else convert via volume: `amount × VOLUME_TO_ML[unit]` (treats ml as g)
3. For "other" unit → use `conversionGrams` field

### Smart Ingredient Matching
- **Token-based fuzzy matching** with 50+ stopword filtering
- Substring bonuses (50 points)
- Token matching (5 points per token)
- Examples:
  - "chicken" matches "Chicken breast" (partial match)
  - "garlic clove" matches "Garlic" (token match)
  - "soy sauce" matches "Soy sauce" (exact match)

### Portion Support
- USDA provides portion descriptions ("1 clove", "1 cup chopped")
- Gram weights extracted from USDA data
- Unit names parsed and stored for easy selection
- Clickable portion buttons auto-configure custom units

### Per-100g Normalization
- All nutrient values stored normalized to per-100g
- Conversion formula: `(value / servingSize) * 100`
- Enables accurate calculations across different unit types

### Value Formatting
- ≥ 1g: displays 2 decimal places (e.g., "31.45g")
- < 1g: displays 2 significant figures (e.g., "0.23g")
- Improves readability while maintaining precision

## 🛣️ Workflow Examples

### Scenario 1: Create Ingredient with Custom Volume Unit
1. Navigate to `Ingredients` → `+ Create Ingredient`
2. Search: "greek yogurt"
3. Select "Yogurt, Greek, plain"
4. Measure your actual serving: 3/4 cup = 170g
5. Set Default Unit: `cup`
6. Set Conversion: `0.75` cup = `170g` → stores `gramsPerUnit: 226.67`
7. Nutrient values auto-populated per 100g
8. Save
9. Future uses: "1 cup" automatically converts to 226.67g

### Scenario 2: Create Ingredient from USDA with Portion
1. Navigate to `Ingredients` → `+ Create Ingredient`
2. Search: "garlic"
3. Select "Garlic, raw"
4. View available portions: "1 clove (3g)", "1 cup chopped (136g)"
5. Click "1 clove (3g)" to auto-fill unit
6. Nutrient values auto-populated
7. Save

### Scenario 3: Edit Recipe Inline
1. Navigate to `Recipes`
2. Click `Edit` button on any recipe
3. RecipeBuilder appears in center panel (no page navigation)
4. Modify ingredients, quantities, or servings
5. Click "Back to list" to return to recipe list
6. Changes automatically saved

### Scenario 4: Import Recipe from Pestle
1. Open a Pestle recipe markdown file
2. Navigate to `Recipes` → `+ Create Recipe`
3. Upload markdown file
4. System auto-matches ingredients (shows "Matched to: X")
5. Unmatched ingredients shown as incomplete
6. Click "Create new ingredient →" to resolve
7. Confirm save, redirects to ingredient creation
8. After saving ingredient, returns to recipe editing
9. Save complete recipe

### Scenario 5: Create Weekly Meal Plan
1. Navigate to `Meal Plans` → `+ Create Meal Plan`
2. Enter name: "Week of Feb 16"
3. Click on a day and meal slot (e.g., Monday Dinner)
4. Select recipe from dropdown
5. Preview shows recipe name and servings
6. Click "Add Meal"
7. Right panel updates with daily totals
8. Repeat for entire week
9. Compare totals to nutrition goals

### Scenario 6: Set Nutrition Goals
1. Navigate to `Settings`
2. View current goals in summary view
3. Click "Edit Goals" to switch to edit mode
4. Adjust min/max values for nutrients
5. Click "Save Changes"
6. Or click "Reset to Defaults" to restore USDA recommendations

### Scenario 7: Resolve Incomplete Recipe
1. Navigate to `Recipes` → click `Edit` on incomplete recipe
2. See "Incomplete - has unmatched ingredients" badge
3. Click "Create new ingredient →" on unmatched item
4. Confirm to save recipe first
5. Create ingredient with USDA lookup
6. Back to recipe auto-focused for editing
7. Complete recipe now shows all nutrients

## 🐛 Troubleshooting

### USDA API Key Issues
- Ensure `.env.local` has `USDA_API_KEY` set
- Get free key: https://fdc.nal.usda.gov/api-key-signup.html
- Check that `.env.local` overrides `.env` per Next.js precedence

### Port Already in Use
```bash
# Use different port
PORT=3001 npm run dev
```

### Database Issues
```bash
# Reset database and re-run migrations
npx prisma migrate reset
```

### Tests Failing
```bash
# Clear Jest cache
npm test -- --clearCache
```

## � Recent Changes & Architecture Notes

### February 2026 Updates

#### Custom Unit System Enhancement
- **Added volume units**: `tsp`, `tbsp`, `cup` to default unit options (previously only `g`, `ml`, `other`)
- **Food-specific gram mappings**: Volume units now support optional `gramsPerUnit` field
  - Example: "3/4 cup yogurt = 170g" stores as `gramsPerUnit: 226.67`
  - Enables accurate tracking for foods with varying densities
  - Falls back to ml-based conversion if no custom mapping provided
- **API changes**: Modified `POST/PUT /api/ingredients` to persist custom unit data for tsp/tbsp/cup
- **Files modified**: 
  - [app/ingredients/page.tsx](app/ingredients/page.tsx) - Added volume units to selectors, custom unit UI
  - [app/api/ingredients/route.ts](app/api/ingredients/route.ts) - Extended isCustomUnit check
  - [app/api/ingredients/[id]/route.ts](app/api/ingredients/[id]/route.ts) - Extended isCustomUnit check

#### 3-Panel Layout Standardization
- **Removed Dashboard**: Eliminated unused Dashboard tab from navigation
- **Settings refactor**: Converted Settings page to 3-panel layout
  - Left: Navigation (192px)
  - Center: Goals form with inline editing
  - Right: Goals summary sidebar (320px)
  - Added "Reset to Defaults" with confirmation dialog
- **Recipe inline editing**: Converted recipe editing from separate page to inline mode
  - Click "Edit" loads recipe data and displays RecipeBuilder in center panel
  - No page navigation, maintains 3-panel layout
  - "Back to list" returns to recipe list view
- **Styling consistency**: All pages now use matching styles
  - Flat borders (border-radius: 0)
  - Theme CSS variables (--background, --foreground, --muted, etc.)
  - 12px base font size for inputs
  - 8px gaps, 10-12px padding
- **Files modified**:
  - [app/layout.tsx](app/layout.tsx) - Removed Dashboard nav link
  - [app/settings/page.tsx](app/settings/page.tsx) - Complete refactor to 3-panel layout
  - [app/settings/settings.module.css](app/settings/settings.module.css) - Styling overhaul
  - [app/recipes/page.tsx](app/recipes/page.tsx) - Added inline edit mode with state management

#### Meal Plan Layout Redesign
- **Daily nutrition moved to center panel**: Changed from cramped 320px sidebar accordion to full-width center panel display
  - Shows below week grid when day is selected
  - Header format: "Nutrition - [Day], [Date]"
  - Close button to dismiss summary
  - Provides spacious view of all nutrient categories with goals
- **Week grid restructured**: Simplified calendar layout for better visual hierarchy
  - Dates moved to header row (under SUN/MON/TUE labels)
  - Removed duplicate "Week of" header
  - Day cards simplified to flat list of meals
- **Improved interaction patterns**:
  - Added "View Nutrition" button to each day card
  - Removed confusing clickable wrapper around entire day
  - Clear call-to-action for viewing daily summaries
- **Visual simplification**:
  - Removed meal counter badges (e.g., "6 meals")
  - Removed meal type grouping labels (breakfast, lunch, dinner)
  - Removed bordered boxes around nutrient categories
  - Changed to hairline dividers between nutrients
  - Removed ring highlight on selected days
- **Files modified**:
  - [app/meal-plans/page.tsx](app/meal-plans/page.tsx) - Moved daily summary to center, removed sidebar accordion
  - [app/components/MealPlanWeek.tsx](app/components/MealPlanWeek.tsx) - Restructured grid, added View Nutrition buttons
  - [app/components/DailySummary.tsx](app/components/DailySummary.tsx) - Simplified styling with hairlines

#### Architecture Decisions
- **Inline editing over navigation**: Pages use state-based edit modes instead of navigating to separate edit pages
  - Benefits: Maintains layout consistency, faster UX, no page reloads
  - Pattern: `editMode` state + `handleEditClick()` loader + conditional rendering
- **Per-100g normalization**: All nutrient storage remains normalized to per 100g
  - Conversion: `(value / servingSize) * 100`
  - Recipe totals: `(nutrient_per_100g × ingredient_grams) / 100`
- **Custom unit priority**: `gramsPerUnit` > volume conversion > conversionGrams
  - See [lib/unitConversion.ts](lib/unitConversion.ts) `getAmountInGrams()` function

### Testing Status
- All 57 tests passing
- No TypeScript/lint errors
- API endpoints validated with comprehensive test coverage

## �📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [USDA FoodData Central API](https://fdc.nal.usda.gov/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Jest Testing](https://jestjs.io/docs/getting-started)

## 📄 License

This project is open source and available under the ISC License.

## 👤 Author

Created as a nutrition tracking solution combining USDA food data with recipe management.

# 🥗 Nutrition App

A modern nutrition tracking application that integrates with the USDA FoodData Central API to help you track ingredients and recipes with detailed nutritional information.

## 🌟 Features

- **Ingredient Management**
  - Create custom ingredients with nutritional data
  - Lookup ingredients via USDA FoodData Central
  - Support for custom units (e.g., "1 clove of garlic")
  - Track 8 key nutrients: calories, fat, saturated fat, sodium, carbs, sugar, protein, fiber

- **Recipe Management**
  - Create and edit recipes with multiple ingredients
  - Import recipes from Pestle markdown format
  - Smart ingredient matching with token-based fuzzy matching
  - Support for incomplete recipes (unresolved ingredients)
  - Automatic nutrient total calculation per serving

- **Smart Features**
  - Portion size support from USDA (e.g., "1 clove", "1 cup")
  - Per-100g nutritional data normalization
  - Branded food filtering (shows generic nutrition data)
  - Ingredient auto-matching when importing recipes
  - Clean separation of list/create/edit views

## 🛠️ Tech Stack

- **Frontend**: Next.js 16.1.6 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4.1.18
- **Database**: SQLite with Prisma ORM 5.22.0
- **API**: USDA FoodData Central API v1
- **Testing**: Jest 29+ with TypeScript support
- **Build**: Turbopack (Next.js Turbo mode)

## 📦 Project Structure

```
nutrition-app/
├── app/
│   ├── api/                          # API routes
│   │   ├── ingredients/              # Ingredient CRUD
│   │   ├── recipes/                  # Recipe CRUD
│   │   ├── nutrients/                # Nutrient lookup
│   │   ├── usda/                     # USDA API integration
│   │   │   ├── search/               # Food search
│   │   │   └── fetch/[fdcId]/        # Food details
│   │   └── recipes/import/pestle/    # Pestle import
│   ├── components/                   # React components
│   │   ├── IngredientForm.tsx        # Ingredient creation/USDA lookup
│   │   └── RecipeBuilder.tsx         # Recipe creation/editing
│   ├── ingredients/                  # Ingredient pages
│   │   ├── page.tsx                  # List view
│   │   ├── create/page.tsx           # Create new
│   │   └── [id]/page.tsx             # Edit existing
│   ├── recipes/                      # Recipe pages
│   │   ├── page.tsx                  # List view
│   │   ├── create/page.tsx           # Create + Pestle import
│   │   └── [id]/page.tsx             # Edit existing
│   ├── globals.css                   # Global styles
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Home page
├── lib/
│   ├── db.ts                         # Prisma client
│   └── unitConversion.ts             # Unit conversion logic
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Database seeding
├── app/__tests__/api/                # API tests (57 tests)
│   ├── ingredients.test.ts
│   ├── ingredients-id.test.ts
│   ├── recipes.test.ts
│   ├── recipes-id.test.ts
│   ├── nutrients-and-usda.test.ts
│   └── pestle-import.test.ts
├── jest.config.js                    # Jest configuration
├── jest.setup.ts                     # Jest setup
├── TESTS.md                          # Testing documentation
└── README.md                         # This file
```

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
- Supports custom units (e.g., "clove", "cup")
- Links to USDA foods via `fdcId`

### Recipe
- Collection of ingredients with quantities
- Tracks `isComplete` flag for incomplete recipes
- Stores source app (e.g., "Pestle")

### RecipeIngredient
- Maps ingredients to recipes
- Stores `originalText` for unmatched ingredients
- Stores `conversionGrams` for unit conversion
- Supports null `ingredientId` for incomplete recipes

### IngredientNutrient
- Stores per-100g normalized nutritional values
- 8 core nutrients tracked

### Nutrient
- Reference table for all tracked nutrients
- Includes USDA nutrient numbers for API mapping

## 📊 API Endpoints

### Ingredients
- `GET /api/ingredients` - List all ingredients
- `POST /api/ingredients` - Create ingredient
- `GET /api/ingredients/[id]` - Get ingredient details
- `PUT /api/ingredients/[id]` - Update ingredient
- `DELETE /api/ingredients/[id]` - Delete ingredient

### Recipes
- `GET /api/recipes` - List all recipes
- `POST /api/recipes` - Create recipe
- `GET /api/recipes/[id]` - Get recipe with nutrient totals
- `PUT /api/recipes/[id]` - Update recipe
- `DELETE /api/recipes/[id]` - Delete recipe

### USDA Integration
- `GET /api/usda/search?query=...` - Search for foods
- `GET /api/usda/fetch/[fdcId]` - Get food details with portions
- `GET /api/nutrients` - List all nutrients

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

### Scenario 1: Create Ingredient from USDA
1. Navigate to `Ingredients` → `+ Create Ingredient`
2. Search: "garlic"
3. Select "Garlic, raw"
4. View available portions: "1 clove (3g)", "1 cup chopped (136g)"
5. Click "1 clove (3g)" to auto-fill unit
6. Nutrient values auto-populated
7. Save

### Scenario 2: Import Recipe from Pestle
1. Open a Pestle recipe markdown file
2. Navigate to `Recipes` → `+ Create Recipe`
3. Upload markdown file
4. System auto-matches ingredients (shows "Matched to: X")
5. Unmatched ingredients shown as incomplete
6. Click "Create new ingredient →" to resolve
7. Confirm save, redirects to ingredient creation
8. After saving ingredient, returns to recipe editing
9. Save complete recipe

### Scenario 3: Edit Recipe and Resolve Incomplete Ingredient
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

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [USDA FoodData Central API](https://fdc.nal.usda.gov/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Jest Testing](https://jestjs.io/docs/getting-started)

## 📄 License

This project is open source and available under the ISC License.

## 👤 Author

Created as a nutrition tracking solution combining USDA food data with recipe management.

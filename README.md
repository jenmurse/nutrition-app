# Set Course — Nutrition Tracking App

A household nutrition tracker for building ingredient libraries, creating recipes, and planning weekly meals against personal nutrition goals.

**Live**: v0-nutrition-app-nu.vercel.app

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Frontend** | Next.js (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4 + CSS variables (no CSS Modules) |
| **Database** | Supabase PostgreSQL via Prisma ORM |
| **Auth** | Supabase Auth (email/password) |
| **Hosting** | Vercel — SFO1 region (colocated with Supabase us-west-1) |
| **APIs** | USDA FoodData Central (nutrition lookup) |
| **AI** | OpenAI (recipe nutrition analysis) via user-supplied API key |
| **MCP** | Custom Node.js stdio server in `mcp/` |

---

## Features

### Dashboard
- Time-of-day greeting with today's date
- SVG ring hero: "X of Y goals on track" with adaptive warning display
- Two-column layout: today's nutrition progress bars (left) + today's meals list (right)
- Empty states: no plan this week, no meals logged yet
- Always fetches fresh data to avoid stale cache false-positives

### Pantry (Ingredients)
- Create/edit/delete pantry items with 8 tracked nutrients (calories, fat, sat fat, sodium, carbs, sugar, protein, fiber)
- USDA FoodData Central lookup with 500ms debounced search
- Custom unit system: `g`, `ml`, `tsp`, `tbsp`, `cup`, `other` — with food-specific gram mappings (e.g. "3/4 cup yogurt = 170g")
- `isMealItem` flag for items tracked directly in meal plans (not just used in recipes)
- All nutrient values stored normalized to per 100g

### Recipes
- Create/edit/delete recipes with ingredient amounts
- AI nutrition analysis (OpenAI) per recipe
- Duplicate recipe
- Import from Pestle markdown format — smart token-based ingredient matching
- Real-time nutrient total calculation per serving
- Tag-based categorization (breakfast, lunch, dinner, snack, side, dessert, beverage)
- Incomplete recipe handling (unresolved ingredients)

### Meal Plans
- Weekly grid view per person — assign recipes/pantry items to days and meal types
- Nutrition summary panel per day: calorie hero, nutrient bars, over/under-limit alerts
- Smart swap suggestions (day-analysis): over-allocation and below-minimum sections, each showing open "Instead of X" cards with SWAP buttons
- Goals are correctly scoped per person — multi-person households don't share/bleed goals
- Pantry item calorie display in meal cards (same as recipe calorie display)
- Duplicate plan
- Multi-person household "Everyone" view (side-by-side grid, shared meal badges)
- Plans are person-scoped and household-scoped
- Recipe picker: pre-filtered to meal slot type with tag highlighted; user can toggle or switch to any category

### Nutrition Goals
- Per-person daily min/max targets for all 8 nutrients
- Plan-level goal overrides
- Reset to USDA defaults
- Goals correctly isolated per person — fixing cross-wiring in both weekly summary and day-analysis endpoints

### Settings
- Household management
- Invite flow (backend ready, UI pending)
- AI & API key configuration (OpenAI)
- Data export/import
- MCP server token management
- Color theme selector (Default, Ocean, Dusk, Sand)

### Person Switcher
- TopNav shows all household members with color dots
- Switching person filters meal plans, goals, and context panels
- Selection persists across page reloads (stored in localStorage)

---

## Architecture

### Auth & Multi-tenancy
- `lib/auth.ts` — `getAuthenticatedHousehold()` returns `{ personId, householdId, role }` or `{ error, status }`
- Middleware sets `x-supabase-user-id` header so API routes skip re-auth (one Supabase round-trip saved per request)
- All data queries scoped to `householdId`
- `Person` model stores `supabaseId` + `email` for auth lookup
- `Household` + `HouseholdMember` + `HouseholdInvite` models

### Layout Pattern
- **Dashboard**: full-width two-column grid (ring hero + nutrition/meals)
- **Ingredients/Recipes**: three-pane (220px list | flex-1 detail | 280px context)
- **Meal Plans**: two-pane (flex-1 week grid | 380px daily summary)

### Data Model
- **Ingredient** — name, defaultUnit, optional custom unit (name/amount/grams), USDA fdcId, `isMealItem` flag
- **IngredientNutrient** — per-ingredient nutrient values (per 100g)
- **Recipe** — name, servings, instructions; linked to ingredients via `RecipeIngredient`
- **MealPlan** — week-scoped (weekStartDate), per-person, per-household
- **MealLog** — individual meal entries within a plan (day, meal type, ingredient or recipe, amount)
- **NutritionGoal** — low/high targets per nutrient per meal plan
- **GlobalNutritionGoal** — per-person default targets (personId-scoped to prevent cross-wiring)
- **Nutrient** — shared lookup table
- **SystemSetting** — household-scoped key/value store (API key, MCP token)
- **ApiUsageLog** — tracks AI API calls per household
- **UsdaSearchCache** / **UsdaFoodCache** — shared USDA fetch cache

### Per-100g Normalization
All nutrient values stored normalized to per 100g: `(value / servingSize) * 100`. Recipe totals: `(nutrient_per_100g × ingredient_grams) / 100`.

### Client-Side Caching
A module-level singleton cache (`lib/clientCache.ts`) persists data across component mount/unmount within a browser session:
- **Cache-first** (recipes, ingredients, goals): return immediately, skip network
- **Cache-then-revalidate** (meal plan details): return cache instantly, fetch in background
- **Surgical updates** on mutation: `clientCache.set()` with the computed new list, never `invalidate()` — keeps navigation instant after creates/edits/deletes
- Dashboard always fetches fresh meal plan data (bypasses cache read) to avoid stale "no meals logged" false-positives

### UI System
- Design tokens via CSS variables (`--fg`, `--bg`, `--accent`, `--muted`, `--rule`, `--error`, etc.) — see `DESIGN.md`
- Font: DM Sans / DM Serif Display / DM Mono
- `lib/toast.ts` — module-level toast emitter; `Toaster.tsx` renders a 2px sweep below the nav
- `lib/dialog.ts` — module-level async confirm; `ConfirmModal.tsx` renders styled modal
- `NumberInputHandler` — global scroll-prevention on number inputs
- Scrollbars hidden globally (`scrollbar-width: none` + `::-webkit-scrollbar`)

---

## Project Structure

```
nutrition-app/
├── app/
│   ├── api/
│   │   ├── ingredients/          # CRUD + slim list endpoint
│   │   ├── recipes/              # CRUD + import/pestle, AI analyze
│   │   ├── meal-plans/           # CRUD + meals, weekly recalc
│   │   │   └── [id]/
│   │   │       └── day-analysis/ # Smart swap suggestions per day
│   │   ├── nutrition-goals/      # Goals management
│   │   ├── persons/              # Person + goals endpoints
│   │   ├── households/           # Household management
│   │   ├── usda/                 # USDA search + fetch with DB cache
│   │   ├── settings/             # Household settings
│   │   └── auth/callback/        # Supabase auth callback + provisioning
│   ├── components/
│   │   ├── PersonContext.tsx      # Household person state + localStorage persistence
│   │   ├── TopNav.tsx             # Navigation + person switcher
│   │   ├── Toaster.tsx            # Toast renderer (sweep + status bar)
│   │   ├── ConfirmModal.tsx       # Async confirm dialog
│   │   ├── RecipeBuilder.tsx      # Recipe create/edit with ingredient amounts
│   │   ├── MealPlanWeek.tsx       # Weekly meal calendar grid
│   │   ├── SmartSuggestionsPanel.tsx # Day-analysis swap recommendations
│   │   ├── RecipeContextPanel.tsx # Right panel for recipes page
│   │   ├── IngredientContextPanel.tsx
│   │   └── NumberInputHandler.tsx
│   ├── ingredients/page.tsx       # Pantry items (formerly "Ingredients")
│   ├── recipes/page.tsx
│   ├── meal-plans/page.tsx
│   ├── settings/page.tsx
│   ├── page.tsx                   # Dashboard (home)
│   ├── login/page.tsx
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── auth.ts                   # getAuthenticatedHousehold()
│   ├── clientCache.ts            # Session-scoped client cache
│   ├── toast.ts                  # Toast emitter
│   ├── dialog.ts                 # Confirm dialog emitter
│   ├── unitConversion.ts         # Unit → grams conversion
│   ├── nutritionCalculations.ts  # Nutrient calculation helpers (getWeeklyNutritionSummary)
│   └── smartMealAnalysis.ts      # Over/under-budget detection + swap candidate scoring
├── mcp/                          # MCP stdio server
├── prisma/
│   └── schema.prisma
├── middleware.ts                 # Auth + x-supabase-user-id header
└── .env.local                    # Environment variables
```

---

## Environment Variables

```env
DATABASE_URL=             # Supabase session pooler (port 5432 on pooler.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
USDA_API_KEY=             # Free key from fdc.nal.usda.gov/api-key-signup.html
```

---

## Getting Started

```bash
npm install
npm run dev          # http://localhost:3000
```

---

## API Endpoints

### Ingredients
- `GET /api/ingredients?slim=true` — list (no nutrient data)
- `GET /api/ingredients/[id]` — full detail with nutrients
- `POST /api/ingredients` — create
- `PUT /api/ingredients/[id]` — update
- `DELETE /api/ingredients/[id]` — delete

### Recipes
- `GET /api/recipes` — list (shallow, no nutrient joins)
- `GET /api/recipes/[id]` — detail with per-serving totals
- `POST /api/recipes` — create
- `PUT /api/recipes/[id]` — update
- `DELETE /api/recipes/[id]` — delete
- `POST /api/recipes/import/pestle` — import from Pestle markdown
- `POST /api/recipes/[id]/analyze` — AI nutrition analysis

### Meal Plans
- `GET /api/meal-plans?personId=` — list
- `GET /api/meal-plans/[id]` — detail with weekly nutrition recalc + calorie maps
- `POST /api/meal-plans` — create
- `PUT /api/meal-plans/[id]` — update
- `DELETE /api/meal-plans/[id]` — delete
- `POST /api/meal-plans/[id]/meals` — add meal
- `PUT /api/meal-plans/[id]/meals/[mealId]` — update meal
- `DELETE /api/meal-plans/[id]/meals/[mealId]` — delete meal
- `GET /api/meal-plans/[id]/day-analysis?date=YYYY-MM-DD` — smart swap suggestions for a day

### Other
- `GET /api/persons` — list household members
- `GET /api/persons/[id]/goals` — nutrition goals for person
- `GET /api/nutrition-goals` — global goals
- `PUT /api/nutrition-goals` — update goals
- `POST /api/nutrition-goals/reset` — reset to USDA defaults
- `GET /api/usda/search?query=` — USDA food search
- `GET /api/usda/fetch/[fdcId]` — USDA food detail + portions

---

## Performance

Key bottleneck: every Prisma query is a network round-trip to Supabase (50–200ms each). Vercel is deployed in SFO1 to colocate with Supabase us-west-1.

Fixes implemented:
- Middleware passes `x-supabase-user-id` header — API routes skip re-auth (saves one Supabase call per request)
- Client-side session cache (`clientCache`) — subsequent page visits are instant
- Surgical cache updates on mutation — no invalidation, cache stays warm post-save
- `slim=true` on ingredient list — omits nutrient data until an ingredient is selected
- Optimistic UI on meal add/delete — appears instantly, nutrition totals sync in background
- Merged meal plan load phases — plan list + detail fetch start in parallel where possible
- Skeleton loading states with `animate-loading` pulse

Remaining bottleneck: first-load DB query latency. Future option: Prisma Accelerate for query-level caching (see `LOADING-PERFORMANCE.md` for full analysis).

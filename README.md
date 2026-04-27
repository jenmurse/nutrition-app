# Good Measure — Nutrition Tracking App

A household nutrition tracker for building ingredient libraries, creating recipes, and planning weekly meals against personal nutrition goals.

**Live**: withgoodmeasure.com

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Frontend** | Next.js (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4 + CSS custom properties (editorial design system) |
| **Database** | Supabase PostgreSQL via Prisma ORM |
| **Auth** | Supabase Auth (email/password + Google OAuth) |
| **Hosting** | Railway — push to `main` auto-deploys |
| **APIs** | USDA FoodData Central (nutrition lookup) |
| **AI** | Claude via MCP — `good-measure-mcp` npm package (no in-app API calls) |
| **MCP** | Custom Node.js stdio server in `mcp/` — published as `good-measure-mcp` |

---

## Design System

Editorial design language built on two typefaces:

| Role | Family | Usage |
|---|---|---|
| **Mono / Label** | DM Mono | All caps UI labels, nav links, nutrition values, metadata |
| **Body / UI** | DM Sans | Body text, form inputs, descriptions, headings (`font-serif` maps to DM Sans in Tailwind) |

**Color tokens**: all CSS variables (`--fg`, `--bg`, `--accent`, `--muted`, `--rule`, etc.) — never hardcode hex values in components.

**8 person themes**: coral, terra, sage, forest, steel, cerulean, plum, slate. Each theme overrides `--accent` and related variables via `[data-theme="..."]` on `<html>`. FOUC-prevented via inline `<script>` in layout.

---

## Features

### Dashboard
- Full-viewport editorial hero greeting (time-aware)
- Dynamic stats strip: 3 user-selected nutrients from Settings (localStorage `dashboard-stats`)
- Today's key meals: breakfast, lunch, dinner, side — with 3 nutrient stats per meal
- Weekly overview grid with today column highlighted
- Getting Started checklist + contextual tips (dismissible)
- Scroll-reveal animations

### Pantry (Ingredients)
- Create/edit/delete with 8 tracked nutrients (calories, fat, sat fat, sodium, carbs, sugar, protein, fiber)
- **Category system**: 15 categories (Produce, Meat & Seafood, Dairy & Eggs, Grains & Bread, Pasta & Rice, Baking, Nuts & Seeds, Spices & Seasonings, Condiments & Sauces, Oils & Fats, Frozen, Canned & Jarred, Beverages, Alcohol, Snacks) — shown on cards, used in shopping list grouping
- USDA FoodData Central lookup (500ms debounced)
- Custom unit system: `g`, `ml`, `tsp`, `tbsp`, `cup`, `other` — food-specific gram density mappings
- Mine / Library toggle — shared USDA ingredient library
- `isMealItem` flag for items tracked directly in meal plans

### Recipes
- Create/edit/delete with per-serving nutrition totals
- Section headers within ingredient lists (drag-and-drop preserved)
- URL import (Schema.org JSON-LD), markdown (.md / Pestle) import
- AI optimization + meal prep via MCP workflow (Claude Desktop / Cursor / Windsurf)
- Scaling: 1×/2×/3×/4× display-only buttons
- Sort by nutrient value; filter by tag
- Duplicate recipe
- Guided nutrition mode: person picker + focus nutrients + real-time GoalsPanel

### Meal Plans
- Weekly grid view per person
- Nutrition summary sidebar (collapsible, 380px)
- Smart swap suggestions: over-allocation and below-minimum sections
- **Shopping list**: grouped by ingredient category, per-group select-all checkboxes, share to clipboard
- Multi-person "Everyone" side-by-side view
- Duplicate plan

### Person / Theme System
- Multi-person households — each person has their own meal plans, goals, and accent theme
- Person switcher in TopNav; selection persists via localStorage
- Per-person theme drives full app skin (accent color, selected states, focus rings, custom cursor hover)

### Mobile
- Bottom nav (5 items: Home, Planner, Recipes, Pantry, Settings)
- Filter bottom sheets (recipes + pantry)
- Add meal bottom sheets with portal rendering (clears bottom nav z-index)
- FAB (+New) on list pages
- Recipe detail sticky header with back button
- Settings horizontal jump bar
- Custom cursor hidden on touch devices

### Settings
- Per-person daily nutrition goals (8 nutrients, min/max)
- Dashboard stat selection (exactly 3 required)
- Household management + invite system
- MCP token management
- Data export/import (full household JSON)

### Auth & Onboarding
- 6-step onboarding wizard: Welcome → Profile → Household → Goals → Recipe Import → Complete
- Getting Started checklist (5 auto-completing tasks)
- Contextual tips across dashboard, pantry, recipe builder, AI tabs

---

## Architecture

### Auth & Multi-tenancy
- `lib/auth.ts` — `getAuthenticatedHousehold()` returns `{ personId, householdId, role }` or `{ error, status }`
- `lib/apiUtils.ts` — `withAuth(handler, fallbackError?)` HOF wraps all API route handlers with auth + error handling
- Middleware sets `x-supabase-user-id` header — API routes skip re-auth
- All data queries scoped to `householdId`

### Layout Pattern
- **Dashboard**: full-width editorial hero + stats + meals + weekly grid
- **Ingredients/Recipes**: three-pane (220px list | flex-1 detail | 300px context)
- **Meal Plans**: flex-1 week grid | 380px collapsible daily summary

### Data Model
- **Ingredient** — name, defaultUnit, category, USDA fdcId, `isMealItem` flag
- **IngredientNutrient** — per 100g values
- **Recipe** — name, servings, instructions, image, section headers
- **RecipeIngredient** — amount, unit, conversionGrams, section
- **MealPlan** — week-scoped, per-person, per-household
- **MealLog** — day, meal type, ingredient or recipe, amount
- **NutritionGoal** / **GlobalNutritionGoal** — per-person low/high targets
- **GlobalIngredient** / **GlobalIngredientNutrient** — shared USDA cache
- **SystemSetting** — household-scoped key/value (MCP token)

### Per-100g Normalization
All nutrient values stored normalized to per 100g. Recipe totals: `(nutrient_per_100g × ingredient_grams) / USDA_BASE_GRAMS`. The constant `USDA_BASE_GRAMS = 100` lives in `lib/constants.ts` — never use the magic number `100` directly.

### Client-Side Caching
`lib/clientCache.ts` — module-level singleton Map, persists across React mount/unmount for the browser session. Pattern: serve cached data immediately, background-revalidate, call `clientCache.invalidate(prefix)` on any mutation. Cached: ingredients (`/api/ingredients`), nutrients (`/api/nutrients`), goals (`/api/persons/[id]/goals`). Dashboard always bypasses cache for fresh meal data.

---

## Project Structure

```
nutrition-app/
├── app/
│   ├── api/
│   │   ├── ingredients/          # CRUD + slim list
│   │   ├── recipes/              # CRUD + import/url + import/md + analyze
│   │   ├── meal-plans/           # CRUD + meals + day-analysis + shopping-list
│   │   ├── persons/              # Person + theme + goals
│   │   ├── households/           # Household management + invites
│   │   ├── usda/                 # Search + fetch with DB cache
│   │   ├── global-ingredients/   # Shared ingredient library
│   │   ├── mcp/                  # MCP auth token endpoints
│   │   └── auth/callback/        # Supabase auth callback + provisioning
│   ├── components/
│   │   ├── PersonContext.tsx     # Household person state + theme application
│   │   ├── TopNav.tsx            # Navigation + person switcher
│   │   ├── BottomNav.tsx         # Mobile 5-item nav
│   │   ├── CustomCursor.tsx      # Portfolio-style cursor (desktop only)
│   │   ├── Toaster.tsx           # Toast renderer
│   │   ├── ConfirmModal.tsx      # Async confirm dialog
│   │   ├── RecipeBuilder.tsx     # Recipe create/edit
│   │   ├── RecipeContextPanel.tsx
│   │   └── IngredientContextPanel.tsx
│   ├── ingredients/page.tsx
│   ├── recipes/[id]/page.tsx
│   ├── meal-plans/page.tsx
│   ├── settings/page.tsx
│   ├── page.tsx                  # Dashboard
│   ├── globals.css               # Design tokens + all editorial CSS classes
│   └── layout.tsx
├── types/
│   └── index.ts                  # Shared domain types (Nutrient, Goal)
├── lib/
│   ├── auth.ts
│   ├── apiUtils.ts               # withAuth HOF for API route handlers
│   ├── clientCache.ts
│   ├── constants.ts              # USDA_BASE_GRAMS and other shared constants
│   ├── themes.ts                 # 8 person themes (THEMES, resolveTheme, themeHex)
│   ├── toast.ts
│   ├── dialog.ts
│   ├── unitConversion.ts
│   ├── nutritionCalculations.ts  # computeRecipeServingTotals + weekly summary
│   └── smartMealAnalysis.ts
├── mcp/                          # good-measure-mcp stdio server
├── prisma/schema.prisma
└── middleware.ts
```

---

## Environment Variables

```env
DATABASE_URL=                     # Supabase session pooler
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
USDA_API_KEY=                     # fdc.nal.usda.gov/api-key-signup.html
```

---

## Getting Started

```bash
npm install
npm run dev    # http://localhost:3000
```

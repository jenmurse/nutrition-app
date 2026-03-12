# Deployment & Multi-User Architecture Plan

> Saved: March 10, 2026
> Status: Not started — revisit when ready to deploy

---

## Phase 1: Supabase Migration

Switch from SQLite to Supabase PostgreSQL so the app can run on Vercel.

- [ ] Create Supabase project and get connection string
- [ ] Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
- [ ] Update `DATABASE_URL` in `.env` to point to Supabase
- [ ] Run `prisma migrate dev` to generate PostgreSQL migrations
- [ ] Seed the 8 nutrients
- [ ] Test all existing API routes against the new database
- [ ] Remove `better-sqlite3` from `package.json`

## Phase 2: Vercel Deployment

Get the app live on Vercel.

- [ ] Create Vercel project linked to the repo
- [ ] Add environment variables in Vercel dashboard:
  - `DATABASE_URL` (Supabase connection string)
  - `USDA_API_KEY`
- [ ] Deploy and verify all pages and API routes work
- [ ] Set up Supabase connection pooling if needed (Vercel serverless can exhaust connections)

## Phase 3: USDA Caching

Add two cache tables so multiple users don't redundantly hit the USDA API.

### 3a. Search Cache

Table: `UsdaSearchCache`
- `id` (primary key)
- `query` (indexed, lowercase-normalized) — e.g., "apple"
- `results` (JSON) — the full USDA search response
- `cachedAt` (timestamp)
- `expiresAt` (timestamp) — 7 days from cachedAt

Flow for `/api/usda/search?q=apple`:
1. Check `UsdaSearchCache` for `query = "apple"` where not expired
2. If found → return cached results (zero USDA calls)
3. If not found → call USDA, store response, return to user

### 3b. Food Detail Cache

Table: `UsdaFoodCache`
- `id` (primary key)
- `fdcId` (unique, indexed) — e.g., 171688
- `description` — "Apple, raw, with skin"
- `nutrients` (JSON) — full nutrient breakdown from USDA
- `foodPortions` (JSON) — portion data
- `cachedAt` (timestamp)

Flow for `/api/usda/fetch/171688`:
1. Check `UsdaFoodCache` for `fdcId = 171688`
2. If found → return cached data (zero USDA calls)
3. If not found → call USDA, store response, return to user

Note: USDA nutrient data for a given fdcId is stable. No expiration needed — refresh annually at most.

### Implementation

- [ ] Add `UsdaSearchCache` and `UsdaFoodCache` models to `prisma/schema.prisma`
- [ ] Run migration
- [ ] Update `/api/usda/search/route.ts` to check cache before calling USDA
- [ ] Update `/api/usda/fetch/[fdcId]/route.ts` to check cache before calling USDA
- [ ] Test with repeated searches to confirm cache hits

## Phase 4: Multi-User Auth

Add Supabase Auth so multiple people can each have their own data.

- [ ] Enable Supabase Auth (email/password to start, OAuth later)
- [ ] Add `userId` column to: `Ingredient`, `Recipe`, `MealPlan`, `NutritionGoal`, `GlobalNutritionGoal`
- [ ] Update all API routes to filter by `userId` from the authenticated session
- [ ] Add login/signup pages
- [ ] Add auth middleware to protect API routes
- [ ] Set up Supabase Row Level Security (RLS) policies:
  - `Ingredient`: users can only SELECT/INSERT/UPDATE/DELETE their own rows
  - `Recipe`: same — user-scoped
  - `MealPlan`, `MealLog`, `NutritionGoal`: same — user-scoped
  - `GlobalNutritionGoal`: becomes per-user (rename or scope)
  - `UsdaSearchCache`: anyone can SELECT, only system can INSERT
  - `UsdaFoodCache`: anyone can SELECT, only system can INSERT
  - `Nutrient`: anyone can SELECT (shared reference data)

## Phase 5: Shared Ingredient Library

Let users discover USDA-sourced ingredients already in the database instead of always searching USDA.

- [ ] Add `source` field to `Ingredient` (`'usda'` | `'custom'`)
- [ ] When searching for ingredients, also query existing USDA-sourced ingredients across all users (read-only)
- [ ] "Clone" flow: user picks a shared ingredient → creates their own copy with their `userId`
- [ ] Users can rename, adjust nutrients, add custom units to their clone without affecting the original
- [ ] The `fdcId` on each ingredient tracks provenance back to USDA

---

## Data Model Summary (Multi-User)

```
Shared (no userId):
  Nutrient           — 8 core nutrients, read-only reference
  UsdaSearchCache    — cached USDA search results
  UsdaFoodCache      — cached USDA food detail by fdcId

Per-user (has userId):
  Ingredient         — user's saved ingredients (may have fdcId if from USDA)
  Recipe             — user's recipes
  MealPlan           — user's weekly meal plans
  MealLog            — individual meals within a plan
  NutritionGoal      — per-plan nutrient targets
  GlobalNutritionGoal — user's default nutrient targets
```

## Security Model

- Users NEVER see each other's ingredients, recipes, or meal plans
- Every query filters by `userId` at the API level AND via Supabase RLS at the database level
- USDA cache tables contain only public government nutrition data — no security concern
- Supabase RLS acts as a safety net even if API code has bugs

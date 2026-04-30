---
name: Row Level Security plan
description: Options and implementation details for adding Supabase RLS — deferred, revisit before public launch
type: project
---

**Status: Deferred** — app currently uses application-level auth (middleware + API route checks). RLS would be a second layer of defense. Decision: revisit before public launch.

**Why:** Supabase RLS requires the DB connection to have the user's JWT identity set. Prisma connects directly to Postgres (bypassing PostgREST), so RLS sees no user identity by default.

---

## Option A: Switch Prisma to use user JWT context (complex, true RLS)

**How it works:**
1. Before each query, run `SELECT set_config('request.jwt.claim.sub', $userId, true)` — the `true` flag makes it transaction-local (resets after transaction ends, safe with PgBouncer).
2. Wrap every API route in a transaction via a helper:
   ```ts
   async function withUserContext(userId: string, fn: (tx: PrismaClient) => Promise<T>) {
     return prisma.$transaction(async (tx) => {
       await tx.$executeRaw`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`
       return fn(tx)
     })
   }
   ```
3. Refactor ~30-40 API route files to use `withUserContext` instead of calling `prisma` directly.
4. Write RLS policies against `current_setting()` (not `auth.uid()` — we're not going through PostgREST):
   ```sql
   USING (household_id IN (
     SELECT household_id FROM "HouseholdMember"
     WHERE user_id = current_setting('request.jwt.claim.sub', true)
   ))
   ```
5. Verify connection pooler mode — Supabase uses PgBouncer. Must confirm transaction mode so session settings don't bleed between connections.

**Risk:** Misconfigured policy silently returns empty results (no error). Requires thorough testing of every data access pattern.

**Effort:** High — major refactor of all API routes.

---

## Option B: Service role key + app-level checks (simpler, layered security)

Keep current approach (Prisma with service role key), but add RLS policies that also check household ownership. RLS acts as a safety net rather than the primary gate.

- Policies use a custom claim or a DB-side helper function to validate household membership
- Application-level checks remain the primary auth mechanism
- Much less refactoring required

**Effort:** Low-medium — write policies, no API route changes needed.

---

## Recommendation

Option B for now. Option A if the app ever handles sensitive multi-tenant data or exposes direct DB access.

**Tables to add policies to (~12 household-scoped tables):**
- Recipe, RecipeIngredient, Ingredient, IngredientNutrient
- MealPlan, MealPlanEntry
- Person, GlobalNutritionGoal, NutritionGoal
- HouseholdMember, HouseholdInvite
- Any others with householdId or userId FK

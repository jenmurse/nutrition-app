# Loading Performance — Issues, Fixes & Future Options

## Architecture Context

The app runs on **Vercel (East US)** with a **Supabase PostgreSQL** database. Every Prisma query goes over the network to Supabase — this adds roughly **50–200ms per round-trip**, which compounds fast when queries are chained sequentially. This is the single biggest constraint on perceived speed, and almost every performance issue in this app traces back to it.

---

## Issues & What We Did About Them

### 1. Double auth on every API request

**The problem**
Next.js middleware calls `supabase.auth.getUser()` to protect routes. Then every API route calls `getAuthenticatedHousehold()` which calls `supabase.auth.getUser()` *again*. That's two Supabase round-trips on every single page load — before any data is even fetched.

**The bug within the bug**
The middleware was setting a header (`x-supabase-user-id`) to pass the verified user ID downstream so API routes could skip re-auth. But `NextResponse.next({ request: { headers } })` snapshots headers at construction time. Any `set()` calls on the original headers object after that point were silently ignored — the header never arrived at the route handler. The fix was to construct the header object *before* calling `NextResponse.next()`, then copy Supabase's session `Set-Cookie` headers onto the new response so auth cookies aren't lost.

**The fix**
- `middleware.ts`: Set `x-supabase-user-id` on the request headers before constructing the response, then copy session cookies from the original response to the new one.
- `lib/auth.ts`: Read the header first. If present, skip `supabase.auth.getUser()` and go straight to the Prisma lookup. Fall back to full auth only when the header is missing (direct API calls, non-middleware paths).

**Impact**: Cuts one Supabase network round-trip from every API call.

---

### 2. Waterfall loading on meal plans page

**The problem**
Four sequential async phases, each waiting for the previous to finish before starting:

```
1. PersonContext loads → fetches /api/persons
2. selectedPersonId set → fetches /api/meal-plans?personId=X
3. Plan list arrives → fetches /api/meal-plans/[id] (heavy — recalculates weekly nutrition)
4. Plan detail arrives → fetches all person plans for the week (multi-person view)
```

Each step added 200–400ms of latency before the page showed anything useful.

**The fix**
- Merged steps 2 and 3 into a single async function (`load()`) so the plan list fetch and plan detail fetch run in the same async chain without gaps.
- If a `planId` is already in the URL (returning visitor, bookmark), the plan detail fetch starts as soon as the page mounts rather than waiting for the plan list first.
- Step 4 (multi-person week fetch) now runs as soon as the plan's `weekStartDate` is known from the list — it no longer waits for the full plan detail to arrive.
- Kept `loading = true` until both the plan list AND the first plan detail are ready, so the UI renders once with real data instead of flashing through intermediate skeleton states.

---

### 3. Full refetch after adding a meal

**The problem**
Adding a meal called `fetchMealPlanDetails()` which re-fetches the entire week's plan including a server-side nutritional recalculation across all 7 days. A single meal addition triggered a 400–800ms round-trip before anything updated in the UI.

**The fix**
- The POST response returns the created meal log (with recipe or ingredient data included).
- The new meal is added to local state immediately (optimistic update) — it appears in the UI instantly.
- `fetchMealPlanDetails()` still runs in the background to sync the nutrition totals, but it doesn't block the UI.

Same pattern applied to meal deletion.

---

### 4. Ingredients page loading full nutrient data on list load

**The problem**
`GET /api/ingredients` returned all ingredients with their full `nutrientValues` arrays. The list view only shows name, unit, and source — none of the nutrient data was used until an ingredient was selected.

**The fix**
Initial list load uses `GET /api/ingredients?slim=true` which returns only the fields needed for the list. Full nutrient data is fetched per-ingredient (`GET /api/ingredients/[id]`) only when an ingredient is selected — which was already happening via `refreshSelectedIngredient`.

---

### 5. No client-side caching — everything refetched on revisit

**The problem**
Every time a user navigated away and back to a page, all data was refetched from scratch. During a session, the underlying data almost never changes between page visits, so this was pure wasted latency.

**The fix**
A module-level singleton cache (`lib/clientCache.ts`) persists data across React component mount/unmount cycles within a browser session. It's a plain `Map` wrapped in a small API (`get`, `set`, `delete`, `invalidate`).

Cache strategy per data type:
- **Static/rarely-changing** (recipes, ingredients, nutrition goals): cache-first — return cache immediately, skip the network.
- **Dynamic** (meal plan details, meal logs): cache-then-revalidate — return cache immediately for instant render, then fetch fresh data in the background and update state when it arrives.
- **Mutations** (create, edit, delete): invalidate the relevant cache keys so the next load is fresh.

The first page visit still takes the same time. Every subsequent visit during the session is instant.

---

### 6. Nutrition goals panels had no loading state

**The problem**
The recipe and ingredient context panels both fetch `GET /api/persons/[id]/goals` when a person is selected. While loading, `goals.length === 0` which showed the same "No nutrition goals set" message as when goals genuinely don't exist — users couldn't tell if the page was loading or if they had no goals.

**The fix**
Added explicit `goalsLoading` state to both `RecipeContextPanel` and `IngredientContextPanel`. While loading, animated skeleton bars are shown instead of the empty state. Goals are now also cached by person ID — switching pages doesn't re-fetch if the goals were already loaded.

---

### 7. Skeleton loading states had no animation

**The problem**
Skeleton placeholder blocks were static gray rectangles. On first load they looked like broken UI rather than an intentional loading state.

**The fix**
Added `@keyframes loading-breathe` (opacity pulses 0.35 → 0.8 → 0.35 over 1.8s) and an `.animate-loading` utility class in `globals.css`. Applied to all skeleton blocks across the dashboard, meal plans, recipes, ingredients, and both context panels.

---

### 8. Toast notification causing layout jog

**The problem**
Success/error messages ("Meal added successfully", etc.) were rendered as an inline block element inside the page's flex column layout. When the message appeared it pushed content down; when it disappeared 3 seconds later the content bounced back up.

**The fix**
Replaced the inline `message` state system with a fixed-position toast (`lib/toast.ts` + `Toaster` component, bottom-right, `position: fixed`). Toast appears and disappears without touching the document flow.

---

## What Still Limits Speed

Even with all of the above in place, first-load times are still 400–800ms on most pages because:

1. **Every Prisma query is a network call to Supabase**. A single page load might need 2–3 queries in series (auth → lookup → data), and each one costs 50–200ms.
2. **Weekly nutrition recalculation** (`GET /api/meal-plans/[id]`) is the heaviest endpoint — it aggregates all meal logs across the week and applies per-nutrient goal statuses. No amount of client-side caching helps the first time it loads.
3. **Cold starts** on Vercel serverless functions add 200–500ms when a function hasn't been invoked recently.

---

## Future Options

### Edge Functions (highest impact, most complex)

Vercel Edge Functions run at the CDN edge — physically closer to the user than a regional serverless function. They respond in ~10–50ms vs ~200–400ms for a standard serverless function.

**What's a good fit:**
- Auth-only endpoints (session validation, token refresh)
- Simple lookups that don't need heavy Prisma queries
- The middleware itself (already runs at edge — this is working)

**The constraint**: Edge functions can't use Prisma with connection pooling in the standard setup — they require a connection pooler like [Prisma Accelerate](https://www.prisma.io/accelerate) or switching to an HTTP-based DB driver. Worth evaluating if Prisma Accelerate fits the stack — it also has a built-in query cache which could eliminate the DB round-trip entirely for frequently-read data.

**Realistic gain**: Moving the auth + household lookup to an edge-compatible path could cut 100–200ms from every API request.

---

### Prisma Accelerate (query-level caching)

[Prisma Accelerate](https://www.prisma.io/accelerate) is a connection pooler and cache layer that sits between the app and the database. You can set a cache TTL per query:

```ts
const goals = await prisma.nutritionGoal.findMany({
  where: { personId },
  cacheStrategy: { ttl: 300 }, // cache for 5 minutes
});
```

**What it helps with:**
- Nutrition goals (rarely change — safe to cache for minutes)
- Ingredient nutrient values (static data — safe to cache for hours)
- Recipe details (change only on edit — could use `swr` strategy)

**What it doesn't help with:**
- Meal logs (change frequently, need fresh data)

**Realistic gain**: Could eliminate the DB round-trip entirely for goal and ingredient lookups, saving 100–300ms on affected endpoints. Free tier available; paid plans for higher throughput.

---

### Database Connection Pooling (PgBouncer / Supabase pooler)

Each serverless function invocation opens a new DB connection. With enough concurrent users, this creates connection pressure on Postgres. Supabase offers a built-in PgBouncer pooler with two modes:

- **Session pooler** (port 5432 on `pooler.supabase.com`) — holds a connection for the full session. Supports prepared statements, so Prisma migrations work.
- **Transaction pooler** (port 6543 on `pooler.supabase.com`) — returns connections after each transaction. More efficient for serverless, but does NOT support prepared statements — `prisma migrate` will fail through this port.

**Current state**: The app uses the **session pooler** (port 5432 on `pooler.supabase.com`). We previously tried the transaction pooler (6543) but switched back because Prisma migrations require prepared statements.

**How to use transaction pooler without breaking migrations**: Prisma supports a `directUrl` for migrations separate from the runtime connection:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // transaction pooler (6543) — used at runtime
  directUrl = env("DIRECT_URL")         // direct connection (5432) — used by prisma migrate
}
```

```env
# Runtime — transaction pooler
DATABASE_URL="postgresql://...@aws-1-us-west-1.pooler.supabase.com:6543/postgres"

# Migrations only — direct connection
DIRECT_URL="postgresql://...@db.dxugcmykyidplpktbduo.supabase.co:5432/postgres"
```

**Note**: The direct connection (`db.xxx.supabase.co`) is not IPv4-compatible. Vercel is IPv4-only, so `DIRECT_URL` would only work from a local machine or an IPv6-capable CI environment. This is fine — migrations are typically run locally, not from Vercel.

**Realistic gain at current scale**: Minimal. The session pooler already eliminates connection setup overhead. Transaction pooler recycles connections faster under concurrent load, but at low traffic the difference is negligible. Worth revisiting if user count grows.

---

### Incremental Static Regeneration (ISR) for read-heavy pages

If parts of the app are ever made public or semi-public (e.g., shared meal plans, public recipes), Vercel's ISR can cache rendered pages at the edge for a configurable TTL and serve them without hitting the database at all. Not applicable to authenticated per-user data, but worth noting if the app scope expands.

---

### Server-Sent Events or WebSockets for live nutrition updates

Currently, adding a meal optimistically updates the UI and then re-fetches the plan to get the recalculated nutrition totals. A future option is to move the recalculation to a background job and push the result back to the client via SSE or WebSocket — eliminating the re-fetch entirely. This is significant engineering complexity for the current scale but would make multi-user household meal editing feel real-time.

---

## Stack-Ranked Next Steps

The remaining options that would meaningfully improve speed, in priority order:

### 1. Prisma Accelerate — query-level caching (recommended first)

The most practical next move. Directly targets the biggest remaining bottleneck: Supabase query latency on first load. Implementation is low-complexity — add the dependency, wrap slow queries with a `cacheStrategy` option specifying a TTL. No architectural changes needed.

Strong candidates for caching:
- Nutrition goals (rarely change — 5-minute TTL)
- Ingredient nutrient values (essentially static — hour+ TTL)
- Recipe details (change only on edit — `swr` strategy)

Meal logs and plan details would stay uncached (change frequently).

### 2. Edge Functions (highest ceiling, requires Accelerate first)

Moving API routes to the edge puts compute physically closer to the user (~10–50ms vs ~200–400ms for regional serverless). But edge functions can't use Prisma with standard connection pooling — they need Prisma Accelerate (or an HTTP-based DB driver) to talk to the database. So Accelerate is a prerequisite anyway, making this a natural second step.

Start with auth + simple lookups at the edge. Leave heavy endpoints (weekly nutrition recalc) on regional serverless.

### 3. SSE / WebSockets for live nutrition updates (most complex, narrowest benefit)

Only helps the specific case where a meal is added/deleted and the nutrition totals need to update. Currently handled with optimistic UI + background refetch, which already feels fast. Real-time push would only matter if multiple household members are editing the same meal plan simultaneously — not a current use case. Significant engineering complexity (background job infrastructure, persistent connections, reconnection handling). Revisit only if multi-user concurrent editing becomes a real need.

### Not prioritized

- **Transaction pooler** (port 6543): Already on the session pooler. The gain at current traffic is negligible. Revisit if connection pressure becomes an issue at scale.
- **ISR**: Doesn't apply — all pages are authenticated and per-user.

---

## Summary Table

| Issue | Status | Approach |
|---|---|---|
| Double Supabase auth per request | ✅ Fixed | Middleware passes user ID via header; API routes skip re-auth |
| Meal plans waterfall | ✅ Fixed | Merged load phases, parallel fetches |
| Full refetch on meal add/delete | ✅ Fixed | Optimistic local update + background refresh |
| Ingredients list over-fetching | ✅ Fixed | `slim=true` on list load |
| No session caching | ✅ Fixed | Module-level `clientCache` with cache-then-revalidate |
| Goals panels had no loading state | ✅ Fixed | `goalsLoading` state + skeleton bars + goal caching |
| Static skeleton loading UI | ✅ Fixed | `animate-loading` pulse animation |
| Toast layout jog | ✅ Fixed | Fixed-position toast system |
| DB latency on first load | ⚠️ Remaining | Inherent to Supabase over network |
| Cold starts | ⚠️ Remaining | Inherent to serverless |
| Edge-compatible auth | 🔭 Future | Prisma Accelerate + Edge Functions |
| Query-level caching | 🔭 Future | Prisma Accelerate cache strategies |
| Transaction pooler | 🔭 Future | Switch from session pooler (5432) to transaction pooler (6543) + `directUrl` for migrations |

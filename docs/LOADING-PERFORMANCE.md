# Loading Performance — Issues, Fixes & Future Options

## Architecture Context

The app runs on **Railway (US region)** with a **Railway PostgreSQL** database. Supabase handles auth only. Both the Next.js server and Postgres run on Railway, co-located in the same region — Prisma queries cost roughly **5–50ms per round-trip** rather than the 50–200ms of cross-cloud setups.

The dominant cost is therefore **not** raw query latency. It's two things:

1. **Cold starts.** Railway sleeps the app after a period of inactivity. First-request-after-idle pays for the Node server warming, Prisma connecting, and the JIT path. That's 1–3 seconds before any code runs.
2. **The weekly nutrition recalculation.** `GET /api/meal-plans/[id]` aggregates every meal log across all 7 days and applies per-nutrient goal statuses. On a full week it's the heaviest endpoint in the app, and it runs every time the planner or dashboard opens (because both render today's nutrition from a full-week aggregate).

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

## Session — June 2026

### 9. Home page never read from clientCache for plan details

**The problem**
`/home` wrote the week's plan detail to `clientCache` after fetching it, but never *read* from it on subsequent visits. Every dashboard load fired a fresh full-week nutrition aggregation — the heaviest endpoint in the app — even though the data was already in memory.

**The fix**
Restructured the home load path to use the same cache-then-revalidate pattern the planner uses. On mount: if cached, paint immediately and clear the loading state; then fetch fresh in the background and update when it arrives. The dashboard now feels instant on the second+ visit of any session.

---

### 10. Hover-prefetch on top nav

**The problem**
By the time a user clicked Planner, the round-trip to fetch the plan list + plan detail hadn't started yet. ~500ms of dead time before anything appeared.

**The fix**
Added an `onMouseEnter` handler on top nav links (Planner, Recipes, Pantry) and the brand wordmark (home). On hover, the destination page's primary data fetch fires immediately and stashes the result in `clientCache`. The user typically takes 100–300ms to move from hover to click — by the time they actually click, the data is often already cached. The page reads from cache and renders instantly.

A `prefetched` Set guards against repeated fetches on the same hover, and resets on fetch failure so retries are possible.

---

### 11. `/api/warm` keep-alive endpoint

**The problem**
Railway sleeps the app after a period of inactivity. The first request after idle pays for Node warming + Prisma reconnecting + JIT — 1–3 seconds before any code runs. Existing `/api/health` proves the Node server is up, but doesn't warm the Prisma pool or the database connection.

**The fix**
New `/api/warm` route that runs `prisma.$queryRaw\`SELECT 1\`` and returns. Hitting this every few minutes keeps the Node server, Prisma client, and DB connection all warm. Endpoint is whitelisted in `proxy.ts` so it doesn't require auth.

**To activate the warm-up loop**, point any external uptime service at `https://withgoodmeasure.com/api/warm` with a 5-minute interval. Free options:
- [Cron-job.org](https://cron-job.org) — simplest, free, web UI
- [UptimeRobot](https://uptimerobot.com) — free tier covers 50 monitors at 5-min intervals
- [BetterStack](https://betterstack.com) — free tier with 10 monitors at 3-min intervals

Cost: $0. Wall-clock impact: app never goes cold, so the first request always feels like a warm request.

---

## What Still Limits Speed

Even with all the above in place, the heaviest single endpoint is still **the weekly nutrition recalculation** (`GET /api/meal-plans/[id]`). It aggregates all meal logs across all 7 days, joins recipes + recipe ingredients + nutrient values, and applies per-nutrient goal statuses. This runs the first time the planner or dashboard opens — `clientCache` hides it on subsequent visits, but the first hit of any session pays for it.

The other limit is the **shell-first render** opportunity: both the planner and dashboard wait for data before showing anything. Rendering the structural shell immediately (empty matrix grid with day labels, empty stats strip, etc.) and streaming data in would make the page *feel* instant even when the data still takes the same time. Not done yet — flagged as a future option below.

---

## Future Options (Railway-specific)

### 1. Denormalize the weekly nutrition totals (highest impact)

The nutrition aggregation is recomputed on every plan detail read, but the totals only change when meals are added, edited, or removed. Storing the computed totals on `MealPlan` (or in a sidecar table) and recomputing on meal write would eliminate the aggregation entirely on read.

**Implementation sketch:**
- Add a `weeklyTotalsJson` column to `MealPlan` (or a `MealPlanTotals` table keyed by `planId`)
- Compute and store in the POST/PATCH/DELETE handlers for meal logs (the same `withAuth` wrappers that own writes)
- Plan detail read returns the stored totals; no aggregation needed
- Background recompute job for safety / data drift

**Realistic gain:** the planner/dashboard first-load drops from 400–800ms to under 100ms for the network round-trip, since the read becomes a simple `findUnique`. This is the biggest remaining structural win.

**Cost:** non-trivial. Need to be careful about all paths that mutate meal logs (write API + MCP write API + bulk day-template apply). A missing path means stale totals.

---

### 2. Shell-first render on planner + dashboard

Both pages currently show a spinner / "Loading…" line until plan data arrives. Replace with a skeleton render of the actual layout — empty matrix grid with day numbers and slot rows on the planner; empty stats strip and "Today's meals" placeholders on the dashboard. The user sees structure in <100ms and the data fades in when it arrives.

**Cost:** moderate. The planner matrix is data-derived (slot order comes from the plan); the skeleton needs default slot rows (Breakfast/Lunch/Dinner) and the week's days computed from `today` without needing the plan.

---

### 3. Background recompute for day templates

Applying a day template inserts up to a dozen meal logs in sequence and then triggers a full nutrition refresh. This is the slowest mutation in the app. With #1 (denormalized totals) in place, this becomes "insert + recompute totals" rather than "insert + re-aggregate on every read forever."

---

### 4. Server-side response caching for nutrient lookups

`Nutrient` rows essentially never change (17 rows). Caching them in-process per server instance (a simple module-level cache invalidated on Nutrient table writes — which never happen in normal operation) would eliminate one DB query from every meal plan read.

**Realistic gain:** ~20–50ms per plan read.

---

### 5. Skip the home page's redundant data

`/home` reads the entire week's meal plan to extract one day's data. The plan detail endpoint could accept a `?day=YYYY-MM-DD` filter to return only today's nutrition. The dashboard would load faster *and* the plan detail would be cheaper to compute.

**Cost:** small. Add a query param, branch the aggregation, keep backward compatibility.

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
| Home page never read from clientCache | ✅ Fixed | Cache-then-revalidate pattern on `/home` |
| Hover-prefetch on nav | ✅ Fixed | Nav links prefetch destination data on hover |
| Cold start after Railway idle | ⚠️ Fixed (requires external cron) | `/api/warm` route + external uptime ping |
| Weekly nutrition recalc on every read | 🔭 Future | Denormalize totals on `MealPlan` |
| Shell-first render | 🔭 Future | Skeleton matrix + skeleton stats on initial load |
| Day template apply slow | 🔭 Future | Depends on denormalized totals |

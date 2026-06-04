---
name: Good Measure — App Overview
description: Comprehensive reference for what the app is, how it works, tech stack, architecture, and key features
type: project
originSessionId: ad1ae207-1b83-4671-b90f-649becb3d102
---
# Good Measure

A hosted, multi-user nutrition tracking and meal planning web app. Built as a daily personal tool and a portfolio project. Live at **withgoodmeasure.com**. Auto-deploys on push to `main`.

---

## What it does

Users build a household (multiple people with shared ingredients and recipes), track nutrition live as they build recipes, and plan weekly meals per person. An AI workflow (via Claude Desktop + MCP) lets users get swap suggestions, plan whole days, and execute meal-plan changes directly — without any in-app API cost.

**Five top-level areas:**
1. **Dashboard** — today's nutrition snapshot, this week's plan at a glance. Stats are configurable per-person.
2. **Planner** — matrix view at `/planner` is the primary route (7-day × N-slot grid per person with daily totals and templates). The classic weekly grid still exists at `/meal-plans` but is unlinked from nav and scheduled for retirement.
3. **Recipes** — import via URL or .md file, build from scratch, nutrition calculates live, compare mode (up to 5 recipes side-by-side; desktop/iPad only).
4. **Pantry** — ingredient library shared across the household. New households are seeded with 110 USDA-sourced staples on onboarding completion. Bulk delete + favorites + a Settings-side bulk-fill tool for missing nutrient data.
5. **Settings** — people, daily goals, dashboard stats, MCP integration, data import/export, and a "Fill missing nutrient data" tool under §05 Data for editing any nutrient across the whole pantry at once.

Optimization and meal prep tools live inside Recipe Detail as the §04 and §05 sections of the page, not as a top-level area. **Day templates** (save a day's meals as a reusable template, then apply to any future day in replace or append mode with smart-merge) are part of the matrix planner.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Hosting | Railway — push to `main` auto-deploys |
| Database | Railway Postgres via Prisma (~20 models, fully normalized — Household, Person, Ingredient, Recipe, RecipeIngredient, MealPlan, MealLog, Nutrient, IngredientNutrient, GlobalNutritionGoal, NutritionGoal, HouseholdMember, HouseholdInvite, GlobalIngredient, GlobalIngredientNutrient, UsdaFoodCache, RecipeFavorite, IngredientFavorite, DayTemplate, DayTemplateItem, Waitlist, SystemSetting) |
| Auth | Supabase Auth — email/password + Google OAuth. Middleware validates session and injects `x-supabase-user-id` header. Apple Sign-In will be added before App Store submission. |
| AI | MCP-based — Claude Desktop + `good-measure-mcp` npm package (v1.4.x). **Read tools** (list_recipes, get_recipe, list_meal_plans, get_meal_plan_week, list_ingredients, list_people, get_person_goals, list_day_templates) **and write tools** (save_recipe, add_meal, update_meal, remove_meal, swap_meal, save_day_template, apply_day_template, save_optimization_notes, save_meal_prep_notes). No in-app AI API calls. |
| Offline | Service worker (`public/sw.js`) caches pages, API GETs, static assets, and images. `OfflinePrefetcher` warms the cache on app load (lists + current week's plan + every recipe in it + favorites). Mutations remain network-only and fail loudly when offline. |
| PWA | Manifest at `public/manifest.json`; installable on Mac, iPhone, iPad. Combined with the service worker, the PWA install is the recommended path for the best offline experience. |
| Styling | Custom CSS design system (no Tailwind for layout) — see design-system.md |

---

## Architecture

### Data model highlights
- `Household` — top-level container; every user belongs to one
- `Person` — multiple people per household (e.g. Jen + Garth). Each has independent meal plans, nutrition goals, dashboard stats, and dismissed tips
- `Ingredient`, `Recipe`, `RecipeIngredient` — shared across the household (no `personId`)
- `Nutrient`, `IngredientNutrient` — polymorphic key-value (lets us add nutrients like `addedSugar` without a schema change)
- `MealPlan`, `MealLog` — per-person. `MealLog` (not `MealPlanEntry`) is the actual meal-entry row.
- `GlobalNutritionGoal`, `NutritionGoal` — per-person daily targets (global = default, NutritionGoal = per-plan override)
- `HouseholdMember`, `HouseholdInvite` — invite system
- `RecipeFavorite`, `IngredientFavorite` — per-person favorites
- `DayTemplate`, `DayTemplateItem` — saved-day-pattern feature, household-scoped with optional `personId` attribution
- `GlobalIngredient`, `GlobalIngredientNutrient` — the curated starter-pantry source; copied into household `Ingredient` on signup
- `UsdaFoodCache` — shared nutrition cache for the USDA FoodData Central API responses
- `Waitlist`, `SystemSetting` — admin tables for pre-launch ops

### Auth flow
- Middleware (`proxy.ts` at project root — named proxy.ts, not middleware.ts) checks the Supabase session cookie on every request
- Sets `x-supabase-user-id` header for downstream API routes
- New users hit `/onboarding`; returning users go to `/`
- `app/auth/callback/route.ts` handles the OAuth callback and the onboarding flag

### API structure
- `/api/*` — standard app API routes (Supabase cookie auth)
- `/api/mcp/*` — MCP tool endpoints (Bearer token auth, separate from app auth)

### Layout system
- **Index pages** (Dashboard, Planner, Recipes, Pantry) break to full viewport width — no max-width container
- **Forms, detail pages, settings, auth, onboarding** stay in 1100px max-width centered with 64px horizontal padding
- Mobile: 5-tab bottom nav, bottom sheets for actions, FAB on list pages
- `<main overflow-hidden>` — pages manage their own scroll panes
- Sheets and modals that overlay the bottom nav MUST use `createPortal(el, document.body)`

The old three-pane layout (220px list / flex-1 detail / 300px context) was removed during the editorial migration. Any references to it elsewhere are stale.

---

## Access control

**Currently invite-only.** Two entry paths:

1. **Invite code** — `/invite` page. User enters a shared code (`INVITE_CODE` env var) in step 1. If valid, step 2 shows the full signup form (name, email, password, confirm password, or Continue with Google). Code is validated server-side only via `POST /api/invite/validate` — never exposed to the browser. Case-insensitive comparison.

2. **Household invite link** — existing member generates a token-based link from Settings → People. Link goes to `/login?invite=<token>`, which switches the login page into signup mode. No invite code required — the token is the auth mechanism.

**Waitlist** — public visitors without a code go to `/waitlist` (name + email). Entries saved to the `Waitlist` table. Viewable at `/admin/waitlist` (password-gated via `ADMIN_PASSWORD` env var).

**`/login`** — sign-in only. No Create Account tab. Household invite links still trigger signup mode via `?invite=` param.

**Opening to the public** — see `auth_and_access.md` for the full checklist. Short version: restore the archived tabbed login (`briefs/_archived/login-page-tabbed.tsx`), remove the invite gate, swap landing CTAs from waitlist to sign-up.

---

## Account deletion

Settings → §06 Account → "Delete account" → confirmation dialog → immediate permanent deletion.

- **Scoped to the logged-in user only** — the person chip (UI state) has no effect. `DELETE /api/account` resolves identity from the Supabase JWT via `getAuthenticatedHousehold()`.
- **What gets deleted:** person profile, nutrition goals, meal plans, meal logs, Supabase auth account.
- **Sole-member households:** all household data (recipes, ingredients, the household itself) is also deleted.
- **Multi-member households:** recipes and pantry items remain — they are household-scoped, not person-scoped.
- **Recovery:** none. Immediate hard delete. Acceptable for a friends-and-family app.

Full decision documented in `decisions-pending.md`.

---

## Multi-person household

Fully implemented. One household can have multiple people.

- **Shared:** Ingredients, Recipes, RecipeIngredient, UsedaIngredientCache
- **Per-person:** MealPlan, MealPlanEntry, GlobalNutritionGoal
- **Person switcher** in TopNav (right side) — scopes goals and plans to selected person
- **"Everyone" view** in Planner — side-by-side columns per person; horizontal scroll for 3+ people
- **Person themes** — 8 curated named themes (coral, terra, sage, forest, steel, cerulean, plum, slate) in `lib/themes.ts`. Each person's theme drives both the avatar dot color and the full app skin via CSS variables. Stored as `Person.theme`; hex derived via `themeHex()` on every save

---

## AI / MCP workflow

Not an in-app API call. Users run Claude Desktop with `good-measure-mcp` installed.

**MCP tools:** `get_recipe`, `save_recipe`, `list_recipes`, `search_ingredients`, `save_optimization_notes`, `save_meal_prep_notes`

**Auth:** Bearer token generated in Settings → MCP tab. Validated on `/api/mcp/*` routes.

**Package:** Published to npm as `good-measure-mcp` (v1.0.9). Published via GitHub Actions OIDC trusted publishing.

See `ai_analysis.md` for full workflow details.

---

## Key feature details

### Recipe import
- URL import: Schema.org JSON-LD extraction (no AI), parses name, servings, ingredients, image, instructions
- .md file import: Pestle-format markdown
- Inline create: build from scratch in the recipe form
- Unmatched ingredients flagged with "Add to library" → opens USDA search inline
- Matcher in `lib/ingredientMatcher.ts` handles prep-adjective stopwords (raw, dried, etc.), bidirectional substring containment, and plural singularization so recipe text matches cleanly against the seeded pantry names

### Recipe images
- URL import extracts from Schema.org
- Manual: URL paste or file upload (base64 stored)
- MCP: `copyImageFromRecipeId` inherits image from the source recipe on optimized versions

### Nutrition guidance in recipe builder
- Toggle enables live per-serving bars vs. daily goals
- Person picker + focus nutrient chips
- Custom cap override per nutrient
- Top Contributors: shows which ingredients are causing overages

### Onboarding (3 layers)
- **Layer 1:** Wizard at `/onboarding` for new users (welcome + 3 content steps + complete screen). Full-width topbar with wordmark left and step label right (`WELCOME` / `STEP · 01 / 03` / `READY`). No `§ ONBOARDING` label — removed as redundant. See `onboarding.md` for structure detail; trust current code if conflicts.
- **Layer 2:** Getting Started checklist on the dashboard. Tasks auto-complete from server state (recipes, ingredients, goals, etc.); dismissed per person server-side via `dismissTip()` in PersonContext.
- **Layer 3:** Contextual tips on key pages, also dismissed per person server-side.

### Shopping list
- Grouped by ingredient category (15 categories)
- Per-category select-all, share to clipboard
- Renders via portal above the bottom nav

### Day templates
- Save the meals on any (planId, date) as a reusable template via the day-column ⋯ menu
- Apply to any future day in **replace** or **append** mode. Append uses smart-merge: items matching (recipeId + mealType) for recipes or (ingredientId + mealType + unit) for ingredients sum into existing meal logs instead of stacking
- Manage sheet: rename, drag-reorder, delete, search; personId attribution chips
- Snapshot endpoint (`PUT /api/day-templates/[id]/snapshot`) supports "save over" — replacing a template's items from the current day without changing its id or name
- Mirrored to MCP write tools (`save_day_template`, `apply_day_template`, `list_day_templates`)

### Added Sugar tracking
- New `addedSugar` Nutrient row (id 17, orderIndex 6 between Sugar and Protein). Polymorphic schema; no migration was needed
- Null-poisoning aggregation: recipe per-serving and matrix daily totals render `—` (not `0g`) when any contributing ingredient lacks an addedSugar value
- USDA whole-food whitelist in `lib/usdaAddedSugar.ts` defaults raw produce / meats / oils / grains to 0; everything else stays null until manually filled
- Onboarding presets (Maintain / Lean / Build) all default `addedSugarHighGoal: 25g`
- Settings → Daily Goals editor includes Added Sugar. Dashboard stat selector and Recipe Compare both include it.

### Offline support
- Service worker (`public/sw.js`) installs on first production load. Strategies: pages and API GETs network-first with cache fallback; static assets and images cache-first; mutations network-only.
- `OfflinePrefetcher.tsx` runs ~3s after app mount and pulls list endpoints + this week's plan detail + each recipe in the current week + up to 20 favorited recipes. Result: opening the app at home before leaving means everything you need at the grocery store is already cached.
- `ServiceWorkerRegister.tsx` renders a flow-positioned "OFFLINE" banner at the top of `.app-shell` based on a 20s `/api/health` ping (more reliable than `navigator.onLine` on iOS Safari).
- `app/offline/page.tsx` is the pre-cached static fallback shown when navigating to a route that hasn't been visited yet this session.

---

## Deployment & config

- **Railway** — push to `main` auto-deploys
- **Environment vars:** `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`, `INVITE_CODE` (shared invite code), `ADMIN_PASSWORD` (waitlist admin page). Values in project memory `project_env_vars.md`.
- **AI_PROVIDER:** set to `mock` (default) or `anthropic` + `AI_API_KEY` for live AI. Currently the MCP workflow is the active integration; the in-app AI route is stubbed
- **SEO/OG/favicon:** all config in `lib/seo.ts`. Favicon: `app/icon.tsx`. OG card: `app/opengraph-image.tsx`

---

## Remaining before public launch

- **Brand mark.** Frameless two-tick placeholder is in place. Swap when ready (touches nav, auth, onboarding, favicon, OG card)
- **Row Level Security** (Supabase RLS — see `rls_plan.md`)
- **Auth hardening** — confirm-password field shipped via Brief 14; CAPTCHA still pending
- **Update Supabase transactional emails** with branding
- **Custom domain finalization** — `withgoodmeasure.com` is live; see `rename_url_guide.md` for any remaining references that point to the old URL
- **Open to the public** — remove invite gate, restore tabbed login, swap landing CTAs. Full checklist in `auth_and_access.md`.

---

## Design system

See `design-system.md` — source of truth for typography, color, layout, shape, components, animations, and accessibility.

Key tokens:
- Surfaces: `--bg`, `--bg-2`, `--bg-3`
- Foreground: `--fg`, `--fg-2`, `--muted`, `--rule`
- Accent (theme-reactive, sage default): `--accent`, `--accent-l`
- Status: `--ok`, `--err`, `--warn` (each with `-l` tinted variant)
- Fonts: `--font-sans` (DM Sans), `--font-mono` (DM Mono). Two typefaces only — no display font, no serif
- Type scale: 9 / 11 / 13 / 16 / 20 / 28 / 36px (7 stops, no others)
- Layout: `--nav-h: 50px`, `--pad: 40px`

# Course — Dev Notes

## What's been built

### Auth & multi-tenancy
- Supabase auth (email/password) on `/login`
- `lib/auth.ts` — `getAuthenticatedHousehold()` returns `{ personId, householdId, role }` or `{ error, status }`
- Middleware sets `x-supabase-user-id` header — API routes skip re-auth (one fewer Supabase round-trip per request)
- All data queries scoped to `householdId` — ingredients, recipes, meal plans, goals, settings, API logs
- `Person` model stores `supabaseId` + `email` for auth lookup
- `Household` + `HouseholdMember` models; one active household per person
- `HouseholdInvite` model with token-based invite flow (token generated, not yet surfaced in UI)
- Auth callback (`app/auth/callback/route.ts`) auto-provisions Person + Household on first login

### Data model (Prisma / Postgres via Supabase)
- `Ingredient` — name, defaultUnit, optional custom unit (name/amount/grams), USDA fdcId, `isMealItem` flag
- `IngredientNutrient` — per-ingredient nutrient values (per 100g)
- `Recipe` — name, servings, instructions; linked to ingredients via `RecipeIngredient`
- `MealPlan` — week-scoped (weekStartDate), per-person, per-household
- `MealLog` — individual meal entries within a plan (day, meal type, ingredient or recipe, amount)
- `NutritionGoal` — low/high targets per nutrient per meal plan
- `GlobalNutritionGoal` — per-person default targets
- `Nutrient` — shared lookup table (not household-scoped)
- `SystemSetting` — household-scoped key/value store (API key, MCP token)
- `ApiUsageLog` — tracks AI API calls per household
- `UsdaSearchCache` / `UsdaFoodCache` — shared USDA fetch cache

### Pages & features
- **Ingredients** — list/search sidebar, detail panel with nutrition facts, create/edit/delete, USDA lookup with 500ms debounce, bulk import
- **Recipes** — list sidebar, detail view, recipe builder (add/edit ingredients with amounts), duplicate, AI analyze
- **Meal Plans** — week view per person, add/remove meals, nutrition summary panel, duplicate plan, edit/delete mode, multi-person household view
- **Dashboard** — week-at-a-glance summary
- **Settings** — Household, Invites, AI & API (OpenAI key), Data (export/import), MCP (token + setup instructions)
- **Person switcher** — TopNav shows household members; selecting a person filters meal plans and goals; selection persists via localStorage

### UI system
- Design tokens via CSS variables (`--fg`, `--bg`, `--accent`, `--muted`, `--rule`, `--error`, etc.)
- Fonts: DM Sans (body), DM Serif Display (headings), DM Mono (labels/data)
- `lib/toast.ts` — module-level toast emitter; `Toaster.tsx` renders a 2px line sweep below the nav (success = green, error = red sweep + bottom status bar with message text)
- `lib/dialog.ts` — module-level async confirm dialog; `app/components/ConfirmModal.tsx` renders styled modal
- No `alert()` or `confirm()` anywhere — all replaced with toast/dialog system
- `NumberInputHandler` — global scroll-prevention on number inputs
- Scrollbars hidden globally (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`)

### Performance
- `GET /api/recipes` list endpoint uses shallow include (no deep nutrient joins)
- `GET /api/ingredients?slim=true` omits nutrientValues for list views
- `POST /api/meal-plans` uses `createMany` for nutrition goals (single DB round-trip)
- Module-level `clientCache` (`lib/clientCache.ts`) — session-scoped Map that persists across component mount/unmount
  - Cache-first for rarely-changing data (recipes, ingredients, goals)
  - Cache-then-revalidate for dynamic data (meal plan details)
  - Surgical `clientCache.set()` updates on mutation — never `invalidate()` — navigation stays instant post-save
- Vercel deployed in SFO1 (San Francisco) to colocate with Supabase us-west-1 DB
- Optimistic UI on meal add/delete — appears instantly, nutrition totals sync in background
- Merged meal plan load phases — plan list and first detail fetch run in the same async chain

### MCP server
- Lives in `mcp/` folder — Node.js stdio server exposing recipe tools to AI assistants
- Token-auth via `COURSE_API_TOKEN` env var; token managed in Settings → MCP

---

## What's left to do

### Multi-tenancy — invite flow UI
The schema and backend exist but the UI isn't wired up yet:
- Settings → Invites tab: generate an invite link, show active members, revoke access
- Login page: detect `?invite=<token>` in URL, store in cookie, show join banner
- OAuth flow needs to pass invite token through redirect URL
- `POST /api/households/invite`, `POST /api/households/switch`, `GET /api/households` routes to be created
- Household name display in TopNav

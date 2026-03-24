# Course — Dev Notes

## What's been built

### Auth & multi-tenancy
- Supabase auth (email + Google OAuth) on `/login`
- `lib/auth.ts` — `getAuthenticatedHousehold()` returns `{ personId, householdId, role }` or `{ error, status }`
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
- **Meal Plans** — week view per person, add/remove meals, nutrition summary panel, duplicate plan, edit/delete mode
- **Settings** — Household, Invites, AI & API (OpenAI key), Data (export/import), MCP (token + setup instructions)
- **Person switcher** — TopNav shows household members; selecting a person filters meal plans and goals

### UI system
- Design tokens via CSS variables (`--fg`, `--bg`, `--accent`, `--muted`, `--rule`, `--error`, etc.)
- Font: mono (`font-mono`) throughout; `text-[9px]` section labels, `text-[11px]` body, `text-[12px]` inputs
- `lib/toast.ts` — module-level toast emitter; `app/components/Toaster.tsx` renders bottom-right toasts
- `lib/dialog.ts` — module-level async confirm dialog; `app/components/ConfirmModal.tsx` renders styled modal
- No `alert()` or `confirm()` anywhere — all replaced with toast/dialog system
- `NumberInputHandler` — global scroll-prevention on number inputs

### Performance
- `GET /api/recipes` list endpoint uses shallow include (no deep nutrient joins)
- `GET /api/ingredients?slim=true` omits nutrientValues for pages that don't need them
- `POST /api/meal-plans` uses `createMany` for nutrition goals (single DB round-trip)

### MCP server
- Lives in `mcp/` folder — Node.js stdio server exposing recipe tools to AI assistants
- Token-auth via `COURSE_API_TOKEN` env var; token managed in Settings → MCP

---

## What's left to do

### Multi-tenancy — invite flow UI
The schema and API routes exist but the UI isn't wired up yet:
- Settings → Invites tab: generate an invite link, show active members, revoke access
- Login page: detect `?invite=<token>` in URL, store in cookie, show join banner
- OAuth flow needs to pass invite token through redirect URL
- `POST /api/households/invite`, `POST /api/households/switch`, `GET /api/households` routes need to be created/verified
- Household name display in TopNav

### Meal plans
- Nutrition summary panel: currently shows raw numbers; could show progress bars vs goals
- "Copy from previous week" flow works but UX is minimal
- No mobile layout

### Ingredients
- Edit form doesn't currently allow changing nutrient values inline (have to delete and recreate)
- No way to merge duplicate ingredients

### Recipes
- AI analyze uses OpenAI — prompt could be tuned
- No tagging or categorization

### Settings
- Data export/import is basic — no validation on import
- No way to rename the household

### General
- No tests (jest/vitest setup exists but coverage is ~0%)
- No mobile/responsive layout anywhere
- No dark mode (CSS vars are set up for it but no toggle)
- Error boundaries — unhandled fetch errors surface as blank panels in some places

---
name: Recipe optimization and meal prep workflow
description: MCP-based workflow for recipe optimization and meal prep — Claude Desktop + good-measure-mcp
type: project
---

**Current architecture: MCP + Claude Desktop** — Not an in-app AI call. Users run Claude Desktop with the `good-measure-mcp` npm package installed, which gives Claude tools to read/write recipes directly in the app DB via Bearer token auth.

**MCP tools available:**
- `get_recipe` — fetches recipe with ingredients (including section headers), nutrition totals, image status; hints to use `copyImageFromRecipeId` when image present
- `save_recipe` — creates recipe with full ingredient list + sections; `copyImageFromRecipeId` copies image from original recipe (used for optimized versions); warns on stub (unmatched) ingredients
- `save_optimization_notes` — writes markdown to `optimizeAnalysis` field on Recipe via `/api/mcp/recipes/[id]` PUT
- `save_meal_prep_notes` — writes markdown to `mealPrepAnalysis` field on Recipe via `/api/mcp/recipes/[id]` PUT
- `list_recipes`, `search_ingredients` — browsing tools

**Auth:** Bearer token via `/api/mcp/` routes — distinct from Supabase cookie auth on `/api/` routes. Users generate a token in Settings → MCP tab.

**Optimization workflow:**
1. User opens recipe Optimize tab — sees pre-filled prompt template (recipe name auto-filled)
2. User copies prompt, pastes into Claude Desktop
3. Claude uses `get_recipe`, analyzes nutrition gaps, proposes swaps
4. Claude saves optimized recipe via `save_recipe` with `copyImageFromRecipeId` to inherit image
5. Claude calls `save_optimization_notes` with markdown result
5. App renders markdown in Optimize tab using `.prose-notes` CSS class (DM Sans/DM Mono font stack)

**Meal Prep workflow:**
1. User opens Meal Prep tab — sees pre-filled prompt template
2. Same copy → Claude Desktop → `save_meal_prep_notes` flow
3. Prompt requests: component breakdown, reheating instructions per component, batch quantities with scaling, this-week vs freeze-for-later guidance, day-by-day plan, storage summary
4. Result renders as markdown in Meal Prep tab

**Prompts are AI-agnostic** — "any MCP-connected AI assistant" language, not Claude-specific.

**Notes render as markdown** — `.prose-notes` CSS class in `globals.css`. Uses `var(--sans)`, `var(--mono)`, `var(--display-font)`. NOT serif.

**Stub ingredient warnings:** When `save_recipe` creates an ingredient that doesn't match the DB, it's flagged as a `stubIngredient`. The MCP tool returns a warning listing stub names. User should check these and link to real ingredients or add via USDA.

**MCP package:** Published to npm as `good-measure-mcp` (v1.0.9). Published via GitHub Actions OIDC trusted publishing — push tag `mcp-vX.Y.Z` to trigger. No expiring npm token needed.

**Algorithmic analysis (no AI cost):**
- `SmartSuggestionsPanel` — swap suggestions, fill-gap candidates at the meal plan level
- `DailySummary` — calorie/nutrient tracking per day
- `lib/smartMealAnalysis.ts` — pure functions for over/under budget detection
- `GET /api/meal-plans/[id]/day-analysis` — server-side algorithmic day-level analysis

**Old API route:** `POST /api/recipes/[id]/analyze` still exists in code with mock mode infrastructure (`AI_PROVIDER=mock`). Not used in the current workflow. Not exposed in UI.

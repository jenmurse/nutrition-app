---
name: Recipe optimization and meal prep workflow
description: MCP-based workflow for recipe optimization and meal prep — Claude Desktop + good-measure-mcp
type: project
---

**Current architecture: MCP + Claude Desktop** — Not an in-app AI call. Users run Claude Desktop with the `good-measure-mcp` npm package installed, which gives Claude tools to read/write recipes directly in the app DB via Bearer token auth.

**MCP tools available (v1.4.x):**

*Read tools:*
- `list_recipes`, `get_recipe` — recipe browsing + full detail with ingredients, nutrition, image status
- `list_ingredients`, `search_ingredients` — pantry browsing
- `list_people`, `get_person_goals` — household + goal access
- `list_meal_plans`, `get_meal_plan_week` — meal-plan browsing; week view returns days with mealLogIds, recipes, and per-day nutrition totals
- `list_day_templates` — day-template browsing (optional `person_id` filter)

*Write tools:*
- `save_recipe` — creates recipe with full ingredient list + sections; `copyImageFromRecipeId` copies image from original recipe; warns on stub (unmatched) ingredients
- `add_meal`, `update_meal`, `remove_meal`, `swap_meal` — meal-log operations on a specific meal plan
- `save_day_template`, `apply_day_template` — snapshot a day → reuse it elsewhere (replace or append mode; append smart-merges)
- `save_optimization_notes`, `save_meal_prep_notes` — markdown to `optimizeAnalysis` / `mealPrepAnalysis` fields on Recipe

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

**MCP package:** Published to npm as `good-measure-mcp` (v1.4.1 as of June 2026). Versioning bumps `mcp/package.json` + the `McpServer({ version })` literal in `mcp/src/index.ts`. Publishing flow: see `reference_npm_publish_mcp.md` in memory. **GH Actions OIDC trusted publishing currently 404s on the publish step** despite the Trusted Publisher config being correct (npm side issue, not a workflow bug); the working path is manual `npm login` + `npm publish --access public` from `mcp/`. After publishing, the Claude Desktop config (pinned to `@latest`) picks up the new version on next restart.

**Algorithmic analysis (no AI cost):**
- `lib/smartMealAnalysis.ts` — pure functions for over/under budget detection
- `GET /api/meal-plans/[id]/day-analysis` — server-side algorithmic day-level analysis

**Old API route:** `POST /api/recipes/[id]/analyze` still exists in code with mock mode infrastructure (`AI_PROVIDER=mock`). Not used in the current workflow. Not exposed in UI.

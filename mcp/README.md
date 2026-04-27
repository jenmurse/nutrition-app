# good-measure-mcp

MCP server for [Good Measure](https://www.withgoodmeasure.com) — connect any MCP-compatible AI assistant to your Good Measure household so it can read recipes, analyze nutrition, and save changes back automatically.

## Requirements

- A [Good Measure](https://www.withgoodmeasure.com) account
- An MCP-compatible AI assistant (Claude Desktop, Cursor, etc.)
- Node.js 18+

## Setup

### 1. Generate an API token

In Good Measure, go to **Settings → 04 MCP Integration** and generate a token. Keep it private — it gives full access to your household's recipes and pantry.

### 2. Add to your AI assistant config

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "good-measure": {
      "command": "npx",
      "args": ["-y", "good-measure-mcp"],
      "env": {
        "GOOD_MEASURE_API_URL": "https://www.withgoodmeasure.com",
        "GOOD_MEASURE_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Cursor** — add the same block to your MCP settings JSON.

### 3. Restart your AI assistant

The server connects automatically. You can now ask your AI to list your recipes, analyze nutrition, optimize ingredients, and save changes back.

## Available tools

| Tool | Description |
|------|-------------|
| `list_recipes` | List all recipes in your household |
| `get_recipe` | Get full details for a single recipe including nutrition |
| `save_recipe` | Create or save a recipe to Good Measure |
| `search_ingredients` | Search your pantry by name |
| `list_ingredients` | List all ingredients in your pantry |
| `save_optimization_notes` | Save AI optimization analysis to a recipe |
| `save_meal_prep_notes` | Save meal prep notes to a recipe |
| `list_people` | List people in your household |
| `get_person_goals` | Get a person's global nutrition goals |
| `list_meal_plans` | List meal plans (filter by person or week) |
| `get_meal_plan_week` | Get a meal plan's full week + daily nutrition totals vs. goals |

## Example prompts

```
Use get_recipe with id 42 to fetch my Thai Green Curry.
Analyze it for nutritional optimization — suggest substitutions to increase protein and reduce saturated fat.
Once I approve, save the optimized version and your analysis notes.
```

```
Use get_recipe with id 15 to get my Overnight Oats recipe.
Give me a full meal prep breakdown with batch cooking recommendations and a day-by-day plan.
```

## Security

Your API token is only valid for your household. Store it in your AI assistant's environment config, not in code or version control. You can revoke and regenerate tokens at any time in Good Measure Settings.

## Publishing (maintainers)

### Normal release flow

1. Bump `version` in `mcp/package.json` (and the `server.version` arg in `mcp/src/index.ts` if you want the handshake string to match).
2. Commit the bump.
3. Tag the commit `mcp-vX.Y.Z` and push the tag:
   ```bash
   git tag mcp-v1.3.1
   git push origin mcp-v1.3.1
   ```
4. The `Publish MCP to npm` GitHub Action (`.github/workflows/publish-mcp.yml`) runs on tags matching `mcp-v*` and publishes to npm with `--provenance`.

### If publish fails with `EOTP` (2FA required)

npm is requiring a one-time password for the publish — a plain automation token can't satisfy it. Pick one:

**Fix A — quick band-aid (disable package 2FA requirement)**
1. npmjs.com → package [`good-measure-mcp`](https://www.npmjs.com/package/good-measure-mcp) → **Settings**
2. **Require Two-Factor Authentication** → set to **Don't require 2FA** (or "Authorization only")
3. Re-run the failed workflow, or push a new tag.

**Fix B — permanent (OIDC trusted publishing, no token needed)**
1. npmjs.com → package `good-measure-mcp` → **Settings** → **Trusted Publishers** → **Add GitHub Actions publisher**:
   - Organization/user: `jenmurse`
   - Repository: `nutrition-app`
   - Workflow filename: `publish-mcp.yml`
   - Environment: *(leave blank)*
2. The workflow already has `permissions: id-token: write` and no `NODE_AUTH_TOKEN`, so npm will accept the OIDC token automatically on the next publish.
3. Once B is in place, the `NPM_TOKEN` repo secret becomes irrelevant and can be removed.

### If publish fails with 401 / 403 (only relevant without OIDC)

The `NPM_TOKEN` repo secret is missing or expired. On npmjs.com → **Access Tokens** → generate a **Granular** token scoped to the `good-measure-mcp` package with **Read and write** permission, then update the `NPM_TOKEN` secret under GitHub repo **Settings → Secrets and variables → Actions**. (Re-add `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` on the Publish step of `publish-mcp.yml` if it was removed for Fix B.)

## License

MIT

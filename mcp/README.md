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

## License

MIT

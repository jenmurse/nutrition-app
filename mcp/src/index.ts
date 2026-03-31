#!/usr/bin/env node
/**
 * Good Measure MCP Server
 *
 * Allows any MCP-compatible AI assistant (Claude, ChatGPT, Gemini, etc.)
 * to save recipes directly into your Good Measure household.
 *
 * Required environment variables:
 *   GOOD_MEASURE_API_URL   — e.g. https://your-app.vercel.app
 *   GOOD_MEASURE_API_TOKEN — API token generated in Good Measure → Settings → MCP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.GOOD_MEASURE_API_URL?.replace(/\/$/, '');
const TOKEN = process.env.GOOD_MEASURE_API_TOKEN;

if (!BASE_URL || !TOKEN) {
  process.stderr.write(
    'Error: GOOD_MEASURE_API_URL and GOOD_MEASURE_API_TOKEN environment variables are required.\n'
  );
  process.exit(1);
}

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers as Record<string, string> ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `API error ${res.status}`);
  return json;
}

// ── Server setup ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'good-measure',
  version: '1.0.0',
});

// ── Tool: save_recipe ─────────────────────────────────────────────────────────

server.tool(
  'save_recipe',
  `Save a recipe to the user's Good Measure recipe collection.
Use this tool whenever the user asks to save, store, add, or remember a recipe.
Good Measure will automatically match ingredients to existing entries or create new
ingredient stubs that can be enriched with nutrition data later.`,
  {
    name: z.string().describe('Recipe name'),
    servings: z.number().positive().optional().default(1).describe('Number of servings this recipe makes'),
    servingUnit: z.string().optional().default('servings').describe('Unit for servings, e.g. "servings", "pieces", "cups"'),
    instructions: z.string().optional().default('').describe('Step-by-step cooking instructions (plain text or markdown)'),
    tags: z
      .array(z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'side', 'dessert', 'beverage']))
      .optional()
      .default([])
      .describe('Meal type tags'),
    prepTime: z.number().int().positive().optional().describe('Prep time in minutes'),
    cookTime: z.number().int().positive().optional().describe('Cook time in minutes'),
    ingredients: z
      .array(
        z.object({
          name: z.string().describe('Ingredient name, e.g. "chicken breast", "olive oil"'),
          quantity: z.number().positive().describe('Amount used'),
          unit: z.string().describe('Unit, e.g. "g", "ml", "cup", "tbsp", "oz", "piece"'),
          notes: z.string().optional().describe('Optional preparation note, e.g. "diced", "room temperature"'),
        })
      )
      .optional()
      .default([])
      .describe('List of ingredients'),
  },
  async ({ name, servings, servingUnit, instructions, tags, prepTime, cookTime, ingredients }) => {
    try {
      const recipe = await apiFetch('/api/mcp/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name,
          servings,
          servingUnit,
          instructions,
          tags,
          prepTime,
          cookTime,
          sourceApp: 'MCP',
          ingredients,
        }),
      }) as {
        id: number;
        name: string;
        servingSize: number;
        servingUnit: string;
        ingredients: { name: string; quantity: number; unit: string }[];
        url: string;
      };

      const ingredientSummary = recipe.ingredients.length > 0
        ? `\n\nIngredients saved (${recipe.ingredients.length}):\n` +
          recipe.ingredients.map((i) => `  • ${i.quantity} ${i.unit} ${i.name}`).join('\n')
        : '';

      return {
        content: [
          {
            type: 'text' as const,
            text: `✓ Recipe "${recipe.name}" saved to Good Measure (${recipe.servingSize} ${recipe.servingUnit}).${ingredientSummary}\n\nView it at: ${recipe.url}`,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to save recipe: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: get_recipe ──────────────────────────────────────────────────────────

server.tool(
  'get_recipe',
  `Get the full details of a single recipe including all ingredients, quantities, and nutrition data.
Use this before optimizing a recipe so you have the complete ingredient list and nutrition breakdown.
Get the recipe id from list_recipes first.`,
  {
    id: z.number().int().positive().describe('Recipe id from list_recipes'),
  },
  async ({ id }) => {
    try {
      const recipe = await apiFetch(`/api/mcp/recipes/${id}`) as {
        id: number;
        name: string;
        servings: number;
        servingUnit: string;
        tags: string;
        prepTime: number | null;
        cookTime: number | null;
        instructions: string;
        ingredients: {
          name: string;
          quantity: number;
          unit: string;
          notes?: string;
          gramsEquivalent: number;
          nutrition: { nutrient: string; unit: string; total: number; per100g: number }[];
        }[];
        nutrition: {
          totals: { nutrient: string; unit: string; total: number; perServing: number }[];
        };
      };

      const ingLines = recipe.ingredients.map((i) => {
        const notes = i.notes ? ` (${i.notes})` : '';
        const cal = i.nutrition.find((n) => n.nutrient.toLowerCase().includes('calor') || n.nutrient.toLowerCase().includes('energy'));
        const protein = i.nutrition.find((n) => n.nutrient.toLowerCase().includes('protein'));
        const macros = [cal && `${Math.round(cal.total)} kcal`, protein && `${protein.total.toFixed(1)}g protein`]
          .filter(Boolean).join(', ');
        return `  • ${i.quantity} ${i.unit} ${i.name}${notes}${macros ? ` — ${macros}` : ''}`;
      });

      const nutLines = recipe.nutrition.totals
        .filter((n) => n.perServing > 0)
        .map((n) => `  • ${n.nutrient}: ${n.perServing} ${n.unit}/serving`);

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Recipe: ${recipe.name}`,
            `Servings: ${recipe.servings} ${recipe.servingUnit}`,
            recipe.prepTime ? `Prep: ${recipe.prepTime}m` : '',
            recipe.cookTime ? `Cook: ${recipe.cookTime}m` : '',
            recipe.tags ? `Tags: ${recipe.tags}` : '',
            '',
            'Ingredients:',
            ...ingLines,
            '',
            'Nutrition per serving:',
            ...nutLines,
            recipe.instructions ? `\nInstructions:\n${recipe.instructions}` : '',
          ].filter((l) => l !== undefined).join('\n'),
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to get recipe: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: list_recipes ────────────────────────────────────────────────────────

server.tool(
  'list_recipes',
  `List all recipes currently saved in the user's Good Measure collection.
Use this to check what recipes already exist before saving a new one, or when
the user asks what recipes they have.`,
  {
    search: z.string().optional().describe('Optional filter — only return recipes whose name contains this string'),
  },
  async ({ search }) => {
    try {
      const recipes = await apiFetch('/api/mcp/recipes') as {
        id: number;
        name: string;
        tags: string;
        servingSize: number;
        servingUnit: string;
        prepTime: number | null;
        cookTime: number | null;
      }[];

      const filtered = search
        ? recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
        : recipes;

      if (filtered.length === 0) {
        return {
          content: [{ type: 'text' as const, text: search ? `No recipes matching "${search}".` : 'No recipes saved yet.' }],
        };
      }

      const lines = filtered.map((r) => {
        const time = [r.prepTime && `${r.prepTime}m prep`, r.cookTime && `${r.cookTime}m cook`]
          .filter(Boolean)
          .join(', ');
        const tags = r.tags ? ` [${r.tags}]` : '';
        return `• [id:${r.id}] ${r.name}${tags}${time ? ` — ${time}` : ''} (${r.servingSize} ${r.servingUnit})`;
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `${filtered.length} recipe${filtered.length === 1 ? '' : 's'} in Good Measure:\n\n${lines.join('\n')}`,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to list recipes: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: search_ingredients ──────────────────────────────────────────────────

server.tool(
  'search_ingredients',
  `Search ingredients already in the Good Measure ingredient library for this household.
Use this to check whether an ingredient exists (and has nutrition data) before
saving a recipe, so you can inform the user if any ingredients will be created
as stubs without nutrition data.`,
  {
    query: z.string().describe('Ingredient name or partial name to search for'),
  },
  async ({ query }) => {
    try {
      const ingredients = await apiFetch(`/api/mcp/ingredients?q=${encodeURIComponent(query)}`) as {
        id: number;
        name: string;
        defaultUnit: string;
        source: string;
        nutrientValues: { value: number; nutrient: { displayName: string; unit: string } }[];
      }[];

      if (ingredients.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `No ingredients found matching "${query}". A new stub will be created when you save a recipe using this ingredient.` }],
        };
      }

      const lines = ingredients.map((ing) => {
        const hasNutrition = ing.nutrientValues.length > 0;
        const calEntry = ing.nutrientValues.find((n) =>
          n.nutrient.displayName.toLowerCase().includes('calor') ||
          n.nutrient.displayName.toLowerCase().includes('energy')
        );
        const calInfo = calEntry ? ` — ${Math.round(calEntry.value)} ${calEntry.nutrient.unit}/100g` : '';
        return `• ${ing.name} (${ing.defaultUnit}${calInfo})${hasNutrition ? '' : ' [no nutrition data]'}`;
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `${ingredients.length} ingredient${ingredients.length === 1 ? '' : 's'} found:\n\n${lines.join('\n')}`,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to search ingredients: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

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
  version: '1.3.0',
});

// ── Tool: save_recipe ─────────────────────────────────────────────────────────

server.tool(
  'save_recipe',
  `Save a recipe to the user's Good Measure recipe collection.
Use this tool whenever the user asks to save, store, add, or remember a recipe.
Good Measure will automatically match ingredients to existing entries or create new
ingredient stubs that can be enriched with nutrition data later.
When saving an optimized version of an existing recipe, set copyImageFromRecipeId
to the original recipe's id so the image carries over.`,
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
    copyImageFromRecipeId: z.number().int().positive().optional().describe('Recipe id to copy the image from (use when saving an optimized version of an existing recipe)'),
    ingredients: z
      .array(
        z.object({
          name: z.string().describe('Ingredient name, e.g. "chicken breast", "olive oil"'),
          quantity: z.number().positive().describe('Amount used'),
          unit: z.string().describe('Unit, e.g. "g", "ml", "cup", "tbsp", "oz", "piece"'),
          notes: z.string().optional().describe('Optional preparation note, e.g. "diced", "room temperature"'),
          section: z.string().optional().describe('Section header this ingredient belongs to, e.g. "Base layer", "Topping", "Sauce". Only set on the FIRST ingredient in each section.'),
        })
      )
      .optional()
      .default([])
      .describe('List of ingredients'),
  },
  async ({ name, servings, servingUnit, instructions, tags, prepTime, cookTime, copyImageFromRecipeId, ingredients }) => {
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
          copyImageFromRecipeId,
          ingredients,
        }),
      }) as {
        id: number;
        name: string;
        servingSize: number;
        servingUnit: string;
        ingredients: { name: string; quantity: number; unit: string }[];
        stubIngredients: string[];
        url: string;
      };

      const ingredientSummary = recipe.ingredients.length > 0
        ? `\n\nIngredients saved (${recipe.ingredients.length}):\n` +
          recipe.ingredients.map((i) => `  • ${i.quantity} ${i.unit} ${i.name}`).join('\n')
        : '';

      const stubWarning = recipe.stubIngredients?.length > 0
        ? `\n\n⚠️ ${recipe.stubIngredients.length} ingredient(s) were not found in the database and saved without nutrition data:\n` +
          recipe.stubIngredients.map((s) => `  • ${s}`).join('\n') +
          `\n\nThese will show $0 nutrition until you add data via the ingredient editor in Good Measure.`
        : '';

      return {
        content: [
          {
            type: 'text' as const,
            text: `✓ Recipe "${recipe.name}" saved to Good Measure (${recipe.servingSize} ${recipe.servingUnit}).${ingredientSummary}${stubWarning}\n\nView it at: ${recipe.url}`,
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
Get the recipe id from list_recipes first.
When saving an optimized version of this recipe, pass copyImageFromRecipeId with this recipe's id to preserve the image.`,
  {
    id: z.number().int().positive().describe('Recipe id from list_recipes'),
  },
  async ({ id }) => {
    try {
      const recipe = await apiFetch(`/api/mcp/recipes/${id}`) as {
        id: number;
        name: string;
        hasImage: boolean;
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
          section?: string;
          gramsEquivalent: number;
          nutrition: { nutrient: string; unit: string; total: number; per100g: number }[];
        }[];
        nutrition: {
          totals: { nutrient: string; unit: string; total: number; perServing: number }[];
        };
      };

      const ingLines: string[] = [];
      let lastSection: string | undefined;
      for (const i of recipe.ingredients) {
        if (i.section && i.section !== lastSection) {
          ingLines.push(`  [${i.section}]`);
          lastSection = i.section;
        }
        const notes = i.notes ? ` (${i.notes})` : '';
        const cal = i.nutrition.find((n) => n.nutrient.toLowerCase().includes('calor') || n.nutrient.toLowerCase().includes('energy'));
        const protein = i.nutrition.find((n) => n.nutrient.toLowerCase().includes('protein'));
        const macros = [cal && `${Math.round(cal.total)} kcal`, protein && `${protein.total.toFixed(1)}g protein`]
          .filter(Boolean).join(', ');
        ingLines.push(`  • ${i.quantity} ${i.unit} ${i.name}${notes}${macros ? ` — ${macros}` : ''}`);
      }

      const nutLines = recipe.nutrition.totals
        .filter((n) => n.perServing > 0)
        .map((n) => `  • ${n.nutrient}: ${n.perServing} ${n.unit}/serving`);

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Recipe #${recipe.id}: ${recipe.name}`,
            recipe.hasImage ? `Image: yes (use copyImageFromRecipeId: ${recipe.id} when saving optimized version)` : 'Image: none',
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

// ── Tool: list_ingredients ────────────────────────────────────────────────────

server.tool(
  'list_ingredients',
  `List all ingredients in the user's Good Measure ingredient library.
Use this when the user wants to generate a recipe from ingredients they already have,
or when you need to know what's available before suggesting a recipe.
Returns all ingredients with their default unit and calorie info.`,
  {},
  async () => {
    try {
      const ingredients = await apiFetch('/api/mcp/ingredients') as {
        id: number;
        name: string;
        defaultUnit: string;
        source: string;
        nutrientValues?: { value: number; nutrient: { displayName: string; unit: string } }[];
      }[];

      if (ingredients.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No ingredients in the library yet.' }],
        };
      }

      // The list endpoint (no ?q) intentionally trims nutrientValues — only
      // search responses include them. Render the lighter line in that case.
      const lines = ingredients.map((ing) => {
        const nutrients = ing.nutrientValues;
        if (!nutrients) {
          return `• [id:${ing.id}] ${ing.name} (${ing.defaultUnit})`;
        }
        const calEntry = nutrients.find((n) =>
          n.nutrient.displayName.toLowerCase().includes('calor') ||
          n.nutrient.displayName.toLowerCase().includes('energy')
        );
        const calInfo = calEntry ? ` — ${Math.round(calEntry.value)} ${calEntry.nutrient.unit}/100g` : '';
        const hasNutrition = nutrients.length > 0;
        return `• [id:${ing.id}] ${ing.name} (${ing.defaultUnit}${calInfo})${hasNutrition ? '' : ' [no nutrition data]'}`;
      });

      return {
        content: [{
          type: 'text' as const,
          text: `${ingredients.length} ingredient${ingredients.length === 1 ? '' : 's'} in Good Measure:\n\n${lines.join('\n')}`,
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to list ingredients: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: save_optimization_notes ────────────────────────────────────────────

server.tool(
  'save_optimization_notes',
  `Save optimization analysis notes to an existing recipe in Good Measure.
Use this after analyzing a recipe for nutritional optimization opportunities.
The notes should be in markdown format and will be stored on the recipe for the user to review.`,
  {
    recipe_id: z.number().int().positive().describe('Recipe id to save notes to'),
    notes: z.string().describe('Optimization analysis notes in markdown format'),
  },
  async ({ recipe_id, notes }) => {
    try {
      await apiFetch(`/api/mcp/recipes/${recipe_id}`, {
        method: 'PUT',
        body: JSON.stringify({ optimizeAnalysis: notes }),
      });

      return {
        content: [{
          type: 'text' as const,
          text: `Optimization notes saved to recipe ${recipe_id}.`,
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to save optimization notes: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: save_meal_prep_notes ───────────────────────────────────────────────

server.tool(
  'save_meal_prep_notes',
  `Save meal prep analysis notes to an existing recipe in Good Measure.
Use this after analyzing a recipe for meal prep strategies, batch cooking tips,
storage instructions, or reheating guidance. The notes should be in markdown format.`,
  {
    recipe_id: z.number().int().positive().describe('Recipe id to save notes to'),
    notes: z.string().describe('Meal prep analysis notes in markdown format'),
  },
  async ({ recipe_id, notes }) => {
    try {
      await apiFetch(`/api/mcp/recipes/${recipe_id}`, {
        method: 'PUT',
        body: JSON.stringify({ mealPrepAnalysis: notes }),
      });

      return {
        content: [{
          type: 'text' as const,
          text: `Meal prep notes saved to recipe ${recipe_id}.`,
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to save meal prep notes: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: list_people ─────────────────────────────────────────────────────────

server.tool(
  'list_people',
  `List all people in the user's Good Measure household.
Use this to find the person_id before calling get_person_goals or when you need
to know who's in the household.`,
  {},
  async () => {
    try {
      const people = await apiFetch('/api/mcp/people') as {
        id: number;
        name: string;
        color: string;
        role: string;
      }[];

      if (people.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No people in this household yet.' }] };
      }

      const lines = people.map((p) => `• [id:${p.id}] ${p.name} (${p.role})`);
      return {
        content: [{
          type: 'text' as const,
          text: `${people.length} ${people.length === 1 ? 'person' : 'people'} in the household:\n\n${lines.join('\n')}`,
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to list people: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: get_person_goals ────────────────────────────────────────────────────

server.tool(
  'get_person_goals',
  `Get a person's baseline daily nutrition goals (calories, macros, micros).
Returns low and high targets per nutrient. Use this to understand what the person
is aiming for before suggesting recipe optimizations or analyzing their meal plan.
Get the person_id from list_people.`,
  {
    person_id: z.number().int().positive().describe('Person id from list_people'),
  },
  async ({ person_id }) => {
    try {
      const data = await apiFetch(`/api/mcp/people/${person_id}/goals`) as {
        person: { id: number; name: string } | null;
        goals: { nutrient: string; unit: string; lowGoal: number | null; highGoal: number | null }[];
      };

      if (!data.person) {
        return { content: [{ type: 'text' as const, text: `Person ${person_id} not found.` }], isError: true };
      }

      if (data.goals.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `${data.person.name} has no nutrition goals set yet.`,
          }],
        };
      }

      const lines = data.goals.map((g) => {
        const range =
          g.lowGoal != null && g.highGoal != null ? `${g.lowGoal}–${g.highGoal}`
          : g.lowGoal != null ? `≥ ${g.lowGoal}`
          : g.highGoal != null ? `≤ ${g.highGoal}`
          : '—';
        return `  • ${g.nutrient}: ${range} ${g.unit}`;
      });

      return {
        content: [{
          type: 'text' as const,
          text: `${data.person.name}'s daily goals:\n\n${lines.join('\n')}`,
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to get goals: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: list_meal_plans ─────────────────────────────────────────────────────

server.tool(
  'list_meal_plans',
  `List recent meal plans in the user's household.
Each meal plan represents one week for one person. Use this to find the meal_plan_id
before calling get_meal_plan_week. Optionally filter by person_id.`,
  {
    person_id: z.number().int().positive().optional().describe('Optional: only return meal plans for this person'),
  },
  async ({ person_id }) => {
    try {
      const qs = person_id ? `?personId=${person_id}` : '';
      const plans = await apiFetch(`/api/mcp/meal-plans${qs}`) as {
        id: number;
        weekStartDate: string;
        personId: number | null;
        personName: string | null;
        mealCount: number;
      }[];

      if (plans.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No meal plans found.' }] };
      }

      const lines = plans.map((p) => {
        const week = p.weekStartDate.slice(0, 10);
        const owner = p.personName ?? 'Household';
        return `• [id:${p.id}] Week of ${week} — ${owner} (${p.mealCount} meals)`;
      });

      return {
        content: [{
          type: 'text' as const,
          text: `${plans.length} meal plan${plans.length === 1 ? '' : 's'}:\n\n${lines.join('\n')}`,
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to list meal plans: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: get_meal_plan_week ──────────────────────────────────────────────────

server.tool(
  'get_meal_plan_week',
  `Get a full week of meals for a meal plan, grouped by day, with daily nutrition
totals and effective goals. Use this to analyze how a person's week is tracking
against their targets, suggest meal swaps, or identify gaps. Get the meal_plan_id
from list_meal_plans.`,
  {
    meal_plan_id: z.number().int().positive().describe('Meal plan id from list_meal_plans'),
  },
  async ({ meal_plan_id }) => {
    try {
      const data = await apiFetch(`/api/mcp/meal-plans/${meal_plan_id}`) as {
        id: number;
        weekStartDate: string;
        person: { id: number; name: string } | null;
        days: {
          date: string;
          meals: {
            mealType: string;
            servings: number;
            recipe?: { id: number; name: string };
            ingredient?: { id: number; name: string; quantity: number | null; unit: string | null };
            notes: string | null;
          }[];
        }[];
        weeklySummary: {
          dailyNutritions: {
            date: string;
            dayOfWeek: string;
            totalNutrients: {
              nutrientId: number;
              displayName: string;
              unit: string;
              value: number;
              lowGoal?: number | null;
              highGoal?: number | null;
            }[];
          }[];
        };
      };

      const owner = data.person?.name ?? 'Household';
      const weekStart = data.weekStartDate.slice(0, 10);

      // Key nutrients to surface (filter for signal vs noise)
      const KEY_NUTRIENTS = new Set(['Calories','Protein','Carbs','Carbohydrates','Fat','Fiber','Sugar','Sodium']);

      const dailyByDate: Record<string, typeof data.weeklySummary.dailyNutritions[number]> = {};
      for (const d of data.weeklySummary?.dailyNutritions ?? []) {
        const key = typeof d.date === 'string' ? d.date.slice(0, 10) : new Date(d.date).toISOString().slice(0, 10);
        dailyByDate[key] = d;
      }

      // Per-day output
      const daySections = data.days.map((day) => {
        const mealLines = day.meals.length === 0
          ? ['  (no meals logged)']
          : day.meals.map((m) => {
              if (m.recipe) {
                const srv = m.servings !== 1 ? ` × ${m.servings}` : '';
                return `  • ${m.mealType}: ${m.recipe.name}${srv} [recipe:${m.recipe.id}]`;
              }
              if (m.ingredient) {
                const qty = m.ingredient.quantity != null ? `${m.ingredient.quantity} ${m.ingredient.unit ?? ''} ` : '';
                return `  • ${m.mealType}: ${qty}${m.ingredient.name} [ing:${m.ingredient.id}]`;
              }
              return `  • ${m.mealType}: (empty)`;
            });

        const summary = dailyByDate[day.date];
        const totalsLines = (summary?.totalNutrients ?? [])
          .filter((n) => KEY_NUTRIENTS.has(n.displayName) && n.value > 0)
          .map((n) => {
            const goalStr = n.highGoal != null ? ` / ${n.highGoal}${n.unit}`
              : n.lowGoal != null ? ` (target ≥ ${n.lowGoal}${n.unit})`
              : ` ${n.unit}`;
            return `    ${n.displayName}: ${n.value}${goalStr}`;
          });

        return [`${day.date}:`, ...mealLines, ...(totalsLines.length ? ['  Totals:', ...totalsLines] : [])].join('\n');
      });

      return {
        content: [{
          type: 'text' as const,
          text: [
            `Meal plan #${data.id} — ${owner}, week of ${weekStart}`,
            '',
            ...daySections,
          ].join('\n\n'),
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Failed to get meal plan week: ${message}` }],
        isError: true,
      };
    }
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

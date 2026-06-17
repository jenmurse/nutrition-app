/**
 * MCP tool catalog for the hosted remote connector (app/api/mcp/connect/[token]).
 *
 * Each entry maps a tool name to (a) its JSON-Schema input (sent to clients in
 * tools/list) and (b) the internal /api/mcp/* REST call that implements it. The
 * hosted endpoint forwards tools/call to those REST routes with the user's token,
 * so ALL business logic + auth + the plan gate are reused unchanged.
 *
 * This intentionally mirrors the tools in the published `good-measure-mcp` npm
 * package (mcp/src/index.ts). The npm package formats results as prose; the
 * hosted endpoint returns the REST JSON verbatim — both hit the same API.
 */

type Json = Record<string, unknown>;

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Json;
  toRequest: (args: Json) => { method: string; path: string; body?: unknown };
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "side", "snack", "dessert", "beverage"];

// Drop undefined keys so we don't send `"x": undefined` in JSON bodies.
function clean(obj: Json): Json {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: "save_recipe",
    description:
      "Save a recipe to the user's Good Measure recipe collection. Use whenever the user asks to save, store, add, or remember a recipe. Ingredients are matched to existing entries or created as stubs. When saving an optimized version of an existing recipe, set copyImageFromRecipeId to the original recipe's id so the image carries over.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Recipe name" },
        servings: { type: "number", description: "Number of servings this recipe makes" },
        servingUnit: { type: "string", description: 'Unit for servings, e.g. "servings", "cups"' },
        instructions: { type: "string", description: "Step-by-step instructions (plain text or markdown)" },
        tags: { type: "array", items: { type: "string", enum: MEAL_TYPES }, description: "Meal type tags" },
        prepTime: { type: "integer", description: "Prep time in minutes" },
        cookTime: { type: "integer", description: "Cook time in minutes" },
        copyImageFromRecipeId: { type: "integer", description: "Recipe id to copy the image from" },
        ingredients: {
          type: "array",
          description: "List of ingredients",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
              notes: { type: "string" },
              section: { type: "string" },
            },
            required: ["name", "quantity", "unit"],
          },
        },
      },
      required: ["name"],
    },
    toRequest: (a) => ({
      method: "POST",
      path: "/api/mcp/recipes",
      body: clean({
        name: a.name,
        servings: a.servings ?? 1,
        servingUnit: a.servingUnit ?? "servings",
        instructions: a.instructions ?? "",
        tags: a.tags ?? [],
        prepTime: a.prepTime,
        cookTime: a.cookTime,
        sourceApp: "MCP",
        copyImageFromRecipeId: a.copyImageFromRecipeId,
        ingredients: a.ingredients ?? [],
      }),
    }),
  },
  {
    name: "get_recipe",
    description:
      "Get full details of a single recipe — ingredients, quantities, and nutrition. Use before optimizing. Get the id from list_recipes. Pass copyImageFromRecipeId with this id when saving an optimized version to preserve the image.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "integer", description: "Recipe id from list_recipes" } },
      required: ["id"],
    },
    toRequest: (a) => ({ method: "GET", path: `/api/mcp/recipes/${a.id}` }),
  },
  {
    name: "list_recipes",
    description:
      "List all recipes in the user's Good Measure collection. Use to check what exists before saving, or when the user asks what recipes they have.",
    inputSchema: {
      type: "object",
      properties: { search: { type: "string", description: "Optional name filter" } },
    },
    // The REST route returns all; the assistant can filter by `search` itself.
    toRequest: () => ({ method: "GET", path: "/api/mcp/recipes" }),
  },
  {
    name: "search_ingredients",
    description:
      "Search ingredients already in the household's library. Use to check whether an ingredient exists (and has nutrition data) before saving a recipe.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Ingredient name or partial name" } },
      required: ["query"],
    },
    toRequest: (a) => ({ method: "GET", path: `/api/mcp/ingredients?q=${encodeURIComponent(String(a.query))}` }),
  },
  {
    name: "list_ingredients",
    description:
      "List all ingredients in the household's library with default unit and calorie info. Use when generating a recipe from what the user already has.",
    inputSchema: { type: "object", properties: {} },
    toRequest: () => ({ method: "GET", path: "/api/mcp/ingredients" }),
  },
  {
    name: "save_optimization_notes",
    description:
      "Save optimization analysis notes (markdown) to an existing recipe. Use after analyzing a recipe for nutritional optimization.",
    inputSchema: {
      type: "object",
      properties: {
        recipe_id: { type: "integer", description: "Recipe id to save notes to" },
        notes: { type: "string", description: "Optimization notes in markdown" },
      },
      required: ["recipe_id", "notes"],
    },
    toRequest: (a) => ({ method: "PUT", path: `/api/mcp/recipes/${a.recipe_id}`, body: { optimizeAnalysis: a.notes } }),
  },
  {
    name: "save_meal_prep_notes",
    description:
      "Save meal prep analysis notes (markdown) to an existing recipe — batch cooking tips, storage, reheating. Use after analyzing a recipe for meal prep.",
    inputSchema: {
      type: "object",
      properties: {
        recipe_id: { type: "integer", description: "Recipe id to save notes to" },
        notes: { type: "string", description: "Meal prep notes in markdown" },
      },
      required: ["recipe_id", "notes"],
    },
    toRequest: (a) => ({ method: "PUT", path: `/api/mcp/recipes/${a.recipe_id}`, body: { mealPrepAnalysis: a.notes } }),
  },
  {
    name: "list_people",
    description: "List all people in the household. Use to find a person_id before get_person_goals.",
    inputSchema: { type: "object", properties: {} },
    toRequest: () => ({ method: "GET", path: "/api/mcp/people" }),
  },
  {
    name: "get_person_goals",
    description:
      "Get a person's baseline daily nutrition goals (low/high per nutrient). Use to understand targets before optimizing. Get person_id from list_people.",
    inputSchema: {
      type: "object",
      properties: { person_id: { type: "integer", description: "Person id from list_people" } },
      required: ["person_id"],
    },
    toRequest: (a) => ({ method: "GET", path: `/api/mcp/people/${a.person_id}/goals` }),
  },
  {
    name: "list_meal_plans",
    description:
      "List recent meal plans. Each is one week for one person. Use to find a meal_plan_id before get_meal_plan_week. Optionally filter by person_id.",
    inputSchema: {
      type: "object",
      properties: { person_id: { type: "integer", description: "Optional person filter" } },
    },
    toRequest: (a) => ({
      method: "GET",
      path: a.person_id ? `/api/mcp/meal-plans?personId=${a.person_id}` : "/api/mcp/meal-plans",
    }),
  },
  {
    name: "get_meal_plan_week",
    description:
      "Get a full week of meals grouped by day, with daily nutrition totals vs. goals. Use to analyze how a week tracks against targets. Get meal_plan_id from list_meal_plans.",
    inputSchema: {
      type: "object",
      properties: { meal_plan_id: { type: "integer", description: "Meal plan id from list_meal_plans" } },
      required: ["meal_plan_id"],
    },
    toRequest: (a) => ({ method: "GET", path: `/api/mcp/meal-plans/${a.meal_plan_id}` }),
  },
  {
    name: "add_meal",
    description:
      "Add a recipe or pantry ingredient to a meal plan on a specific day. Pass either recipe_id (with optional servings) OR ingredient_id + quantity + unit. Confirm with the user before calling — this writes to their plan.",
    inputSchema: {
      type: "object",
      properties: {
        meal_plan_id: { type: "integer" },
        date: { type: "string", description: "YYYY-MM-DD" },
        meal_type: { type: "string", enum: MEAL_TYPES },
        recipe_id: { type: "integer", description: "Recipe to add (mutually exclusive with ingredient_id)" },
        ingredient_id: { type: "integer", description: "Pantry ingredient (requires quantity + unit)" },
        servings: { type: "number", description: "Servings of the recipe (default 1)" },
        quantity: { type: "number", description: "Quantity of the ingredient" },
        unit: { type: "string", description: "Unit for the ingredient quantity" },
        notes: { type: "string" },
      },
      required: ["meal_plan_id", "date", "meal_type"],
    },
    toRequest: (a) => ({
      method: "POST",
      path: `/api/mcp/meal-plans/${a.meal_plan_id}/meals`,
      body: clean({
        recipeId: a.recipe_id,
        ingredientId: a.ingredient_id,
        servings: a.servings,
        quantity: a.quantity,
        unit: a.unit,
        date: a.date,
        mealType: a.meal_type,
        notes: a.notes,
      }),
    }),
  },
  {
    name: "remove_meal",
    description:
      "Remove a single meal log from a plan. Destructive — confirm with the user first. Get meal_log_id from get_meal_plan_week.",
    inputSchema: {
      type: "object",
      properties: {
        meal_plan_id: { type: "integer" },
        meal_log_id: { type: "integer", description: "The meal log id to delete" },
      },
      required: ["meal_plan_id", "meal_log_id"],
    },
    toRequest: (a) => ({ method: "DELETE", path: `/api/mcp/meal-plans/${a.meal_plan_id}/meals/${a.meal_log_id}` }),
  },
  {
    name: "update_meal",
    description:
      "Adjust a meal log in place — servings, quantity, unit, slot, or notes. For swapping the recipe/ingredient itself, use swap_meal.",
    inputSchema: {
      type: "object",
      properties: {
        meal_plan_id: { type: "integer" },
        meal_log_id: { type: "integer" },
        servings: { type: "number" },
        quantity: { type: "number" },
        unit: { type: "string" },
        meal_type: { type: "string", enum: MEAL_TYPES },
        notes: { type: "string" },
      },
      required: ["meal_plan_id", "meal_log_id"],
    },
    toRequest: (a) => ({
      method: "PATCH",
      path: `/api/mcp/meal-plans/${a.meal_plan_id}/meals/${a.meal_log_id}`,
      body: clean({ servings: a.servings, quantity: a.quantity, unit: a.unit, mealType: a.meal_type, notes: a.notes }),
    }),
  },
  {
    name: "swap_meal",
    description:
      "Swap a meal log's referent — point it at a different recipe or ingredient. Provide exactly one of recipe_id or ingredient_id (ingredients need quantity + unit). Confirm with the user first.",
    inputSchema: {
      type: "object",
      properties: {
        meal_plan_id: { type: "integer" },
        meal_log_id: { type: "integer" },
        recipe_id: { type: "integer" },
        ingredient_id: { type: "integer" },
        servings: { type: "number" },
        quantity: { type: "number" },
        unit: { type: "string" },
      },
      required: ["meal_plan_id", "meal_log_id"],
    },
    toRequest: (a) => {
      const body: Json = a.recipe_id
        ? clean({ recipeId: a.recipe_id, servings: a.servings })
        : clean({ ingredientId: a.ingredient_id, quantity: a.quantity, unit: a.unit });
      return { method: "PATCH", path: `/api/mcp/meal-plans/${a.meal_plan_id}/meals/${a.meal_log_id}`, body };
    },
  },
  {
    name: "list_day_templates",
    description:
      "List saved day templates in this household. Optionally filter by person_id — templates without a person are always included.",
    inputSchema: {
      type: "object",
      properties: { person_id: { type: "integer" } },
    },
    toRequest: (a) => ({
      method: "GET",
      path: a.person_id ? `/api/mcp/day-templates?personId=${a.person_id}` : "/api/mcp/day-templates",
    }),
  },
  {
    name: "save_day_template",
    description:
      "Snapshot the meals on a (plan_id, date) into a reusable day template. Names must be unique within the household (returns 409 on collision).",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: { type: "integer" },
        date: { type: "string", description: "YYYY-MM-DD — the day to snapshot" },
        name: { type: "string", description: "Template name, unique within household" },
        person_id: { type: "integer", description: "Attribution; defaults to the token owner" },
      },
      required: ["plan_id", "date", "name"],
    },
    toRequest: (a) => ({
      method: "POST",
      path: "/api/mcp/day-templates",
      body: clean({ planId: a.plan_id, date: a.date, name: a.name, personId: a.person_id }),
    }),
  },
  {
    name: "apply_day_template",
    description:
      'Apply a saved day template to a target (plan_id, date). mode="replace" deletes existing meals on that day first; mode="append" smart-merges. Destructive when "replace" — confirm with the user first.',
    inputSchema: {
      type: "object",
      properties: {
        template_id: { type: "integer" },
        plan_id: { type: "integer" },
        date: { type: "string", description: "YYYY-MM-DD — target day" },
        mode: { type: "string", enum: ["replace", "append"] },
      },
      required: ["template_id", "plan_id", "date", "mode"],
    },
    toRequest: (a) => ({
      method: "POST",
      path: `/api/mcp/day-templates/${a.template_id}/apply`,
      body: clean({ planId: a.plan_id, date: a.date, mode: a.mode }),
    }),
  },
];

export const MCP_TOOLS_BY_NAME: Record<string, McpToolDef> = Object.fromEntries(
  MCP_TOOLS.map((t) => [t.name, t])
);

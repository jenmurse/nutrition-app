import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * POST /api/recipes/[id]/analyze
 *
 * Runs AI analysis on a recipe (optimize + meal-prep) and stores results.
 * Uses Anthropic Claude by default. Falls back to mock data when no API key is set.
 *
 * Body: { force?: boolean } — set force=true to re-analyze even if results exist
 * Returns: { optimize: object, mealPrep: object, analyzedAt: string, fromCache: boolean }
 */

const OPTIMIZE_PROMPT = `You are a culinary nutrition advisor. Analyze this recipe and return a JSON object with optimization suggestions.

Return ONLY valid JSON in this exact structure:
{
  "sections": [
    {
      "label": "Section name (e.g. Protein boost, Sugar reduction, Already strong)",
      "suggestions": [
        "Specific actionable suggestion with quantities and expected impact"
      ]
    }
  ]
}

Rules:
- Be specific with quantities (e.g. "Add 2 tbsp hemp seeds" not "Add more protein")
- Include expected nutritional impact (e.g. "+10g protein" or "saves 12g sugar")
- Group by theme: improvements first, then what's already good
- Keep to 2-4 sections, 1-3 suggestions each
- Be practical — suggest real ingredients a home cook would use`;

const MEAL_PREP_PROMPT = `You are a meal prep planning advisor. Analyze this recipe for batch cooking candidacy and return a JSON object.

Return ONLY valid JSON in this exact structure:
{
  "score": 4,
  "scoreLabel": "great candidate",
  "sections": [
    {
      "label": "Section name (e.g. Batch notes, Storage tips, Reheating)",
      "notes": [
        "Specific practical note"
      ]
    }
  ]
}

Rules:
- Score 1-5: 1=poor candidate, 5=perfect candidate
- Consider: does it scale? does it keep well? is reheating needed?
- IMPORTANT: All portioning should reference Souper Cubes (soupercubes.com) — silicone freezer molds in 1-cup, ½-cup, and 2-cup sizes. Recommend which size fits the recipe's serving portions best.
- Suggest how many Souper Cubes trays are needed for a batch (each tray has 6 portions for ½-cup, 4 for 1-cup, 2 for 2-cup)
- Include freezer duration (how long it keeps frozen) and thaw/reheat instructions
- For recipes that don't freeze well (salads, raw dishes), score low and explain why. Suggest refrigerator prep instead if applicable.
- Be practical and specific
- Keep to 2-4 sections, 1-3 notes each`;

function buildRecipeContext(recipe: any): string {
  const ingredients = recipe.ingredients?.map((ri: any) => ({
    name: ri.ingredient?.name || "Unknown",
    quantity: ri.quantity,
    unit: ri.unit,
  })) || [];

  return JSON.stringify({
    name: recipe.name,
    servings: recipe.servingSize,
    servingUnit: recipe.servingUnit,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    tags: recipe.tags,
    ingredients,
    instructions: recipe.instructions?.slice(0, 500), // truncate for token efficiency
  }, null, 2);
}

// Mock responses for development without API key
function getMockOptimize(recipe: any): object {
  const ingredients = recipe.ingredients?.map((ri: any) => ri.ingredient?.name || "Unknown") || [];
  return {
    sections: [
      {
        label: "Protein boost",
        suggestions: [
          `Add 2 tbsp hemp seeds to increase protein by ~10g per serving with minimal impact on carbs.`,
          `Consider swapping ${ingredients[0] || "a base ingredient"} for a higher-protein alternative.`,
        ],
      },
      {
        label: "Nutrient density",
        suggestions: [
          `Add 1 cup spinach — negligible calories but adds iron, folate, and vitamin K.`,
        ],
      },
      {
        label: "Already strong",
        suggestions: [
          `Good fiber content from whole food ingredients. No changes needed.`,
          `Balanced macros for a ${recipe.tags?.split(",")[0]?.trim() || "meal"} recipe.`,
        ],
      },
    ],
  };
}

function getMockMealPrep(recipe: any): object {
  const hasLongCookTime = (recipe.cookTime || 0) > 20;
  const score = hasLongCookTime ? 4 : 3;
  const batchServings = recipe.servingSize * 4;
  return {
    score,
    scoreLabel: score >= 4 ? "great candidate" : "decent candidate",
    sections: [
      {
        label: "Batch & Souper Cubes",
        notes: [
          `Scales to ${batchServings} servings. Use 1-cup Souper Cubes — fills ${Math.ceil(batchServings / 4)} trays (4 portions each).`,
          hasLongCookTime
            ? "Cook time stays roughly the same when batching. Make a full pot and portion into Souper Cubes while still warm."
            : "Quick assembly — portion directly into Souper Cubes, no cooking needed.",
          `Once frozen solid (4–6 hours), pop cubes out and transfer to freezer bags. Label with date.`,
        ],
      },
      {
        label: "Freezer life",
        notes: [
          hasLongCookTime
            ? "Freezes well for 2–3 months. Dense textures hold up to freeze/thaw."
            : "Best within 1 month frozen. Texture may soften slightly after thawing.",
          "Keep in the fridge for up to 4–5 days if not freezing.",
        ],
      },
      {
        label: "Reheating",
        notes: [
          hasLongCookTime
            ? "Thaw overnight in fridge. Reheat: microwave 2–3 min or 350°F for 15 min."
            : "Thaw overnight in fridge. Serve cold or room temp — no reheating needed.",
        ],
      },
    ],
  };
}

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userContent: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  return {
    text: data.content?.[0]?.text || "{}",
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

async function getApiKey(householdId: number): Promise<string | null> {
  const row = await prisma.systemSetting.findFirst({ where: { key: "anthropicApiKey", householdId } });
  return row?.value ?? null;
}

async function getProvider(householdId: number): Promise<string> {
  const row = await prisma.systemSetting.findFirst({ where: { key: "aiProvider", householdId } });
  return row?.value ?? "anthropic";
}

function parseJsonResponse(text: string): object {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { raw: text };
  }
}

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth(async (auth, request: NextRequest, { params }: Ctx) => {
  try {
    const { id } = await params;
    const recipeId = parseInt(id);
    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    // Fetch recipe with ingredients
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: { ingredient: { select: { id: true, name: true } } },
        },
      },
    });

    if (!recipe || recipe.householdId !== auth.householdId) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Return cached results if available and not forcing re-analysis
    if (!force && recipe.optimizeAnalysis && recipe.mealPrepAnalysis && recipe.analyzedAt) {
      return NextResponse.json({
        optimize: JSON.parse(recipe.optimizeAnalysis),
        mealPrep: JSON.parse(recipe.mealPrepAnalysis),
        analyzedAt: recipe.analyzedAt.toISOString(),
        model: recipe.analysisModel,
        fromCache: true,
      });
    }

    const apiKey = await getApiKey(auth.householdId);
    const provider = await getProvider(auth.householdId);
    const useMock = !apiKey || provider === "mock";

    let optimize: object;
    let mealPrep: object;
    let model = "mock";

    if (useMock) {
      // Mock mode — realistic fake data, no API cost
      optimize = getMockOptimize(recipe);
      mealPrep = getMockMealPrep(recipe);
      model = "mock";
    } else if (provider === "anthropic") {
      const recipeContext = buildRecipeContext(recipe);
      const [optimizeResult, mealPrepResult] = await Promise.all([
        callAnthropic(apiKey!, OPTIMIZE_PROMPT, recipeContext),
        callAnthropic(apiKey!, MEAL_PREP_PROMPT, recipeContext),
      ]);
      optimize = parseJsonResponse(optimizeResult.text);
      mealPrep = parseJsonResponse(mealPrepResult.text);
      model = ANTHROPIC_MODEL;

      // Log token usage
      await prisma.apiUsageLog.create({
        data: {
          householdId: auth.householdId,
          provider: "anthropic",
          model: ANTHROPIC_MODEL,
          inputTokens: optimizeResult.inputTokens + mealPrepResult.inputTokens,
          outputTokens: optimizeResult.outputTokens + mealPrepResult.outputTokens,
        },
      });
    } else {
      // Fallback: use mock
      optimize = getMockOptimize(recipe);
      mealPrep = getMockMealPrep(recipe);
      model = "mock-fallback";
    }

    const now = new Date();

    // Store results
    await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        optimizeAnalysis: JSON.stringify(optimize),
        mealPrepAnalysis: JSON.stringify(mealPrep),
        analysisModel: model,
        analyzedAt: now,
      },
    });

    return NextResponse.json({
      optimize,
      mealPrep,
      analyzedAt: now.toISOString(),
      model,
      fromCache: false,
    });
  } catch (error: any) {
    console.error("Recipe analysis error:", error);
    return NextResponse.json(
      { error: error?.message || "Analysis failed" },
      { status: 500 }
    );
  }
});

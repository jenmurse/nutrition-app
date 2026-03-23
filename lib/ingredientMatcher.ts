/**
 * Shared ingredient-matching logic used by both Pestle and URL import routes.
 */

export type ParsedIngredient = {
  originalText: string;
  quantity: number;
  unit: string;
  nameGuess: string;
  section?: string | null;
  ingredientId?: number | null;
};

export type ParsedRecipe = {
  name: string;
  servingSize: number;
  servingUnit: string;
  instructions: string;
  sourceApp: string;
  ingredients: ParsedIngredient[];
  isComplete: boolean;
};

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "and", "or", "of", "the", "a", "an", "to", "for", "with",
  "fresh", "ground", "minced", "diced", "chopped", "sliced", "optional", "plus",
]);

function scoreMatch(guess: string, candidate: string): number {
  if (!guess || !candidate) return 0;
  if (guess === candidate) return 100;
  if (guess.includes(candidate)) return 50 + candidate.length;

  const guessTokens = guess.split(" ").filter((t) => t.length > 2 && !STOPWORDS.has(t));
  const candTokens = candidate.split(" ").filter((t) => t.length > 2 && !STOPWORDS.has(t));
  if (!guessTokens.length || !candTokens.length) return 0;

  let score = 0;
  for (const token of candTokens) {
    if (guessTokens.includes(token)) score += 5;
  }
  return score;
}

export function matchIngredients(
  parsed: ParsedRecipe,
  existing: { id: number; name: string }[]
): ParsedRecipe {
  const normalized = existing.map((ing) => ({
    id: ing.id,
    name: ing.name,
    norm: normalizeText(ing.name),
  }));

  const updated = parsed.ingredients.map((item) => {
    const guess = normalizeText(item.nameGuess || item.originalText);
    if (!guess) return item;

    let best: { id: number; name: string; norm: string } | undefined;
    let bestScore = 0;

    for (const ing of normalized) {
      const score = scoreMatch(guess, ing.norm);
      if (score > bestScore) {
        bestScore = score;
        best = ing;
      }
    }

    return { ...item, ingredientId: bestScore > 0 ? best?.id ?? null : null };
  });

  return {
    ...parsed,
    ingredients: updated,
    isComplete: updated.every((i) => i.ingredientId),
  };
}

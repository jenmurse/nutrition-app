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

// Stopwords are skipped during token matching. The list includes filler words,
// common prep adjectives ("raw", "dried", etc — common in pantry names but
// usually omitted in recipe text), and size descriptors ("large", "medium").
// These would otherwise drag scoring asymmetrically — e.g. pantry "Chicken
// thigh, raw" would be penalized vs a recipe simply saying "chicken thighs".
const STOPWORDS = new Set([
  "and", "or", "of", "the", "a", "an", "to", "for", "with", "in", "on",
  "fresh", "ground", "minced", "diced", "chopped", "sliced", "grated",
  "shredded", "crushed", "cubed", "julienned", "halved", "quartered",
  "raw", "cooked", "dry", "dried", "frozen", "canned", "whole",
  "boneless", "skinless", "lean", "extra", "virgin",
  "large", "small", "medium", "big", "little",
  "optional", "plus", "approx", "approximately", "about",
]);

/**
 * Naive singularization — strips common English plural endings without
 * needing a stemmer dependency. Handles: berries→berry, tomatoes→tomato,
 * eggs→egg, while preserving short words and double-s words (loss, miss).
 */
function singularize(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) return token.slice(0, -3) + "y";
  if (token.endsWith("es") && token.length > 4 && !token.endsWith("ses")) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && !token.endsWith("us") && !token.endsWith("is")) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(text: string): { raw: string[]; singular: string[] } {
  const raw = text.split(" ").filter((t) => t.length > 2 && !STOPWORDS.has(t));
  const singular = raw.map(singularize);
  return { raw, singular };
}

function scoreMatch(guess: string, candidate: string): number {
  if (!guess || !candidate) return 0;
  if (guess === candidate) return 100;

  // Substring containment in either direction (slight edge to forward).
  // 'guess contains candidate' = recipe text wraps a shorter pantry name
  //                              (e.g. "1 cup yellow onion" contains "yellow onion")
  // 'candidate contains guess' = recipe says less than the pantry name
  //                              (e.g. "onion" inside pantry "yellow onion")
  if (guess.includes(candidate)) return 50 + candidate.length;
  if (candidate.includes(guess)) return 40 + guess.length;

  const g = tokenize(guess);
  const c = tokenize(candidate);
  if (!g.raw.length || !c.raw.length) return 0;

  // Score by matching tokens, using singular form so plurals match singulars.
  // Exact form match scores higher than singularized match.
  const guessRawSet = new Set(g.raw);
  const guessSingSet = new Set(g.singular);
  let score = 0;
  for (let i = 0; i < c.raw.length; i++) {
    if (guessRawSet.has(c.raw[i])) score += 5;
    else if (guessSingSet.has(c.singular[i])) score += 4;
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

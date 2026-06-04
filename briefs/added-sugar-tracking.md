# Good Measure — Added sugar tracking

## Distinguishing added sugar from total sugar

**Status:** Stub / problem statement
**Author:** Jen (with Claude)
**Date:** May 2026

---

## The problem

Good Measure currently tracks one sugar value per ingredient and recipe: total sugar. USDA data is the same — `Sugars, total including NLEA` is what comes back from the FDC API.

The thing that actually matters for diet is **added sugar** — sugar that didn't come with the food in its whole form. Natural sugar in an apple, milk, or sweet potato isn't the metabolic problem; refined sugar in baked goods, sauces, and beverages is. The WHO, the Dietary Guidelines for Americans, and the FDA's Nutrition Facts label redesign all target added sugar specifically.

By conflating the two, Good Measure makes it impossible to track the metric that matters most for many users (Jen included). An apple-heavy day looks the same as a cookie-heavy day in the current model.

## Why this is hard

1. **USDA data doesn't always distinguish.** Some FDC entries have an "Added Sugars" field; many don't. Branded data is patchy.
2. **Composed recipes inherit from their ingredients.** A recipe's added sugar = sum of its ingredients' added sugar. If any ingredient's added sugar is unknown, the recipe total is unknown — not zero.
3. **The user often knows what the app can't infer.** A packaged yogurt label says "12g sugar, 8g added sugar." The user has that data; the database doesn't.

## Proposed data model change

Add `addedSugar` as a separate nutrient alongside `sugar`. Treat unknown as a distinct state from zero.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `sugar` | number | required | Total sugar, grams per 100g basis (existing) |
| `addedSugar` | number \| null | null | Added sugar, grams per 100g basis. `null` = unknown. |

**Why null matters:** If an unknown ingredient is in a recipe, the recipe's added-sugar total must also be unknown, not zero. Showing "0g added sugar" when we don't know is misleading.

## UI implications

- **Pantry detail / form:** Add an "Added Sugar" input next to "Sugar." Unknown is the default; user fills in when they know. Show `—` when null.
- **Recipe nutrition panel:** Show added sugar as a separate row below total sugar. Show `—` if any ingredient is null.
- **Daily Goals:** Allow setting `addedSugarHighGoal` independently from `sugarHighGoal`. Most users will care about added sugar; some won't track it at all.
- **Goal logic:** Three-state color rule applies. Over `addedSugarHighGoal` → red. Otherwise neutral. No green state — there's no "minimum added sugar" target.
- **Nutrition panel display:** When `addedSugar` is null for a recipe (because some ingredients are unknown), show `—` and a small hint: "Some ingredients lack added-sugar data."

## Population paths

Four ways the field gets populated:

1. **USDA import** — when the FDC entry has an "Added Sugars" nutrient, use it. Otherwise leave null.
2. **Manual entry** — user types it in from a packaged label. Most common path for branded items.
3. **Composed recipe inference** — if a recipe is built from ingredients with known added-sugar values, sum them. Recompute on save.
4. **MCP / Claude estimation** — for imported URL recipes, MCP can read the ingredient list and estimate. "This is a chocolate chip cookie recipe; brown sugar and chocolate chips contribute ~28g added sugar per serving." The user reviews and accepts. Mark the value as estimated vs measured for transparency.

## Migration

Existing ingredients/recipes have a `sugar` value and no `addedSugar`. Default all existing rows to `addedSugar: null` (unknown). Don't backfill with zero — that would create false zero readings for recipes that have added sugar.

Provide a bulk-fill workflow in Settings: "Review pantry items missing added-sugar data." Lets the user methodically fill in what they know.

## Out of scope

- Tracking other "added" vs "natural" distinctions (e.g., naturally occurring vs added sodium — not a real metabolic concern in the same way).
- Distinguishing added sugar by source (refined vs honey vs maple). Not a tracked health metric.
- Per-meal added-sugar goals (the daily target is fine; finer granularity is overengineering).

## Open questions

1. **Goal default:** what's a sensible default for `addedSugarHighGoal`? AHA recommends <36g/day for men, <25g for women. Use those as suggested defaults during onboarding.
2. **Do we ever expose "natural sugar"** as a derived field (sugar − addedSugar)? Probably not useful. Skip.
3. **MCP estimation accuracy** — Claude is good at this but not perfect. Confidence threshold? Let the user accept/reject per ingredient?
4. **Backwards compatibility on `sugar`** — should we rename `sugar` to `totalSugar` for clarity, or leave as-is? Leave as-is to avoid churn. The existing field is total; the new field is added.

## Sequencing

Probably ships after the matrix view and before any monetization conversation. It's a real product gap that several Playbook stories would want to reference (anyone optimizing for diet quality). Not blocking matrix or favorites work.

## Playbook story this unlocks

**"Cutting added sugar across a whole rotation"** — User logs an average week, sees high added-sugar totals, uses MCP to identify the worst offender recipes, runs Optimization prompts to find lower-added-sugar versions, rebuilds the rotation. Before/after comparison.

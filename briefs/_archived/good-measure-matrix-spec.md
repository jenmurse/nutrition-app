# Good Measure — Matrix Planner View

## Spec for feature exploration

**Status:** Open exploration · not a closed decision
**Author:** Jen (with Claude)
**Date:** May 2026

---

## Context

The current Good Measure planner is a free-form weekly view where users add recipes and pantry items to days and slots. Nutrition shows as a daily summary, and a swap feature suggests substitutions when targets are exceeded.

This works well for casual planning. For users dialing in their diet (managing LDL, cutting added sugar, hitting protein targets, etc.) the workflow is friction-heavy: you add items, look at the summary, remove items, try different ones, look again. The swap suggestions help but feel reactive rather than exploratory.

This spec proposes an alternative **matrix view** of the planner — a tighter, more interactive grid that makes nutritional tradeoffs visible at the slot level, designed for users who want to systematically explore combinations against their targets.

---

## Primary problem to solve

When dialing in a diet, the question is rarely "what's the nutrition of this exact day?" It's:

- "What if I swap salmon for tuna at lunch?"
- "Does the Creami dessert push me over sugar?"
- "Can I have Thai Curry on a workout day or is sat fat too high?"

The current planner answers these one swap at a time. The matrix view answers them through fast iteration — change a dropdown, see the impact instantly, no add/remove cycle.

---

## Proposed approach

### 1. Toggle into matrix view from the planner

The free-form planner stays as the default. A view toggle (somewhere in the planner header — sibling to NUTRITION, EDIT etc.) switches into matrix mode. Same data, different presentation.

### 2. Day shape per column

In matrix mode, each day column has explicit named slots. The current planner's freeform structure becomes a defined skeleton: Breakfast, Lunch, Snack(s), Pre-workout, Dinner, Dessert.

The exact slots per day are user-configurable. A user might have:
- 5 slots Mon (Breakfast, Lunch, Snack, Pre-WO, Dinner, Dessert)
- 4 slots Tue (Breakfast, Lunch, Snack, Dinner, Dessert)
- 4 slots Sat (Breakfast, Snack, Snack, Dinner, Dessert — no lunch)

This shape is *the user's*, not Good Measure's. Set once per day, then dropdowns appear in each slot.

**Open question:** How is the day shape configured? Options worth exploring:
- Inline "+ add slot" / "remove slot" controls in matrix view
- A small modal per day where you check which slots are active
- Smart defaults based on tags or past behavior

### 3. Dropdowns per slot

Each slot is a dropdown of eligible recipes/items. "Eligible" needs definition. Options to consider:

- **Filtered by favorites** — only favorited recipes appear in dropdowns. Highest signal, smallest list. Limitation: pantry items aren't favoritable today.
- **Filtered by tag** — slot labeled "Breakfast" only shows recipes tagged breakfast. Less curation but more discoverable.
- **Filtered by favorites + tag** — favorites that match the slot tag. Probably the best default.
- **User-defined list per slot type** — e.g. user can select "these 6 recipes are my breakfast rotation" once, and they always populate the Breakfast dropdown. Requires new UI for managing those lists.

**Pantry items are also valid choices** — eggs, yogurt, etc. need to appear alongside recipes. This means favorites needs to extend to pantry items (small feature, could be its own ticket).

### 4. Per-slot info on selection

When you pick something from a dropdown, the slot shows:
- The name
- Calories (matches existing planner display)

That's it. The detail lives in the day totals — the matrix is about scanning, not reading.

### 5. Live day totals

Below each day column, a totals block shows all tracked metrics with target-aware color coding:

- Calories
- Protein
- Fat
- Saturated fat
- Sodium
- Carbs
- Sugar
- Fiber

Each total compares against the user's daily targets (which are already configurable in Good Measure). Color states:

- **Green** — within target range
- **Yellow** — close to limit (e.g. within 10% of upper bound)
- **Red** — over limit (or under for "want more" metrics like protein and fiber)

The thresholds for close/over should be tunable but reasonable defaults are fine to start.

### 6. Saved day plans

A "save day" action on each day column stores the day's full configuration as a named template:

- Day shape (which slots are active)
- The specific recipe/item in each slot
- Optional notes

These saved days appear in a library accessible from any day in any week. "Load saved day" replaces the current day's contents with the saved template.

**Open question:** How does this relate to the existing copy-week feature? Two reasonable answers:
- Saved days are a separate concept (templates, reusable forever)
- Saved days are a layer above weeks (a week is a sequence of saved days)

The first is simpler to build. The second is more powerful long-term.

### 7. Person toggle

Already exists in Good Measure (Jen/Garth/Everyone). Matrix view should honor it — targets and color coding update per person. Useful for households where one person is tracking more aggressively than the other.

---

## Design notes

The prototype I built (HTML/JS) does **not** match the Good Measure design system — that's expected. The implementation should use Good Measure's existing typography, spacing, color tokens, and component library.

The general layout that worked well in the prototype:
- 7-column grid (or fewer if hiding empty days)
- Each column ~180px wide on desktop
- Day header with date and day type label
- Slots stack vertically inside the column
- Dropdowns are compact (single line, name + kcal)
- Totals block at bottom of column, distinct visual treatment

On mobile this likely becomes a vertical stack with horizontal swipe between days, but that's a separate layout problem.

---

## Why this is useful (rationale)

The free-form planner is great for **planning what to eat**. The matrix view is for **deciding what to eat** — when you're optimizing against targets and need to see tradeoffs.

Two different jobs. Same data. The toggle keeps them as one product.

The matrix also handles a specific advanced use case well: users who have a relatively fixed weekly skeleton (oats Mon/Wed/Fri, shake Tue/Thu, egg breakfast weekends, etc.) and want to vary the components within that skeleton. The free-form planner makes this feel manual every week. The matrix + saved day plans turns it into a system.

---

## Out of scope (for now)

- Recipe creation/editing — happens elsewhere
- Pantry management — happens elsewhere
- Multi-week planning — current week scope only
- Shopping list generation — already exists, untouched

---

## Open questions summary

1. How does day shape get configured? Inline controls vs modal vs smart defaults?
2. How do dropdowns get populated? Favorites + tag, or user-defined lists, or something else?
3. Should favorites extend to pantry items? (Likely yes — small dependency.)
4. How do saved day plans relate to the existing copy-week feature?
5. What are reasonable defaults for "close to limit" thresholds in color coding?
6. Does this need separate Garth/Jen day plans, or are saved days household-level?

---

## Things explicitly not decided

- Whether matrix becomes the default for users dialing in their diet
- Whether the free-form planner ever shows nutrition this densely
- Whether saved day plans should also be shareable across households

# Brief 2J — Type register audit (investigation only)

**Status:** Complete (April 29, 2026) — investigation + fix landed in one session
**Type:** Investigation → became patch
**Depends on:** 2I.1 (parallel; not blocking)
**Blocks:** A future 2J.1 fix brief, plus Step 10 (type pass)

---

## Why

The user has flagged inconsistent typeface usage across labels, eyebrows, toolbar items, and small-caps elements. Specific evidence: in the recipes toolbar and adjacent dropdown, "DINNER" renders with a sans-serif capital I (DM Sans) while "SODIUM" in the same visual zone renders with a serifed capital I (DM Mono). Both should be in the same register; they're not.

This appears to be widespread across the app. Without an inventory, we can't write a fix. This brief is investigation only.

The user has also identified a quick visual diagnostic: **the capital I is the giveaway**. DM Mono's capital I has top and bottom serifs (horizontal strokes). DM Sans's capital I is a plain vertical stroke. Anywhere a capital I appears in uppercase text, you can identify the register at a glance.

---

## What we need

A complete inventory of every text element in the app where the register choice (DM Mono vs DM Sans) is part of the design language. For each element:

1. **Selector** (CSS class or component name)
2. **Where it appears** (which page/surface, which UI region)
3. **Computed `font-family`** (the actual value rendered, not the class declaration — use DevTools)
4. **What we believe it should be** based on the pattern (Mono for eyebrows/labels/toolbar/small-caps; Sans for content/headings/body)
5. **Match or divergence** flag

The intent is to catch every place where the implemented `font-family` doesn't match the design intent.

---

## Methodology

### Step 1 — Identify the categories

Group every text element into one of these registers based on design intent:

**Should be DM Mono (`var(--mono)` or `var(--font-mono)`):**
- Eyebrows (e.g. `§ STEP TWO · TUESDAY, APRIL 28`)
- Toolbar items (filter labels, sort labels, count text, view toggles)
- Field labels (RECIPE NAME, SERVINGS, PREP TIME, etc.)
- Small-caps category labels (CANNED & JARRED, NUTS & SEEDS, etc.)
- Stat units and values in lists (kcal, g, mg, "219 kcal", "9g fat")
- Sidebar nav labels (01 BASICS, 02 PHOTO, etc.)
- Dropdown menu items in toolbar dropdowns
- Step counters (01, 02, 03 prefixes)
- Any uppercase letterspaced label

**Should be DM Sans (`var(--sans)` or `var(--font-sans)`):**
- Page headings ("Pick a meal type.", "New Recipe", "A week of meals.")
- Body text (descriptions, paragraphs)
- Form input values (the actual user-typed content)
- Recipe names, ingredient names, item names (content, not labels)
- Buttons with sentence-case labels (the cream import / upload buttons in image 2 — "IMPORT" / "UPLOAD FILE" — these read uppercase but are buttons, not labels; flag for review whether they should be Mono or Sans)
- Dropdown selected-value text (e.g. "servings" in the SERVING UNIT dropdown)
- Any prose

### Step 2 — Walk every surface

Visit each of these surfaces in DevTools. For each text element on the page, identify selector → computed font-family → expected register → match or divergence.

Surfaces to walk:

1. Landing page
2. Auth (sign in, create)
3. Onboarding (each step)
4. Onboarding checklist
5. Dashboard
6. Planner (full week view)
7. Add Meal Step 1 (Pick a meal type)
8. Add Meal Step 2 (Pick a breakfast / lunch / etc.)
9. Recipes index (grid view)
10. Recipes index (list view)
11. Recipes index in compare mode
12. Nutrition comparison page
13. Recipe detail (existing recipe)
14. Recipe new
15. Recipe edit
16. Pantry index (grid view)
17. Pantry index (list view)
18. Pantry detail
19. Pantry new
20. Pantry edit
21. Settings (all tabs)
22. Shopping list
23. All mobile sheets (filter, sort, planner add-meal sheet, settings jump nav, anywhere a sheet renders)
24. The mobile bottom rail (MENU / PAGE NAME)
25. Any modal or overlay (compare modal, etc.)

### Step 3 — Special focus on known suspects

The user has already flagged these specific inconsistencies. Investigate each first:

- **Recipes toolbar:** ALL / BREAKFAST / LUNCH / DINNER / SIDE / SNACK / DESSERT / BEVERAGE / FAVORITES / 65 RECIPES / COMPARE / NAME / GRID / LIST / SEARCH / + NEW. Report the font-family for each.
- **Recipes toolbar sort dropdown:** NAME / CALORIES / FAT / SAT FAT / SODIUM / CARBS / SUGAR / PROTEIN / FIBER. Report the font-family for each.
- **New Recipe form labels:** RECIPE / NEW (eyebrow) / 01 BASICS (sidebar) / IMPORT RECIPE / RECIPE NAME / SERVINGS / SERVING UNIT / PREP TIME (MIN) / COOK TIME (MIN) / TOTAL TIME / TAGS. Report the font-family for each.
- **Pantry list view:** ALL / ITEMS / INGREDIENTS / 225 ITEMS / GRID / LIST / SEARCH / + ADD. Plus category labels (CANNED & JARRED, NUTS & SEEDS, BAKING, DAIRY & EGGS, ALCOHOL, PRODUCE). Plus stat units (kcal, fat, carbs, prot). Report each.
- **Eyebrows everywhere:** any text that starts with `§` (e.g. `§ STEP TWO · TUESDAY, APRIL 28`, `§ APR 26 – MAY 2`, `§ NO RECIPES YET`). Report each.

### Step 4 — Output format

Return a markdown table:

```
| Selector | Surface | Computed font-family | Expected register | Match? |
|----------|---------|----------------------|-------------------|--------|
| .ed-toolbar-tab | Recipes toolbar | "DM Sans", sans-serif | Mono | DIVERGENCE |
| .ed-count | Recipes toolbar | "DM Mono", monospace | Mono | match |
| ... | ... | ... | ... | ... |
```

Group the table by surface. Highlight divergences clearly so they're easy to scan.

### Step 5 — Don't fix anything

This is investigation only. Do not change any CSS or component code. The fix will be a separate brief (2J.1) once we've reviewed the inventory together and decided what should change.

---

## Out of scope

- Sizing or leading changes (Step 10 territory)
- Weight changes within a register (e.g. DM Mono regular vs DM Mono medium) — flag those if obvious but don't audit them comprehensively
- Marketing pages (separate audit if needed)
- Decisions about which register is "right" — for now, follow the design-system docs and the patterns above. We'll review the inventory and decide on edge cases together.

---

## Why investigation-first

The user and I cannot reliably diagnose register issues from screenshots. We need DevTools-level confirmation. Writing a fix without an inventory means guessing, missing surfaces, and likely needing a 2J.2, 2J.3, etc. Better to spend the time once on a complete inventory and then write a clean fix brief.

---

## Doc updates after this lands

None yet. The fix brief (2J.1) will handle doc updates after we've decided what changes.

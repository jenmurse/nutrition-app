# Brief 17 — Empty states editorial treatment + remaining action dialogs

Two related polish items bundled because they both extend work from earlier briefs.

## Part 1 — Empty state icons → editorial typographic treatment

Empty state pages currently use illustrated SVG icons (book for Recipes, fork+knife for Pantry, calendar for "no plan this week" on Planner and Dashboard, plus likely others). These are the only illustrative elements left in the system and don't match the editorial language of the rest of the app — typography, hairlines, and `§` eyebrows are how the app communicates everywhere else.

**Fix:** remove the icons. Replace each empty state with an editorial typographic moment using the same eyebrow + headline + lede + CTA pattern as the landing and onboarding.

### Pattern (apply to every empty state)

```
§ NO RECIPES YET

An empty library.

Build it from scratch, or import recipes
you already love.

[+ NEW RECIPE →]
```

### Spec

- Eyebrow `§ NO RECIPES YET` — DM Mono 9px, letter-spacing 0.14em, uppercase, color `var(--muted)`. Margin below: 24px.
- Headline — DM Sans 500, 36px, letter-spacing -0.025em, line-height 1.05, color `var(--fg)`. Margin below: 20px.
- Lede — DM Sans 13px, line-height 1.7, color `var(--fg-2)`, max-width ~40ch, with `<br/>` for natural line break. Margin below: 40px.
- CTA — existing outlined button treatment (`.btn-outline`), sharp, unchanged.

Vertical centering: the empty state stack sits centered in the available viewport area. The whole composition is centered horizontally (text-align: center).

### Headline + lede copy per surface

| Surface | Eyebrow | Headline | Lede |
|---|---|---|---|
| Recipes | `§ NO RECIPES YET` | An empty library. | Build it from scratch, or import recipes<br/>you already love. |
| Pantry | `§ NO INGREDIENTS YET` | An empty pantry. | Add what you cook with often,<br/>or look it up as you go. |
| Planner (no plan this week) | `§ NO PLAN THIS WEEK` | A blank week. | Drop in recipes for the days ahead<br/>and the nutrition math handles itself. |
| Search no results | `§ NO MATCHES` | Nothing matches that. | Try a different search, or clear the filters<br/>to see everything. |
| Favorites empty | `§ NO FAVORITES YET` | Nothing starred. | Star recipes you love so they're easy<br/>to find later. |

The "An empty X / A blank X" pattern recurs across the three main empty states for parallelism. Search and Favorites use different patterns because their context is different (they're filtered states, not unfilled states).

### Surfaces to update

- Recipes — remove book icon
- Pantry — remove fork+knife icon
- Planner — remove calendar icon from "NO PLAN THIS WEEK" state, also any per-day empty state if applicable
- Dashboard "NO PLAN THIS WEEK" inline state — same treatment as the Planner empty state
- Recipe search no results — apply Search pattern
- Favorites filter empty — apply Favorites pattern
- Any other empty state surfaces in the app — sweep and remove icons everywhere
- Mobile equivalents — same icons appear on mobile, remove there too

### Files likely affected

- `app/components/EmptyStateIcons.tsx` (or similar) — delete the file entirely once nothing imports it
- `app/recipes/page.tsx`, `app/pantry/page.tsx`, `app/planner/page.tsx`, `app/page.tsx` (dashboard) — replace icon usage with the new typographic empty state

If there's a shared `<EmptyState>` component, update it once. If empty states are inline per-page, sweep them all and consider extracting a shared `<EmptyState>` component as part of this work.

---

## Part 2 — Action dialogs sweep

Brief 16d swept confirmation dialogs (delete recipe, remove member, etc.) into spec. But action dialogs — the ones that aren't confirmations but rather "do a thing" interactions — are still using legacy rounded styling with pill buttons.

### Surfaces still wrong

1. **Select meal type dialog** (Planner "+ ADD" → opens dialog with Breakfast / Lunch / Dinner / Side / Snack / Dessert / Beverage). Rounded corners, oversized typography (24px+), looks completely different from the rest of the system.

2. **Add to meal plan dialog** (Recipe → "+ Add to plan" → opens dialog with RECIPES/ITEMS tabs, search, category chips, ADD TO PLAN button). Rounded corners, pill-shaped chips inside, pill ADD TO PLAN button, coral underline on the active tab.

Both dialogs need to match `design-system.md §5h` modal spec — same as the confirmation dialogs from 16d.

### Fix for each

Container (both dialogs):
- `border-radius: 0` (sharp)
- `border: 1px solid var(--rule)`
- `background: var(--bg)`
- Sharp dismiss `✕` button in DM Mono, no circular background

Buttons inside (both dialogs):
- Sharp rectangles per the new button rule
- CANCEL = `.btn-ghost` (text only, no border)
- Primary action (ADD TO PLAN, or whatever applies) = `.btn-primary` (filled black) — it's the page primary action within this dialog
- DM Mono 9px, letter-spacing 0.14em, uppercase, `padding: 8px 14px` (or whatever post-15a padding is)

### Specifically for the Select meal type dialog

- The 7 meal type options (Breakfast, Lunch, Dinner, etc.) should be ruled rows or a tighter grid, not oversized clickable text
- Options: DM Sans 13px (or 14px max), not 24px+
- One option per row in a single column, separated by `border-bottom: 1px solid var(--rule)` (ruled-row pattern), OR a 2-column grid with the same hairline separators
- Header: "Select meal type" → DM Mono 9px eyebrow style, NOT a large heading. Or drop the header entirely and let the options speak for themselves.

### Specifically for the Add to meal plan dialog

- RECIPES / ITEMS tabs: black underline on active, NOT coral. Match the tab pattern from `design-system.md §5c`.
- Category chips (Breakfast, Lunch, Dinner, etc.): match the filter chip pattern from the toolbar — bare DM Mono 9px, no border, active state is a 1.5px underline below the text. NOT pill-shaped.
- Recipe rows: ruled row with name + serving info, no pill or card. `border-bottom: 1px solid var(--rule)` between rows.
- Search input: bottom-border-only, no rounded box, matching the existing `.input` style. The placeholder "Find recipe..." stays.
- Servings input: same bottom-border-only style.
- ADD TO PLAN button: filled black sharp rectangle. Disabled state when no recipe is selected.
- CANCEL button: ghost text link, left of ADD TO PLAN.

### Verify after fix

- Open Planner, click + ADD on a day. Meal type dialog appears with sharp corners, tighter typography, and the meal types as ruled rows or compact grid.
- Open Recipe detail (or wherever this dialog opens from), click + Add to plan. Sharp corners, no pill chips, black active underline on RECIPES tab.
- Both dialogs match the visual language of the confirmation dialogs from 16d.
- No coral or pill shapes remain on either dialog.

---

## Files

Empty states:
- `app/components/EmptyStateIcons.tsx` — delete if unused after sweep
- `app/components/EmptyState.tsx` (new, or update existing if present) — shared component
- All page-level empty state usages

Action dialogs:
- `app/components/MealTypePicker.tsx` (or wherever the meal type picker lives)
- `app/components/AddToMealPlan.tsx` (or wherever the add-to-meal-plan dialog lives)
- May share styles with the confirmation dialog component from 16d — consolidate where possible

## Acceptance

After merge, walk through:

1. New user with no recipes → recipe page shows the typographic empty state with no icon, headline "An empty library."
2. New user with no ingredients → pantry shows the typographic empty state with no icon, headline "An empty pantry."
3. New user, no meal plan this week → both dashboard and planner show the typographic empty state with no icon, headline "A blank week."
4. Search with no results → typographic empty state, headline "Nothing matches that."
5. Favorites filter with no favorites → typographic empty state, headline "Nothing starred."
6. `EmptyStateIcons` component (if it existed) is deleted, no orphan imports remain.
7. Open Planner → click + ADD on any day. Meal type picker dialog appears with sharp corners, compact typography, ruled rows.
8. Open a recipe → click + Add to plan. Dialog appears with sharp corners, black active tab underline (not coral), bare-mono category chips with underline-active (not pills), filled black ADD TO PLAN button.
9. All confirmation AND action dialogs across the app now share the same visual language.

## Effort

Medium. Empty states are mostly mechanical sweeps with locked copy. Action dialogs are a real rebuild — the meal type picker and add-to-plan dialog need their internal layouts redone, not just `border-radius` fixes. Probably 2–3 hours.

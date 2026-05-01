# BRIEF SHOP-1 — Shopping list: plan-scoped logic + empty state

**Part of:** Step 3 stragglers / pre-Step 4 bug fix.
**Scope:** Single PR. Shopping page logic fix + empty state (desktop + mobile). No other pages touched.
**Depends on:** Nothing.
**Blocks:** Nothing.

---

## Why this brief

Two related problems:

**1 — Wrong plan scope.** The shopping cart icon in the planner always navigates to the shopping list for the current calendar week, regardless of which week the user is viewing in the planner. If the user is viewing a future or past week with a meal plan, the shopping page shows that same current-week list. If the user views a week with no plan (the empty planner state), the shopping page still loads the current-week list. The shopping page should always reflect the week the user was viewing when they tapped the cart.

**2 — Missing empty state.** When a plan exists for the week but has no ingredients (zero recipes added), the shopping page currently renders "No ingredients in this week's plan" as a single line in DM Mono. This does not match the locked empty state pattern used on Recipes, Pantry, and Planner (§ eyebrow / display headline / lede / outlined CTA). It needs to be replaced.

---

## Fix 1 — Plan-scoped navigation

### Current behavior

The shopping cart button (in the planner toolbar or bottom rail right slot) navigates to `/shopping` with no week context passed. The shopping page then resolves to the current calendar week's plan independently.

### Correct behavior

The shopping page should always show the shopping list for the week the user was viewing in the planner when they tapped the cart.

**Implementation:**

Pass the week start date as a URL param when navigating to the shopping page.

```
/shopping?week=2026-04-26
```

The `week` param should be the ISO date string of the Monday (week start) of the planner week in view. This matches however the planner already tracks the current week in its own state.

The shopping page reads this param on load:
- If `week` param is present: load the meal plan for that week.
- If `week` param is absent (direct URL, bookmark, share link): fall back to the current calendar week. This preserves the existing share behavior — shared shopping list URLs don't include a week param, so they resolve to the recipient's current week or can be updated to include the param if desired (out of scope for this brief).

**Where to add the param:**
- Desktop planner toolbar: the cart icon button that opens the shopping page. Update the `href` or `onClick` navigation to append `?week=<weekStart>`.
- Mobile bottom rail right slot: on Add Meal screens, the right slot shows date/person. On the planner, the right slot shows `RECIPES` / `PLANNER` etc. The cart access on mobile is via the menu sheet (SHOPPING link). Update that link to also pass the week context if the user is navigating from the planner. If the week context isn't available in the menu sheet (since it's a global overlay), fall back to the current week for menu-sheet-initiated navigation. This is acceptable — the menu sheet path is a secondary entry point.
- If there are any other entry points to `/shopping` in the codebase, audit and update them to pass the param where the week context is available.

**No change to the shopping page URL structure for shared links.** The SHARE button behavior is unchanged. Shared URLs resolve to the current week for the recipient, which is existing behavior.

---

## Fix 2 — Empty state

### Two distinct empty conditions

| Condition | Current behavior | Correct behavior |
|---|---|---|
| Week has a plan but zero ingredients (no recipes added yet) | "No ingredients in this week's plan" in DM Mono | Empty state: § eyebrow + display headline + lede + CTA |
| Week has no plan at all | Unknown / untested | Empty state: different copy (see below) |

Both conditions need an empty state. They are visually identical in structure but have different copy.

### Empty state spec

Matches the locked pattern from Planner ("A blank week."), Pantry ("An empty pantry."), and Recipes ("An empty library." or equivalent).

**Structure:**

```html
<div class="shop-empty">
  <p class="eyebrow">§ NO INGREDIENTS YET</p>
  <h1 class="shop-empty-headline">A week without a list.</h1>
  <p class="shop-empty-lede">Add recipes to your plan and the ingredients show up here, sorted and ready to shop.</p>
  <a href="/meal-plans" class="ed-btn">+ ADD MEALS →</a>
</div>
```

**Copy — condition A: plan exists, no recipes added**

```
§ NO INGREDIENTS YET

A week without a list.

Add recipes to your plan and the ingredients show up here, sorted and ready to shop.

[+ ADD MEALS →]
```

CTA navigates to `/meal-plans` (the planner), passing the same `?week=<weekStart>` param so the user lands on the right week. If the week context is available on the shopping page (it should be, from the URL param), append it.

**Copy — condition B: no plan exists for this week**

```
§ NO PLAN THIS WEEK

A blank shopping list.

Create a plan for this week, add some recipes, and the ingredients will be waiting here.

[+ CREATE PLAN →]
```

CTA navigates to `/meal-plans` (the planner), passing the week param.

### Styles

The empty state is centered vertically and horizontally in the page content area (below the shopping page header). It follows the exact visual pattern used on the Planner and Pantry empty states.

```css
.shop-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  padding: 80px var(--pad);
  min-height: 40vh;
}

.shop-empty .eyebrow {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.shop-empty-headline {
  font: 700 clamp(36px, 4.4vw, 64px) var(--font-sans);
  letter-spacing: -0.03em;
  line-height: 1.0;
  color: var(--fg);
  text-wrap: balance;
  margin: 0;
}

.shop-empty-lede {
  font: 400 13px var(--font-sans);
  color: var(--fg-2);
  line-height: 1.7;
  max-width: 360px;
  text-wrap: pretty;
  margin: 0;
}
```

The CTA uses the existing `.ed-btn` outlined class — same as the Planner and Pantry empty state CTAs. Not filled black. This is not a primary commit action; it's a navigation prompt.

**The existing shopping page header ("A week of meals." + eyebrow + HIDE CHECKED / SHARE) should NOT render when the page is in an empty state.** The header implies content exists. Replace the entire page content with the empty state component. HIDE CHECKED and SHARE are irrelevant when there are no ingredients.

### Desktop layout

The empty state occupies the full content area of the shopping page, vertically centered in the space where the ingredient list would appear. The shopping page header (`§ APR 26 – MAY 2 / A week of meals.`) is replaced by the empty state entirely -- no eyebrow, no headline, no HIDE CHECKED / SHARE controls.

### Mobile layout

Same structure. The empty state centers in the scroll area below any persistent chrome. No changes to the bottom rail. SHARE in the bottom rail right slot should be hidden or replaced with a neutral section locator (e.g. `SHOPPING`) when the page is empty, since there is nothing to share.

If the bottom rail right slot is driven by route rather than content state, it may be simplest to always show `SHOPPING` on the mobile shopping route and only show `SHARE` when the page has content. Update this logic if feasible; if it requires significant refactor, leave the rail as-is and note it for a future cleanup.

---

## Verification

**Logic:**
- Navigate to the planner. View the current week with an empty plan. Tap the cart / navigate to Shopping. Confirm the shopping page shows the empty state (condition A or B depending on whether a plan object exists).
- Navigate to the planner. Use the week navigation to move to a future week with no plan. Tap the cart. Confirm the shopping page shows the correct empty state for that week, not the current week's content.
- Navigate to the planner. View a week with a real plan and ingredients. Tap the cart. Confirm the shopping page shows that week's ingredients.
- Navigate to Shopping via the menu sheet (mobile). Confirm it still resolves to a reasonable week (current week fallback is acceptable for menu-sheet entry).

**Empty state visual:**
- The empty state renders centered in the content area.
- Eyebrow is 9px DM Mono uppercase muted, with § prefix.
- Headline is DM Sans 700, tracking -0.03em, line-height 1.0, appropriate clamp range.
- Lede is DM Sans 13px, color `var(--fg-2)`, line-height 1.7.
- CTA is outlined (not filled black), DM Mono 9px uppercase.
- No shopping page header elements (eyebrow, "A week of meals.", HIDE CHECKED, SHARE) render when empty.
- On mobile, the bottom rail right slot shows `SHOPPING` (not `SHARE`) when the page is empty.

**No regressions:**
- Shopping page with real content is unchanged.
- HIDE CHECKED works as before when content exists.
- SHARE works as before when content exists.
- No other planner page behavior changed.
- The `?week=` param is present in the URL when navigating from the planner cart button; absent when using a direct URL or share link.

---

## Out of scope

- Redesigning the shopping list layout when it has content.
- Changes to the SHARE behavior or share link format.
- Adding a "discard" or confirmation step when navigating from shopping to planner.
- Mobile swipe gestures on shopping list rows.
- Any planner page changes beyond passing the week param from the cart button.
- The shopping page's `HIDE CHECKED` behavior is unchanged.
- Recipe-level empty states or planner column empty states.

---

## Files most likely affected

- Shopping page component (`app/shopping/page.tsx` or equivalent)
- Shopping page route / URL param reading
- Planner toolbar cart button (desktop) -- add `?week=<weekStart>` param
- Mobile menu sheet SHOPPING link -- add week param if week context is available at render time; otherwise leave as current-week fallback
- `globals.css` -- add `.shop-empty`, `.shop-empty-headline`, `.shop-empty-lede` (or confirm the existing empty state classes from other pages can be reused directly)

Before adding new CSS classes, check whether the existing empty state pattern from Pantry or Planner already has reusable classes. Prefer reuse over duplication -- the visual spec is identical.

---

## Notes for the implementer

- The "A week of meals." headline and the `§ APR 26 – MAY 2` eyebrow currently render as the shopping page header even when empty. These are content-dependent and should be conditionally rendered only when the ingredient list has items.
- "No ingredients in this week's plan" (the current mono fallback text) should be fully removed and replaced by the empty state component described here.
- The two empty-state conditions (plan exists but empty vs. no plan) can share one component with props controlling copy and CTA destination. This avoids duplicating the layout.
- If distinguishing "plan exists with 0 recipes" from "no plan at all" requires an additional API field, confirm the shopping page API already returns enough information to make this distinction. If not, the simpler fallback is to use condition A copy for both cases -- "A week without a list." is accurate for both.

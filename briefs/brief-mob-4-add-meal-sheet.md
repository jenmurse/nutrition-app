# BRIEF MOB-4 — Add Meal: step 1 as bottom sheet

**Part of:** Step 4 mobile audit.
**Scope:** Single PR. Mobile only. Changes Add Meal step 1 from a full page to a bottom sheet. Fixes the duplicate `← BACK` row on step 2. Desktop is unchanged.
**Depends on:** MOB-1 (top bar pattern).
**Blocks:** Nothing.

---

## Why this brief

Add Meal is a two-step flow:
- **Step 1** — pick a meal type (Breakfast / Lunch / Dinner / Side / Snack / Dessert / Beverage / Pantry Items)
- **Step 2** — pick a recipe from the filtered list

Step 1 is currently a full page navigation. This is the wrong pattern. Step 1 is an interruption of the planner — a short choice (8 items) triggered by tapping a day. It doesn't need its own page. Treating it as a page causes two problems:

1. **No persistent chrome signals a broken state.** After MOB-1, step 1 has no top bar (it was an exception), which looks like a bug rather than a deliberate choice.
2. **Step 2 has a duplicate back row.** When MOB-1 added the top bar to step 2 (`← BACK` left, `FRI, MAY 1 · JEN` right), the old in-content `← BACK` row wasn't removed. Two back links on one screen.

The fix: step 1 becomes a bottom sheet that rises over the planner. Step 2 stays a full page with the correct top bar. The sheet pattern makes the "no top bar" intentional and expected rather than broken-looking.

---

## Step 1 — bottom sheet

### Trigger
The sheet opens when the user taps the "+ ADD MEAL" affordance on a planner day, or taps an empty meal slot. The trigger source is unchanged -- only the presentation of step 1 changes.

### Sheet behavior
- Slides up from the bottom over the planner. The planner remains visible behind a scrim.
- Scrim: `rgba(0,0,0,0.28)`, covers the full viewport behind the sheet.
- Tapping the scrim dismisses the sheet and returns to the planner (no navigation).
- Dragging the sheet down dismisses it (existing sheet drag-to-dismiss behavior).
- The sheet uses the existing `.mob-sheet` component with its locked `border-radius: 0 0 8px 8px` exception (after MOB-CLEANUP-1 ships the direction flip -- top corners sharp, rounded bottom). If MOB-CLEANUP-1 hasn't shipped yet, use `border-radius: 8px 8px 0 0` (current direction).

### Sheet contents

```html
<div class="mob-sheet add-meal-sheet">
  <div class="mob-sheet-handle"></div>
  <div class="add-meal-sheet-eyebrow">§ FRIDAY, MAY 1</div>
  <div class="add-meal-sheet-rows">
    <button class="add-meal-type-row">Breakfast <span>→</span></button>
    <button class="add-meal-type-row">Lunch <span>→</span></button>
    <button class="add-meal-type-row">Dinner <span>→</span></button>
    <button class="add-meal-type-row">Side <span>→</span></button>
    <button class="add-meal-type-row">Snack <span>→</span></button>
    <button class="add-meal-type-row">Dessert <span>→</span></button>
    <button class="add-meal-type-row">Beverage <span>→</span></button>
    <button class="add-meal-type-row">Pantry Items <span>→</span></button>
  </div>
</div>
```

**Sheet eyebrow:** `§ FRIDAY, MAY 1` (or the current date in context). 9px DM Mono uppercase `var(--muted)`. Padded `var(--pad)` left. Sits below the drag handle.

**Meal type rows:** Each row is a full-width tap target. Font: DM Sans 16px 600. Right-aligned `→` arrow. `border-bottom: 1px solid var(--rule)` between rows. Padding: 16px `var(--pad)`. Last row has no bottom border.

**No title, no "Add a meal." headline.** The eyebrow + the context of where the user came from (the planner) is sufficient. The sheet is a picker, not a page.

**No top bar, no wordmark, no hamburger.** Sheets never have top bars. The drag handle and scrim communicate dismissal.

### Sheet height
The sheet should be tall enough to show all 8 rows without scrolling, plus the eyebrow and handle. If the viewport is too short (older/smaller devices), the sheet should scroll internally rather than cut off rows. Use `max-height: 80vh; overflow-y: auto` on the sheet.

### Styles

```css
.add-meal-sheet-eyebrow {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 var(--pad) 12px;
}

.add-meal-type-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px var(--pad);
  border: none;
  border-bottom: 1px solid var(--rule);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 16px;
  font-weight: 600;
  color: var(--fg);
  text-align: left;
  cursor: pointer;
}
.add-meal-type-row:last-child { border-bottom: none; }
.add-meal-type-row span { color: var(--muted); font-weight: 400; }
.add-meal-type-row:active { background: var(--bg-2); }
```

### On selection
Tapping a meal type row:
1. Dismisses the sheet (no scrim fade delay -- instant dismiss).
2. Navigates to step 2 as a full-page push, passing the selected meal type and the day context (date, person).

The sheet dismissal and the step 2 navigation happen together -- the user should perceive it as a single transition: sheet goes away, step 2 appears.

---

## Step 2 — full page, corrected top bar

Step 2 is already a full page. The only change here is removing the duplicate in-content `← BACK` row that was left over from the pre-MOB-1 implementation.

### Remove the in-content back row
The step 2 page currently renders a `← BACK` row (with a hairline below) as the first element inside the page content, below the top bar hairline. This row was the pre-MOB-1 back navigation. The top bar now handles back navigation via its left slot. Remove the in-content row entirely.

After removal, step 2 should look like:

```
[top bar: ← BACK  |  FRI, MAY 1 · JEN]
[hairline]
[page content: § FRIDAY, MAY 1 eyebrow]
[Add a breakfast. headline]
[search + servings row]
[recipe list]
```

No back row, no extra hairline between the top bar and the eyebrow.

### Top bar (unchanged from MOB-1 spec)
- Left: `← BACK` — tapping navigates back to the planner. Does not re-open the step 1 sheet (the user has already made their meal type choice; going back means cancelling the add-meal flow entirely and returning to the planner).
- Right: `FRI, MAY 1 · JEN` — date and active person. 9px DM Mono uppercase `var(--muted)`.
- No wordmark. No hamburger. This is a focused flow screen.

---

## Desktop

Desktop Add Meal is unchanged. The desktop flow uses a different pattern (sidebar rail + inline picker). This brief is mobile only.

---

## Verification

**Step 1:**
- Tapping "+ ADD MEAL" on the planner opens the bottom sheet. The planner is visible behind the scrim.
- Sheet contains the drag handle, `§ [DAY, DATE]` eyebrow, and 8 meal type rows.
- Tapping the scrim dismisses the sheet. Planner is restored to normal (no scrim).
- Dragging the sheet down dismisses it.
- Tapping a meal type dismisses the sheet and navigates to step 2.
- All 8 rows are visible without scrolling on a standard iPhone viewport (375x667 and larger).
- No top bar, no wordmark, no hamburger inside the sheet.

**Step 2:**
- Top bar: `← BACK` left, `FRI, MAY 1 · JEN` right.
- No duplicate in-content `← BACK` row below the top bar hairline.
- Page content starts immediately with `§ FRIDAY, MAY 1` eyebrow below the top bar.
- `← BACK` returns to the planner, not to a step 1 page.
- The selected meal type from step 1 is reflected in the headline ("Add a breakfast.", "Add a dinner.", etc.) and the recipe list filter.

**No regressions:**
- Desktop Add Meal flow is unchanged.
- Other bottom sheets (filter, sort, new plan) are unchanged.
- The planner page is unchanged.
- Navigating back from step 2 lands on the planner at the correct day/week.

---

## Out of scope

- Desktop Add Meal — unchanged.
- The recipe list content and search behavior on step 2 — unchanged.
- The servings input on step 2 — unchanged.
- Adding a "Pantry Items" flow variant — the sheet lists it as a row; the flow it leads to is an existing concern, not changed here.
- Any animation refinements beyond the standard `.mob-sheet` enter/exit — those are covered in MOB-CLEANUP-1 Fix 1.
- The planner's "+ ADD MEAL" button or tap target design — out of scope.

---

## Files most likely affected

- Add Meal step 1 component — convert from page to sheet, remove page wrapper, add sheet markup.
- Add Meal step 2 component — remove in-content `← BACK` row.
- Planner component — update the trigger to open the sheet instead of navigating to a route.
- Router — the `/add-meal` or `/add-meal/step-1` route may no longer be needed if step 1 is purely a sheet. Confirm whether to keep the route (as a fallback for deep links) or remove it. If removed, ensure no other part of the app navigates to it.
- `globals.css` — add `.add-meal-sheet-eyebrow`, `.add-meal-type-row` styles. Reuse `.mob-sheet` for the sheet container.

---

## Notes for the implementer

- The sheet uses the existing `.mob-sheet` component. Do not create a new sheet primitive — add a modifier class (`.add-meal-sheet`) for any sizing/content-specific overrides.
- The instant dismiss-then-navigate behavior (no delay between sheet closing and step 2 appearing) is intentional. A delayed dismiss followed by a page push would feel sluggish. The two transitions should overlap or sequence tightly.
- `← BACK` on step 2 goes to the planner, not to a step 1 sheet. The step 1 sheet is ephemeral -- it doesn't live in the navigation stack.
- The day and person context (date, meal type) must be passed from the sheet selection to step 2. Confirm the existing step 1 → step 2 data flow still works when step 1 is a sheet rather than a page. The data shape shouldn't change -- only where the selection happens.

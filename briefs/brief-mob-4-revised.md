# BRIEF MOB-4 — Add Meal: full-overlay sheet flow + planner day strip alignment

**Part of:** Step 4 mobile audit.
**Scope:** Single PR. Mobile only. Two fixes: (1) converts Add Meal into a full-overlay two-step sheet flow, (2) fixes the planner day strip left/right alignment. Desktop unchanged.
**Depends on:** MOB-1 (top bar). MOB-CLEANUP-1 and MOB-CLEANUP-1B (day strip fix attempted twice, still unresolved — this brief supersedes those attempts for the day strip).
**Blocks:** Nothing.

---

## Part 1 — Add Meal: full-overlay sheet flow

### Why

Add Meal is currently a two-step page-based flow that doesn't match the nutrition summary sheet pattern. The nutrition summary rises as a full-viewport-scrimmed overlay. Add Meal should feel identical — it's the same kind of interruption of the planner.

Currently:
- Step 1 exists as a page with no top bar (looks broken post-MOB-1)
- Step 2 is a full page with a top bar and a duplicate in-content `← BACK` row
- The scrim on step 1 only covers the planner content area, not the top bar — inconsistent with the nutrition summary

The fix converts both steps into a single continuous sheet overlay. The scrim covers the full viewport from the first tap to the last. The sheet expands from step 1 to step 2 without leaving the overlay. Tap the scrim at any point to cancel.

### The pattern

**Trigger:** User taps an add-meal affordance on a planner day. The full-viewport scrim appears and the step 1 sheet rises from the bottom.

**Scrim:** `rgba(0,0,0,0.28)`, `position: fixed; inset: 0; z-index: 40`. Covers everything — top bar, toolbar, day strip, planner content. Identical to the nutrition summary scrim. Tapping the scrim dismisses the entire overlay at any point in the flow.

**Step 1 sheet — meal type picker:**

```
[drag handle]
[§ FRIDAY, MAY 1  ← eyebrow, 9px DM Mono uppercase var(--muted)]
[Breakfast  →]
[Lunch  →]
[Dinner  →]
[Side  →]
[Snack  →]
[Dessert  →]
[Beverage  →]
[Pantry Items  →]
```

- Sheet sits at the bottom of the viewport. Height: tall enough to show all 8 rows without scrolling. Use `max-height: 75vh; overflow-y: auto` as a safety valve on small viewports.
- Drag handle: 22px wide, 2px tall, `var(--rule)` color, centered, `margin: 8px auto`.
- Eyebrow: `§ FRIDAY, MAY 1` (current date in context). 9px DM Mono uppercase `var(--muted)`. Padding `var(--pad)` left/right, 8px bottom.
- Rows: DM Sans 16px 600, full-width tap targets, `border-bottom: 1px solid var(--rule)`. Last row no border. `→` arrow on the right, `var(--muted)` color. Padding 16px `var(--pad)`. Active state: `background: var(--bg-2)`.
- No header row. No `← BACK`. No close button. The drag handle and scrim handle dismissal.
- `border-radius: 8px 8px 0 0` on the sheet top edge.

**Transition from step 1 to step 2:**

Tapping a meal type row expands the sheet to near-full-height. The scrim stays. The planner remains dimmed behind it throughout. The expansion should feel like the sheet growing upward, not a page navigation.

Implementation options (pick whichever fits the existing sheet system):
- Animate `height` or `max-height` from the partial height to `calc(100vh - 60px)` (leaving ~60px of scrimmed planner visible at the top).
- Or: replace the sheet content in place while animating the height change.
- The transition duration should match the existing sheet enter: 360ms `var(--ease-out)`.

**Step 2 sheet — recipe picker:**

```
[drag handle]
[§ FRIDAY, MAY 1  ← eyebrow]
[Add a breakfast.  ← headline, DM Sans 700 ~28px]
[SEARCH FIND RECIPE… | SERVINGS 1  ← search + servings row]
[recipe list rows]
```

- Same drag handle as step 1.
- Same eyebrow pattern. `§ FRIDAY, MAY 1`.
- Headline reflects the selected meal type: "Add a breakfast.", "Add a lunch.", "Add a dinner.", etc.
- Search + servings row: same pattern as the current step 2 implementation. No changes to search behavior or servings input.
- Recipe list rows: same as current step 2.
- **No header row.** No `← BACK`. No `FRI, MAY 1 · JEN` context line. No hairline below the drag handle. The eyebrow carries the date context. The headline carries the meal type context.
- The sheet is scrollable if the recipe list is long.

### Dismissal

- **Tap scrim:** dismisses the entire overlay from any step. Returns to planner. No confirmation.
- **Drag sheet down:** dismisses the entire overlay. Returns to planner.
- **Select a recipe:** adds the meal, dismisses the overlay, returns to planner at the correct day.
- There is no "back to step 1" from step 2. If the user wants a different meal type they tap the scrim and start over. This is the right tradeoff — the step 1 choice is fast (8 rows, one tap) and restart is low cost.

### What gets removed

- The Add Meal step 1 page route (or convert to a no-op redirect if deep links exist).
- The Add Meal step 2 page route (same consideration).
- The step 2 top bar (`← BACK` left, `FRI, MAY 1 · JEN` right) — replaced by the sheet header-less pattern.
- The in-content `← BACK` row on step 2 — removed entirely.
- Any `--bottom-nav-h` padding adjustments that were applied to these routes post-MOB-1.

### Desktop

Desktop Add Meal flow is unchanged. This brief is mobile only.

---

## Part 2 — Planner day strip alignment

### Why

The planner day strip (SU 26 / MO 27 / TU 28 ... SA 2) is more inset than the toolbar rows above it. This has been attempted in MOB-CLEANUP-1 and MOB-CLEANUP-1B and has not landed. This attempt includes mandatory devtools verification steps before and after the fix.

### Target

The SU day cell's left content edge and the SA day cell's right content edge should align with the left/right edges of the content in the toolbar row directly above (APR 26 – MAY 2 text on the left, + NEW PLAN button on the right). All three rows — top bar, planner toolbar, day strip — share the same horizontal boundary: `var(--pad)` from each screen edge.

### Mandatory pre-fix inspection

Before writing any code, open the planner in Chrome devtools on a 375px mobile viewport.

1. Click on the SU day cell. In the computed styles panel, note the element's left offset from the viewport edge. Write it down.
2. Click on the APR 26 – MAY 2 text. Note its left offset from the viewport edge.
3. They should be equal. If they are not, identify every element in the DOM between the viewport edge and the SU cell content that contributes left offset (padding, margin, or transform). List them all.
4. The fix must zero out all sources of excess inset on the day strip side, or add matching padding on the toolbar side, until the two left offsets are equal.

### The fix

The day strip container needs `padding-left: var(--pad); padding-right: var(--pad)`. The 7 day cells inside must have no additional left/right padding or margin of their own.

Common failure modes from prior attempts:
- The fix was applied to a parent wrapper, but the day cells themselves have `padding` or `margin` adding extra inset. Fix: remove cell-level horizontal padding.
- The class name assumed in the brief (`.pl-day-strip`) doesn't exist in the codebase. The fix was applied to a non-existent selector. Fix: find the actual component/class by inspecting in devtools.
- The padding was applied as a Tailwind class that gets overridden by a more specific rule elsewhere. Fix: check specificity and override if needed.
- The grid or flex container has `justify-content: space-around` or `space-evenly` that adds internal gutters beyond the intended padding. Fix: use `justify-content: stretch` or remove the justify-content rule.

### Mandatory post-fix verification

After applying the fix, before declaring done:

1. Open the planner on a 375px mobile viewport.
2. In devtools, confirm the SU cell left content edge equals the APR 26 text left edge. They must be at the same X position. Measure in pixels.
3. Confirm the SA cell right content edge equals the + NEW PLAN button right edge.
4. Take a screenshot and compare visually — the three rows (top bar, toolbar, day strip) should appear to share the same left/right boundary.
5. If they do not match, do not ship — investigate further.

### Verification (visual)

- SU 26 left edge aligns with APR 26 text left edge.
- SA 2 right edge aligns with + NEW PLAN right edge.
- Day cells are equally spaced across the full available width.
- Active day accent (coral underline on FR 1) unchanged.
- Desktop planner is unchanged.

---

## Verification checklist

**Add Meal flow:**
- [ ] Tapping an add-meal affordance on the planner shows a full-viewport scrim covering top bar, toolbar, day strip, and content
- [ ] Step 1 sheet rises from bottom with drag handle + eyebrow + 8 meal type rows. No header row, no back button
- [ ] Tapping the scrim dismisses the overlay and returns to the planner
- [ ] Dragging the sheet down dismisses the overlay
- [ ] Tapping a meal type expands the sheet to near-full-height (step 2). Scrim remains
- [ ] Step 2 has drag handle + eyebrow + headline + search/servings + recipe list. No header row, no back button, no hairline after handle
- [ ] Headline on step 2 reflects the selected meal type ("Add a breakfast.", "Add a dinner.", etc.)
- [ ] Selecting a recipe adds the meal and dismisses the overlay
- [ ] There is no route-based navigation during the flow — no page pushes, no URL changes mid-flow
- [ ] Desktop Add Meal is unchanged

**Day strip:**
- [ ] Devtools confirms SU cell left edge = APR 26 text left edge (same X coordinate)
- [ ] Devtools confirms SA cell right edge = + NEW PLAN right edge (same X coordinate)
- [ ] Visual screenshot confirms all three rows share the same horizontal boundary
- [ ] Day cells equally spaced
- [ ] Active day accent unchanged
- [ ] Desktop planner unchanged

---

## Out of scope

- Desktop Add Meal flow — unchanged
- The nutrition summary sheet — unchanged (this brief matches its pattern, not modifies it)
- Recipe list search behavior, servings input, or recipe selection logic — unchanged
- Any other planner spacing issues — covered in MOB-CLEANUP-1
- The planner toolbar row (APR 26 – MAY 2 / chip / + NEW PLAN) padding — covered in MOB-CLEANUP-1

---

## Files most likely affected

- Add Meal flow component(s) — convert from page to sheet, merge step 1 and step 2 into one sheet component with two states
- Planner component — update trigger to open sheet overlay instead of navigating to a route; add scrim
- Router — evaluate whether `/add-meal` routes should be kept as redirects or removed
- `globals.css` — sheet expansion transition if not already handled by the existing sheet system
- Planner day strip component / styles — padding fix (see Part 2 diagnosis steps)

---

## Notes for the implementer

- The scrim must be `position: fixed` with a z-index above the top bar. The top bar is typically `position: sticky` or `fixed` with a z-index around 10–20. The scrim needs z-index above that (e.g. 40), and the sheet needs z-index above the scrim (e.g. 41). Confirm the actual z-index values in the codebase.
- The sheet expansion from step 1 to step 2 should feel like one continuous surface growing, not a new component mounting. If the existing sheet system supports content-swapping with height animation, use it. If not, a simple height transition on the sheet container with a content replace is sufficient.
- The drag handle appears on both steps. It should always be functional — dragging down dismisses from either step.
- For the day strip fix: if two prior attempts have failed, the root cause is almost certainly a CSS specificity issue or the wrong selector. Use devtools computed styles, not the source styles panel — computed styles show what's actually applied after cascade resolution.

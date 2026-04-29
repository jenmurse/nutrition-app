# Brief 2H — Count Baseline & Compare Card Outline

**Status:** Ready for Claude Code
**Depends on:** none (independent of 2G, can run in parallel)
**Blocks:** Step 2 closure (along with 2H and 2I)
**Sibling brief:** 2G (toggle underline rule)

---

## Why

Two visual bugs surfaced during the 2G audit that aren't toggle-related and don't belong in 2G's scope. Bundling them here so they get fixed together.

Both are confined to the recipes page in/around the toolbar and grid. Both have been investigated and have proposed fixes ready to verify.

---

## Bug A — "15 RECIPES" count baseline

### Diagnosis (confirmed)

`.ed-count` has `margin-top: -1px` (globals.css ~line 554). The parent `.ed-toolbar` uses `display: flex; align-items: center; height: 44px`, which already vertically centers all children. The `-1px` was a manual optical nudge layered on top of flex centering, which now offsets `.ed-count` 1px above every other child of the row.

### Fix

1. Remove `margin-top: -1px` from `.ed-count`.
2. Visually verify the count is now flush with COMPARE / NAME / arrow / GRID / LIST / SEARCH / + NEW.
3. **Only if** the mono numerals still read visually high after removal (DM Mono cap height vs. surrounding sans), try `margin-top: 1px` as a recenter. Default is zero. Don't pre-emptively add the 1px.

### Verification

- [ ] Take a screenshot of the toolbar with at least 5 visible items
- [ ] Confirm baselines align across COMPARE, NAME, GRID, LIST, "15 RECIPES", and SEARCH placeholder text

---

## Bug B — Compare-mode selected card outline

### Diagnosis (confirmed)

`.recipe-grid-item.is-selected` uses `outline: 2px solid var(--fg); outline-offset: -2px` (globals.css ~lines 607–609).

The card's photo bleeds outside the border-box (`margin: 0 -24px 18px`, `-40px` for edge columns). With `outline-offset: -2px`:

- **Top stroke** draws 2px down from the card's top edge — directly through the photo's top edge. Visible clip.
- **Left/right strokes** sit 2px inside the card edges, which means 26px inside the photo's visual extent. Effectively hidden behind the photo bleed. The selection ring's sides are invisible.
- **Bottom stroke** draws 2px inside the bottom border. Visible but disconnected from the (invisible) sides.

Net result: top stripe through the photo, bottom stripe near the bottom edge, no visible sides. Reads as broken, not as selection.

### Fix

Replace `outline` with `box-shadow`:

```css
.recipe-grid-item.is-selected {
  /* old:
  outline: 2px solid var(--fg);
  outline-offset: -2px;
  */
  box-shadow: 0 0 0 2px var(--fg);
  z-index: 1;
}
```

### Why this works

- `box-shadow` draws outside the border-box, so it never clips the photo at any edge.
- It extends 2px into the grid gutter and overlaps adjacent hairlines — visually fine, since the 2px ink ring dominates the 1px rule.
- `z-index: 1` lifts the selected card above neighboring cards' hairlines and above the card itself for clean ring rendering.

### Two things to verify before locking the fix

**1. `position: relative` already on `.recipe-grid-item`?**
- If yes: only `z-index: 1` needs to be added (z-index requires a positioned parent).
- If no: add `position: relative; z-index: 1;` together.
- Confirm before writing the patch. Don't add `position: relative` unconditionally — could trigger unintended layout shifts in containing flex/grid.

**2. Two-adjacent-selected-cards visual.**
- When two adjacent cards are both selected, their box-shadows overlap in the gutter.
- Logic predicts: the overlap merges into a continuous 2px ring across both cards (not a 4px doubled ring). This should read as "these two are part of the same selection group."
- **Required:** screenshot two adjacent selected cards (one row apart and one column apart, both cases) and confirm it reads cleanly. If it looks doubled or strange, fall back is more involved — surface the screenshot before attempting fallback so we can decide together.

**3. Stacking context with the compare strip.**
- The compare strip sits above the grid (likely sticky or fixed-positioned).
- `box-shadow: 0 0 0 2px` does NOT create a new stacking context, so this should be fine — but verify that scrolling the grid behind the strip still has the strip rendering above the box-shadows. Quick visual check, no fix expected.

### Verification

- [ ] Single selected card: clean 2px ring around the entire card, no clipping at the photo edge
- [ ] Two adjacent selected cards (horizontal): no doubled ring, reads as one continuous selection
- [ ] Two adjacent selected cards (vertical): same
- [ ] Compare strip still renders above selected cards on scroll
- [ ] Edge-of-row cards (first column, last column) — the box-shadow extends into the page margin without overflowing or causing horizontal scroll

---

## Out of scope

- Any toggle/underline work (covered in 2G)
- The `.compare-strip-cta` button itself (treatment is correct, no change)
- Any restructure of the photo bleed margins (the bleed is a deliberate design choice from earlier briefs)

---

## Doc updates after code lands

### `step2-audit.md`

Mark 2H complete. Note both bugs and their fixes.

### `master-plan.md`

Step 2 is complete only after 2G, 2H, AND 2I ship.

No design-system or mobile_ux doc updates needed — these are bug fixes against existing patterns, not new rules.

# BRIEF MOB-CLEANUP-1B — Day strip alignment + dashboard chip gap (targeted fix)

**Part of:** Step 4 mobile audit cleanup.
**Scope:** Two targeted fixes only. MOB-CLEANUP-1 ran but these two items did not land correctly.
**Depends on:** MOB-CLEANUP-1 (already shipped).
**Blocks:** Nothing.

---

## Context

MOB-CLEANUP-1 included Fix 6 (dashboard chip + hamburger gap) and Fix 9 (planner day strip alignment). Both are visually unchanged after the cleanup brief ran. This brief diagnoses why and provides implementation-specific guidance to land them correctly.

---

## Fix A — Planner day strip: left/right alignment

### What should happen
The SU day cell's left edge and the SA day cell's right edge should align with the left/right edges of the toolbar content above (APR 26 – MAY 2 text, + NEW PLAN button). All three rows -- top bar, planner toolbar, day strip -- share the same horizontal boundary.

### What's happening
The day strip content is visibly more inset (~8-10px from screen edge) than the toolbar rows above (~20px). The fix from MOB-CLEANUP-1 did not change the visual result.

### Diagnosis steps

Before making any change, inspect the day strip in browser devtools:

1. Identify the exact element that renders the 7 day columns. It may be a CSS grid, flexbox row, or a mapped array of cells.
2. Check `padding-left` and `padding-right` on that element AND on any parent wrapper between it and the viewport edge.
3. Check whether the day cells themselves have their own `padding` or `margin` adding to the inset.
4. Check whether the previous fix targeted a class that exists in the codebase -- the class name `.pl-day-strip` was assumed in the brief but may differ. Search for the actual class or component.

### The fix

The outer container of the 7-column day strip needs:

```css
padding-left: var(--pad);
padding-right: var(--pad);
```

AND any inner wrapper or the grid/flex container itself must NOT add additional left/right padding or margin.

If the day cells are rendered as a grid with equal columns:

```css
.pl-day-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding-left: var(--pad);
  padding-right: var(--pad);
}
```

The cells themselves should have no left/right padding -- all horizontal inset comes from the container.

**STOP-CHECK:** After applying, measure in devtools that the left edge of the SU cell content equals the left edge of the "APR 26" text in the toolbar row above. They must be at the same X position. If they still differ, the padding is being applied to the wrong element -- keep walking up the DOM until you find where the inset is coming from.

### Verification
- SU 26 left edge aligns with APR 26 text left edge.
- SA 2 right edge aligns with + NEW PLAN button right edge.
- Day cells are equally spaced across the full available width between those two points.
- Active day accent (FR 1 in coral) is unchanged.

---

## Fix B — Dashboard person chip + hamburger gap

### What should happen
The JEN chip and the hamburger glyph should sit 8px apart. They are a functional pair on the right side of the top bar and should read as a group.

### What's happening
The gap is still ~20-24px. The `gap: 8px` fix from MOB-CLEANUP-1 did not change the visual result.

### Diagnosis steps

1. Inspect the top bar right slot on the dashboard in devtools.
2. Identify what controls the horizontal distance between the chip and the hamburger. It may be: `gap` on a flex container, `margin-left` on the hamburger trigger, `margin-right` on the chip, or `justify-content: space-between` on the topbar itself pushing the two elements apart.
3. Check whether `.hm-topbar-right` exists as a class in the codebase. If not, find the actual class name for the dashboard top bar's right slot container.
4. Check whether the top bar uses `justify-content: space-between` at the topbar level (which would push wordmark left and the entire right slot right, but wouldn't affect the gap between chip and hamburger within the right slot).

### The fix

The container holding both the chip and the hamburger trigger needs:

```css
display: flex;
align-items: center;
gap: 8px;
```

If `gap` is already set but has no effect, check whether the container is using `justify-content: space-between` instead of `gap` for its internal spacing. Remove `space-between` from the chip+hamburger container (not the topbar itself -- that should keep `space-between` to push wordmark left and right slot right).

If the hamburger trigger has a left margin or the chip has a right margin, remove it and let `gap` handle the spacing.

```css
/* Remove any of these if present on the chip or hamburger inside the right slot */
.hm-person-chip { margin-right: 0; }
.menu-trigger { margin-left: 0; }
```

The topbar itself (`display: flex; justify-content: space-between`) is correct and unchanged. Only the internal spacing of the right slot changes.

**STOP-CHECK:** After applying, the visual gap between the chip's right border and the hamburger glyph's left line should be approximately 8px. Check on a 375px viewport. If it's still wide, log the computed styles on the right-slot container and confirm `gap: 8px` is present and not overridden by a higher-specificity rule.

### Verification
- On dashboard mobile: JEN chip right edge and hamburger glyph left edge are ~8px apart.
- They read as a visually grouped pair on the right side of the top bar.
- On all other pages (planner, recipes, pantry, etc.) the top bar right slot (hamburger only) is unchanged.
- Desktop top bar is unchanged.

---

## Out of scope
- All other MOB-CLEANUP-1 items -- those are assumed shipped.
- Any other spacing or visual issues -- separate pass.

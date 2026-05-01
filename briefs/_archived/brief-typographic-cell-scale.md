# Brief — Typographic recipe cell name scale

**Status:** Ready
**Type:** Visual bug fix
**Surface:** Recipes index, GRID view, cells without photos (typographic cells)

---

## Why

The typographic recipe cells (cells for recipes with no uploaded photo) are not rendering at the intended display scale. The original design mock specified these cells as deliberate typographic statements: large bold sans, tight letter-spacing, tight line-height, bottom-aligned. The shipped version renders the recipe name at roughly the same size as the photo-cell captions (~16-20px), making the empty cells look like broken photo cells rather than intentional typographic moments.

Reference: the typographic cell in the original mock used `.rg-cell-name-large` with these values:

```css
.rg-cell-name-large {
  font-weight: 700;
  font-size: clamp(20px, 2.4vw, 32px);
  letter-spacing: -0.025em;
  line-height: 1.1;
  color: var(--fg);
  text-wrap: balance;
}
```

The shipped version is using something closer to:

```css
.rg-cell-name {
  font-weight: 600;
  font-size: clamp(14px, 1.2vw, 16px);
  line-height: 1.25;
  letter-spacing: -0.01em;
}
```

That's the photo-cell treatment, applied to the wrong context.

---

## Investigation step (do this first)

Before patching, identify what's actually happening. Three possibilities:

1. **Wrong class applied.** The typographic cells are using the photo-cell name class. Inspect a typographic cell in DevTools and report the actual class on the recipe-name span.
2. **Large variant CSS not present.** The class exists in the JSX but the large-name CSS rules were never written or got stripped.
3. **Clamp collapsing.** The `clamp(20px, 2.4vw, 32px)` is resolving to its minimum (20px) because of a parent width constraint, and 20px isn't reading large enough at this density.

Report which one, then patch.

---

## Fix

### If cause 1 (wrong class applied)

Apply the correct class to the typographic-cell name. Likely the existing class structure has both `.rg-cell-name` (photo cell strip) and `.rg-cell-name-large` (typographic cell), and the JSX is picking the wrong one. Switch the typographic cell's name span to use the large variant.

### If cause 2 (large variant CSS missing)

Add the missing CSS rule:

```css
.rg-cell-name-large {
  font-weight: 700;
  font-size: clamp(20px, 2.4vw, 32px);
  letter-spacing: -0.025em;
  line-height: 1.1;
  color: var(--fg);
  text-wrap: balance;
}
```

If the existing class name in the codebase differs (e.g. `.recipe-grid-name-typographic` or similar), use the existing name.

### If cause 3 (clamp collapsing)

The clamp middle value `2.4vw` may be too low for the actual cell width at production breakpoints. Increase the middle value or switch to a container-relative unit. Likely fix:

```css
font-size: clamp(22px, 2.8vw, 32px);
```

Or, if the cells are using a CSS Grid container that allows container queries, use container query units (`cqi`) for more reliable sizing.

---

## Visual targets after fix

- Typographic cell name reads as a **display-scale** moment, not a caption. At a 4-column desktop grid (~280-320px cell width), the name should render at roughly 28-32px.
- Eyebrow (`DESSERT`, `BREAKFAST`, etc.) stays small mono, unchanged from current.
- Bottom-anchored alignment (eyebrow + name push to the bottom of the cell with padding above) — confirm this is preserved.
- Tight letter-spacing (`-0.025em`) and tight line-height (`1.1`) — confirm both applied.
- `text-wrap: balance` so multi-line names break at sensible points.
- No fill or background on the cell — stays cream/`var(--bg)`. The shipped screenshot shows what may be a subtle fill on the typographic cell; if there's a `background:` rule on `.rg-cell-typographic` or equivalent, remove it unless it's an intentional hover state.

## Verification

- [ ] Open recipes index, GRID view, with at least 2-3 typographic cells visible (recipes without photos)
- [ ] Typographic cell name reads as display-scale large bold, not caption-scale
- [ ] Photo cells unchanged — their caption strip still renders at the small caption scale
- [ ] Compare side-by-side: a photo cell next to a typographic cell. The typographic cell's name should feel like a deliberate typographic statement, the photo cell's name should feel like a label under an image. Both should feel intentional.
- [ ] Multi-line names (`Almond Croissant Blondies`, `Almond Flour Lemon Bars`) break with `text-wrap: balance` to roughly even line lengths
- [ ] Cell height matches the photo cell height (still aspect-ratio: 1/1 or whatever the grid is using) — the typographic cell shouldn't grow taller because of the larger text
- [ ] Screenshot at 100% and 200% zoom for sign-off

## Out of scope

- Any chrome changes (toolbar, subnav, etc.)
- Any treatment for cells with photos
- Any change to the eyebrow style
- The "muted ghost text" old empty-state pattern is gone and stays gone — do not reintroduce

## Doc updates after code lands

`design-system.md` — if the typographic cell pattern isn't already documented, add a small section under recipe-grid spec describing the two cell variants (photo cell with caption strip, typographic cell with display-scale name) and when each applies.

# BRIEF-12 · Toolbar polish — button height, sort control, planner pills

## Why

Three residual toolbar issues remain after BRIEF-06 through BRIEF-11:

1. The primary toolbar CTA buttons (`+ NEW`, `+ ADD`, `+ NEW PLAN`) are too tall. The full-height edge-anchored treatment was tried and rejected — mid-toolbar it reads as a heavy block with nothing to connect to, and making height position-dependent is not a principled rule. The right treatment is the same compact centered button everywhere.

2. The sort control on Recipes shows both a field-selector caret and a directional arrow jammed together (`NAME ▾↑`), and the whole control sits slightly off the shared toolbar baseline.

3. The Planner toolbar still has pill-bordered buttons on PREV, NEXT, THIS WEEK, EDIT, and NUTRITION — the same rounded chrome that was removed from Recipes and Pantry in BRIEF-06.

## Intent

One pass across the three index-page toolbars: compact CTA button height everywhere, fixed sort control with proper spacing and baseline alignment, and Planner's mode controls haircut to match Recipes/Pantry.

## Depends on

BRIEF-06 through BRIEF-11 all merged.

## Visual reference

`design-mocks/toolbar-button-options-v2.html` — three stacked toolbars showing the final approved state. This is the source of truth for this brief. Specifically:
- All three pages show the same compact `8px × 14px` padded black button
- The sort control on Recipes shows `NAME ▾` then a gap then `↑` as a separate element
- The Planner toolbar has no pill borders anywhere

## Scope

**In scope:**
- Primary CTA button height/padding on Recipes (`+ NEW`), Pantry (`+ ADD`), and Planner (`+ NEW PLAN`)
- Sort control on Recipes: caret removal from the directional arrow, add caret to field label, proper spacing between the two controls, baseline alignment fix
- Planner toolbar: PREV, NEXT, THIS WEEK, EDIT, NUTRITION lose pill borders and become mono text buttons
- Outlined secondary button border color — aligned globally to `var(--rule)` (warm grey) instead of black, on both the app and the landing page
- Recipe detail EDIT / DUPLICATE / DELETE buttons — sharpen from rounded corners to zero radius, soften border to `var(--rule)`

**Out of scope:**
- Person-switcher pills on Planner (JEN/GARTH/EVERYONE) — stay round, stay as-is, this is intentional identity chrome
- Shopping cart icon button on Planner — icon buttons stay round per design system
- Chip underlines, toggle underlines, search field — already correct from BRIEF-06
- Hairline weight — already handled in BRIEF-11
- DESSERT category tag pill on recipe detail — flagged but separate brief

## Specific changes

### 1. Primary CTA button — compact centered

Replace the current button treatment on all three index-page toolbars with a single consistent primitive:

```css
.ed-btn-primary {
  background: var(--fg);
  color: var(--bg);
  border: 0;
  border-radius: 0;
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}
.ed-btn-primary:hover { opacity: 0.88; }
```

`8px × 14px` padding gives a button height of roughly 30px, which sits comfortably centered in a 44px toolbar without dominating the row. No `align-self: stretch`, no `height: 100%`, no margin tricks — just a regular box.

Applied to: `+ NEW` on Recipes, `+ ADD` on Pantry, `+ NEW PLAN` on Planner. These may already use `.ed-btn-primary` from BRIEF-06; if so, just confirm the padding is `8px 14px` and that no toolbar-specific override is inflating the height. If a toolbar-specific override exists, remove it.

### 2. Sort control — two controls, proper spacing, baseline fix

**Current state:** `NAME ▾↑` — the field dropdown caret and the directional arrow are adjacent with no gap, reading as one compound glyph. The sort control's container also sits below the shared baseline of COMPARE, GRID, LIST, SEARCH.

**Target state:** `NAME ▾` as a clickable field selector (click opens a menu of sort fields) and `↑` / `↓` as a separate direction toggle (click flips direction), with a visible gap between them.

```jsx
<span className="sort-control">
  <button className="sort-field" onClick={openSortMenu}>
    {sortField}<span className="sort-caret">▾</span>
  </button>
  <button className="sort-dir" onClick={toggleSortDir} aria-label="Toggle sort direction">
    {sortDir === 'asc' ? '↑' : '↓'}
  </button>
</span>
```

```css
.sort-control {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}
.sort-field {
  background: none;
  border: 0;
  padding: 3px 0 2px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.sort-field:hover { color: var(--fg); }
.sort-caret {
  display: inline-block;
  font-size: 8px;
  line-height: 1;
  vertical-align: baseline;
  position: relative;
  top: -1px;   /* pulls the caret up slightly so it doesn't drag the field button's line box down */
}
.sort-dir {
  background: none;
  border: 0;
  padding: 2px 2px;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  display: inline-block;
  vertical-align: baseline;
}
.sort-dir:hover { color: var(--fg); }
```

**Baseline fix:** The sort-control sits inside `.ed-toolbar-group.end` which should use `align-items: baseline` so all its children share a text baseline. If it currently uses `align-items: center`, change it to `align-items: baseline` and verify that every child in the group (count label, separator, compare button, sort control, grid/list toggle, search, CTA button) looks correct under baseline alignment.

If changing the group to `align-items: baseline` breaks the vertical centering of the search input or the CTA button, use `align-self: center` on those specific elements to opt them back out, and leave the sort control and text-label elements on baseline.

**Verification for this change:** In the browser, draw a horizontal guide at the baseline of `64 RECIPES`. The text of COMPARE, NAME, GRID, LIST, and SEARCH placeholder should all sit on that line. The `▾` caret and `↑`/`↓` arrows are allowed to deviate slightly (they're non-text glyphs) but the labels `NAME`, `GRID`, `LIST` should all be level.

### 3. Planner toolbar — remove pill borders

The following Planner toolbar controls currently have pill-shaped borders. Remove the borders entirely; these become plain mono text buttons matching the Recipes chip pattern.

Controls to fix:
- `‹ PREV` button
- `NEXT ›` button
- `THIS WEEK` button
- `EDIT` button
- `‹ NUTRITION` button (the `‹` prefix stays — it's a directional affordance indicating the panel it opens, not a navigation arrow)

Target CSS for each, matching the existing `.ed-btn-text` primitive from BRIEF-06:

```css
/* These controls should already exist as .ed-btn-text or equivalent from BRIEF-06.
   If they're using a different class, swap them or add .ed-btn-text to each. */
.ed-btn-text {
  background: none;
  border: 0;
  padding: 3px 0 2px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease;
}
.ed-btn-text:hover { color: var(--fg); }
```

If BRIEF-06 already introduced `.ed-btn-text`, these controls just need their pill-border class removed and `.ed-btn-text` applied. If the Planner toolbar was out of scope for BRIEF-06 (which it was), these controls still have their original styling and need the class swap.

**Do not touch:**
- `+ NEW PLAN` — already handled by change 1 above
- `JEN`, `GARTH`, `EVERYONE` person-switcher pills — these stay round with theme-color rings
- The shopping cart icon button — stays as-is
- The `APR 19–25` date label — it's a label, not a button, leave it alone
- The pipe separators between groups — keep them

### 4. Outlined secondary button border — warm grey everywhere

The app's outlined button (RESET, USDA LOOKUP, REGENERATE, etc.) already uses `var(--rule)` for its border — warm grey, not black. This is correct and should be the standard.

The landing page's outlined button (`SEE HOW IT WORKS`) currently uses a black border, which creates a visual tie with the filled `GET STARTED` button and makes them harder to rank.

**Change:** Update the landing's outlined button border from black to `var(--rule)` (or the landing's equivalent warm grey token). Text stays black (`var(--fg)`). Only the border color changes.

Find the outlined button in `app/(marketing)/landing.css` (or wherever the landing styles live, scoped under `.mkt`). The selector is probably `.mkt .btn-outline` or similar. Update:

```css
/* Before */
border: 1.5px solid var(--fg);   /* or whatever black value it currently uses */

/* After */
border: 1.5px solid var(--rule);
```

If the landing and app use different tokens for warm grey, confirm the rendered hex values match before shipping — they should both resolve to the same `#C8C3B8` (or whatever the post-BRIEF-11 rule value is).

### 5. Recipe detail — EDIT / DUPLICATE / DELETE buttons

These three buttons currently have rounded corners and a black border. Change to:

```css
/* These are probably .ed-btn-outline or a similar class */
border-radius: 0;                  /* was rounded, ~6–8px radius */
border: 1px solid var(--rule);     /* was black, soften to warm grey */
```

Typography, padding, and hover behavior unchanged. The buttons just become sharp rectangles with the same grey border as the form's RESET button — consistent with the outlined button system everywhere else in the app.

If these buttons use a shared `.ed-btn-outline` component that already has `border-radius: 0` from BRIEF-06, the only change needed is confirming the border color is `var(--rule)` not black. If the class wasn't in scope for BRIEF-06 and still has rounded corners, apply both fixes.

## Do not change

- Planner person-switcher pill shapes, theme colors, or ring treatment
- Any button's fill color, text color, or hover behavior — only border color and border-radius change
- Chip underlines or toggle underlines from BRIEF-06
- Planner's responsive collapse behavior if it has one
- CANCEL button on forms — already a text link per BRIEF-06, not an outlined button
- DESSERT category pill on recipe detail — out of scope, separate brief

## Files likely affected

- Recipes toolbar component or page — sort control JSX, CTA button class/padding
- Pantry toolbar component or page — CTA button class/padding
- Planner toolbar component or page — PREV/NEXT/THIS WEEK/EDIT/NUTRITION button classes, CTA button class/padding
- `app/globals.css` — confirm `.ed-btn-primary` padding is `8px 14px`, update `.ed-btn-outline` border to `var(--rule)` and `border-radius: 0`, add `.sort-control`, `.sort-field`, `.sort-caret`, `.sort-dir` classes
- `app/(marketing)/landing.css` — update outlined button border from black to `var(--rule)`
- Recipe detail component — EDIT/DUPLICATE/DELETE button border-radius and border color

## Verification

1. **Button height, all three pages:** Open Recipes, Pantry, Planner. The CTA button on each (`+ NEW`, `+ ADD`, `+ NEW PLAN`) sits comfortably centered in the toolbar — clearly a button but not filling the full toolbar height. Visually matches the button height of the SAVE button on the pantry edit form.
2. **Sort control, Recipes:** Rendered as `NAME ▾  ↑` with a visible gap between the two controls. Clicking `NAME ▾` opens the field-selection menu. Clicking `↑` flips to `↓` and re-sorts. The `NAME` text sits on the same baseline as `COMPARE`, `GRID`, `LIST`, `SEARCH`.
3. **Baseline check:** Draw a guide at the baseline of `64 RECIPES`. Confirm COMPARE, NAME, GRID, LIST, and SEARCH placeholder all sit on it. Use browser devtools if needed.
4. **Planner pills gone:** Open Planner. The PREV, NEXT, THIS WEEK, EDIT, NUTRITION controls have no borders, no backgrounds. They look like the filter chips on Recipes — muted mono text that darkens on hover.
5. **Person switcher unchanged:** JEN pill has its coral ring, GARTH has its sage ring, EVERYONE is unbordered. Exactly as before.
6. **Outlined button borders, app:** Open pantry edit form. The RESET button has a warm grey border, not black. Same on any other outlined button in the app (USDA LOOKUP, REGENERATE, etc.).
7. **Outlined button border, landing:** Open withgoodmeasure.com. The `SEE HOW IT WORKS` button has a warm grey border that matches the app's outlined buttons. Hold it up against a form's RESET button in the app — same weight, same color.
8. **Recipe detail buttons:** Open a recipe detail page. EDIT / DUPLICATE / DELETE are sharp-cornered rectangles with warm grey borders. No rounded corners.
9. **Regression check:** Sort functionality works — changing fields updates the sort, changing direction flips the order. No behavior regressions, only visual changes.
10. **Test suite:** jest passes, TypeScript clean.

## Commit message

```
design: toolbar polish + button system alignment (BRIEF-12)

Toolbar CTAs (+ NEW, + ADD, + NEW PLAN) become compact centered sharp
rectangles matching form button height. Sort control splits into
NAME ▾ field selector and ↑/↓ direction toggle with proper spacing
and baseline alignment. Planner PREV/NEXT/THIS WEEK/EDIT/NUTRITION
lose pill borders. Outlined button borders globally softened from
black to var(--rule) — app and landing now match. Recipe detail
EDIT/DUPLICATE/DELETE buttons sharpen to zero radius.

Depends on BRIEF-06 through BRIEF-11.
```

## Flag before proceeding

Pause and check in if:
- The sort control is a native `<select>` element — splitting into two controls requires a full component replacement. Describe the current implementation before changing anything.
- Changing `.ed-toolbar-group.end` from `align-items: center` to `align-items: baseline` causes any child element to visually break — describe which element and why before fixing.
- The Planner toolbar was built with a shared component that's also used elsewhere — don't modify the shared component. Apply changes to the Planner-specific usage only and flag for consolidation.
- The `‹ NUTRITION` button opens a drawer — verify which direction the drawer opens and correct the chevron to match (`‹` if it opens left, `›` if it opens right).
- The landing's outlined button uses a different token name than `var(--rule)` — note both values, confirm they resolve to the same hex after BRIEF-11, and update accordingly.
- The recipe detail EDIT/DUPLICATE/DELETE buttons use a shared outlined button component — if `border-radius: 0` and `border: 1px solid var(--rule)` are already correct on that component from BRIEF-06, these buttons may already be correct. Verify visually before touching anything.

# BRIEF-13 · Compare mode, shopping list modal, grid alignment

## Why

Three surfaces need work:

1. **Compare mode** — the current implementation uses a dark full-width banner above the grid plus a floating rounded pill at the bottom. Neither is anchored to the app's ruled system. The redesign collapses everything into a single slim subrow and removes the floating pill entirely.

2. **Shopping list modal** — rounded corners throughout (modal container, SHARE button, HIDE COMPLETED button). The overlay doesn't extend to the full viewport.

3. **Recipe/Pantry grid outer-column text alignment** — photos correctly span edge to edge, but the text content (category eyebrow + recipe/item name) below the outer photos doesn't align with the toolbar text above them. The outermost grid cell padding needs to match the toolbar's 40px on the outer edges.

## Depends on

BRIEF-06 through BRIEF-12 all merged.

## Visual reference

`design-mocks/compare-mode-redesign-v1.html` — four states showing the full compare flow. This is the source of truth for this brief.

---

## Part A — Compare mode

### A1. Remove the dark banner

Delete the dark full-width instruction banner that currently appears above the grid when compare mode is active (`SELECT UP TO 4 RECIPES TO COMPARE NUTRITION · × EXIT`). It gets replaced by the slim subrow in A2.

### A2. Add a compare subrow

When compare mode is active, insert a 36px subrow between the toolbar and the grid. It sits on a `var(--bg-2)` background — slightly offset from the page so it reads as a secondary mode layer without being harsh.

```jsx
{compareMode && (
  <div className="compare-strip">
    <div className="compare-strip-label">
      {selectedCount === 0
        ? <>Select up to <strong>4 recipes</strong> to compare nutrition</>
        : <><strong>{selectedCount}</strong> of 4 selected</>
      }
    </div>
    <div className="compare-strip-slots">
      {[1,2,3,4].map(n => (
        <div key={n} className={`slot ${n <= selectedCount ? 'filled' : ''}`}>{n}</div>
      ))}
    </div>
    <div className="compare-strip-sep" />
    {selectedCount > 0 && <button className="ed-btn-text" onClick={clearSelection}>Clear</button>}
    <button className="ed-btn-text" onClick={exitCompareMode}>Exit</button>
    <button
      className="compare-strip-cta"
      disabled={selectedCount < 2}
      onClick={triggerComparison}
    >
      Compare →
    </button>
  </div>
)}
```

```css
.compare-strip {
  border-bottom: 1px solid var(--rule);
  padding: 0 40px;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-2);
}
.compare-strip-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  flex: 1;
}
.compare-strip-label strong { color: var(--fg); }

.compare-strip-slots { display: flex; gap: 6px; align-items: center; }
.slot {
  width: 20px; height: 20px;
  border: 1px solid var(--rule);
  border-radius: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 8px; color: var(--muted);
}
.slot.filled { background: var(--fg); color: var(--bg); border-color: var(--fg); }

.compare-strip-sep { width: 1px; background: var(--rule); height: 16px; align-self: center; }

.compare-strip-cta {
  background: var(--fg); color: var(--bg);
  border: 0; border-radius: 0;
  padding: 6px 14px;
  font-family: var(--font-mono); font-size: 9px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.14em;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.compare-strip-cta:disabled { opacity: 0.35; cursor: default; }
.compare-strip-cta:not(:disabled):hover { opacity: 0.88; }
```

### A3. Remove the floating selection pill

Delete the floating dark pill at the bottom of the viewport that currently shows `CLEAR · 1 2 3 4 · 4/4 SELECTED · COMPARE →`. Everything it did is now in the compare subrow (A2) and the toolbar (A4).

### A4. Update the COMPARE toolbar button

When compare mode is active, the COMPARE button in the main toolbar should reflect the active state:

- Gets the active chip treatment: `color: var(--fg)`, `border-bottom: 1.5px solid var(--fg)`
- When 1+ recipes are selected, shows a count: `COMPARE (2)`, `COMPARE (3)`, etc.
- Clicking it while in compare mode with 2+ selected triggers the comparison (same as the subrow CTA)
- Clicking it when in compare mode with 0 selected exits compare mode

```jsx
<button
  className={`ed-btn-text ${compareMode ? 'is-active' : ''}`}
  onClick={compareMode ? (selectedCount >= 2 ? triggerComparison : exitCompareMode) : enterCompareMode}
>
  {compareMode && selectedCount > 0 ? `Compare (${selectedCount})` : 'Compare'}
</button>
```

### A5. Selected tile state — border, no fill

When a recipe is selected in compare mode, the tile should show:

- `outline: 2px solid var(--fg); outline-offset: -2px` — a sharp black border inset into the tile
- No background fill, no tint — the pink/cream background fill is removed entirely
- A checkmark circle (already exists) — move it inside the `.rgrid-photo` container so it sits above the background image, not behind it

```css
.rgrid-item.selected {
  outline: 2px solid var(--fg);
  outline-offset: -2px;
}
/* Checkmark must be a child of .rgrid-photo, not .rgrid-item */
.rgrid-photo { position: relative; }
.check-mark {
  position: absolute;
  top: 12px; left: 12px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--fg); color: var(--bg);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  opacity: 0;
  transition: opacity 0.1s ease;
  z-index: 2;
}
.rgrid-item.selected .check-mark { opacity: 1; }
.rgrid-item.selectable:not(.selected):hover .check-mark { opacity: 0.3; }
```

**HTML structure:** The check-mark div must be the first child of `.rgrid-photo`, not of `.rgrid-item`:

```jsx
<article className="rgrid-item selectable">
  <div className="rgrid-photo" style={{backgroundImage: `url(...)`}}>
    <div className="check-mark">✓</div>  {/* inside photo, not before it */}
  </div>
  <div className="rgrid-cat">Dessert</div>
  <div className="rgrid-name">Almond Croissant Bars</div>
</article>
```

### A6. Exit compare mode — EXIT button behavior

The EXIT button in the compare subrow clears all selections and exits compare mode. The `× EXIT` pill from the old dark banner is removed. The new Exit is a plain `.ed-btn-text` button.

### A7. Comparison chart — photo border artifact

Remove the unintended black top border on recipe thumbnails in the comparison chart. Find the CSS rule applying a `border-top` to the thumbnail images or their container and remove it. There should be no border on the photo thumbnails in the comparison chart — just the image, no frame.

```css
/* Remove any rule like this on the comparison chart thumbnails: */
/* border-top: 2px solid var(--fg);  <-- DELETE */
```

### A8. Comparison chart — lowest value highlight

On the comparison chart, the lowest value in each nutrient row should be visually distinguished so users can scan which recipe wins per metric.

- Non-winner values: `color: var(--muted)`, `font-weight: 400`, `font-size: 20px`
- Winning (lowest) value: `color: var(--fg)`, `font-weight: 700`, `font-size: 22px`, plus a small `↓` indicator

```css
.cmp-value .cmp-num {
  color: var(--muted);
  font-weight: 400;
  font-size: 20px;
}
.cmp-value .cmp-unit {
  color: var(--muted);
  opacity: 0.6;
}
.cmp-value.lo .cmp-num {
  color: var(--fg);
  font-weight: 700;
  font-size: 22px;
}
.cmp-value.lo .cmp-unit {
  color: var(--muted);
  opacity: 1;
}
.cmp-value.lo::after {
  content: '↓';
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--muted);
  align-self: flex-end;
  margin-left: 4px;
  margin-bottom: 5px;
}
```

Add a `lo` class to the cell with the lowest value for each row. If there's a tie for lowest, mark all tied cells as `lo`.

### A9. Comparison chart nav header

The `‹ BACK TO RECIPES` link and `NUTRITION COMPARISON` label should sit on the same baseline in a 44px ruled nav row, separated by a hairline vertical separator — same pattern as the toolbar.

```jsx
<div className="cmp-nav">
  <a href="/recipes">‹ Back to Recipes</a>
  <div className="cmp-nav-sep" />
  <span className="cmp-nav-title">Nutrition Comparison</span>
</div>
```

```css
.cmp-nav {
  height: 44px;
  border-bottom: 1px solid var(--rule);
  display: flex;
  align-items: center;
  padding: 0 40px;
  gap: 20px;
}
.cmp-nav a {
  font-family: var(--font-mono); font-size: 9px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--muted); text-decoration: none;
}
.cmp-nav a:hover { color: var(--fg); }
.cmp-nav-sep { width: 1px; background: var(--rule); height: 16px; align-self: center; }
.cmp-nav-title {
  font-family: var(--font-mono); font-size: 9px; font-weight: 400;
  text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted);
}
```

---

## Part B — Shopping list modal

### B1. Modal container — sharp corners

```css
.shopping-list-modal {
  border-radius: 0;   /* was rounded */
}
```

### B2. Modal overlay — full viewport

The overlay background should cover the entire viewport. If it's currently constrained to a content container width, move it to `position: fixed; inset: 0`:

```css
.shopping-list-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 25, 22, 0.4);  /* warm dark, not pure black */
  z-index: 50;
}
```

### B3. HIDE COMPLETED button — text button

Remove the pill border. Apply `.ed-btn-text` treatment — plain mono text, muted at rest, darkens on hover.

### B4. SHARE button — compact sharp button

Replace the full-width pill-shaped SHARE button with a compact sharp primary button. It should not span the full modal width.

```css
/* Remove: width: 100%; border-radius: large value */
/* Apply: */
.shopping-list-share {
  background: var(--fg);
  color: var(--bg);
  border: 0;
  border-radius: 0;
  padding: 8px 24px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
}
```

Position it in a footer row at the bottom of the modal, left-aligned or centered — not stretched. The footer has a top hairline rule and 20px vertical padding.

---

## Part C — Grid outer-column text alignment

### C1. The problem

Recipe grid and Pantry grid photos correctly span edge to edge. But the text content below the outer photos (category eyebrow + name) sits at 24px from the photo edge — which means the leftmost column's text starts 24px from the left viewport edge, while the toolbar's "ALL" chip starts 40px in. Same misalignment on the right. The photos are intentionally full-bleed; the text beneath them should align with the toolbar.

### C2. The fix

Apply asymmetric padding to the outer grid cells so their text content aligns with the toolbar:

```css
/* All cells: internal padding */
.rgrid-item {
  padding: 0 24px 32px;  /* top-padding handled separately per photo */
}

/* Photo fills full cell width — no side padding on the photo */
.rgrid-photo {
  margin: 0 -24px;       /* cancel the cell's side padding for the photo */
  width: calc(100% + 48px);
}

/* Outer columns override side padding on the text content only */
.rgrid-item:nth-child(4n+1) {
  padding-left: 40px;
}
.rgrid-item:nth-child(4n+1) .rgrid-photo {
  margin-left: -40px;
  width: calc(100% + 64px);
}

.rgrid-item:nth-child(4n) {
  padding-right: 40px;
}
.rgrid-item:nth-child(4n) .rgrid-photo {
  margin-right: -40px;
  width: calc(100% + 64px);
}
```

**Simpler alternative if the above is fiddly:** Keep the grid cells edge-to-edge with no padding, and add a wrapper div inside each cell for the text content only:

```jsx
<article className="rgrid-item">
  <div className="rgrid-photo" />       {/* full cell width, no padding */}
  <div className="rgrid-text">          {/* text wrapper with padding */}
    <div className="rgrid-cat">Dessert</div>
    <div className="rgrid-name">Almond Croissant Bars</div>
  </div>
</article>
```

```css
.rgrid-text {
  padding: 18px 24px 0;
}
.rgrid-item:nth-child(4n+1) .rgrid-text { padding-left: 40px; }
.rgrid-item:nth-child(4n)   .rgrid-text { padding-right: 40px; }
```

The simpler alternative is cleaner — prefer it unless there's a structural reason to keep the text outside a wrapper. Apply the same pattern to the Pantry grid.

**Note:** This fix applies at the current 4-column breakpoint. At 3 or 2 columns (narrower viewports), the `nth-child` rules need to update to match the column count — whichever approach is used, make sure the responsive breakpoints are consistent with the column count.

---

## Do not change

- Photo aspect ratios or the fact that photos span edge to edge — that's correct and intentional
- The comparison chart's row structure, column widths, or label styles beyond what's specified in A8/A9
- Checkbox states on the shopping list — checkboxes stay round (identity/form element)
- The ✕ close button on the shopping list modal — icon button, stays round
- Filter chip behavior in compare mode — chips still filter the grid while in compare mode
- Pantry grid — apply the C1/C2 outer padding fix there too (same column structure)

## Files likely affected

- Recipe grid component — selection state, checkmark placement, compare subrow
- Compare mode state management — selectedCount, enterCompareMode, exitCompareMode, clearSelection
- Comparison chart component — `.lo` class logic, nav header, thumbnail border removal
- Shopping list modal component — border-radius, overlay, SHARE button, HIDE COMPLETED button
- `app/globals.css` — `.compare-strip`, `.slot`, `.compare-strip-cta`, `.cmp-nav`, `.cmp-nav-sep`, `.cmp-nav-title`, `.cmp-value` highlight rules
- Pantry grid component — outer column padding fix

## Verification

1. **Compare mode entry:** Click COMPARE in the toolbar. The dark banner does not appear. The slim subrow appears beneath the toolbar with 4 empty slots and a disabled COMPARE → button.
2. **Selection:** Click 3 recipe tiles. Each shows a checkmark above the photo (not behind it), and a sharp black border outline. No pink or cream tint. Slots 1–3 fill black in the subrow. Subrow label updates to `3 of 4 selected`. COMPARE → activates. Toolbar button shows `COMPARE (3)`.
3. **Compare trigger:** Click COMPARE → in the subrow OR click COMPARE (3) in the toolbar. Both navigate to the comparison chart.
4. **Exit:** Click EXIT in the subrow. Compare mode ends, selections clear, dark banner does not reappear, floating pill does not reappear.
5. **Comparison chart:** No black border artifact on photo thumbnails. Nav row shows `‹ BACK TO RECIPES | NUTRITION COMPARISON` on a single baseline. Lowest value in each row is bold black at 22px; other values are muted at 20px with a small `↓` indicator on the winner.
6. **Shopping list modal:** Open via the cart icon on Planner toolbar. Modal has zero border-radius. Overlay covers the full viewport including outside the content container. HIDE COMPLETED is plain text. SHARE is a compact sharp button at the bottom of the modal, not full-width.
7. **Grid text alignment:** On a wide viewport (1440px+), the text below the leftmost grid column starts at the same horizontal position as "ALL" in the toolbar. The text below the rightmost column ends at the same position as "+ NEW". Photos still span edge to edge.
8. **Test suite:** jest passes, TypeScript clean.

## Commit message

```
design: compare mode, shopping list modal, grid alignment (BRIEF-13)

Compare mode loses the dark banner and floating pill. A slim subrow
replaces both, with slots that fill as recipes are selected and a
COMPARE → CTA that activates at 2+ selections. Selected tiles show
a border outline, no fill tint. Checkmarks move inside .rgrid-photo
so they sit above the background image. Comparison chart gets the
lowest-value highlight (bold black vs muted) and a clean nav header.
Shopping list modal corners sharp, overlay full-viewport, SHARE
button compact. Grid outer columns get matching 40px padding so
category text aligns with the toolbar.

Depends on BRIEF-06 through BRIEF-12.
```

## Flag before proceeding

Pause and check in if:
- Compare mode state is managed in a way that doesn't cleanly support `selectedCount` in the toolbar button label — describe the state shape and we'll adapt
- The comparison chart's lowest-value logic is server-computed — if `.lo` needs to be added dynamically, describe how the chart data is structured so the right approach can be specified
- The `nth-child` outer-column padding fix conflicts with the grid's responsive breakpoints in an unexpected way — describe and we'll adjust the selector logic
- The shopping list modal uses a shared modal primitive that's also used elsewhere — apply border-radius: 0 to the specific modal class, not the shared primitive, and flag the shared component for a future sweep
- The photo border artifact in the comparison chart comes from a shared image component that also has borders elsewhere — isolate the fix to the comparison chart context only

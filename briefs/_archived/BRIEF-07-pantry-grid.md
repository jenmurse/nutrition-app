# BRIEF-07 · Pantry grid — kill the cards

## Why

The landing page's Fig. 01 Pantry shows a two-column ruled layout with category eyebrows in mono, item names in DM Sans, and nutrition values running inline with mono units — no card container, no shadow, no tile boundary. The live app shows a wall of bordered, padded rectangular tiles. This is the single biggest visual gap between the app and the landing, and the landing is essentially promising a surface the app doesn't yet deliver.

## Intent

Convert the Pantry grid from a card-based tile layout to a ruled-column layout that matches the landing's Fig. 01. Items sit in hairline-ruled grid cells with no surrounding border per item. The grid should read as a single typographic page, not a grid of boxes.

## Depends on

**BRIEF-06** must be merged first. This brief uses the new toolbar primitives from 06 directly. Do not implement 07 before 06.

## Visual reference

Approved mockup at `design-mocks/app-index-pages-v1.html`, **Fig. 01 — Pantry · Grid**. That file is the source of truth for typography, spacing, and structure. Anything unclear in this brief should defer to the mock.

## Scope

**In scope:**
- Pantry grid page, desktop view only
- Per-item card/tile container → ruled grid cell
- Item name typography (16px → 18px, slightly larger to earn the space the card used to occupy)
- Nutrition block layout (now a two-column label/value pair that stretches the cell width)
- Category eyebrow, per-unit line, and item name vertical stack above nutrition

**Out of scope:**
- Pantry list view (already mostly correct — brief 06 handles its toolbar; no other changes)
- Mobile pantry (separate pass)
- Pantry form (edit/new) — not touched
- Filter/search/sort behavior (same functionality, new styling via 06)
- Data model or per-item actions (click to edit, delete flow) — unchanged

## Specific changes

### 1. Grid container

Replace whatever grid/card-list container is currently used with a sharp CSS grid:

```css
.pantry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  column-gap: 0;
  row-gap: 0;
  /* 4-column layout inside the 1100px max-width container that wraps all page content per design-system.md §3b */
}
```

At narrower desktop widths (below ~1100px) the grid may collapse to 3 or 2 columns — use standard responsive breakpoints matching what the recipe grid uses, but confirm column count at 1100px, 1280px, and 1440px before shipping.

### 2. Per-item cell

Kill the card entirely. No background fill, no box-shadow, no rounded corners, no per-item border. Cells are separated only by hairline rules drawn by the grid itself:

```css
.pantry-item {
  padding: 28px 28px 24px;
  border-right: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  background: none;
  box-shadow: none;
  border-radius: 0;
}
.pantry-item:nth-child(4n)          { border-right: 0; }  /* last column, no right rule */
.pantry-item:nth-last-child(-n+4)   { border-bottom: 0; } /* last row, no bottom rule */
```

The `:nth-last-child(-n+4)` rule assumes a 4-column grid. If the grid is responsive and the column count changes, the last-row rule-removal needs to match — handle that with the same technique per breakpoint.

### 3. Cell internal stack

The current layout puts category, name, unit, and a full nutrition table inside a padded white card. The new layout preserves the same vertical order but restyles each piece:

```jsx
<article className="pantry-item">
  <div className="pantry-item__cat">Canned & Jarred</div>    {/* 9px mono muted, was same */}
  <h3 className="pantry-item__name">Anchovy fillets</h3>      {/* 18px DM Sans 600 — was ~16px */}
  <div className="pantry-item__unit">1 anchovy · 2.67g</div>  {/* 9px mono muted — sits between name and nutrition */}
  <dl className="pantry-item__nut">
    <dt>Calories</dt><dd>219</dd>
    <dt>Fat</dt><dd>9.4<span className="u">g</span></dd>
    {/* ... 8 rows total */}
  </dl>
</article>
```

**Typography changes from current:**
- Item name: 16 → 18px, 600 weight, letter-spacing -0.01em, line-height 1.2. Uses DM Sans (font-sans).
- Category eyebrow: 9px DM Mono uppercase, 0.14em letter-spacing, `var(--muted)`. Unchanged from current.
- Per-unit line: 9px DM Mono, `var(--muted)`, 0.04em letter-spacing. Sits with 20px gap before the nutrition block.
- Nutrition labels (`dt`): 9px DM Mono uppercase, 0.10em letter-spacing, `var(--muted)`, weight 400.
- Nutrition values (`dd`): 11px DM Mono, tabular-nums, right-aligned, `var(--fg)`.
- Nutrition unit suffix (`.u` inside dd): 9px DM Mono, `var(--muted)`, 2px left margin.

### 4. Nutrition block layout

Two-column grid inside each cell. Label aligns left, value aligns right, rows separated by 6px row-gap, columns separated by 16px:

```css
.pantry-item__nut {
  display: grid;
  grid-template-columns: 1fr auto;
  row-gap: 6px;
  column-gap: 16px;
  margin-top: 20px;
}
.pantry-item__nut dt {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.10em;
  color: var(--muted);
  font-weight: 400;
  margin: 0;
}
.pantry-item__nut dd {
  font-family: var(--font-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--fg);
  margin: 0;
}
.pantry-item__nut dd .u {
  font-size: 9px;
  color: var(--muted);
  margin-left: 2px;
}
```

All 8 rows (Calories, Fat, Sat Fat, Sodium, Carbs, Sugar, Protein, Fiber) are always shown. This is the deliberate tradeoff of grid view — it shows the full nutrition at a glance. If someone wants less density, that's what list view is for.

### 5. Toolbar

Use the new toolbar primitives from BRIEF-06. Structure:

```jsx
<div className="ed-toolbar">
  <div className="ed-toolbar-group chips">
    <button className="ed-chip is-active">All</button>
    <button className="ed-chip">Items</button>
    <button className="ed-chip">Ingredients</button>
  </div>
  <div className="ed-toolbar-group end">
    <span className="ed-count"><strong>{count}</strong> items</span>
    <div className="ed-toolbar-sep" />
    <div className="ed-toggle">
      <a className="is-active" href="?view=grid">Grid</a>
      <a href="?view=list">List</a>
    </div>
    <div className="ed-search"><input placeholder="SEARCH" /></div>
    <button className="ed-btn-primary">+ Add</button>
  </div>
</div>
```

Nothing in the toolbar is page-specific beyond the chip labels and count. If a shared `PantryToolbar` / `RecipesToolbar` abstraction already exists, keep it and just swap its styles to the new primitives. Do not introduce a new component layer for this.

## Do not change

- Data fetching or the Pantry item model. This is purely a presentational change.
- Click behavior (tap item → open edit form). Preserved.
- Filter logic (ALL / ITEMS / INGREDIENTS). The chip styles change; the behavior does not.
- The `224 items` count — stays as the page's primary affordance for orientation.
- Ghost/empty state — if a pantry has zero items, leave the existing empty state alone. That's a separate pass.
- Mobile layout. Desktop only. Mobile has its own pass later.

## Files likely affected

- The pantry grid view component (likely `app/pantry/page.tsx` or `components/pantry/PantryGrid.tsx` or similar)
- The pantry item card component (likely `components/pantry/PantryCard.tsx` — this component may shrink substantially or merge into the grid parent)
- `app/globals.css` for the new `.pantry-item`, `.pantry-item__*` classes (or Tailwind equivalents if the project's using utility-first)
- Remove any old pantry-card-specific CSS (background, box-shadow, border-radius) that's no longer referenced

## Verification

1. **Visual, desktop 1440×900:** Pantry grid should show 4 columns of items, items separated only by hairline rules, no boxed tiles. Category eyebrow in mono up top, item name larger than before, unit line underneath, 8-row nutrition block below. Compare side-by-side with `design-mocks/app-index-pages-v1.html` Fig. 01 — they should look near-identical.
2. **Cell boundaries:** The rightmost column has no right-border (grid ends cleanly). The bottom row has no bottom-border (grid ends cleanly). No double-rules anywhere.
3. **Responsive check at 1100px:** The grid should still be readable. If 4 columns are too tight at 1100px, drop to 3 columns — confirm the nth-child rule-removal logic updates accordingly.
4. **Data density:** Every visible item must show all 8 nutrition rows. If any item is missing data (e.g., no fiber), show `0g` not blank — the visual consistency of the grid depends on every row being present.
5. **Hover behavior:** Hovering an item should cue that it's clickable. Subtle — either a small background tint (`var(--bg-2)` at low opacity) or a cursor change alone. Do NOT add a shadow or lift effect — that reintroduces the card feeling.
6. **Click-through:** Tapping/clicking an item opens the pantry edit form as before.
7. **Grid/list toggle:** Switch to list and back. List view unchanged in layout; both should now share the new toolbar primitives.
8. **Test suite:** jest passes. TypeScript clean.

## Commit message

```
design: convert pantry grid to ruled columns (BRIEF-07)

Replaces the card-tile layout with a 4-column ruled grid matching
landing Fig. 01. Items lose their per-item border, shadow, and
background; cells are separated by hairline rules only. Item name
bumps from 16 → 18px and the 8-row nutrition block uses a two-column
label/value layout that stretches the cell width.

Depends on BRIEF-06 toolbar primitives.
```

## Flag before proceeding

Pause and check in if:
- The pantry card is using a shared card component (e.g., `<Card />`) that's also used on recipe detail or elsewhere. If so, don't modify the shared component — fork it or inline the new styles specifically for pantry, and flag the shared component for a separate brief.
- The current grid uses CSS-in-JS with a card abstraction that can't cleanly reach hairline rules — describe the constraint and we'll rework the approach.
- Any pantry item has truly missing data (not 0, but undefined) — the display logic needs to handle that case explicitly.
- The responsive column count (4 → 3 → 2) doesn't fit existing breakpoints in the project — ask rather than inventing new ones.

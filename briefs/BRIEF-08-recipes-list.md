# BRIEF-08 · Recipes list — add nutrition values, unify with pantry list

## Why

The Recipes list view currently shows a thumbnail, a category tag in mono, and the recipe name — and that's it. No nutrition data. This makes the list view nearly useless for its primary purpose: scanning recipes by their nutritional profile. The Pantry list already shows a 4-value nutrition row (kcal · fat · carbs · prot); the Recipes list should match exactly, so the two pages read as a unified pattern.

## Intent

Add the same 4-value nutrition row to each Recipe list row. Move the category tag to follow the name (currently leads it), matching the Pantry list pattern. Apply the new toolbar primitives from BRIEF-06.

## Depends on

**BRIEF-06** must be merged first.

## Visual reference

`design-mocks/app-index-pages-v1.html`, **Fig. 04 — Recipes · List**.

## Scope

**In scope:**
- Recipes list view, desktop only
- Add nutrition values (kcal, fat, carbs, protein) to each row, mono, tabular-nums, right-aligned
- Reorder: `[thumbnail] NAME CATEGORY · values` (category follows name, matches pantry list)
- Apply new toolbar primitives per BRIEF-06
- Row density and spacing to match Pantry list (same typographic pattern)

**Out of scope:**
- Recipes grid view (brief 09)
- Recipe detail page
- Compare mode overlay (flagged separately as the weakest surface in the app — not this brief)
- Mobile list view
- Recipe data model (each recipe already has the nutrition values; this is a display change only)
- Favorites behavior
- Sort logic (NAME ↓ still sorts as before; visual treatment changes per 06)

## Specific changes

### 1. Row layout

Replace the current row with a three-column grid: thumbnail, name+category, values:

```css
.recipe-list-row {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: center;
  padding: 14px 40px;
  border-bottom: 1px solid var(--rule);
  gap: 18px;
}
.recipe-list-row:last-child { border-bottom: 0; }
```

### 2. Thumbnail

Small, 56×40px, cover-positioned. Ghost/no-photo state: the existing cream `var(--bg-2)` background is fine — no placeholder text needed at this size (the name is right next to it).

```css
.recipe-list-row__thumb {
  width: 56px;
  height: 40px;
  background-color: var(--bg-2);
  background-size: cover;
  background-position: center;
}
```

### 3. Name + category block

Name is DM Sans 600 15px. Category follows the name in DM Mono 9px muted uppercase — this is the change from the current layout, where category leads the name.

```css
.recipe-list-row__main {
  display: flex;
  align-items: baseline;
  gap: 14px;
  min-width: 0;
}
.recipe-list-row__name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg);
}
.recipe-list-row__cat {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  flex-shrink: 0;
}
```

JSX pattern:

```jsx
<div className="recipe-list-row__main">
  <span className="recipe-list-row__name">Almond Croissant Bars</span>
  <span className="recipe-list-row__cat">Dessert</span>
</div>
```

### 4. Nutrition values

Add a 4-value mono row at the end of each row, same pattern as Pantry list. Values are kcal, fat, carbs, protein — per serving. Unit follows the number in smaller muted mono.

```css
.recipe-list-row__vals {
  display: flex;
  gap: 28px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--fg);
}
.recipe-list-row__vals span .u {
  font-size: 9px;
  color: var(--muted);
  margin-left: 2px;
}
```

JSX:

```jsx
<div className="recipe-list-row__vals">
  <span>380<span className="u">kcal</span></span>
  <span>14<span className="u">g fat</span></span>
  <span>56<span className="u">g carbs</span></span>
  <span>11<span className="u">g prot</span></span>
</div>
```

**Fixed order:** kcal, fat, carbs, protein. Do not sort by value or reorder per recipe. This consistency is what makes the list scannable.

**Rounding:** values are whole numbers for kcal (no decimals), integer grams for macros. If a recipe has sub-1g fiber or sat fat, round to 0. If the stored value is precisely 0, still render "0" — never leave a slot blank. Visual consistency > nutritional precision at this density.

### 5. Toolbar

Use BRIEF-06 primitives. Structure identical to Recipes grid:

```jsx
<div className="ed-toolbar">
  <div className="ed-toolbar-group chips">
    <button className="ed-chip is-active">All</button>
    <button className="ed-chip">Breakfast</button>
    <button className="ed-chip">Lunch</button>
    <button className="ed-chip">Dinner</button>
    <button className="ed-chip">Side</button>
    <button className="ed-chip">Snack</button>
    <button className="ed-chip">Dessert</button>
    <button className="ed-chip">Beverage</button>
    <button className="ed-chip">★ Favorites</button>
  </div>
  <div className="ed-toolbar-group end">
    <span className="ed-count"><strong>{count}</strong> recipes</span>
    <div className="ed-toolbar-sep" />
    <button className="ed-btn-text">Compare</button>
    <button className="ed-btn-text">Name ↓</button>
    <div className="ed-toggle">
      <a href="?view=grid">Grid</a>
      <a className="is-active" href="?view=list">List</a>
    </div>
    <div className="ed-search"><input placeholder="SEARCH" /></div>
    <button className="ed-btn-primary">+ New</button>
  </div>
</div>
```

Note: COMPARE and NAME ↓ are now text buttons (via 06), not pill buttons. The `↓` arrow is a Unicode char (↓ U+2193). If the current sort dropdown is a `<select>`, keep the `<select>` behavior but style its trigger using `ed-btn-text` — rendering the native dropdown chrome invisibly around the trigger text.

## Do not change

- Recipe data model, including per-serving nutrition values (assumed to exist)
- Click behavior (tap row → open recipe detail)
- Favorite star on recipe rows (if present) — keep its geometric dot treatment from previous coral-cleanup work; that pattern is correct
- List row height beyond what's specified — the ~68px row height should feel right; if it feels too tall or too tight after merging, tune then
- Sort behavior — NAME ↓ sorts the same way, just looks different
- Compare mode entry — still triggered by the Compare button; still uses the existing compare overlay (which is a separate weak surface flagged for a future brief)

## Files likely affected

- Recipes list view (likely `app/recipes/page.tsx` with a `view=list` branch, or `components/recipes/RecipeList.tsx`)
- Recipe row component
- `app/globals.css` for `.recipe-list-row`, `.recipe-list-row__*` classes
- Per-recipe nutrition accessor if it's not already available in the list-view data fetch — confirm the serving-level nutrition is loaded for the list view; if not, may need to extend the data fetch

## Verification

1. **Visual, desktop 1440×900:** Every row shows thumbnail, name, category in mono, and 4 values. Rows separated by hairline rules. Compare to `design-mocks/app-index-pages-v1.html` Fig. 04 — they should look near-identical.
2. **Values align:** All 4 value slots align in vertical columns across rows (tabular-nums ensures this). Units always align. Longer values (e.g., 1000+ kcal) don't break the column.
3. **Category after name:** Confirm every row has category trailing the name, not leading it. If any row still has leading category, the old pattern leaked through.
4. **Name + category baseline:** Both align on the same baseline. The `align-items: baseline` on the main block handles this; don't override with center-alignment.
5. **Toolbar:** Matches BRIEF-06 spec exactly. Chips scroll horizontally if too wide to fit; active chip has hairline underline under its letters, not at the toolbar bottom.
6. **Grid toggle still works:** Switching to grid mode navigates to the grid view (brief 09 if merged, or the current grid if not). Data model and routing unchanged.
7. **Ghost thumbnails:** Recipes without photos show a cream block, same as before. Readable.
8. **Test suite:** jest passes. TypeScript clean.

## Commit message

```
design: recipes list gets nutrition values + pantry-list pattern (BRIEF-08)

Adds a 4-value mono scan row (kcal · fat · carbs · prot) to every
row, matching pantry list exactly. Category tag moves to follow the
name in mono. Applies BRIEF-06 toolbar primitives.

Depends on BRIEF-06 toolbar primitives.
```

## Flag before proceeding

Pause and check in if:
- Recipe objects don't carry per-serving nutrition at list-fetch time (may need a data-layer change)
- The favorites star or any other per-row affordance uses a class that would conflict with the new row grid
- The sort dropdown is implemented in a way that doesn't degrade cleanly to a text-button trigger (e.g., a headless-UI or Radix select with heavy chrome) — describe and we'll adapt

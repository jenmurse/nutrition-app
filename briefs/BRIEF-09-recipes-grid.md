# BRIEF-09 · Recipes grid — ruled cells, ghost tile alignment

## Why

The current Recipes grid reads as a pinboard of photo tiles floating in a page — the cells feel like separate objects rather than a composed surface. The landing's register (Fig. 01, Fig. 03) is ruled and unified: cells exist only as hairline-bounded regions of a single grid. This brief brings the Recipes grid into that register without disrupting the photo-first nature of the page (the photo is load-bearing content for recipe recognition and stays dominant).

A second, smaller issue: ghost tiles (recipes without photos) currently use a bottom-left aligned title against the `var(--bg-2)` cream background. That's correct and should be preserved. An earlier mock attempt centered the title; the current bottom-left treatment stays.

## Intent

Convert the Recipes grid from padded floating tiles to a ruled 4-column grid. Photo remains dominant. Category eyebrow and name sit below the photo in the same typographic register as Pantry grid (brief 07). No nutrition values on grid view — those live on list (brief 08).

## Depends on

**BRIEF-06** must be merged first. BRIEF-07 (Pantry grid) is a close sibling — order doesn't matter but doing 07 before 09 makes the typography consistency checks easier.

## Visual reference

`design-mocks/app-index-pages-v1.html`, **Fig. 03 — Recipes · Grid**.

## Scope

**In scope:**
- Recipes grid page, desktop only
- Per-tile container → ruled grid cell
- Photo remains the primary content (stays aspect-ratio 1:1 or existing ratio, whichever the codebase uses)
- Category + name typography below photo, matching pantry grid
- Ghost tile (no photo) — bottom-left aligned large muted title, preserved from current behavior

**Out of scope:**
- Recipes list view (brief 08)
- Recipe detail page
- Compare mode and its selection overlay (weakest surface, separate brief)
- Mobile grid view (separate pass — currently single column at Instagram scale, still under review per SESSION-SUMMARY)
- Nutrition data on grid cells (explicitly not added — the grid is visual recognition, not nutritional scanning)
- Favorites behavior on cards
- Sort/filter logic (same behavior, new toolbar styling via 06)

## Specific changes

### 1. Grid container

Same pattern as Pantry grid (brief 07) — 4 columns, hairline-ruled, no inter-cell gaps:

```css
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  column-gap: 0;
  row-gap: 0;
}
```

Responsive collapse to 3 columns at narrow desktop widths should match whatever breakpoint Pantry grid uses so the two pages stay visually consistent.

### 2. Per-cell layout

```css
.recipe-grid-item {
  padding: 24px 24px 32px;
  border-right: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  background: none;
  box-shadow: none;
  border-radius: 0;
}
.recipe-grid-item:nth-child(4n)        { border-right: 0; }
.recipe-grid-item:nth-last-child(-n+4) { border-bottom: 0; }
```

Same last-column / last-row rule-removal as pantry grid. If column count changes at breakpoints, the rule-removal logic must change with it.

### 3. Photo

Keep the existing aspect ratio (1:1 in the current app) and `object-fit: cover` behavior. Remove any rounded corners on the image itself:

```css
.recipe-grid-item__photo {
  aspect-ratio: 1 / 1;
  background-color: var(--bg-2);
  background-size: cover;
  background-position: center;
  border-radius: 0;
  margin-bottom: 18px;
}
```

The photo is the primary identity of each recipe. Do not shrink it or add chrome around it.

### 4. Ghost tile (recipe without photo)

Cream `var(--bg-2)` background, name rendered as large muted text, bottom-left aligned inside the photo area. This is the current behavior — preserve it, don't change to centered:

```css
.recipe-grid-item__photo.is-ghost {
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 20px;
}
.recipe-grid-item__photo.is-ghost .ghost-title {
  color: var(--rule);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.1;
  text-align: left;
}
```

The ghost state is an editorial flourish — the empty state becomes a typographic card on its own. Do not replace it with an icon or illustration.

**Rule:** The app does not center content. Ghost titles, like everything else, align bottom-left.

### 5. Category eyebrow + name below the photo

```css
.recipe-grid-item__cat {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  margin-bottom: 6px;
}
.recipe-grid-item__name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--fg);
  text-wrap: balance;  /* orphan prevention */
}
```

JSX:

```jsx
<article className="recipe-grid-item">
  <div
    className={`recipe-grid-item__photo ${recipe.image ? '' : 'is-ghost'}`}
    style={recipe.image ? { backgroundImage: `url(${recipe.image})` } : undefined}
  >
    {!recipe.image && <span className="ghost-title">{recipe.name}</span>}
  </div>
  <div className="recipe-grid-item__cat">{recipe.category}</div>
  <h3 className="recipe-grid-item__name">{recipe.name}</h3>
</article>
```

### 6. Toolbar

Use BRIEF-06 primitives. Structure identical to Recipes list (brief 08):

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
      <a className="is-active" href="?view=grid">Grid</a>
      <a href="?view=list">List</a>
    </div>
    <div className="ed-search"><input placeholder="SEARCH" /></div>
    <button className="ed-btn-primary">+ New</button>
  </div>
</div>
```

## Do not change

- Recipe data model. Purely presentational.
- Click behavior (tap tile → open recipe detail).
- Favorites dot marker on recipes with a photo (if present) — preserve the current geometric dot treatment from previous coral-cleanup work.
- The photo aspect ratio. If it's currently 1:1, keep it 1:1. If it's something else, keep that.
- Mobile layout. Desktop only.
- Compare mode entry (still via toolbar Compare button; still uses the existing — flagged weak — overlay).

## Files likely affected

- Recipes grid view component (likely `app/recipes/page.tsx` with a `view=grid` branch, or `components/recipes/RecipeGrid.tsx`)
- Recipe tile / card component — will shrink substantially; its card chrome is removed entirely
- `app/globals.css` for `.recipe-grid-item`, `.recipe-grid-item__*` classes
- Remove any old recipe-card-specific CSS (background, box-shadow, border-radius, padding) that's no longer referenced

## Verification

1. **Visual, desktop 1440×900:** Recipes grid shows 4 columns, cells separated only by hairline rules, no boxed tiles, no shadows. Photos are prominent and bottom-left aligned with their typography. Compare against `design-mocks/app-index-pages-v1.html` Fig. 03.
2. **Ghost tiles:** Any recipe without a photo shows the cream block with bottom-left aligned large muted title. Confirm several ghost tiles render correctly by category-filtering to a view where ghost tiles are common (e.g., a category that hasn't had photos uploaded yet).
3. **Cell boundaries:** Rightmost column has no right-border. Bottom row has no bottom-border. No double-rules.
4. **Photo edges are sharp:** No rounded corners on any photo. Visual confirm on both photo-filled and ghost tiles.
5. **Responsive at 1100px:** Grid still reads well. Column count matches pantry grid at the same breakpoint for consistency.
6. **Toolbar:** Matches BRIEF-06 spec. Filter chips scroll horizontally as needed with right-side fade. Active chip and active toggle word both have hairline underlines under their letters.
7. **Click-through:** Tapping a tile opens recipe detail.
8. **Test suite:** jest passes. TypeScript clean.

## Commit message

```
design: recipes grid — ruled cells, sharp photos (BRIEF-09)

Replaces the padded floating-tile layout with a 4-column ruled grid
matching pantry grid (brief 07). Photos lose any rounded corners and
stay dominant. Category + name sit directly below the photo in the
same typographic register as pantry. Ghost tiles keep their cream
bottom-left-aligned title treatment.

Depends on BRIEF-06 toolbar primitives.
```

## Flag before proceeding

Pause and check in if:
- The recipe tile is using a shared card component that's also used elsewhere (recipe detail, compare overlay, planner)
- Photos are rendered via a Next.js `<Image />` component with built-in rounded corners that need explicit override
- The ghost tile is currently center-aligned in code — preserve it as bottom-left-aligned, matching current app behavior, and flag if the current behavior is actually different from what SESSION-SUMMARY suggests
- The grid responsive breakpoints disagree with pantry grid — they should match

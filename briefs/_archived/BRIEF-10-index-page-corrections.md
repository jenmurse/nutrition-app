# BRIEF-10 · Index page corrections

## Why

BRIEF-06 through BRIEF-09 landed and the new register is close, but a pass of visual QA against the approved mockup (`design-mocks/app-index-pages-v1.html`) and against Dashboard/Planner (the two pages already in the target register) surfaced four related issues. All are small but they compound into a noticeable gap between app and mock. Rolling them into one brief because they're all on the same surfaces and a single pass is less friction than four separate PRs.

## Intent

Bring Recipes grid, Recipes list, Pantry grid, and Pantry list into pixel alignment with the mock by fixing four things:

1. **Layout container.** Recipes and Pantry index pages currently stay inside the 1100px content container. Dashboard and Planner already break out to full viewport width. Recipes and Pantry should match them — the index surfaces are the wide, dense surfaces of the app and belong edge-to-edge.

2. **Toolbar spacing.** The toolbar implementation from BRIEF-06 lost the group gaps and the vertical pipe separator somewhere in translation. Things sit too close together on the right side, and COMPARE still has a carry-over icon glyph that should be plain text.

3. **Hover affordance.** Pantry list has a subtle hover treatment — a thin left-to-right fill animation on row hover. It's working well there but doesn't exist on recipe list or on grid cells. Extend the treatment to all four ruled surfaces as a shared primitive.

4. **COMPARE glyph.** Residual from the pre-BRIEF-06 pill-button implementation. Remove the glyph so it's just the word "Compare" in mono.

## Depends on

BRIEF-06, 07, 08, 09 all merged.

## Visual reference

`design-mocks/app-index-pages-v1.html` — specifically Fig. 01 (Pantry grid) and Fig. 02 (Pantry list) for the edge-to-edge layout and toolbar spacing. The mock renders everything inside a ruled frame, but the key detail is that the hairline rules between cells/rows extend from left content edge to right content edge without floating inside a narrower column.

For the layout convention, look at the live app's Planner page and Dashboard page. Both already break out to viewport width. Copy their container pattern.

## Scope

**In scope:**
- Recipes grid page container — break out to viewport width
- Recipes list page container — break out to viewport width
- Pantry grid page container — break out to viewport width
- Pantry list page container — break out to viewport width
- Toolbar spacing on all four pages — restore 20px group gaps, restore vertical pipe separator, fix any other spacing that diverges from the mock
- COMPARE button — remove icon glyph, keep the text
- Unified row/cell hover treatment — extract whatever pantry list is doing into a shared utility, apply to the other three surfaces

**Out of scope:**
- Dashboard (already correct)
- Planner (separate brief later for its toolbar)
- Recipe detail page
- Forms (pantry edit/new, recipe edit/new)
- Settings, auth, onboarding
- Compare selection overlay (the dark pill selection banner — flagged as the weakest surface in the app, separate brief)
- Hairline weight audit (separate brief — we want to compare app `var(--rule)` against the landing's hairlines, but that's a token investigation not a page fix)
- Primary button sizing adjustment — hold judgment until after this brief lands and the toolbar has its proper spacing back, then re-evaluate

## Specific changes

### 1. Break Recipes and Pantry out of the 1100px container

Find the pattern Planner and Dashboard use to opt out of the app's default 1100px content container. Likely candidates:

- A `layout.tsx` at `app/(app)/layout.tsx` or similar that wraps children in a `max-width` container
- A page-level `className` that overrides the container
- A per-route layout or a wrapping `<main>` element with a specific class

Once the pattern is identified, apply the same opt-out to Recipes and Pantry index routes. The goal: on a 1920px monitor, the toolbar's bottom hairline and the grid/list rules extend from the left edge of the viewport to the right edge, with no beige margin on either side.

**Content padding still applies.** The text inside cells and rows should not hug the viewport edge. Use 40px horizontal padding on the inner elements (matching the nav and toolbar), but the hairline rules themselves extend the full viewport width. Pattern:

```css
.recipe-list-row,
.pantry-list-row {
  padding: 18px 40px;              /* content sits 40px from viewport edge */
  border-bottom: 1px solid var(--rule);  /* rule spans full width because the row is edge-to-edge */
}

.recipe-grid,
.pantry-grid {
  /* grid itself spans full width; each cell has internal padding */
}
.recipe-grid-item,
.pantry-item {
  padding: 24px 40px 32px;         /* first/last columns match list padding for vertical alignment */
}
```

**Important:** the leftmost and rightmost cells of the grid should have 40px interior padding on their outside edge specifically, so the content inside them lines up with the toolbar and nav above. Interior cells can use 24px like the mock. This keeps visual alignment of text anchors across the full page width.

If the codebase uses a utility class like `.full-bleed` or `.break-out`, use that. If not, the cleanest implementation is a page-level wrapper that explicitly opts out of the content container.

### 2. Toolbar spacing

Compare the live toolbar against `design-mocks/app-index-pages-v1.html`. Fix:

**Group gap.** The right-side group of controls (count, separator, compare, sort, toggle, search, button) should have 18–20px between each element. Currently some elements are jammed together. Check the `.ed-toolbar-group.end` rule and confirm `gap: 18px` (or equivalent per framework).

**Vertical pipe separator.** A 1px × 16px vertical rule should sit between the count and the first utility control. If the separator element was lost in implementation, add it back:

```html
<span className="ed-count"><strong>64</strong> recipes</span>
<div className="ed-toolbar-sep" />
<button className="ed-btn-text">Compare</button>
```

```css
.ed-toolbar-sep {
  width: 1px;
  background: var(--rule);
  height: 16px;
  align-self: center;
  margin: 0 2px;
}
```

This one pipe is load-bearing — it visually separates "metadata about the page" (the count) from "controls you use" (compare/sort/view/search/add). Without it, the right side of the toolbar reads as mush.

**Toolbar horizontal padding.** The toolbar's own left/right padding should match the nav and the grid content — 40px. If it's been reduced to get the right-side controls to fit, restore to 40px and let the chip row's horizontal scroll handle overflow instead.

**COMPARE icon.** The Compare button currently renders a glyph (`⊞` or similar) before the word. Remove the glyph. Final rendered text is just "Compare" in uppercase DM Mono 9px muted, matching the other text buttons. If the icon is hard-coded in the JSX, remove it. If it's coming from a lucide-react / icon-set import, remove the import and the element.

### 3. Unified row/cell hover treatment

The pantry list rows currently have a hover animation — a thin black bar that fills left-to-right across the row on hover. (If that's not quite what the implementation does, describe what it actually does and we'll align.) This is the treatment we want everywhere.

Extract the existing pantry-list hover into a shared utility class, then apply to:

- Pantry list rows (keep as-is, just make sure it uses the shared class)
- Recipe list rows
- Pantry grid cells
- Recipe grid cells

Proposed shared pattern:

```css
.ruled-hover {
  position: relative;
  cursor: pointer;
  transition: color 0.15s ease;
}
.ruled-hover::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;              /* sits on the bottom hairline of the row/cell */
  height: 1px;
  width: 0;
  background: var(--fg);
  transition: width 0.25s ease;
}
.ruled-hover:hover::before {
  width: 100%;
}
```

If the existing pantry list implementation uses a different technique (e.g., animating the border color, or using `box-shadow` to fake a thicker bottom rule), preserve the existing technique and just port it to the three other surfaces. Consistency of behavior matters more than the exact CSS mechanism.

**Do not add a background color change on hover.** The black-rule fill is the signal; a background tint would add visual weight and move the register back toward cards.

For grid cells specifically, the bottom-edge black-fill on hover might read strangely on the bottom-row cells (where there's no bottom rule). If that's an issue, an alternative: use the right rule instead for grid cells, so the hover line draws top-to-bottom on the right edge rather than left-to-right on the bottom. Test both and flag which reads better. Either is acceptable — just pick one per surface and apply consistently.

### 4. Mockup file: update if needed

If the mockup's toolbar spacing has diverged from what the new brief specifies (e.g., the mock uses `gap: 20px` but this brief says `gap: 18px`), update the mockup file itself so it stays the source of truth. Do not leave the mockup in conflict with the brief — future design questions will read the mockup first and get confused.

## Do not change

- Dashboard layout — already correct
- Planner layout — already correct and handled by a separate brief later
- Any form or detail page — they stay in the 1100px container because they're document pages
- The grid's internal column count or responsive breakpoints — already correct
- Chip styles, toggle styles, primary button styles — the BRIEF-06 primitives stay as specified; this brief only fixes spacing around them
- The count label text (`64 recipes` / `224 items`) — already correct
- Sort behavior, filter behavior, search behavior — unchanged
- The ghost tile treatment on recipe grid — already correct per BRIEF-09
- Any hover treatment on the top nav, chips, toggles, or buttons — those have their own hover logic and are not part of the "ruled row" unification

## Files likely affected

- App layout file(s) — locate the container that applies the 1100px max-width and find how Dashboard/Planner opt out
- `app/recipes/page.tsx` (or equivalent) for layout opt-out
- `app/pantry/page.tsx` (or equivalent) for layout opt-out
- `app/globals.css` — add `.ed-toolbar-sep` if missing, add `.ruled-hover` utility, fix toolbar gap if needed
- Shared toolbar component if one exists — fix the sep/gap there rather than per-page
- `components/recipes/RecipeList.tsx`, `RecipeGrid.tsx`, `components/pantry/PantryList.tsx`, `PantryGrid.tsx` — add `.ruled-hover` class to row/cell elements
- Compare button JSX wherever it lives — remove the icon glyph
- `design-mocks/app-index-pages-v1.html` — only if spacing values in the mock diverge from this brief

## Verification

1. **Full viewport on a wide monitor (1680px+):** Open Recipes grid. Toolbar hairline extends from far-left viewport edge to far-right viewport edge. Grid rules extend the same way. No beige margin on either side. Repeat on Recipes list, Pantry grid, Pantry list.
2. **Content alignment:** The leftmost column of text (e.g., "Almond Croissant Bars" on Recipes list, or the category eyebrow on the leftmost grid cell) should sit 40px from the viewport left edge — same horizontal position as the "Good Measure" wordmark in the nav. Use browser devtools to measure and confirm.
3. **Toolbar, right side:** On Recipes, the right-side controls should read as: `64 RECIPES  |  COMPARE  NAME ↓  GRID LIST  SEARCH_  [+ NEW]`. The pipe is a real vertical rule. The spaces between COMPARE / NAME / GRID/LIST / SEARCH / button are visibly consistent. COMPARE has no icon glyph — just the word.
4. **Toolbar, both Recipes and Pantry:** Same spacing and structure on both pages. No one-off quirks.
5. **Hover on all four surfaces:** Mouse over a recipe list row — thin black line draws left-to-right across the bottom. Mouse over a pantry list row — same. Mouse over a recipe grid cell — same (or right-edge draw, whichever you chose). Mouse over a pantry grid cell — same. The four surfaces should feel like the same product.
6. **Keyboard focus:** Tabbing through a list row should show a focus state that's distinct from hover but not obnoxious. The existing focus ring primitives apply — this brief doesn't change them but verify they still work after the layout changes.
7. **Responsive:** At ~1100px viewport width, the pages should still read well. The full-bleed treatment is a "uses the width you have" pattern, not a "needs at least 1400px" pattern. Narrower viewports just mean shorter rules.
8. **Regression check:** Dashboard and Planner still look identical to before this brief. Recipe detail and forms still sit in the 1100px container.
9. **Test suite:** jest passes, TypeScript clean.

## Commit message

```
design: index page corrections — edge-to-edge, toolbar spacing, unified hover (BRIEF-10)

Recipes and Pantry index pages break out of the 1100px container to
match Dashboard and Planner. Toolbar spacing restored with 20px group
gaps and the vertical pipe separator between count and utility
controls. COMPARE icon glyph removed. Row/cell hover treatment
extracted from pantry list into a shared primitive and applied to
recipe list, pantry grid, and recipe grid.

Depends on BRIEF-06 through BRIEF-09.
```

## Flag before proceeding

Pause and check in if:
- The layout container is enforced by a shared wrapper that Dashboard and Planner opt out of via a mechanism that doesn't generalize cleanly (e.g., they use a hardcoded className that would conflict elsewhere) — describe the constraint and we'll decide how to extend it
- The existing pantry list hover isn't implemented the way this brief assumes, and porting the real mechanism to three other surfaces raises compatibility issues (e.g., the technique depends on a sibling element that grid cells don't have) — describe and we'll adapt
- Removing the 1100px container on Recipes/Pantry causes unrelated elements on those pages (empty states, modals, etc.) to stretch in ugly ways — call those out page by page; we may need to scope the break-out more carefully than "the whole page"
- The COMPARE icon is structurally tied to a shared IconButton component that the compare-overlay banner also uses — don't touch the shared component; just suppress the icon on the toolbar's instance
- The toolbar in code lives as separate per-page components rather than one shared component — fix in one place, duplicate the fix to the other, and flag the duplication so a future brief can consolidate

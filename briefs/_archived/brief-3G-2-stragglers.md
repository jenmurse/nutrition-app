# BRIEF 3G-2 — Stragglers (revised)

**Settings actions, recipe grid empty-state, planner cart icon, preset card active state**

**Part of:** Step 3 of the design pass. Final brief in the Step 3 sequence.
**Scope:** Single PR. Four small targeted fixes across Settings, Recipes grid, Planner empty state, and Onboarding Step 4. Desktop primary; mobile parity where the same component renders.
**Depends on:** 3A (tokens) merged. Independent of 3B, 3D, 3E, 3F — can run in parallel.
**Blocks:** Nothing.
**Supersedes:** brief-3G-stragglers.md (original draft, written before letter-spacing lock and underline-width clarification landed).

---

## Reconciliation with locked decisions

This brief reconciles with locks that landed AFTER the original 3G draft was written:

1. **Letter-spacing locked to 0.14em** for all eyebrows and mono labels (was 0.16em in places).
2. **Active-state underline must match text glyph width exactly** (locked during 3D-2 work on Add Meal rail; called out explicitly here for the preset card eyebrow underline).
3. **Cart icon scope clarified.** Original brief only removed cart from empty planner; this revision considers the populated planner case too.

---

## Why this brief

Four straggler fixes that surfaced during the desktop chrome audit. None large enough to justify a dedicated brief; together small enough to ship in one PR. After this brief lands, every desktop surface in the working register is fully aligned with the locked editorial system.

The four fixes:

1. **Settings primary action distribution.** The People section's SAVE button is filled black. Downgrade to outlined because saving a household name is a smaller stakes action than saving nutrition goals or regenerating an API token.

2. **Recipe grid empty-state typographic fallback.** When a recipe has no photo, the grid cell currently renders the recipe name in muted ghost text that reads as placeholder. Commit to the typographic fallback by sizing it confidently and adding a category eyebrow above.

3. **Planner empty toolbar cart icon.** The empty planner toolbar shows a shopping cart icon. The empty planner has no plan and therefore nothing to shop for; the cart there is functionally gratuitous. Remove from empty planner; preserve on populated planner where it has a real destination.

4. **Onboarding Step 4 preset card active state.** Currently uses a thicker border on the selected preset card. The locked active-state convention is a 1.5px ink underline. Migrate.

## What's wrong now

### A · Settings People SAVE

Looking at `desktop_settings.png`:

- Three filled-black buttons across the page: SAVE (in People section, top), SAVE GOALS (in Daily Goals section), REGENERATE (in MCP Integration section).
- Per the active-state convention, filled-black is reserved for "the single primary commit per task context." Settings has multiple task contexts (people, goals, MCP, dashboard, data) so multiple filled-blacks is technically allowed.
- But three filled-blacks on one scroll competes visually. The People SAVE is the lowest-stakes of the three (renaming a household, no data risk if missed) but visually identical to the others.

### B · Recipe grid empty cells

Looking at `desktop_recipe_grid.png`:

- Recipes with photos render the photo at full cell size with a category eyebrow + recipe name in a strip below.
- Recipes without photos (`Almond Croissant Blondies`, `Almond Flour Lemon Bars` visible in the screenshot) render a large muted ghost text version of the recipe name, with a thin DESSERT eyebrow appearing later in the strip below.
- The ghost text reads as "incomplete" or "loading" rather than as a deliberate fallback. It's the wrong kind of muted — too light, no architectural commitment.
- Decision (locked from prior conversation): commit to the typographic fallback. Size up the recipe name confidently, place a category eyebrow above it, treat the empty cell as a *typographic moment* rather than as a missing photo.

### C · Empty planner cart icon

Looking at `desktop_empty_planner.png`:

- The empty planner's secondary toolbar shows: `MEAL PLANS | THIS WEEK | 🛒 (cart icon)` on the left, `+ NEW PLAN` outlined button on the right.
- Empty planner has no plan, so the cart icon has no destination — there's nothing to shop for.
- The populated planner toolbar (per `desktop_planner.png`) also shows the cart icon, but on populated planner it has a real destination: the shopping list for the active week's plan. The cart on populated planner stays.

This brief removes the cart only from the empty planner toolbar. If the populated planner toolbar's cart needs visual reconsideration (e.g., to be a text-mono link rather than an icon for system consistency), that's a separate conversation — file as a finding for a future brief.

### D · Onboarding preset card active state

Looking at `desktop_onboarding_4.png`:

- Four preset cards in a 2×2 grid: MAINTAIN, LEAN OUT, BUILD, CUSTOM.
- The selected card (LEAN OUT in the screenshot) has a thicker border than the unselected cards.
- Per the locked active-state convention (design-system §11), active = 1.5px ink underline below the label, not a border weight change.
- The cards themselves are correctly sharp (no rounded corners). Only the selection mechanism is out of system.

## Spec

### A · Downgrade Settings People SAVE to outlined

Change the People section's SAVE button from filled black to outlined:

```jsx
{/* Before */}
<button className="ed-btn-primary">SAVE</button>

{/* After */}
<button className="ed-btn-outline">SAVE</button>
```

Use the existing `.ed-btn-outline` class — whichever class is already in use for the Data section's `EXPORT DATA` button. The People SAVE should match `EXPORT DATA` exactly: same class, same rendering.

**On the sans-vs-mono question.** The locked button register rule is "Border = Sans, No border = Mono." But the existing `EXPORT DATA` button may render in DM Mono (verify in the running build). For this brief: match the EXPORT DATA rendering exactly. Don't introduce a register inconsistency just to follow the rule literally.

If during this work the implementer notices that EXPORT DATA is itself inconsistent with the rule, file as a backlog finding for a future audit. Don't fix in this brief.

```css
/* Reference — should already exist in the codebase */
.ed-btn-outline {
  background: none;
  color: var(--fg);
  border: 1px solid var(--rule);
  border-radius: 0;
  padding: 8px 14px;
  font: 400 9px var(--font-mono);  /* or var(--font-sans), match existing */
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 120ms var(--ease-out);
}

.ed-btn-outline:hover {
  border-color: var(--fg);
}
```

**SAVE GOALS and REGENERATE stay filled black.** They're higher-stakes actions:
- SAVE GOALS: nutrition values that affect meal planning calculations downstream.
- REGENERATE: invalidates the existing MCP API token.

EXPORT DATA was already outlined; that pattern was correct. The People SAVE matches that treatment now.

### B · Recipe grid empty cell typographic fallback

The empty cell becomes a deliberate typographic composition: category eyebrow above, recipe name confidently sized, both left-aligned within the cell.

```jsx
{recipe.image ? (
  <div className="rg-cell rg-cell-photo">
    <img src={recipe.image} alt={recipe.name} />
    <div className="rg-cell-strip">
      <span className="rg-cell-category">{recipe.category}</span>
      <span className="rg-cell-name">{recipe.name}</span>
    </div>
  </div>
) : (
  <div className="rg-cell rg-cell-typographic">
    <span className="rg-cell-category">{recipe.category}</span>
    <span className="rg-cell-name-large">{recipe.name}</span>
  </div>
)}
```

```css
.rg-cell-typographic {
  background: var(--bg);  /* working register white — recipe grid is in working register */
  border: 0.5px solid var(--rule);
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;  /* anchor content to the bottom of the cell */
  aspect-ratio: 1 / 1;  /* match photo cells */
  min-height: 240px;
}

.rg-cell-typographic .rg-cell-category {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
}

.rg-cell-typographic .rg-cell-name-large {
  font: 700 clamp(20px, 2.4vw, 32px) var(--font-sans);
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--fg);
  text-wrap: balance;
}
```

**Note on register.** The recipe grid lives on the recipes index page, which is in the working register. The page wrapper has `data-register="working"` (or no attribute, since working may be the default). `--bg` resolves to white, `--rule` to the working-register hairline color, `--muted` to the working-register muted color.

**Key design moves:**

1. **Anchor to the bottom of the cell** (`justify-content: flex-end`). The eyebrow + name composition reads as label-then-name, with breathing room above. Visually rhymes with the photo cells where the strip sits at the bottom.
2. **Recipe name is larger and ink-colored** — not muted, not ghost. It's the focal point of the cell. The text *is* the cell's content; the cell is a typographic composition, not a missing photo.
3. **Category eyebrow above** matches the photo cells' DESSERT/BREAKFAST/etc. label. Uses the system-wide 9px / 0.14em eyebrow token.
4. **Hairline border** (`0.5px solid var(--rule)`) gives the cell a frame that anchors it visually next to the photo cells. Without the border, the typographic cells would float against the white page background, making them feel even more "missing photo." With the border, they're committed objects.
5. **Aspect ratio 1:1** matches the photo cells. Same footprint, different content.

**The typographic fallback is the design.** Not a placeholder. Not a "we couldn't find a photo" state. It's a deliberate alternative composition. Recipes without photos get a typographic treatment that's *as confident* as the photographic treatment — different but equally finished.

This may also become a stylistic choice over time: some users may prefer the typographic treatment and intentionally not upload photos for certain recipes.

**The eyebrow + name block stays positioned at the bottom of the cell** to mirror photo cells (where the photo is the main content and the text strip is at the bottom). This preserves visual rhythm across the grid even when individual cells are typographic vs. photographic.

### C · Remove the empty planner cart icon

Open the empty planner toolbar component. Locate the cart icon (likely an SVG or icon component rendered conditionally on the empty planner state). Delete it.

Before:
```jsx
<div className="planner-toolbar">
  <span className="mono-link">MEAL PLANS</span>
  <span className="mono-link">THIS WEEK</span>
  <button className="cart-icon-btn">
    <CartIcon />
  </button>
  {/* spacer */}
  <button className="ed-btn-outline">+ NEW PLAN</button>
</div>
```

After:
```jsx
<div className="planner-toolbar">
  <span className="mono-link">MEAL PLANS</span>
  <span className="mono-link">THIS WEEK</span>
  {/* spacer */}
  <button className="ed-btn-outline">+ NEW PLAN</button>
</div>
```

**Don't replace the icon with a SHOPPING text link.** The empty planner has no plan; there's nothing to shop for. The shopping path becomes available on the populated planner and that's the right time for it.

If there's a CSS class scoped to the cart icon (`.cart-icon-btn`, `.toolbar-cart`, etc.), remove it too. Audit for any other reference to the cart icon in the empty-planner context and clean up.

**Populated planner cart stays.** On the populated planner toolbar, the cart icon has a real destination — the shopping list for the active week's plan. Don't remove it from the populated planner. If it later turns out to need its own design treatment (e.g., text link instead of icon for system-wide chrome consistency), that's a separate brief.

### D · Onboarding preset card active state — underline convention

Currently the selected preset card has a thicker border. Migrate to the locked underline convention.

```css
.ob-preset-card {
  background: var(--bg);
  border: 0.5px solid var(--rule);
  border-radius: 0;
  padding: 24px;
  cursor: pointer;
  transition: border-color 120ms var(--ease-out);
  display: flex;
  flex-direction: column;
  position: relative;
}

.ob-preset-card:hover {
  border-color: var(--fg);
}

.ob-preset-card .ob-preset-eyebrow {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
  border-bottom: 1.5px solid transparent;
  padding-bottom: 4px;
  align-self: flex-start; /* eyebrow shrinks to content width; underline doesn't extend past glyphs */
  display: inline-block;
  width: auto;
  transition: color 120ms var(--ease-out), border-color 120ms var(--ease-out);
}

/* Selected state — eyebrow gets the underline + ink color */
.ob-preset-card.is-selected .ob-preset-eyebrow {
  color: var(--fg);
  border-bottom-color: var(--fg);
}
```

**Selected state visual logic:**

- The card's border stays at `0.5px solid var(--rule)` regardless of selection (no border weight change).
- The eyebrow text (MAINTAIN, LEAN OUT, BUILD, CUSTOM) shifts from `var(--muted)` to `var(--fg)`.
- A 1.5px ink underline appears below the eyebrow text.
- Inactive state reserves `border-bottom: 1.5px solid transparent` so the underline doesn't cause layout shift on activation.

**Active underline width MUST match text glyph width exactly.** The `align-self: flex-start` + `display: inline-block; width: auto` combination ensures the eyebrow span shrinks to its text bounds. The underline spans only those bounds.

To verify: when MAINTAIN is selected, the underline is the visual width of the M-A-I-N-T-A-I-N glyphs. When CUSTOM is selected, the underline matches C-U-S-T-O-M. Not wider. If the underline visibly extends past the last character's right edge, the implementation is wrong — likely `align-self` or `width: auto` was missed.

**Why eyebrow-underline instead of card-bottom-underline:**

The eyebrow is the label for the card's content (MAINTAIN = stay where you are). Underlining the eyebrow is the same gesture as underlining a tab label — it says "this label is active." Underlining the card's bottom edge would be ambiguous: is it a separator? a selected state? Eyebrow underline makes the active state location-specific and unambiguous.

**Don't add a colored fill or accent color.** Per the active-state convention, accent colors are reserved for identity. Selection is a decision, not an identity. Decision = neutral ink, never theme color.

**Card content stays unchanged.** Eyebrow at top, headline middle (`Stay where you are.` / `Modest deficit.` / `Lean gain.` / `Set my own.`), specs at bottom (`2,000 KCAL · BALANCED` etc.). Layout unchanged. Only the selected-state mechanism changes.

## Files most likely affected

- Settings page component — the People section's SAVE button (component classname swap)
- Recipe grid component — the empty-cell rendering branch
- `globals.css` — add `.rg-cell-typographic` and related classes; remove the old empty-cell ghost-text styling; update `.ob-preset-card` and `.ob-preset-eyebrow` styles
- Empty planner toolbar component — remove cart icon JSX and any associated CSS class. Verify the icon is conditionally rendered (empty state only); if it's shared with the populated state, scope the removal to the empty branch.
- Onboarding Step 4 (Goals) component — verify the active state class is applied to a wrapper element so the eyebrow underline can render correctly

## Verify before declaring done

### A · Settings People SAVE

- [ ] Open `/settings`. Scroll to the People section.
- [ ] The SAVE button (next to the household name input) renders identically to the EXPORT DATA button in the Data section.
- [ ] Tap SAVE → the household name change persists (functional behavior unchanged).
- [ ] Confirm SAVE GOALS in the Daily Goals section is still filled black.
- [ ] Confirm REGENERATE in MCP Integration is still filled black.

### B · Recipe grid empty cells

- [ ] Open `/recipes` and switch to grid view.
- [ ] For recipes with photos, cells render unchanged: photo at top, eyebrow + name strip below.
- [ ] For recipes without photos, cells render as typographic compositions:
  - White background (working register `--bg`)
  - 0.5px hairline border in `var(--rule)`
  - Category eyebrow at top of the bottom-anchored content block (DESSERT, BREAKFAST, etc., 9px DM Mono uppercase 0.14em muted)
  - Recipe name large and confident (DM Sans 700, `clamp(20px, 2.4vw, 32px)`), ink color, left-aligned
  - Content anchored to the bottom of the cell with breathing room above
  - 1:1 aspect ratio matching photo cells
- [ ] The grid as a whole reads as visually consistent: photo cells and typographic cells share footprint, share strip position, just differ in content type.
- [ ] Hover states (if any) are unchanged.

### C · Empty planner cart icon

- [ ] Open `/planner` (or the planner route) when no meal plan exists for the current week.
- [ ] The toolbar shows `MEAL PLANS | THIS WEEK` on the left, `+ NEW PLAN` outlined button on the right. **No cart icon.**
- [ ] The empty planner main content (`§ NO PLAN THIS WEEK / A blank week. / lede / + CREATE PLAN →` outlined CTA) is unchanged.
- [ ] Open `/planner` with a populated week. The populated planner toolbar still has the cart icon (verify; do not remove from populated planner).

### D · Onboarding Step 4 preset card

- [ ] Open the onboarding flow. Navigate to Step 4 (Daily Goals / `A starting point.`).
- [ ] The four preset cards (MAINTAIN, LEAN OUT, BUILD, CUSTOM) render with thin 0.5px hairline borders, sharp corners, no fill.
- [ ] Click any card. The card's border stays at 0.5px (no thickness change). The eyebrow text shifts from muted to ink color and gets a 1.5px ink underline below it.
- [ ] **Underline width matches eyebrow text glyph width exactly.** If the underline visibly extends past the last character of the eyebrow text, the implementation is wrong.
- [ ] Click a different card. The previous card's eyebrow underline disappears; the new card's eyebrow underline appears. No layout shift on the cards (the underline space was reserved as transparent in inactive state).
- [ ] Hover state on inactive cards: border darkens to `var(--fg)`. (This is existing hover behavior, verify it still works.)

### Grep checklist

- The cart icon SVG or import in any planner empty-state file — should not appear after this brief lands
- Any CSS class scoped to the empty-planner cart button — should be removed
- `font-style: italic` on `.rg-cell-name-large` — should not appear (typographic fallback is sans, not italic)
- Border-width changes (`border-width: 2px`, etc.) on `.ob-preset-card.is-selected` — should not appear; underline replaces border thickness change
- `color: var(--muted)` in any production state of `.rg-cell-name` (when the recipe lacks a photo) — should not appear; the typographic fallback uses `var(--fg)` ink, not muted
- `letter-spacing: 0.16em` in any of the styles touched by this brief — should not appear (locked at 0.14em)

### Cross-surface consistency check

After this brief lands:

- [ ] Settings Section primary actions: outlined SAVE in People, filled SAVE GOALS in Daily Goals, filled REGENERATE in MCP, outlined EXPORT DATA in Data. The visual hierarchy of action stakes reads correctly.
- [ ] Recipe grid: photo and typographic cells coexist gracefully, both feeling intentional.
- [ ] Empty planner: no icon-based affordances; chrome is fully text-based.
- [ ] Onboarding presets: selection mechanism matches the rest of the app (filter chips, view toggles, person tabs, Add Meal rail items, auth tabs) — all use the underline convention with text-glyph-width-matching underlines.
- [ ] Every working-register surface in the app uses one of two layout models (index or editorial) and the locked active-state conventions are applied uniformly.

## Out of scope

- **The recipe grid photo cell layout itself.** Photo handling, image optimization, lazy loading, hover states on photo cells — all unchanged.
- **The recipe import-to-grid flow.** When a user imports a recipe URL and a photo gets pulled, that's existing logic and unchanged.
- **The Settings page's other sections** (Daily Goals, Dashboard, MCP Integration, Data). All unchanged beyond the verification that SAVE GOALS and REGENERATE remain filled black.
- **The populated planner toolbar's cart icon.** Stays. If it needs design reconsideration (icon → text link, etc.) for consistency with the rest of the chrome, that's a separate brief.
- **The populated planner toolbar in general.** Has its own structure with `NUTRITION ›` link, person tabs, etc. Unchanged.
- **The onboarding flow logic.** Preset selection still drives the user's initial nutrition goals. Step 4's behavior on FINISH is unchanged.
- **The empty planner main content** (the `§ NO PLAN THIS WEEK / A blank week.` editorial moment with the `+ CREATE PLAN →` outlined CTA). Unchanged.
- **Mobile parity for these fixes.** Most of the four fixes have natural mobile parity (the same components render on both surfaces). Verify, but don't redesign mobile-specific behavior.
- **Any other stragglers found during implementation.** If the implementer surfaces additional inconsistencies during this work, file as findings for a future cleanup brief; don't sweep into this PR.
- **The button register rule audit** (sans vs mono on outlined buttons). If EXPORT DATA is itself inconsistent with the locked rule, file as a backlog finding. Don't fix in this brief.

## Notes for the implementer

- This is a "small fixes" PR. Four targeted changes. Should be reviewable in chunks (one commit per fix, four commits total).
- The Settings SAVE downgrade is the smallest of the four — likely a 5-minute change once the right component is found. Start there for momentum.
- The recipe grid typographic fallback is the most design-loaded of the four. The visual goal is "this empty cell looks intentional and finished, not like a missing photo." If during implementation the result feels half-committed (text too small, too muted, not anchored well), iterate. The typographic fallback should feel as confident as the photo treatment.
- The empty planner cart icon removal is structural cleanup. Verify no other reference to the icon remains; sometimes icon components have multiple usage points. Confirm the populated planner cart icon is preserved (different code path).
- The onboarding preset card change is the most pattern-aligning of the four — bringing it into compliance with the active-state convention used everywhere else. Worth being precise about the eyebrow-underline placement (under the eyebrow text, matching glyph width, not under the whole card or extending past glyphs).
- After this brief lands, Step 3 is fully shipped except for the deferred wordmark integration (3C). Every working-register surface uses one of two layout models, the active-state convention is uniform, and the visual register migration is complete.

## Doc updates after code lands

- `design-system.md` §5e — update if the Settings People SAVE downgrade reveals that the button-stakes hierarchy needs a documented rule. Currently the rule is implicit ("filled black for primary commit per task context"); after this brief there's a clearer pattern of "filled = data-affecting, outlined = small-config like household name or export trigger" that's worth codifying.
- `design-system.md` §11 — confirm the active-state underline rule is present. If not, add it: "active = 1.5px underline matching the active label's text glyph width exactly. Inactive state reserves `border-bottom: 1.5px solid transparent` to prevent layout shift."
- `master-plan.md` — log Brief 3G-2 close date. Note: with 3G shipped, Step 3 is complete except for 3C (wordmark integration, deferred).

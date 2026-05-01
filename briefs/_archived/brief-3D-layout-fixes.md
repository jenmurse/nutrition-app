# BRIEF 3D — Layout fixes: Add Meal alignment, Compare nav, Shopping toolbar

**Part of:** Step 3 of the design pass.
**Scope:** Single PR. Desktop only. Three surfaces: Add Meal Step 1, Add Meal Step 2, Compare, Shopping. All four collapse to the editorial layout model with primary nav restored where missing and centered/toolbar treatments removed.
**Depends on:** 3A (tokens) merged. 3B (app migration audit) merged or in flight. This brief assumes the working register white surface is in place.
**Blocks:** Nothing. Parallelizable with 3E, 3F, 3G after 3A and 3B land.

---

## Why this brief

The current desktop chrome has six different layout models in production. Step 3 collapses them to two: the **index model** (top primary nav + secondary toolbar + content) and the **editorial model** (top primary nav + opening editorial block + content, no secondary toolbar). This brief migrates the four out-of-system surfaces to the model they belong in.

| Surface | Current model | Target model | What changes |
|---|---|---|---|
| Add Meal Step 1 | Editorial-but-centered | Editorial, left-aligned | Headline + eyebrow alignment |
| Add Meal Step 2 | Editorial-but-centered | Editorial, left-aligned | Headline + eyebrow alignment |
| Compare | Modal-style with back-bar replacing primary nav | Editorial with full primary nav | Restore primary nav, kill back-bar, add editorial header |
| Shopping | Index model with secondary toolbar | Editorial with inline actions | Kill toolbar, add editorial header, move SHARE and HIDE CHECKED inline |

After this brief lands, every working-register surface uses one of the two locked models. No exceptions.

## What's wrong now

### Add Meal Step 1 (`desktop_add_meal_screen_1.png`)

- Eyebrow `§ STEP ONE · TUESDAY, APRIL 28` is centered.
- Headline `Pick a meal type.` is centered.
- The meal-type list (`01 Breakfast`, `02 Lunch`, `03 Dinner`, etc.) below is left-aligned within its column.
- The mismatch — centered header above left-aligned content — is structurally awkward and inconsistent with every other content page in the app.
- BACK link is at the bottom-left of the meal-type list, which is the correct location for a step-flow back action; that part stays.

### Add Meal Step 2 (`desktop_add_meal_screen_2.png`)

- Same centering issue: eyebrow `§ STEP TWO · TUESDAY, APRIL 28` and headline `Pick a breakfast.` are centered above left-aligned content.
- RECIPES / ITEMS toggle, search, category filter chips, recipe list — all left-aligned within their column.
- BACK / ADD TO PLAN row at the bottom of the content is correct (primary commit point for the flow). Stays unchanged.

### Compare (`desktop_compare.png`)

- Top primary nav is **gone entirely**. Replaced by a custom row: `‹ BACK TO RECIPES | NUTRITION COMPARISON`.
- This breaks user wayfinding — once on Compare, the user can't navigate sideways to Pantry, Planner, Settings, or sign out without first backing out to Recipes.
- The comparison table itself (`desktop_compare.png` body) is the strongest data design in the build. It stays unchanged.

### Shopping (`desktop_shopping.png`)

- Top primary nav is correct (Good Measure | Planner Recipes Pantry).
- Below the nav is a secondary toolbar: `APR 26 - MAY 2 | SHARE | HIDE CHECKED`.
- Below the toolbar is the editorial header: `§ APR 26 — MAY 2` eyebrow + `A week of meals.` headline.
- **Date appears twice** — once in the toolbar, once in the eyebrow.
- **SHARE is a primary action** stranded in the secondary toolbar where it reads as a filter or view control.
- **HIDE CHECKED is a filter**, also stranded in the toolbar.
- The toolbar is doing two jobs (locator + actions) and doing both poorly.

## Spec

### Editorial model — the target pattern

The editorial model used by Dashboard and Recipe Detail is the reference. Every surface in this brief migrates to this structure:

```
[ Top primary nav — Good Measure | Planner Recipes Pantry | avatars Settings Sign Out ]
[ Generous vertical breath ]
[ § EYEBROW (left-aligned, mono, muted) ]
[ Display Headline (left-aligned, sans 700, bold) ]
[ Optional lede line (sans 400, fg-2) ]
[ Vertical space ]
[ Content ]
```

No secondary toolbar. No modal-style back-bar. No centered headlines. The primary nav is the only top chrome.

Container width follows the existing system: `1100px max-width centered with 64px horizontal padding` for these surfaces (per design-system §3b — "Forms, detail pages, settings, auth, onboarding stay in 1100px"). Compare and Shopping use the standard editorial container; Add Meal already does.

### A · Add Meal Step 1 — left-align headline

**Current:** Eyebrow and headline are centered above the meal-type list.

**Target:** Eyebrow and headline are left-aligned, matching the column edge of the meal-type list below.

**Implementation:**

```jsx
<div className="ed-container">
  <div className="add-meal-header">
    <span className="eyebrow">§ STEP ONE · TUESDAY, APRIL 28</span>
    <h1 className="page-title">Pick a meal type.</h1>
  </div>
  <ol className="meal-type-list">
    {/* existing rows: 01 Breakfast, 02 Lunch, ... */}
  </ol>
  <div className="add-meal-footer">
    <button className="ed-btn-text">‹ BACK</button>
  </div>
</div>
```

```css
.add-meal-header {
  padding: 80px 0 48px;  /* generous vertical breath above headline */
  text-align: left;       /* the change */
}

.add-meal-header .eyebrow {
  display: block;
  font: 400 9px var(--font-mono);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
}

.add-meal-header .page-title {
  font: 700 clamp(28px, 3vw, 44px) var(--font-sans);
  letter-spacing: -0.025em;
  line-height: 1.05;
  color: var(--fg);
  text-wrap: balance;
}
```

The eyebrow includes the date because Add Meal is contextually anchored to a planner day. That stays.

The meal-type list (existing component) is unchanged — it's already left-aligned within the container. The header now aligns with it.

The BACK button at the bottom stays in place. It's a step-flow control, not a chrome control.

### B · Add Meal Step 2 — left-align headline

**Current:** Eyebrow `§ STEP TWO · TUESDAY, APRIL 28` and headline `Pick a breakfast.` (or `Pick a lunch.`, etc.) are centered.

**Target:** Same left-aligned editorial header treatment as Step 1.

**Implementation:**

Apply the exact same `.add-meal-header` pattern from Step 1. The headline is interpolated by the meal type chosen in Step 1 (`Pick a {breakfast | lunch | dinner | side | snack | dessert | beverage}.`).

The RECIPES / ITEMS tab toggle, search field, category filter chips (BREAKFAST / LUNCH / DINNER / SIDE / SNACK / DESSERT / BEVERAGE / CLEAR), and recipe list are unchanged — already left-aligned within the column.

The bottom row with BACK / ADD TO PLAN is unchanged.

The `ALSO ADD TO [Garth]` checkbox at the bottom-left is unchanged.

### C · Compare — restore primary nav, add editorial header

**Current:** No top primary nav. Custom `‹ BACK TO RECIPES | NUTRITION COMPARISON` row replaces it.

**Target:** Standard top primary nav (Good Measure | Planner Recipes Pantry | avatars Settings Sign Out). Below it, an editorial header. Below that, the existing comparison table.

**Implementation:**

```jsx
<>
  <PrimaryNav activePage="recipes" />  {/* restore standard nav, Recipes active */}
  <div className="ed-container">
    <div className="compare-header">
      <span className="eyebrow">§ NUTRITION COMPARISON</span>
      <h1 className="page-title">Side by side.</h1>
    </div>
    <CompareTable recipes={recipes} />  {/* unchanged */}
  </div>
</>
```

```css
.compare-header {
  padding: 80px 0 48px;
  text-align: left;
}
/* eyebrow + page-title use the same tokens as Add Meal — see § A */
```

**Headline copy.** Suggested: `Side by side.` Alternative: `What's different.` The Step 5 editorial pass may revise; for now, ship `Side by side.` as the working choice. Don't block on copy — the editorial structure is what matters here.

**Active nav state.** Compare is reached from the Recipes page (the user selects multiple recipes and clicks the Compare action). When on Compare, the primary nav shows Recipes as the active page (1.5px ink underline below "Recipes"). The user is conceptually still inside the Recipes section; Compare is a sub-view of Recipes.

**Removing the back-bar.** Delete the entire `‹ BACK TO RECIPES | NUTRITION COMPARISON` row. The primary nav now provides the navigation paths the user needs. Specifically: clicking "Recipes" in the nav returns to the recipes index. There's no need for a duplicate "back to recipes" affordance.

**The comparison table itself.** Unchanged. The table layout, the inline `kcal/g/mg` units, the bold lowest-value highlighting, the `↓` arrows on best values, the muted row labels — all stay exactly as they are. This is the strongest piece of data design in the build; don't touch it.

**Mobile reminder.** This brief is desktop only. Compare on mobile may have a different chrome treatment that's out of scope here. If the mobile Compare also has the back-bar problem, file it as a finding for a future mobile pass; do not fix in this brief.

### D · Shopping — kill toolbar, inline SHARE and HIDE CHECKED

**Current:** Top primary nav (correct) + secondary toolbar (`APR 26 - MAY 2 | SHARE | HIDE CHECKED`) + editorial header (`§ APR 26 — MAY 2 / A week of meals.`) + category-grouped item list.

**Target:** Top primary nav + editorial header (with SHARE and HIDE CHECKED / SHOW ALL inline) + category-grouped item list. No secondary toolbar.

**Implementation:**

```jsx
<>
  <PrimaryNav activePage="planner" />
  <div className="ed-container">
    <div className="shopping-header">
      <span className="eyebrow">§ APR 26 — MAY 2</span>
      <div className="shopping-header-row">
        <h1 className="page-title">A week of meals.</h1>
        <div className="shopping-actions">
          <button className="ed-btn-text">SHARE →</button>
          <button className="ed-btn-text" onClick={toggleHideChecked}>
            {hideChecked ? 'SHOW ALL' : 'HIDE CHECKED'}
          </button>
        </div>
      </div>
    </div>
    <ShoppingList categories={categories} />  {/* unchanged */}
  </div>
</>
```

```css
.shopping-header {
  padding: 80px 0 48px;
  text-align: left;
}

.shopping-header-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;  /* on narrow viewports, actions wrap below headline */
}

.shopping-actions {
  display: flex;
  gap: 24px;
  align-items: baseline;
}
```

**Action button styling — `ed-btn-text` (DM Mono, no border, baseline-anchored).** Both SHARE and HIDE CHECKED use the existing `.ed-btn-text` text-button class. Per the locked button register rule: "no border = mono."

```css
.ed-btn-text {
  background: none;
  border: none;
  padding: 0;
  font: 400 11px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg);
  cursor: pointer;
  transition: opacity 120ms var(--ease-out);
}
.ed-btn-text:hover { opacity: 0.7; }
```

If `.ed-btn-text` doesn't already exist in `globals.css`, this is the moment to add it. The class is reusable across surfaces (any inline mono action button in editorial chrome).

**SHARE behavior.** Tapping SHARE opens the existing share sheet/dialog — implementation unchanged. Only the position and visual treatment change.

**HIDE CHECKED / SHOW ALL.** This is a stateful toggle button. The label text swaps based on state:
- When checked items are visible: button reads `HIDE CHECKED`
- When checked items are hidden: button reads `SHOW ALL`

This is a deliberate departure from the locked underline-active convention. The convention applies to **toggles within a set** (filter chips, view toggles, person tabs) where the user picks one of multiple options. HIDE CHECKED / SHOW ALL is a **single binary control** where the label itself communicates the state — like a play/pause button. The user always sees one label; tapping it swaps to the other.

If this needs to be an underline-toggle later, it can be revisited. For now, the label-swap is simpler and clearer.

**Layout reasoning.** The eyebrow `§ APR 26 — MAY 2` and the headline `A week of meals.` are stacked vertically (eyebrow above headline). The headline + actions row is a horizontal flex with `space-between` — headline left, actions right, baseline-aligned. On narrow viewports the actions wrap below the headline.

**The category-grouped item list itself.** Unchanged. PRODUCE, MEAT & SEAFOOD, DAIRY & EGGS, GRAINS PASTA & BREAD, LEGUMES, BAKING, NUTS & SEEDS, SPICES & SEASONINGS, CONDIMENTS & SAUCES, OILS & FATS, FROZEN, CANNED & JARRED, SNACKS, OTHER — every category section, every item row with its checkbox + amount + name, all unchanged.

**Removing the secondary toolbar.** Delete the entire `APR 26 - MAY 2 | SHARE | HIDE CHECKED` row from above the editorial header. The header now carries that information (date in eyebrow, actions inline with headline).

## Files most likely affected

- Add Meal Step 1 page component (header layout + alignment)
- Add Meal Step 2 page component (header layout + alignment)
- Compare page component (top chrome restructure, primary nav restoration)
- Shopping page component (toolbar removal, inline action restructure)
- `globals.css` — verify `.ed-container`, `.add-meal-header`, `.compare-header`, `.shopping-header`, `.shopping-header-row`, `.shopping-actions`, `.ed-btn-text` exist and are scoped correctly. Add any missing ones.
- Whatever component currently renders the back-bar on Compare — delete or unmount

The PrimaryNav component itself is unchanged — Compare needs to render it the same way Dashboard, Planner, Recipes, etc. render it. The fix is restoring the rendering, not modifying the nav.

## Verify before declaring done

### Visual

**Add Meal Step 1.**
- Eyebrow `§ STEP ONE · TUESDAY, APRIL 28` is left-aligned.
- Headline `Pick a meal type.` is left-aligned and sits at the same horizontal position as the meal-type list below it.
- The list (01 Breakfast, 02 Lunch, etc.) is unchanged.
- BACK link is at the bottom-left.

**Add Meal Step 2.**
- Eyebrow `§ STEP TWO · TUESDAY, APRIL 28` is left-aligned.
- Headline `Pick a breakfast.` (or correct meal type) is left-aligned.
- RECIPES / ITEMS toggle, search, category filter chips, recipe list — unchanged.
- BACK / ADD TO PLAN row at bottom is unchanged.
- ALSO ADD TO Garth checkbox is unchanged.

**Compare.**
- Top primary nav is present and identical to other app pages (Good Measure wordmark, Planner / Recipes / Pantry tabs with Recipes active, avatars + settings + sign out on the right).
- The `‹ BACK TO RECIPES | NUTRITION COMPARISON` row is gone.
- Below the primary nav: editorial header with `§ NUTRITION COMPARISON` eyebrow and `Side by side.` headline, both left-aligned.
- Below the header: the existing comparison table, untouched.
- Recipes nav link in the primary nav is the active state (1.5px underline).

**Shopping.**
- Top primary nav is present (Planner active, since Shopping is reached from the planner — confirm with the implementer or use the existing convention if Planner-active is correct).
- The `APR 26 - MAY 2 | SHARE | HIDE CHECKED` secondary toolbar is gone.
- Below the primary nav: editorial header with `§ APR 26 — MAY 2` eyebrow stacked above a flex row containing the headline `A week of meals.` left-aligned and `SHARE → | HIDE CHECKED` actions right-aligned.
- The actions are mono text-buttons (no border, no fill).
- HIDE CHECKED toggles to SHOW ALL when the user hides checked items.
- Below the header: the existing category-grouped item list, untouched.

### DevTools

- Inspect the Compare page; confirm the rendered DOM contains the standard PrimaryNav component and not a custom back-bar.
- Inspect the Shopping page; confirm there's no secondary toolbar element between the nav and the editorial header.
- Inspect the Add Meal headers; confirm `text-align: left` on the header containers (or no `text-align: center` overriding the default).

### Functional

- Click Recipes in the primary nav from Compare → returns to Recipes index.
- Click Pantry in the primary nav from Compare → opens Pantry index. (This wasn't possible before because the back-bar replaced the nav.)
- Tap SHARE on Shopping → opens the existing share sheet/dialog with the same behavior as before.
- Tap HIDE CHECKED on Shopping → checked items hide, label swaps to SHOW ALL.
- Tap SHOW ALL → checked items reappear, label swaps to HIDE CHECKED.
- Add Meal Step 1 → tap a meal type → advances to Step 2 with the correct context (date, meal type interpolated into the headline).
- Add Meal Step 2 → tap BACK → returns to Step 1 with the meal type selection cleared (or preserved, whichever is the existing behavior — don't change it in this brief).

### Grep checklist

- `BACK TO RECIPES` literal copy — should not appear in the Compare component after this brief lands. The standard primary nav with Recipes active provides the same affordance.
- `text-align: center` on Add Meal Step 1 or Step 2 header containers — flag any remaining
- `secondary-toolbar` or any class scoped to a Shopping toolbar — should not appear after the toolbar is deleted
- Hardcoded `APR 26 - MAY 2` as a literal string in two places on Shopping — should appear only once, in the eyebrow
- The custom Compare top-bar component — flag any references to it; delete unused code

### Cross-surface check

- Open Dashboard, Planner, Recipes (list), Pantry (list), Settings, Recipe Detail, Recipe Form, Pantry Form, Add Meal Step 1, Add Meal Step 2, Compare, Shopping. All twelve surfaces should now use one of two layout models:
  - Index model: Dashboard? No, Dashboard is editorial. Planner, Recipes (list), Pantry (list) are index.
  - Editorial model: Dashboard, Recipe Detail, Recipe Form, Pantry Form, Settings, Add Meal Step 1, Add Meal Step 2, Compare, Shopping.
- No surface should have a centered headline above left-aligned content.
- No surface should have a custom top-bar replacing the primary nav.
- No surface should have a secondary toolbar that duplicates information shown in an editorial header.

## Out of scope

- **Mobile chrome.** This brief is desktop only. Mobile Add Meal, mobile Compare, mobile Shopping all have their own chrome treatments. If any mobile surface has analogous problems, file as findings for a future mobile pass; do not touch in this brief.
- **The Compare flow's entry point on Recipes.** The recipes page has a "Compare" action that activates compare mode and lets users select recipes to compare. That entry-point chrome is unchanged in this brief; only the destination page is rewritten.
- **The shopping list item rows themselves** (checkbox + amount + name + category grouping). All unchanged.
- **The comparison table** on Compare. Unchanged.
- **Wordmark integration.** The "Good Measure" Title Case wordmark in the primary nav stays as-is for now. The locked wordmark spec sweep is deferred (separate future step).
- **Settings primary action distribution, recipe grid empty-state ghost text, planner cart icon, onboarding preset card active state.** Those are 3G's stragglers.
- **Auth and onboarding chrome.** 3E and 3F.
- **Copy revisions on the Compare headline (`Side by side.`) or Shopping headline (`A week of meals.`).** Step 5 editorial pass.
- **Italic moments on any of these headlines.** Step 6.

## Notes for the implementer

- **The four surfaces in this brief are all editorial-model targets.** Once they ship, every working-register page in the app uses one of two locked chrome models. This is the moment we collapse the chaos.
- **The Compare page change is the most visible.** Restoring the primary nav fundamentally changes how Compare feels — the user is no longer "stuck in a modal" but is on a page within the app like any other. Worth making sure during review that the Recipes-active state on the nav reads correctly so users still know they're conceptually inside the Recipes section.
- **The Shopping change is the largest restructure.** Killing the secondary toolbar, restructuring the header into a flex row with inline actions, handling the wrap behavior on narrow viewports — there's more component logic here than in the other three. Worth a careful review of the responsive behavior.
- **The Add Meal alignment fix is the smallest change** (essentially `text-align: left` on the header container plus removing any centering wrappers) but worth verifying the result feels right at the actual viewport widths the app supports. The headline + meal-type list should now share a clear left edge.
- **`ed-btn-text` may already exist** as part of the locked button register rule (per design-system §1d, "no border = Mono"). If it doesn't, add it. Don't create a new class for SHARE and HIDE CHECKED — they're standard text-buttons.
- After this brief lands, design-system.md should be updated to document the editorial layout model explicitly. Don't update the doc as part of this PR — flag for follow-up in a housekeeping pass.


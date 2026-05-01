# Brief 3D.1 — Add Meal one-screen rebuild + content alignment fixes

**Status:** Open · Step 3 follow-up
**Supersedes:** 3D follow-up edit #2 (content column rule was wrong)
**Scope:** Three layout fixes that cluster around the same root cause
(content alignment to recipe detail's content X created a phantom
rail on pages without a jump nav). Each surface gets the right rule
for its own content shape.

---

## Why

The previous 3D follow-up #2 told us to align Compare, Shopping,
Add Meal Step 1, and Add Meal Step 2 to recipe detail's content X
position (after the 196px jump-nav offset). On pages without a
jump nav, this leaves an empty 196px gutter on the left that reads
as a phantom rail. The page looks pushed right with no reason.

Three different rules apply, depending on the page:

1. **Compare** — wide content (5 recipe cells side by side). Should
   use full container width. Move content left to container edge.
2. **Shopping** — wide content (3 ingredient columns). Same fix.
3. **Add Meal** — needs a real left rail. Step One and Step Two
   collapse into one screen with a fixed left rail (meal types +
   items) that mirrors recipe detail's jump nav exactly.

---

## Fix 1 · Compare — content aligns to container left edge

**Current state:** Content sits at recipe detail's content X
(container_left + 196px offset). Trailing space when fewer than
5 recipes are selected.

**Change:**
- Remove the 196px content offset on Compare
- Content aligns to `.ed-container`'s left padding edge (i.e., the
  content X you'd get without any jump-nav offset)
- `§ NUTRITION COMPARISON` eyebrow and `Side by side.` headline
  shift left to land at this new edge
- Comparison table cells stay locked to fixed width sized for
  5-across (already done in 3D follow-up #3); fewer recipes =
  trailing empty space, left-aligned

**New affordance — trailing add slot:**
When fewer than 5 recipes are loaded, render a single trailing
column at the same fixed cell width with a `+ ADD MORE` link
inside. Treatment:
- Column width matches a real comparison cell
- Inside the column, vertically aligned with the recipe
  thumbnail/title row of real cells: a hairline-bordered ghost
  area with `+ ADD MORE` centered, DM Mono 9px uppercase 0.14em,
  color `var(--muted)`
- Below the ghost area, the metric rows continue as empty cells
  (no values, just hairlines extending across to maintain the
  table grid)
- Clicking `+ ADD MORE` returns the user to the recipe selection
  screen with current selections preserved
- If 5 of 5 are loaded, no trailing slot

**Verification:**
- Open Compare with 2 recipes selected. Content left-aligns to
  container edge. Trailing slot reads `+ ADD MORE` and is
  clickable. Metric grid extends across the full width.
- Open Compare with 5 recipes. No trailing slot. Page looks
  identical to current except shifted left.

---

## Fix 2 · Shopping — content aligns to container left edge

**Current state:** Content sits at recipe detail's content X
(196px in from container left). Three ingredient columns leave
significant trailing whitespace on the right.

**Change:**
- Remove the 196px content offset on Shopping
- Eyebrow `§ APR 26 — MAY 2`, headline `A week of meals.`, and the
  HIDE CHECKED · SHARE actions all shift left
- Three ingredient columns expand to fill available width

**Verification:**
- Eyebrow and headline land on the same X as the content
  container's left padding edge
- Three ingredient columns are wider than current
- HIDE CHECKED · SHARE actions remain right-aligned to container edge

---

## Fix 3 · Add Meal — Step One + Step Two collapse into one screen

This is the biggest change in this brief. Read carefully.

### Current state

Two routes/steps:
- Step One (`/meal-plans/add-meal` step 1): meal type picker,
  list of 7 meal types, click advances to Step Two
- Step Two (`/meal-plans/add-meal` step 2): recipe browser with
  RECIPES/ITEMS tabs, search, category chips, recipe grid,
  Also add to / Back / Add to Plan footer

### Target state

Single screen with two columns:
- **Left rail** (fixed, mirrors recipe detail's `.rd-jump-nav`):
  list of 7 meal types + a hairline + ITEMS as an alt-mode entry
- **Right column** (sits inside `.ed-container` with 196px left
  offset to clear the rail): eyebrow + headline + search/servings
  controls + recipe grid (or item list when ITEMS is selected) +
  footer with Also add to / Add to Plan

### Detailed spec

**Route:** Single route, no step query param. Default selection
is the meal type that makes sense for the time of day, OR the
last-used type, OR Breakfast as fallback. Confirm with current
implementation what makes sense.

**Left rail — exact match to recipe detail's jump nav:**

```css
.am-rail {
  position: fixed;
  left: var(--pad);            /* 40px from page edge */
  top: calc(var(--nav-h) + 60px);  /* aligns with eyebrow top edge on right column */
  width: 140px;
  z-index: 50;
  display: flex;
  flex-direction: column;
}
```

### Vertical alignment — non-negotiable

The first rail item's text baseline MUST land on the same Y
coordinate as the eyebrow text on the right column. Not "roughly
near," not "around the same place." Identical baseline.

The rail's `top` value is the eyebrow's top edge from the
viewport. Specifically:
- Nav is `position: sticky` or `position: fixed`, height
  `var(--nav-h)` (50px)
- Right column content begins at `padding-top: 60px` inside
  `.page-container`, so eyebrow's top edge is at viewport Y =
  `var(--nav-h) + 60px = 110px`
- The rail's `top: calc(var(--nav-h) + 60px)` therefore puts
  the rail's first item's top edge at the same Y as the
  eyebrow's top edge

**Common implementation traps to avoid:**

1. **Do not** offset the rail's `top` to clear the headline area.
   The rail must sit BESIDE the eyebrow + headline, not below
   them. If the rail is below the headline, the `top` value is
   wrong. The fixed rail's first item is at the same Y as the
   eyebrow.

2. **Do not** put the rail inside the page container's padding
   flow as a flex/grid child. It must be `position: fixed`
   relative to the viewport. If it's in flex/grid flow, the
   container's `padding-top: 60px` will affect its position
   AND it will move when the page scrolls.

3. **Do not** add `padding-top` to the rail or to the first
   rail item beyond what's specified. The first rail item has
   `padding-top: 0` (override from the default `padding: 8px 0`
   on subsequent items). Subsequent items use `padding: 8px 0`.

4. **Verify by measuring.** Open browser DevTools, inspect the
   eyebrow on the right column and the first rail item. Their
   computed Y coordinates (top of bounding box) should be
   identical to within 1px. If they're not, the implementation
   is wrong.

5. The line-height of the rail items and the eyebrow should both
   default to ~1.0–1.2 for tight uppercase mono. If one has a
   default `line-height: 1.7` from inherited body styles, the
   text baseline within the box will sit lower. Set both
   `.am-rail .am-rail-item` and `.am-eyebrow` to an explicit
   `line-height: 1.2` to ensure baselines match.

### Rail items spec — match existing `.rd-jump-nav` style

The Add Meal rail must use the same visual treatment as the
existing jump nav on recipe detail, recipe form, pantry form,
and settings — minus the numbers. Same tokens, same active-state
treatment, same hover behavior. The only difference is the
absence of the leading number column.

**The pattern this is following:** the `.rd-jump-nav` from
design-system.md §3c. Same container, same item styling. The
new component should reuse the existing classes where possible
or mirror them exactly.

**Items in the rail:**

```
BREAKFAST
LUNCH
DINNER
SIDE
SNACK
DESSERT
BEVERAGE
PANTRY ITEMS
```

Eight items total, all flush with no separator between Beverage
and Pantry Items. The two-word "Pantry Items" label provides
sufficient visual distinction from the single-word meal types
above it.

**Each rail item — exact style match to `.rd-jump-nav` items:**

- Font: `var(--font-mono), 'DM Mono', ui-monospace, monospace`
  9px, weight 400, letter-spacing 0.14em, uppercase
- Default color: `var(--muted)`
- Hover color: `var(--fg)`
- Active state — per design-system.md §11 (locked by Brief 2G):
  - Color shifts from `var(--muted)` to `var(--fg)`
  - 1.5px baseline underline appears
  - Text weight stays at 400 (NOT 700 — the active state is
    color + underline only, never weight change)
- **Layout shift prevention** (per §11 locked rule): the inactive
  state must reserve `border-bottom: 1.5px solid transparent`.
  The active state changes only `border-bottom-color` to
  `var(--fg)`. Without this reservation, activating the underline
  pushes the text by 1.5px.

**Vertical rhythm between items:**
- `padding: 8px 0` on each item (vertical breathing room within
  the rail). This matches the visual rhythm of `.rd-jump-nav`
  where items are spaced ~16px apart in total.
- The first rail item gets `padding-top: 0` so its text top
  aligns with the eyebrow on the right column (see "Vertical
  alignment — non-negotiable" section above).

**No hairline divider, no eyebrow break, no spacing exception
between Beverage and Pantry Items.** All 8 items are styled
identically and spaced identically. Pantry Items is the 8th
rail item, flush with the others.

**Dropping the numbers — justification:**

The existing `.rd-jump-nav` uses a number+label two-column
format (`01 INGREDIENTS`, `02 NUTRITION`, etc.) because those
rails navigate within long-scroll editorial pages where the
numbered sections are part of the content rhythm (`01 Ingredients`
also appears in the page body as a section header).

Add Meal's rail is a category selector for filtering recipes
by meal type. Meal types are not ordered sections of an article;
they are a peer set. The number column is therefore semantically
inappropriate and is dropped. The item-styling tokens
(font, size, color, active state) are otherwise identical.

**Right column — sits inside container:**

```css
.am-content {
  padding-left: 196px;
  min-width: 0;
}
```

Inside `.ed-container` (1100px max, 64px padding), this gives the
right column a left edge that clears the fixed rail.

**Eyebrow:** `§ TUESDAY, APRIL 28` (or current date in active
context). Uses the system-wide 9px eyebrow token (currently being
locked across the app). DM Mono 9px, 0.14em, uppercase,
`var(--muted)`. Margin-bottom 12px.

**Headline:** Dynamic per active rail item:
- Breakfast → `Add a breakfast.`
- Lunch → `Add a lunch.`
- Dinner → `Add a dinner.`
- Side → `Add a side.`
- Snack → `Add a snack.`
- Dessert → `Add a dessert.`
- Beverage → `Add a beverage.`
- Pantry Items → `Add a pantry item.`

Headline uses the locked size from 3D follow-up #5:
`clamp(36px, 4.4vw, 64px)`, DM Sans 700, letter-spacing -0.03em,
line-height 1.05, text-wrap balance.

**Removed:**
- The RECIPES / ITEMS tab strip (replaced by the rail's
  Pantry Items entry)
- The category chip row (BREAKFAST · LUNCH · DINNER ...) — the
  rail handles type selection
- The `← BACK` affordance on desktop — Compare doesn't have
  `BACK TO RECIPES`, Add Meal doesn't need `BACK TO PLANNER`.
  User exits via top nav or by completing Add to Plan.

**Kept:**
- Search input (hairline-underlined, no magnifier per
  design-system.md, DM Mono uppercase placeholder)
- Servings input on the right side of the same row
- Recipe grid (2-column on desktop)
- Also add to / Add to Plan footer
- ADD TO PLAN button stays filled black (single primary CTA on
  this page per the locked rule)

**Pantry Items mode (when Pantry Items is the active rail item):**
- Headline: `Add a pantry item.`
- Search placeholder: `Find item…`
- The recipe grid is replaced by a single-column ruled-row list
  of pantry items (name + quantity, hairline below each row)
- Servings input is replaced with a quantity input (or hidden if
  the item already has its own unit)
- Footer stays the same

### Transition between rail items

When the user clicks a different rail item, the right column
swaps content with an opacity-only transition, matching
`--motion-state` from design-system.md §7:

- Both the eyebrow+headline region AND the results region fade
  out together
- Duration 180ms, easing `var(--ease-out)`
- Content updates while opacity is 0
- Both regions fade back in (180ms)
- Total perceived swap: ~360ms
- The rail itself does not animate; only the right column
- The search/servings control row does NOT swap (the controls
  themselves don't change, only their context). It stays static.
- The footer does NOT swap

Note the asymmetry: header + results fade; controls + footer
stay. This is correct because the controls and footer are page
chrome that applies regardless of meal type.

**Reduced motion:** If `prefers-reduced-motion`, skip the
transition entirely (instant swap). Per design-system.md §7
the rule is "collapse all transforms to opacity-only fades — do
not skip the transition entirely" but for this case opacity is
already the only motion, and at 180ms the transition is short
enough that an instant swap is acceptable. Confirm whether the
existing reduced-motion handling in the codebase makes this
moot.

### State that needs to migrate

- Step One's meal type selection becomes the rail's active
  state, persisted in URL params or local state
- Step Two's recipe selection / search / category filter become
  the right column's state
- The transition between Step One and Step Two via
  `--motion-step` is removed; this animation no longer applies
- Routes consolidate to a single route. Audit any links into
  Add Meal (from the planner's `+ ADD` buttons, from menu
  sheets, etc.) to ensure they all hit the new single route.
  Existing query params for date/person are preserved.

### Mobile — two-step flow with simplified Screen 2

Mobile cannot accommodate a persistent fixed rail without
sacrificing too much vertical real estate, so it stays two-step.
But the structure of those two steps now mirrors desktop: pick a
category on Screen 1, browse within that category on Screen 2.

**Screen 1 — meal type selector:**

```
§ THURSDAY, APRIL 30
Add a meal.

────────────────────
Breakfast        →
────────────────────
Lunch            →
────────────────────
Dinner           →
────────────────────
Side             →
────────────────────
Snack            →
────────────────────
Dessert          →
────────────────────
Beverage         →
────────────────────
Pantry Items     →
────────────────────
```

- Page eyebrow: `§ THURSDAY, APRIL 30` (or active date), DM Mono
  9px (system-wide eyebrow token)
- Page headline: `Add a meal.` — DM Sans 700, mobile headline size
  (~32px). NOT `Pick a meal type.` (the current copy). The headline
  reflects the user's intent, not the screen's mechanic.
- 8 ruled rows total: 7 meal types + Pantry Items as the 8th row,
  flush, no separator
- Each row: name on left (DM Sans 600 ~18px), `→` glyph on right,
  full-width hairlines top and bottom (`1px solid var(--rule)`)
- Numbers (`01`, `02`, `03`...) currently shown on Screen 1 are
  REMOVED. Meal type names are flush-left, no leading numbers.
- Tap a row to advance to Screen 2

**Screen 2 — recipe (or item) browser:**

```
← BACK

§ THURSDAY, APRIL 30
Add a breakfast.

SEARCH  Find recipe…
SERVINGS  1
────────────────────
[recipe list]
```

- Top row: `← BACK` link, DM Mono 9px, color `var(--fg)`. Tapping
  returns to Screen 1 with the meal type selection cleared (or
  preserved — see decision note below).
- Eyebrow + headline same pattern as Screen 1, but headline is
  dynamic per selected meal type:
  Breakfast → `Add a breakfast.`
  Lunch → `Add a lunch.`
  ... same mapping as desktop.
  Pantry Items → `Add a pantry item.`
- Search + Servings row (Servings becomes Quantity for Pantry
  Items mode)
- Recipe list (or Pantry Items list) below — single-column ruled
  rows on mobile (mobile already uses single-column for this list)
- Footer: Also add to / Add to Plan — same as before
- REMOVED on Screen 2: the RECIPES / ITEMS tab strip. The choice
  was made on Screen 1 (Pantry Items vs a meal type), so the tab
  is redundant.
- REMOVED on Screen 2: the meal-type chip strip
  (BREAKFAST · LUNCH · DINNER · ...). The `← BACK` provides the
  affordance to change the meal type.

**About the `← BACK` affordance — deliberate exception:**

design-system.md has a locked rule (from 2D.2): "no top back-bar
on child screens." This rule was established for editorial
parent-to-child drill-ins (e.g., Recipe Detail → Edit Recipe).

Add Meal Screen 1 → Screen 2 is NOT that relationship. It is a
peer-to-peer step transition within a single task. The user is
not drilling into a child of the Screen 1 content; they are
advancing through a two-step decision. This is closer to a
wizard step than a content hierarchy.

The `← BACK` here is a step-back affordance, not a content-back
affordance. It is functionally equivalent to the rail click
behavior on desktop (going from "I picked Breakfast" back to
"actually I want Lunch").

This exception should be documented in design-system.md alongside
the original rule:
- Original rule: "No top back-bar on editorial child screens"
- Exception: "Wizard-step screens (Add Meal Screen 2) get a top
  `← BACK` link to return to the previous step"

**Decision note for implementer:** when Back is tapped on
Screen 2, should Screen 1 reset its selection state, or
preserve it with the previously-selected meal type highlighted?
Recommend: reset, since the user's intent in pressing Back is
typically "I want a different meal type." If the user wanted to
just back out of Screen 2 without changing intent, they'd use
the bottom rail Menu instead.

### Files touched (estimated)

- The Add Meal page component(s) — both desktop and mobile
- Mobile Screen 1 component (meal type selector)
- Mobile Screen 2 component (recipe/item browser)
- Any route definitions / route guards
- The Step One → Step Two transition motion in CSS (remove)
- Possibly the planner's `+ ADD` link generation if it includes
  step query params
- design-system.md §8 — add new "Add Meal" subsection describing
  the rail + content pattern (or fold into recipe detail's jump
  nav section as a second instance of the same pattern)
- design-system.md mobile chrome section — document the
  wizard-step exception for the `← BACK` link

---

## Verification checklist

**Compare:**
- [ ] Eyebrow + headline left-align to container edge
- [ ] Comparison cells start at container edge with no left gutter
- [ ] With 2 recipes loaded, trailing column shows `+ ADD MORE`
- [ ] With 5 recipes loaded, no trailing column
- [ ] `+ ADD MORE` returns to selection page with state preserved

**Shopping:**
- [ ] Eyebrow + headline left-align to container edge
- [ ] HIDE CHECKED · SHARE remain right-aligned
- [ ] Three ingredient columns expand to fill width

**Add Meal — vertical rail alignment (mechanical check):**
- [ ] Open page in browser, inspect first rail item ("Breakfast")
  and the eyebrow ("§ TUESDAY, APRIL 28")
- [ ] Both elements' computed `top` coordinate from viewport
  must be identical to within 1px
- [ ] Specifically: the eyebrow's top should be at Y =
  `var(--nav-h) + 60px` from viewport top
- [ ] The rail's first item top should be at the SAME Y
- [ ] If the rail sits below the headline, the `top` value
  is wrong. Fix it.

**Add Meal — desktop (one-screen layout):**
- [ ] Single route, no Step One / Step Two
- [ ] Left rail at `position: fixed; left: var(--pad)`, width 140px
- [ ] First rail item baseline aligns with eyebrow baseline on right
- [ ] Rail items match `.rd-jump-nav` token-for-token: DM Mono 9px,
  weight 400, letter-spacing 0.14em, uppercase, color `var(--muted)`
- [ ] Active state: color `var(--fg)` + 1.5px baseline underline.
  Weight stays 400. NOT weight 700. NOT a fill. NOT accent color.
- [ ] Inactive items reserve `border-bottom: 1.5px solid transparent`
  to prevent layout shift on activation (per §11 locked rule)
- [ ] 8 rail items total, all flush, no hairline divider, no eyebrow break
- [ ] 8th rail item is "Pantry Items" (two-word label)
- [ ] Eyebrow uses the new 9px system-wide token
- [ ] Headline updates dynamically per active rail item
- [ ] Pantry Items active → headline `Add a pantry item.`
- [ ] Headline at `clamp(36px, 4.4vw, 64px)`
- [ ] Right column content has 196px left padding inside container
- [ ] Click a rail item: opacity-only transition, 180ms fade out + fade in
- [ ] Header region and results region fade together; controls + footer stay
- [ ] No `← BACK` affordance on desktop
- [ ] No RECIPES / ITEMS tab
- [ ] No category chip row
- [ ] Pantry Items rail entry swaps right column to single-column
  pantry item list with `Find item…` placeholder

**Add Meal — visual consistency check:**
- [ ] Open Add Meal and recipe detail in adjacent tabs
- [ ] Rail items in both pages are visually indistinguishable
  in size, weight, color, spacing
- [ ] Active state in both pages uses identical underline treatment
- [ ] Only difference: Add Meal has no leading numbers, recipe
  detail does

**Add Meal — mobile (two-screen flow):**
- [ ] Screen 1 headline: `Add a meal.` (NOT `Pick a meal type.`)
- [ ] Screen 1 has 8 ruled rows, no leading numbers (`01`, `02`,
  etc. removed)
- [ ] Screen 1 rows are flush-left, name + `→` arrow, with hairlines
- [ ] 8th row is "Pantry Items", flush with the other rows, no
  separator or eyebrow break
- [ ] Screen 2 has a `← BACK` link at the top
- [ ] Screen 2 has NO RECIPES / ITEMS tab
- [ ] Screen 2 has NO meal-type chip strip
- [ ] Screen 2 headline is dynamic per meal type (`Add a breakfast.`
  etc.) with `Add a pantry item.` for Pantry Items mode
- [ ] Tapping `← BACK` returns to Screen 1 with selection reset

**Cross-check vs recipe detail:**
- [ ] Open recipe detail and Add Meal in adjacent tabs/windows
- [ ] Rail X position is identical (40px from page edge)
- [ ] Rail width is identical (140px)
- [ ] First rail item Y position aligns with eyebrow on the
  right column of each page

---

## Out of scope

- The Compare entry point UX (the recipe selection page that
  feeds into Compare). 3D follow-up #3 already bumped the cap
  from 4 to 5; this brief only handles what happens on the
  Compare page itself.
- Wordmark integration (3C is deferred).
- The eyebrow audit / token reconciliation (resolved separately
  by the system-wide 9px lock).

---

## Doc updates after code lands

- `design-system.md §8` — add Add Meal pattern, OR add a note
  under recipe detail's jump nav section that the same pattern
  is also used on Add Meal
- `design-system.md §3c` — extend "Long-scroll pages... use a
  fixed left jump nav" to include Add Meal as a non-scroll page
  that also uses this pattern (rename to "Pages with a left
  rail" maybe)
- `design-system.md` (mobile chrome section) — document the
  wizard-step exception to the "no top back-bar on child screens"
  rule. Original rule from 2D.2 stays. New exception: wizard-step
  screens (Add Meal Screen 2) get a top `← BACK` link to return
  to the previous step. This is distinct from editorial child
  screens (Recipe Detail → Edit Recipe), which still follow the
  original rule.
- `master-plan.md` — log Brief 3D.1 close date, note that
  Step One/Step Two collapse is complete, note that
  `--motion-step` is no longer used and can be removed if it
  has no other consumers (audit before removing)

# Brief 18 — Editorial overlays and motion language

## Context

Replaces the original Brief 18 (linework cleanup pass). After review, the linework changes were too aggressive in some places and too tweaky in others. The real opportunity is to promote two surfaces — Shopping list and Add Meal — from modals to full-screen editorial pages following the pattern Compare already established. With that comes a system-wide motion language so editorial transitions feel intentional rather than toggled.

Onboarding chrome and broader linework are explicitly out of scope for this brief. They wait for the wordmark work.

This brief has five pieces:

1. Add Meal as a two-page editorial flow
2. Shopping list as a single-page editorial overlay
3. Compare underline jump bug fix
4. Compare loading animation
5. Motion language documented in design-system.md

---

## 1. Add Meal — two-page editorial flow

Replaces the current two-step modal sequence (meal type picker dialog, then recipe picker dialog) with two full-screen editorial pages.

### Step 1 — Pick a meal type

Triggered by `+ ADD` on any planner cell. Slides in from the right (see motion language below).

**Anchor row** at top: `← BACK TO PLANNER` left, vertical divider, `ADD MEAL` label, then right-aligned meta `MON, APR 27 · JEN` (the day and person being added to). Hairline below.

**Page body** centered with editorial padding (matches Compare's body padding):

- Eyebrow: `§ STEP ONE`
- Title: `Pick a meal type.` (DM Sans 700, 38px, leading 1.0)
- Subtitle: `Then choose what fills it.` (13px, color secondary)
- Numbered list of meal types as tappable rows:
  - `01  Breakfast  →`
  - `02  Lunch  →`
  - `03  Dinner  →`
  - `04  Side  →`
  - `05  Snack  →`
  - `06  Dessert  →`
  - `07  Beverage  →`
- Each row: number in 11px mono caps muted, name in 22px DM Sans 700, arrow at right. Full-width hairline between rows. Hover state darkens arrow and slightly shifts background.

**Tap on a row** transitions to Step 2 (see motion language).

### Step 2 — Pick the recipe

The list is pre-filtered to whatever meal type was chosen in Step 1.

**Anchor row** at top: `← BACK` left (returns to Step 1), vertical divider, `ADD MEAL` label, vertical divider, then the chosen meal type as a breadcrumb (e.g. `BREAKFAST` in mono caps muted). Right-aligned meta unchanged. Hairline below.

The breadcrumb is clickable and returns to Step 1. This lets users change meal type without losing their place in the flow.

**Page body**:

- Eyebrow: `§ STEP TWO`
- Title: takes meal type — `Pick a breakfast.` / `Pick a lunch.` / `Pick a dinner.` / `Pick a side.` / `Pick a snack.` / `Pick a dessert.` / `Pick a beverage.`
- Tabs row below the title: `RECIPES` / `ITEMS` (mono caps, active underlined, hairline below the row)
- Controls row: SEARCH field (flex-1) on left, SERVINGS field (80px) on right. Both with mono caps labels and hairline underlines.
- Recipe list in two columns. Each row: name in 13px DM Sans 500, meta in 11px muted (e.g. "1 serving · 320 kcal"). Hairline between rows.
- Footer: `ALSO ADD TO` mono caps label, then a checkbox row for the other household member(s). Right-aligned: `CANCEL` (text link, mono caps) and `ADD TO PLAN →` (filled black primary button).
- Top border on footer separates it from the list.

### Removing the existing modals

Both the SELECT MEAL TYPE dialog and the RECIPES/ITEMS modal currently triggered from `+ ADD` are removed. Their logic is replaced by the two pages above.

---

## 2. Shopping list — single-page editorial

Replaces the current Shopping List modal (currently triggered by the cart icon on the planner toolbar) with a full-screen editorial page.

Triggered by the cart icon. Slides in from the right.

**Anchor row** at top: `← BACK TO PLANNER` left, vertical divider, `SHOPPING LIST` label, then right-aligned meta `42 ITEMS` and `SHARE` text link. Hairline below.

**Page body**:

- Eyebrow: `§ APR 26 – MAY 2` (the week being shopped for)
- Title: `A week of meals.` (DM Sans 700, 36px)
- Subtitle: `Built from 11 recipes across Jen and Garth's plans.` (13px muted, dynamic)
- Three-column grid for category groups (responsive — collapses to two columns then one on narrower viewports). Each column contains:
  - Category header: small circle, mono caps category name (e.g. `PRODUCE`), count at right (e.g. `14`). Heavier rule below — 1px solid `var(--text-primary)` — to distinguish category boundary from item boundaries.
  - Item rows below: small circle (checkbox state), amount in 11px muted with min-width for tabular alignment, item name in 13px primary. Standard `var(--rule)` hairline between items.

The current modal's "SHARE" button at the bottom moves into the anchor row at top right. Clicking it triggers the existing share sheet.

Categories continue to use the same set as today (Produce, Protein, Pantry, Dairy, etc.). The category rendering and rule weight is the only structural change.

---

## 3. Compare — underline jump bug fix

The COMPARE button in the recipe list toolbar currently has an active-state underline that sits too close to the text, visually shifting the word upward when the state activates. The GRID button in the same toolbar uses a baseline-anchored underline that does not shift.

**Fix**: Use the same treatment as GRID for COMPARE. Replace the active-state underline (likely `text-decoration: underline` or insufficient padding-bottom) with a `border-bottom: 1px solid var(--text-primary)` and matching `padding-bottom` so the underline sits at the same baseline whether the state is active or inactive.

Audit all toolbar text buttons (GRID, LIST, COMPARE, sort direction, etc.) and confirm the active-state underline treatment is consistent. Standardize on the GRID/LIST pattern.

---

## 4. Compare — loading animation

Currently when COMPARE is clicked from the recipe list toolbar, the comparison view toggles into place with no transition. This breaks the editorial-page metaphor.

**Fix**: Compare now uses the page-enters-from-right transition (see motion language). When activated, the Compare page slides in from the right over the recipe list. When dismissed (← BACK TO RECIPES), it slides back out to the right.

This applies to both the COMPARE state shown over the recipe list and the dedicated Compare page that opens after recipes are selected.

---

## 5. Motion language — design-system.md update

Add a new section to `design-system.md` titled **§9 Motion**. Locks the timing and easing values for transitions across the system.

### Page enters from right

Used for: Add Meal Step 1 opening, Shopping list opening, Compare loading, any future full-screen editorial page.

- Duration: 400ms
- Easing: ease-out (CSS `cubic-bezier(0.0, 0.0, 0.2, 1)`)
- Transform: translateX(24px) → translateX(0)
- Opacity: 0 → 1
- Underlying page: stays in place. No movement, no fade.

### Step-to-step within a flow

Used for: Add Meal Step 1 → Step 2 and back.

- Duration: 320ms
- Easing: ease-in-out (CSS `cubic-bezier(0.4, 0.0, 0.2, 1)`)
- Outgoing step: translateX(0) → translateX(-16px), opacity 1 → 0
- Incoming step: translateX(16px) → translateX(0), opacity 0 → 1
- Crossfade overlap: outgoing and incoming run concurrently

### Page exits

Used for: any ← BACK from a full-screen editorial page.

- Duration: 280ms
- Easing: ease-in (CSS `cubic-bezier(0.4, 0.0, 1, 1)`)
- Transform: translateX(0) → translateX(24px)
- Opacity: 1 → 0

### Confirmation modals

Used for: delete confirmations, the existing dialog sweep from Brief 16d.

- Duration: 200ms
- Easing: ease-out
- Transform: translateY(8px) → translateY(0)
- Opacity: 0 → 1
- Background dim: opacity 0 → 1, parallel timing

### In-page state changes

Used for: Grid ↔ List toggle, sort direction change, filter chip selection, tab switches within a page.

- Duration: 100ms
- Easing: linear
- Property: opacity only. No transform.

### Static elements that never animate

Wordmark, anchor row chrome, navigation. These are structural and stay still.

### Implementation note

Use CSS variables for the timing values:

```
--motion-page-enter: 400ms cubic-bezier(0.0, 0.0, 0.2, 1);
--motion-page-exit: 280ms cubic-bezier(0.4, 0.0, 1, 1);
--motion-step: 320ms cubic-bezier(0.4, 0.0, 0.2, 1);
--motion-modal: 200ms cubic-bezier(0.0, 0.0, 0.2, 1);
--motion-state: 100ms linear;
```

Apply via Framer Motion or equivalent for entrance/exit transitions on full-screen pages. CSS transitions sufficient for in-page state changes and modals.

Respect `prefers-reduced-motion`: when set, all transforms collapse to instant or to opacity-only fades. Do not skip the transition entirely — opacity fades still help orient the user.

---

## Out of scope

- Onboarding chrome — deferred until wordmark
- Sage italic accent — deferred until wordmark
- Mobile pass — deferred until wordmark
- Auth changes — deferred until wordmark
- Settings/Recipes/Pantry sidebar nav rules — keep as-is
- Type leading audit — moved to its own future brief
- Account deletion strategy — deferred, in `decisions-pending.md`

---

## Verification

After implementation, verify:

1. `+ ADD` on a planner cell opens the Step 1 page (not a modal). The page slides in from the right.
2. Tapping a meal type on Step 1 transitions to Step 2 with the crossfade animation. The Step 2 list is pre-filtered to the chosen meal type.
3. The breadcrumb on Step 2 is clickable and returns to Step 1.
4. `← BACK` from Step 1 returns to the planner with the page-exit animation.
5. The cart icon on the planner toolbar opens the full-screen Shopping list page (not a modal). The page slides in from the right.
6. Shopping list categories have a heavier 1px black rule below the header and standard hairlines between items.
7. SHARE on the shopping list anchor row triggers the existing share sheet.
8. COMPARE button in the recipe toolbar no longer shifts upward when activated. The underline sits at the same baseline as GRID and LIST.
9. Activating COMPARE slides the Compare page in from the right.
10. `prefers-reduced-motion` collapses all transforms to opacity-only fades.

Run through the app end-to-end and confirm. Take fresh screenshots of Add Meal Step 1, Step 2, Shopping list, and Compare for the project folder.

---

## Notes for implementation

The Add Meal flow needs to know which day and which person the meal is being added to. The current modal already has this state. The new pages take that state via URL params or route state — `/planner/add?date=2026-04-27&person=jen`. Step 2's URL adds the meal type — `/planner/add?date=2026-04-27&person=jen&type=breakfast`.

The Shopping list page also needs the week range from the planner. URL: `/planner/shopping?start=2026-04-26&end=2026-05-02`.

Compare's existing routing should already work — the loading animation is a transition layer over what already exists.

---

## After this brief

Open queue:

1. Wordmark direction (in progress)
2. Sage italic decision (depends on wordmark)
3. Onboarding chrome anchor (deferred to broader pass)
4. Mobile pass (depends on wordmark)
5. Type leading audit (its own brief, low priority)
6. Account deletion strategy (deferred)

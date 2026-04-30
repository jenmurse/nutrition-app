# Brief 2D.2 — Remove top back-bars, contextual bottom rails, button hierarchy

## Why

Walking through every child screen and its entry/exit flows revealed that BACK is never the right way out. Each child screen is entered with explicit intent and exits via a contextual commit action (CANCEL / SAVE / CREATE / ADD TO PLAN) or via the Menu. The top back-bar we added in 2D / 2D.1 is solving a problem that doesn't exist.

It also fights the editorial-meets-app principle. The bottom Menu rail is the app-like navigation chrome. The page top should be pure editorial: eyebrow, headline, content. Nothing competing.

This brief removes the top back-bars from all child screens, gives Shopping and Add Meal a proper bottom rail (which they currently lack), and fixes a button-hierarchy regression on Add Meal.

## What's wrong

1. **Top back-bars on all four form pages** (New/Edit Recipe, New/Edit Pantry) — added in 2D, redesigned in 2D.1, but they don't earn their place. They're breadcrumb strips pretending to be action bars. With CANCEL/SAVE at the bottom of the form, BACK is redundant.
2. **Top bar on Shopping** — has BACK + SHARE. BACK is redundant (you got here via Menu). SHARE is functional and needs a home.
3. **Top bar on Add Meal step 1 + step 2** — has BACK + breadcrumb (`ADD MEAL`, `ADD MEAL | LUNCH`) + date/person context (`TUE, APR 28 · JEN`). BACK is redundant. The breadcrumb is duplicated by the editorial step header (`§ STEP ONE / Pick a meal type.`). The date/person context is real and needs a home.
4. **Shopping and Add Meal lack a bottom Menu rail** — they're treated as modal overlays, but they're real pages in the app and the Menu should be globally reachable from them like every other screen.
5. **`ADD TO PLAN` button is outlined, not filled black** — Add Meal step 2 has CANCEL (text-only) + ADD TO PLAN (outlined). This breaks the established hierarchy: filled black is reserved for the single primary commit action on a page. CANCEL/CREATE on the recipe form gets this right; CANCEL/ADD TO PLAN does not.

## Spec

### 1. Remove top back-bars from all child screens

Pages affected:
- New Recipe
- Edit Recipe
- New Pantry Item
- Edit Pantry Item
- Shopping
- Add Meal (step 1: pick meal type)
- Add Meal (step 2: pick recipe / pick item)

For all of the above:
- Remove the entire top bar / back-row markup and CSS.
- Page begins directly with the editorial eyebrow + headline (`RECIPE / NEW`, `New Recipe`, etc.) at the top of the content area.
- No padding-top adjustments needed — the page should sit naturally at the top of the scroll area like a parent screen does.
- The mobile MQ override that cancels `main.app-main` padding-top via `:has(.form-page-shell)` (added in 2D.1) is no longer needed since there's no back-row to position. Remove it.
- The `.form-page-shell` class is no longer needed if its only job was the padding-top override. Remove if so. Keep if it's doing other layout work.
- Delete the `.form-back-row` class and all related CSS entirely. This is dead code now, not just hidden.

### 2. Add bottom rail to Shopping and Add Meal

Both screens currently render without the bottom Menu rail. Add it.

**Shopping bottom rail:**
```
Menu                                       SHARE
```
- Left side: `Menu` (same component used on every other screen)
- Right side: `SHARE` action (replaces the SHARE button currently in the top bar)
- `SHARE` should be styled as a text link in mono uppercase tracking, matching the `NN/NN — SECTION` pattern visually but functional. Tap target sized appropriately (44px minimum height).
- Same height, padding, and hairline as the existing bottom rail on Recipes/Pantry/Planner/Dashboard.

**Add Meal bottom rail (both steps 1 and 2):**
```
Menu                          TUE, APR 28 · JEN
```
- Left side: `Menu`
- Right side: the date and person context (`TUE, APR 28 · JEN`), formatted in mono uppercase to match `03/04 — RECIPES` pattern. Not interactive — this is a "you are here" status locator.
- Person color dot rendered before the name (e.g., orange dot for Jen, green for Garth) — same dot used elsewhere for person identity.

### 3. Fix ADD TO PLAN button hierarchy

On Add Meal step 2:
- `ADD TO PLAN` button → change from outlined to filled black (same treatment as `CREATE` on the recipe form).
- `CANCEL` stays as a text-only ghost link.
- The pair should read identically to CANCEL / CREATE pairs elsewhere.

### 4. Editorial step header reduction on Add Meal step 2

With the top bar gone, the breadcrumb-y `ADD MEAL | LUNCH` chain disappears. The editorial header on step 2 currently is:
```
§ STEP TWO
Pick a lunch.
```
This is correct and stays as-is. The lost breadcrumb information ("you're in the Add Meal flow, picking a Lunch") is fully recovered by the step header text. No change needed beyond removing the top bar.

### 5. Button hierarchy audit (preventive sweep)

While in the codebase, verify the button hierarchy rule across every CTA in the app. Rule:
- **Filled black** — reserved for the single primary commit action on a page (CREATE, SAVE, ADD TO PLAN after fix, etc.)
- **Outlined** — secondary actions, toolbar buttons, inline form actions (`+ NEW`, `+ ADD`, `IMPORT`, `UPLOAD FILE`, `USDA LOOKUP`, etc.)
- **Text-only** — tertiary/cancel actions (CANCEL, CLEAR, etc.)
- **Underlined link or mono link** — navigation/text actions (SHARE in bottom rail, scale chips on recipe detail, etc.)

Grep for `background: #000`, `background: var(--fg)`, or any filled black button styles. Flag any usage that isn't a single primary commit action. Don't fix beyond ADD TO PLAN in this brief — just list anything that looks wrong, and we'll address in a follow-up if needed.

## Files affected

- `index.html` (or wherever the main mobile shell is) — remove top bar markup from all six page templates
- Form page CSS — delete `.form-back-row` class and related rules
- Mobile MQ — remove `:has(.form-page-shell)` padding-top override
- Shopping CSS — remove top bar markup, add bottom rail markup
- Add Meal CSS — remove top bar markup, add bottom rail markup with person dot
- Bottom rail component — accept right-slot content variants:
  - `NN/NN — SECTION` (existing, parent screens)
  - `SHARE` action link (Shopping)
  - `DAY, MMM DD · PERSON` status (Add Meal)
- Add Meal step 2 — change ADD TO PLAN from outlined to filled black
- design-system.md — update button hierarchy section if not already documented; remove the 2D.1 locked rule about `← BACK` copy and replace with new rule (see Notes)

## Verify

Mobile (primary surface for this brief):
- New Recipe: top of page is `RECIPE / NEW` eyebrow, then `New Recipe` headline. No bar above. CANCEL/CREATE at form bottom. Bottom rail shows `Menu | 03/04 — RECIPES`.
- Edit Recipe: top of page is `RECIPE / EDIT` eyebrow, then `Edit Recipe` headline. No bar above. CANCEL/SAVE at form bottom. Bottom rail shows `Menu | 03/04 — RECIPES`.
- New Pantry: top of page is `PANTRY / NEW` eyebrow, then `New Pantry Item` headline. No bar above. CANCEL/CREATE at form bottom. Bottom rail shows `Menu | 04/04 — PANTRY`.
- Edit Pantry: same pattern, EDIT eyebrow.
- Shopping: top of page is `§ APR 26 - MAY 2` eyebrow, then `A week of meals.` headline. No bar above. Bottom rail shows `Menu | SHARE`. SHARE is functional.
- Add Meal step 1: top of page is `§ STEP ONE` eyebrow, then `Pick a meal type.` headline. No bar above. Bottom rail shows `Menu | TUE, APR 28 · JEN` with orange dot before JEN.
- Add Meal step 2: top of page is `§ STEP TWO` eyebrow, then `Pick a lunch.` headline. No bar above. ADD TO PLAN button is filled black. CANCEL is text-only ghost. Bottom rail shows `Menu | TUE, APR 28 · JEN` with person dot.

Desktop:
- Verify same changes apply consistently. Desktop has more horizontal room and may have had different top bar treatments — make sure none are left behind.
- Verify no regression on desktop Recipes/Pantry/Planner/Dashboard toolbars.

Greps to run and paste back:
- `grep -r "form-back-row" .` → should return zero hits after this brief.
- `grep -r "form-page-shell" .` → should return zero hits unless that class was doing other layout work.
- `grep -r "class=\"top-bar\"" .` (or whatever the top bar class was) → should return zero hits on form/shopping/add-meal pages.
- `grep -r "BACK" . | grep -v "node_modules"` → flag any remaining BACK link occurrences. None should remain in mobile views except as historical CSS that's been deleted.
- `grep -r "background: #000\|background: var(--fg)" .` for button styles → list each, confirm only primary commit actions use filled black.

Visual:
- All six child screens should feel like editorial pages from top edge to bottom rail. Eyebrow → headline → content → (optional) form actions → bottom rail.
- Bottom rail should feel like a single consistent component across all screens, with right-side content varying by context.
- ADD TO PLAN should now read with the same visual weight as CREATE on the recipe form — no doubt about which is the primary action.

## Out of scope

- Sheet radius and chip patterns inside sheets (that's 2E)
- Mobile menu rail polish, drop NN/NN, sign out relocation (that's 2F)
- Token sweep, --radius-md/lg/pill flattening (that's 2G)
- Any further changes to parent screens (Recipes, Pantry, Planner, Dashboard, Recipe Detail) — those toolbars stay as locked in 2A/2B/2B.1/2B.2/2C/2C.1
- Add Meal step 1 row arrows (`→`) — leave as-is, they're an editorial flourish that works
- Date/person status format on Add Meal — keep current `TUE, APR 28 · JEN` format
- Renaming SHARE or rethinking the share flow — just relocating it
- Button hierarchy fixes beyond ADD TO PLAN — flag others, fix in follow-up if needed

## Notes for implementer

- This brief deletes more than it adds. Be ruthless about removing dead CSS, dead markup, and stale class names. Don't leave commented-out blocks.
- The bottom rail is becoming a more flexible component. If it's currently hardcoded with `NN/NN — SECTION` markup, refactor it to accept a right-slot prop or content variant. Three variants needed: section locator (parent screens), action link (Shopping SHARE), status with person dot (Add Meal).
- The person dot on Add Meal's bottom rail should use whatever color-dot component is already used on the planner's person chips. Don't reinvent it. If the colors live as CSS custom properties keyed to person ID, use those.
- After the form-back-row CSS is deleted, the Shopping and Add Meal top-bar CSS should be deleted too. They were doing the same job (chrome that contained back + context). All gone.
- If the existing top bar CSS for Shopping/Add Meal was using a shared class name with the form back-rows, the deletion is one CSS block. If they were separate, delete both.
- The locked rule from 2D.1 — "Mobile back-link copy is always `← BACK`. No `← BACK TO X`." — is now obsolete. Replace with: **"Mobile child screens have no top back-bar. Navigation is contextual via cancel/save form actions and the persistent Menu in the bottom rail. The bottom rail's right slot adapts: section locator on parent screens, primary action on screens with one (Shopping SHARE), or status locator on screens that need it (Add Meal date/person)."** Update design-system.md accordingly.
- After this lands, the design has resolved its biggest open question: chrome lives at the bottom (Menu rail, contextual right-slot), content lives at the top (editorial eyebrow + headline + body). Nothing in the middle competing. This is the editorial-meets-app principle paying off.
- Ask before guessing on any of the following: where SHARE currently lives in the Shopping component tree; how the Add Meal step 2 ADD TO PLAN button is currently styled (outlined via border or via a class); whether there's existing person-dot infrastructure to reuse.

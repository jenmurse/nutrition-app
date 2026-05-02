# Brief 5B — Button casing verification + class audit

**Step:** 5 (Editorial pass and § convention)
**Status:** Ready to ship
**Depends on:** 5A (eyebrow class enforcement pattern is the precedent for this brief)
**Blocks:** Nothing

---

## Context (carrying over from 5A)

Step 5 of the design pass is the editorial and copy audit. Brief 5A handled five mechanical quick wins (eyebrow casing, em-dash removal, two stray button labels, breadcrumb verification, date eyebrow verification). The pattern established there: **fix the system, not just the strings.** CSS classes enforce casing so future drift is impossible; source strings are secondary.

This brief continues the same pattern for the rest of the button system.

---

## What this brief does

A copy audit found what looked like widespread casing inconsistency on buttons — mixed-case strings like `Edit`, `Duplicate`, `Delete`, `Add to Favorites`, `+ New Plan`, `Done`, `Continue with Google`. On follow-up the rendered app shows these as UPPERCASE, which means CSS `text-transform: uppercase` is doing the work at the class level and the source strings are mixed-case but render correctly.

Two areas weren't visually verified by the user and may be actual stragglers:
- **RecipeBuilder footer buttons** (`Cancel`, `Save`, `Create`, `Saving…`, `Creating…`) — the form footer on New Recipe / Edit Recipe pages
- **AddMealSheet primary commit** (`Add to Plan`, `Adding…`) — the bottom button of the Add Meal sheet/page

This brief verifies the system is uniformly enforcing uppercase, fixes any class that isn't, and locks the rule explicitly in the design system doc.

---

## §1 · Lock the casing rule in design-system.md §1d

The current §1d "Button register rule (locked)" defines border vs typography register but doesn't state casing. Add an explicit casing line.

**Add to §1d:**

> **Casing.** All button labels render UPPERCASE, regardless of register. Borderless DM Mono buttons (`.ed-btn-text`, `.ed-chip`, `.ed-toggle button`, `.sort-field`) and bordered DM Sans buttons (`.ed-btn`, `.ed-btn-outline`) all use `text-transform: uppercase` enforced at the class level. Source strings may be authored mixed-case for readability — the class does the work.

This makes the rule explicit so future button work doesn't drift.

---

## §2 · Audit every button class in globals.css for `text-transform: uppercase`

**Tasks:**

1. Find every button-related class in `globals.css`. Likely candidates (verify by grep, don't trust this list as exhaustive):
 - `.ed-btn`
 - `.ed-btn-outline`
 - `.ed-btn-text`
 - `.ed-chip`
 - `.ed-toggle button` / `.ed-toggle-btn`
 - `.sort-field`
 - `.btn-primary`
 - `.btn-outline`
 - `.btn-ghost`
 - `.toolbar-text-btn`
 - `.am-rail-item` (Add Meal rail)
 - `.rd-jump-nav a` (jump nav links)
 - `.cmp-mode-btn` (compare mode)
 - `.set-mob-jump-btn`, `.set-person-chip` (settings)
 - `.pl-person-chip`, `.pl-nut-chip`, `.pl-add-filter-chip` (planner chips)
 - `.auth-tab` (auth tabs)
 - `.add-meal-chip`
 - `.mob-sheet-chip`, `.mob-sheet-sort-btn`, `.mob-sheet-cat-btn`
 - `.hm-mob-person-chip`
 - `.filter-chip`
 - `.tab`
 - any class with `-btn`, `-chip`, `-toggle`, `-tab`, `-pill` in the name

2. For each class found, confirm it includes `text-transform: uppercase`.

3. **Flag and fix any that don't.** Add `text-transform: uppercase` to the class definition.

4. **One known exception:** the menu sheet items on mobile (`.mob-menu-item` or similar — Home, Planner, Recipes, Pantry, Shopping, Settings, Sign out) are explicitly **sentence case** at 36px DM Sans. Per design-system.md §8h, those are "content register because the sheet is an overlay surface, not chrome." Do NOT add uppercase to those. If you encounter them, leave alone.

**STOP-CHECK:** before declaring done, list every button-related class found and confirm whether it has `text-transform: uppercase` (yes / no / N/A — content register exception). Report this list back.

---

## §3 · Visual verification of the two suspect areas

Two surfaces need visual check in the rendered app — not just the CSS — because the user wasn't sure if they're rendering uppercase:

**3a. RecipeBuilder footer buttons.** Navigate to `/recipes/create` (or `/recipes/[id]/edit`). The footer should have buttons that render as `CANCEL`, `SAVE` or `CREATE`. If they're rendering mixed-case (`Cancel`, `Save`), that's the bug — find which class they use and add `text-transform: uppercase`.

**3b. AddMealSheet primary commit.** Navigate to `/meal-plans/add-meal` (desktop) or trigger Add Meal from a planner cell on mobile. The primary commit button at the bottom of the sheet/page should render `ADD TO PLAN` or `ADDING…`. If mixed-case, fix the class.

**Report back:** what each renders as currently, and what (if anything) was fixed.

---

## §4 · Source string cleanup (stretch goal)

**Lower priority.** Once §2 confirms all classes enforce uppercase, the source strings rendering correctly is no longer a user-visible issue. However, mixed-case source strings hurt code clarity and grep-ability.

**If time allows:** uppercase the source strings on the highest-traffic surfaces so source matches rendered output:

- **Recipe Detail action buttons:** `Edit`, `Duplicate`, `Delete`, `Add to Favorites`, `★ Favorited · Remove`, `Scale` → `EDIT`, `DUPLICATE`, `DELETE`, `ADD TO FAVORITES`, `★ FAVORITED · REMOVE`, `SCALE`
- **Planner toolbar:** `+ New Plan`, `Edit`, `Done`, `Delete`, `Everyone`, `‹ Prev`, `Next ›` → `+ NEW PLAN`, `EDIT`, `DONE`, `DELETE`, `EVERYONE`, `‹ PREV`, `NEXT ›`
- **Auth:** `Continue with Google` → `CONTINUE WITH GOOGLE` (Google's brand guidelines used to require Title Case but the brand is rendered uppercase in this app already, so source can match)
- **RecipeBuilder footer:** `Cancel`, `Save`, `Create`, `Saving…`, `Creating…` → uppercase versions
- **AddMealSheet:** `Add to Plan`, `Adding…` → `ADD TO PLAN`, `ADDING…`
- **Settings:** `Reset to defaults`, `Save Goals`, `Export`, `Import` → uppercase versions
- **Recipes toolbar:** `Compare`, `Compare (N)`, `Exit`, `Clear`, `Compare →`, `+ Add More`, `Filter & Sort`, `Done`, `Clear all` → uppercase versions
- **MealPlanWeek dialog:** `Remove this meal?` (dialog title) and `Remove` (confirm button) — leave dialog title sentence case (it's a headline, not a button), uppercase the confirm button → `REMOVE`

**Skip:**
- Dialog titles and bodies (those are headlines, not buttons — different rule applies in Step 5C eventually)
- Toast messages
- Form field labels
- Menu sheet items (per §2 exception)
- Form placeholders (`Search USDA database…`, `Paste recipe URL…`) — those are placeholder text, not buttons

**STOP-CHECK on stretch goal:** if you start §4, do it as a single dedicated commit so it can be reverted independently if scope creeps. Don't intermix string changes with class changes from §2.

---

## Reconciliation block

This brief continues the pattern from 5A: **fix the system at the class level first, source strings second.** The user verified that most buttons that looked broken in the audit are actually rendering correctly because CSS is doing the work. So the bulk of the work is verification and locking the rule, not a string sweep.

**Two areas the user couldn't visually confirm** — RecipeBuilder footer and AddMealSheet primary commit — are the most likely actual stragglers, hence §3.

**What's deliberately NOT in this brief (deferred to later 5x briefs):**
- Empty-state CTA additions (Recipes/Pantry "no matches", Shopping no-plan, Shopping no-ingredients, Planner "nothing selected")
- Form-page headline voice (`Edit Recipe`, `New Recipe`, `Edit Pantry Item`, `New Pantry Item`)
- Dashboard stats strip empty state structure
- Landing italic density (`other`, `matrix`, `left off` cuts)
- Landing copy adjustments
- Dialog title/body voice (separate concern from button casing)

---

## Verification checklist

Before declaring done:

- [ ] design-system.md §1d updated with the explicit casing rule.
- [ ] Every button-related class in globals.css enumerated and audited. Report includes which classes have `text-transform: uppercase` and which were fixed.
- [ ] Mobile menu sheet items (`.mob-menu-item` or equivalent) confirmed as the documented exception — sentence case retained.
- [ ] RecipeBuilder footer buttons render UPPERCASE in the rendered app. Report which class enforces it.
- [ ] AddMealSheet `ADD TO PLAN` button renders UPPERCASE in the rendered app. Report which class enforces it.
- [ ] If §4 stretch goal attempted: source string changes in a separate commit from class changes.
- [ ] Grep `text-transform: uppercase` in globals.css — note the count before vs after.

---

## Files likely touched

- `app/globals.css` (button class additions)
- `docs/design-system.md` (§1d update)

If §4 stretch goal attempted, also:
- `app/recipes/[id]/page.tsx`
- `app/meal-plans/page.tsx`
- `app/login/page.tsx`
- `app/components/RecipeBuilder.tsx`
- `app/components/AddMealSheet.tsx`
- `app/meal-plans/add-meal/page.tsx`
- `app/settings/page.tsx`
- `app/recipes/page.tsx`
- `app/components/MealPlanWeek.tsx`

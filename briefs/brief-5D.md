# Brief 5D — Form-page headlines + working-surface scale

**Step:** 5 (Editorial pass and § convention)
**Status:** Ready to ship
**Depends on:** Nothing
**Blocks:** Step 10 (type leading pass) will need to verify the scale split this brief introduces

---

## Context (carrying over from 5A/5B/5C)

Step 5 of the design pass is the editorial and copy audit. Briefs 5A through 5C handled mechanical fixes: eyebrow casing, button class enforcement, and empty-state CTAs. This brief tackles the form-page headline voice — the four pages where the headline is in label-register Title Case (`New Recipe`, `Edit Recipe`, `New Pantry Item`, `Edit Pantry Item`) instead of the lowercase editorial voice used elsewhere.

It also introduces a scale split between **editorial bookend pages** and **working surfaces.** The form pages already render at a smaller form-title scale (~22–32px clamp). This brief extends that scale to Add Meal and Shopping, on the principle that those are also working surfaces — the user navigates to them with a task in mind, not for an editorial moment.

---

## What this brief does

Two related changes:

1. **Form-page headline rewrite.** Replace four Title Case headlines with lowercase editorial copy. Replace path-style breadcrumbs (`RECIPE / NEW`) with single-word § eyebrows (`§ NEW`).
2. **Working-surface scale standardization.** Pull Add Meal and Shopping headlines down to the form-title scale, matching form pages. Editorial bookend pages (landing, auth, onboarding, dashboard, empty states, 404) keep the Display scale.

---

## §1 · Form-page headlines

### Pattern

Replace existing Title Case headlines + path breadcrumbs with `§ EYEBROW` + lowercase editorial headline.

| Page | New eyebrow | New headline |
|---|---|---|
| `/recipes/create` | `§ NEW` | `A new recipe.` |
| `/recipes/[id]/edit` | `§ EDIT` | `Edit this recipe.` |
| `/ingredients/create` | `§ NEW` | `A new pantry item.` |
| `/ingredients/[id]` | `§ EDIT` | `Edit this pantry item.` |

### Notes

- Eyebrow = DM Mono 9px UPPERCASE, enforced by class (per 5A pattern). Source string can be authored in any case; the class does the work.
- Headline = lowercase, sentence ends with a period. Same voice as `Pick your color.` (onboarding), `Welcome back.` (auth), `Add a breakfast.` (Add Meal).
- The § convention matches: `§ WEDNESDAY, APRIL 29` (Add Meal) → `§ NEW` (form page) is the same shape.
- Path-style breadcrumbs (`RECIPE / NEW`, `PANTRY / EDIT`) are removed entirely. The single-word § eyebrow replaces them. The top nav already does the locator work (highlighting Recipes or Pantry).

### Rationale for the parallel headline structure

Create pages get the article form (`A new recipe.`). Edit pages get the imperative form (`Edit this recipe.`). Both lowercase, both end with a period. The voice rhymes. This was an explicit design decision over alternatives (e.g. using the record's own name as the edit-page headline) — the parallel article/imperative structure was preferred for consistency with the rest of the editorial voice.

---

## §2 · Working-surface scale

### The principle

Headlines split into two scales by **user intent**:

- **Editorial scale (Display, ~64px clamp):** Bookend pages where the headline is a moment. Landing hero, onboarding bookends, auth, dashboard greeting (own scale), empty-state headlines, 404.
- **Working scale (Form-title, ~22–32px clamp):** Pages where the user is doing a task. Form pages, Add Meal, Shopping.

The current state has form pages at working scale already (~22–32px clamp via the existing form-page-title token). Add Meal and Shopping are at editorial scale. This brief pulls Add Meal and Shopping down to working scale.

### What changes

| Surface | Current scale | New scale |
|---|---|---|
| Add Meal (desktop) — `Add a breakfast.` etc. | Display (~64px clamp) | Form-title (~22–32px clamp) |
| Add Meal (mobile sheet) — `Add a breakfast.` etc. | Display (~64px clamp) | Form-title (~22–32px clamp) |
| Shopping — `A week of meals.` | Display (~64px clamp) | Form-title (~22–32px clamp) |
| Shopping empty states — `A blank shopping list.`, `A week without a list.` | Display (~64px clamp) | **Stays at Display.** Empty-state headlines belong with editorial bookends. |

### Implementation

The form-page-title scale already exists in the system. From design-system.md §1b:

> Page title (form) | clamp(22px, 2.4vw, 32px) | 700 | -0.02em

Apply this same token to:
- Add Meal headline (`.am-headline` or whatever class governs it — verify in code)
- Shopping headline (`.shop-headline` or equivalent)

Don't introduce a new token. Reuse the existing form-page-title token so all four working surfaces share one scale.

### What stays

- Empty states inside Shopping (`§ NO PLAN THIS WEEK / A blank shopping list.`) keep Display scale. Empty states are editorial bookends, not working surfaces.
- Recipe detail page title (the recipe's name) keeps its own larger clamp — it's content, not a UI headline. Different rule.
- Onboarding step headlines (`Pick your color.`, `Who else is eating?`) — these are arguably working surfaces (the user is making decisions), but they're explicitly bookend chapters in the wizard flow. Keep them at editorial scale. They're a deliberate exception.

---

## §3 · Verification step before implementation

Before making changes, document the current state of each headline:

1. **Form pages (4):** Confirm current headline class and scale. Confirm current breadcrumb structure. Capture the existing strings.
2. **Add Meal:** Find the headline class. Confirm current scale.
3. **Shopping:** Find the headline class. Confirm current scale.
4. **Onboarding step headlines:** Confirm they're on a separate class from Add Meal / Shopping (so pulling those down doesn't accidentally affect onboarding).

**Report this audit before making changes.** It's a sanity check that the class boundaries are clean.

---

## §4 · Implementation order

1. Form-page eyebrow + headline rewrites (§1). Smallest change, lowest risk.
2. Verification of class boundaries (§3).
3. Working-surface scale change for Add Meal (§2).
4. Working-surface scale change for Shopping (§2).
5. Visual verification across all six surfaces.

Do these as separate commits where practical so any single change can be reverted independently.

---

## §5 · Visual verification

After implementation, verify in the rendered app:

- Form pages: `§ NEW` / `A new recipe.` reads as a unit, eyebrow is small mono uppercase above the headline, headline is the form-title clamp scale.
- Form pages: the breadcrumb path (`RECIPE / NEW`) is fully removed. The § eyebrow replaces it; nothing else lingers.
- Add Meal desktop: headline scale matches form pages. Layout doesn't break (the rail and form below should still feel proportionate to the smaller headline).
- Add Meal mobile sheet: headline scale matches form pages. Sheet still feels right at the smaller scale — flag if the headline now feels lost in the sheet.
- Shopping: headline scale matches form pages. The § eyebrow above it stays. The visual hierarchy still feels right.
- Empty states inside Shopping: still at Display scale. Confirm the editorial-vs-working scale split is visible side by side.
- Mobile and desktop both verified.

---

## Reconciliation block

Two earlier proposals during the design discussion were considered and rejected:

- **Demoting edit-page headlines entirely** (using only the breadcrumb, with the record's name in the form's first field as orientation) — rejected because the parallel `§ NEW / A new recipe.` + `§ EDIT / Edit this recipe.` structure is cleaner and the form pages need a headline anchor.
- **Using the record's own name as the edit-page headline** (e.g. `Almond Croissant Bars` as the h1 above the form) — rejected because the parallel article/imperative structure with editorial headlines is more consistent with the rest of the system.

Type sizing differences across surfaces (e.g. confirming form-title clamp is the right value, evaluating whether the editorial scale is consistent across the bookend pages) is **deferred to Step 10** (type leading and tracking pass). This brief just establishes the working-surface vs editorial scale split.

**What's deliberately NOT in this brief (deferred to later 5x briefs or other steps):**

- Dashboard stats strip empty state structure
- Landing italic density (`other`, `matrix`, `left off` cuts)
- Landing copy adjustments
- Dialog title/body voice
- Type leading and tracking pass (Step 10)
- Italic typeface decision (Step 6)

---

## Verification checklist

Before declaring done:

- [ ] §3 verification audit completed and reported. Class boundaries confirmed clean.
- [ ] `/recipes/create` shows `§ NEW` + `A new recipe.` Path breadcrumb removed.
- [ ] `/recipes/[id]/edit` shows `§ EDIT` + `Edit this recipe.` Path breadcrumb removed.
- [ ] `/ingredients/create` shows `§ NEW` + `A new pantry item.` Path breadcrumb removed.
- [ ] `/ingredients/[id]` shows `§ EDIT` + `Edit this pantry item.` Path breadcrumb removed.
- [ ] Eyebrow class enforces UPPERCASE (per 5A pattern).
- [ ] Add Meal desktop headline scale = form-title clamp. Renders correctly.
- [ ] Add Meal mobile sheet headline scale = form-title clamp. Renders correctly.
- [ ] Shopping main headline scale = form-title clamp.
- [ ] Shopping empty-state headlines still at Display scale.
- [ ] Onboarding step headlines unaffected.
- [ ] Empty-state headlines (Recipes/Pantry "no matches", Planner "A blank week.", etc.) unaffected.
- [ ] Mobile and desktop both verified.
- [ ] design-system.md §8 patterns updated where any of these changes affect documented surface specs.

---

## Files likely touched

- `app/recipes/create/page.tsx` (eyebrow + headline)
- `app/recipes/[id]/edit/page.tsx` (eyebrow + headline) — find the actual edit page path
- `app/ingredients/create/page.tsx` (eyebrow + headline)
- `app/ingredients/[id]/page.tsx` (eyebrow + headline)
- `app/meal-plans/add-meal/page.tsx` (headline scale change)
- `app/components/AddMealSheet.tsx` (headline scale change)
- `app/shopping/page.tsx` (headline scale change)
- `app/globals.css` (possibly — if the form-title clamp class needs to be applied to new selectors)
- `docs/design-system.md` (§1b headline scale rules, §8 surface specs if they document Add Meal / Shopping headline scale)

---

## Note on revertibility

Per the user's note: this brief folds together the form-page copy change AND the working-surface scale change because they're conceptually one decision (treating these as working surfaces). If the scale change feels wrong in the rendered app but the copy change works, revert §2 only — keep the eyebrow + headline rewrites from §1, and let the scale stay at editorial. The two changes are independent enough to revert in isolation.

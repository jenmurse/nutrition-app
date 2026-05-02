# Brief 5C — Empty-state CTAs

**Step:** 5 (Editorial pass and § convention)
**Status:** Ready to ship
**Depends on:** Nothing (5A and 5B can have shipped or not — no overlap)
**Blocks:** Nothing

---

## Context (carrying over from 5A/5B)

Step 5 of the design pass is the editorial and copy audit. Briefs 5A (eyebrow + button casing quick wins) and 5B (button class audit) handled mechanical fixes. This brief tackles the first structural finding from the audit: **empty states missing CTAs.**

The empty-state pattern locked in design-system.md is `§ EYEBROW / display headline / lede / outlined CTA`. Several surfaces have the eyebrow + headline but no CTA, and one has weak headline + instructional lede that needs a rewrite.

---

## What this brief does

Adds CTAs to five empty states. Verifies a sixth that may be dead code. One state needs a headline rewrite alongside the CTA. Verifies that all states have ledes and adds them if missing.

---

## §1 · Verify which empty states have ledes

Before adding CTAs, audit each of the six empty states below and confirm presence of a lede paragraph.

For each state, document:
- Eyebrow string (verbatim)
- Headline string (verbatim)
- Lede string if present (verbatim) or "MISSING" if absent
- Existing CTA if any

The six states:

1. **Recipes — no matches** (`app/recipes/page.tsx`) — when filters/search return zero results
2. **Pantry — no matches** (`app/ingredients/page.tsx`) — when filters/search return zero results
3. **Planner — nothing selected** (`app/meal-plans/page.tsx`) — see §2 below, this one needs verification first
4. **Shopping — no plan** (`app/shopping/page.tsx`) — when no meal plan exists
5. **Shopping — no ingredients** (`app/shopping/page.tsx`) — when plan exists but no recipes/ingredients in it
6. **Dashboard — nothing today** (`app/home/page.tsx`) — when no meals logged for today

**Report this audit before making changes.** It informs §3–§7 below.

---

## §2 · Verify whether `§ SELECT A PLAN` / "Nothing selected." is reachable

The planner defaults to the current week's plan if one exists. So the conditions that trigger `§ SELECT A PLAN` / "Nothing selected." are unclear.

**Tasks:**

1. Find where this empty state renders in `app/meal-plans/page.tsx` (or whichever component owns the planner shell).
2. Trace the condition that triggers it. Document:
 - What `selectedPlan` (or equivalent) is set to when this renders
 - What user actions reach this state (deleting the current plan? having no plan for current week but plans elsewhere? something else?)
 - Whether the state is reachable in production with realistic user behavior
3. Determine which of three cases applies:

**Case A — Real and reachable.** Users can land here through normal use (e.g. they delete the currently-selected plan and the selector empties).
→ Action: keep the empty state but rewrite per §4 below.

**Case B — Reachable but redirectable.** The state happens (e.g. on plan deletion) but the better UX is to fall back to another plan or to the "A blank week." state, not to show "Nothing selected."
→ Action: change the logic to redirect/fallback. Delete the `§ SELECT A PLAN` empty state. Confirm `§ NO PLAN THIS WEEK` / "A blank week." covers all empty cases.

**Case C — Dead code.** The condition that triggers this state isn't reachable through any user flow.
→ Action: delete the empty state and any code that renders it.

**Report which case applies before proceeding with §4.**

---

## §3 · Add `CLEAR FILTERS →` CTA to "no matches" states

Both Recipes (§1.1) and Pantry (§1.2) need this.

**Pattern:**
- Eyebrow: `§ NO MATCHES` (existing, unchanged)
- Headline: `Nothing matches that.` (existing, unchanged)
- Lede: confirm exists per §1; if missing, add a one-line lede appropriate to the surface (something like "Try a different search or clear your filters.").
- CTA: `CLEAR FILTERS →`, outlined button (`.ed-btn-outline` or equivalent)

**Behavior:**
- The CTA clears all active filters (search input, category filter, favorites filter, etc.) and resets to the default view.
- The "no matches" state should only render when filters are actually active. If filters are empty/default and there are still no matches, the underlying data is empty — that should render the `§ NO RECIPES YET` / `§ NO INGREDIENTS YET` state instead.
- Verify the conditional logic separates "no matches due to filters" vs "no data at all" before adding the CTA. If the logic conflates them, fix it.

---

## §4 · Planner — `A week to plan.` (conditional on §2)

**Only do this section if §2 returns Case A.** Skip if Case B or C.

If Case A:

- Eyebrow: `§ SELECT A PLAN` (existing, unchanged)
- Headline: `Nothing selected.` → `A week to plan.`
- Lede: drop the existing "Use the controls above to select or create a plan." entirely. Replace with nothing, or with a one-line editorial lede if the layout requires one (something like "Choose an existing plan or start a new one." — but only if the layout looks bare without a lede).
- CTA: `+ CREATE PLAN →`, outlined button

The instructional lede pointing at controls is body copy compensating for unclear UI. Cut it.

---

## §5 · Shopping — no plan

**Pattern:**
- Eyebrow: `§ NO PLAN THIS WEEK` (existing, unchanged)
- Headline: `A blank shopping list.` (existing, unchanged)
- Lede: confirm exists per §1; if missing, add one-line lede.
- CTA: `+ CREATE PLAN →`, outlined button, links to `/meal-plans` or whichever route triggers the create-plan flow

Same CTA string as the planner empty state — that's intentional, it's the same action.

---

## §6 · Shopping — no ingredients

**Pattern:**
- Eyebrow: `§ NO INGREDIENTS YET` (existing, unchanged)
- Headline: `A week without a list.` (existing, unchanged)
- Lede: confirm exists per §1; if missing, add one-line lede.
- CTA: `OPEN PLANNER →`, outlined button, links to `/meal-plans`

Different CTA from §5 because the state is different — the plan exists, the user just hasn't added meals to it. The action is to go add meals, not create a plan.

---

## §7 · Dashboard — nothing today

**Pattern:**
- Eyebrow: `§ NOTHING TODAY` (existing, unchanged)
- Headline: `No meals logged.` (existing, unchanged — user has explicitly chosen not to change this)
- Lede: confirm exists per §1; if missing, add one-line lede.
- CTA: see decision below

**CTA decision — verify routing capability first:**

The user wants to add a meal to today. Two possible CTAs:

**Option A: `+ ADD MEAL →`** — links into the AddMeal flow with today's date and the active person prefilled.
- Use this if the AddMeal flow accepts URL params or some entry mechanism that prefills date + person. E.g. `/meal-plans/add-meal?date=2026-05-01&personId=...`

**Option B: `OPEN PLANNER →`** — links to the planner so the user navigates to today's column and adds a meal there.
- Use this if AddMeal can't be entered with prefilled date+person.

**Tasks:**
1. Check the AddMeal flow (`app/meal-plans/add-meal/page.tsx` and `app/components/AddMealSheet.tsx`).
2. Determine if it accepts date + person prefill via URL params or props.
3. Implement Option A if yes, Option B if no.
4. Note: the existing `+ Add` toolbar button on the dashboard stays — that's a separate affordance. The empty-state CTA is additive.

**Report which option applied and why.**

---

## §8 · Visual verification

After implementing each empty state, verify in the rendered app:

- The pattern reads as `§ EYEBROW / headline / lede / CTA` with consistent vertical spacing
- The CTA is outlined (`.ed-btn-outline` or equivalent), not filled black
- The CTA renders UPPERCASE (depending on §5B status)
- The CTA's `→` arrow is present and properly spaced
- On mobile, the CTA is full-width or appropriately sized; doesn't sit awkwardly

---

## Reconciliation block

This brief picks up the first structural finding from the Step 5 audit. The deferred items remain:

- Form-page headline voice (`Edit Recipe`, `New Recipe`, `Edit Pantry Item`, `New Pantry Item`)
- Dashboard stats strip empty state (no proper headline + lede + CTA structure currently)
- Landing italic density (`other`, `matrix`, `left off` cuts)
- Landing copy adjustments
- Dialog title/body voice

**Note on `Dashboard — nothing today` headline:** the audit and prior discussion considered changing `No meals logged.` to `A blank today.` to match the editorial voice elsewhere ("A blank week.", "An empty library."). The user explicitly said not to change this — `A blank today` reads weird. Keep `No meals logged.` This brief only adds the CTA, doesn't touch the headline.

---

## Verification checklist

Before declaring done:

- [ ] §1 lede audit completed and reported. Missing ledes added.
- [ ] §2 verification of `§ SELECT A PLAN` completed. Case A/B/C documented.
- [ ] If Case A: §4 implemented (`A week to plan.` + `+ CREATE PLAN →`).
- [ ] If Case B or C: empty state removed or redirect logic added; confirmed `§ NO PLAN THIS WEEK` covers remaining empty paths.
- [ ] Recipes "no matches" has `CLEAR FILTERS →` CTA. Conditional logic separates "no matches" from "no data".
- [ ] Pantry "no matches" has `CLEAR FILTERS →` CTA. Same conditional logic check.
- [ ] Shopping "no plan" has `+ CREATE PLAN →` CTA.
- [ ] Shopping "no ingredients" has `OPEN PLANNER →` CTA.
- [ ] Dashboard "nothing today" has either `+ ADD MEAL →` or `OPEN PLANNER →` based on AddMeal prefill capability. Decision documented.
- [ ] All CTAs render outlined, uppercase, with → arrow.
- [ ] Each empty state visually inspected on desktop and mobile.

---

## Files likely touched

- `app/recipes/page.tsx` (no-matches CTA + lede)
- `app/ingredients/page.tsx` (no-matches CTA + lede)
- `app/meal-plans/page.tsx` (Planner verification + possible cleanup)
- `app/shopping/page.tsx` (two empty-state CTAs + ledes)
- `app/home/page.tsx` (dashboard CTA + lede)
- `app/components/EmptyState.tsx` if a shared component exists (likely — the pattern is consistent enough that it should be componentized)
- Possibly `app/meal-plans/add-meal/page.tsx` to add date+person URL param handling if Option A applies in §7

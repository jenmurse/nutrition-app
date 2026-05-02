# Brief 5A — Copy pass quick wins

**Step:** 5 (Editorial pass and § convention)
**Status:** Ready to ship
**Depends on:** Nothing
**Blocks:** Nothing

---

## Handoff prompt (for new Claude Code session)

We're starting **Step 5 of the Good Measure design pass: the editorial and copy audit.**

Read these docs before doing anything else:
- `docs/master-plan.md` — overall plan, Step 5 is what we're working on
- `docs/design-system.md` — source of truth for visual language; §1 (typography), §6a (eyebrow labels), §6f (em accent conventions), §1d (button register rule)
- `docs/feedback_design_system_enforcement.md` — strict enforcement rules
- `docs/copy-audit.md` — the full inventory of static UI strings, organized by surface

A copy audit was done in a separate session (`step-5-copy-audit.md` artifact) covering: § convention, headline voice, em-dashes, eyebrow copy, button labels, empty states, and landing italic moments. Findings were discussed and a set of decisions made. The full audit is reference material; **this brief is the first batch of work — quick wins only.**

Subsequent briefs (5B, 5C…) will tackle the structural decisions: button register casing system-wide, empty-state CTAs, form-page headline voice, and landing italic density. Those are not in scope here.

**This brief is mechanical fixes only.** No copy rewrites, no headline changes, no decisions. The bigger questions are deliberately deferred.

---

## What this brief does

Five quick wins from the copy audit. Mostly enforcement of rules already in the design system that drifted during implementation.

---

## §1 · Enforce UPPERCASE on § eyebrows at the component level

**Rule (already in design-system.md §6a):** Eyebrow labels are DM Mono 9px UPPERCASE.

The audit found three eyebrows where the text after `§` is mixed-case in the source string:
- `§ Dashboard stats` (Dashboard, stats strip empty state)
- `§ Settings` (Settings page)
- `§ Not found` (404 page)

**Fix the system, not just the strings.** The eyebrow class (`.eyebrow`, plus any surface-specific equivalents like `.ob-eyebrow`, `.auth-eyebrow`, `.empty-eyebrow`) must include `text-transform: uppercase` so future drift is impossible. This may already be on the base class — verify, and add to any subclass that doesn't inherit it.

**Then update the source strings to UPPERCASE** (so the markup matches the rendered output and search/grep works correctly):
- `§ Dashboard stats` → `§ DASHBOARD STATS`
- `§ Settings` → `§ SETTINGS`
- `§ Not found` → `§ NOT FOUND`

**Verify before fixing:** grep the codebase for each string first. The audit doc may not be 100% accurate — if the code already says `§ DASHBOARD STATS`, no string change needed (but still confirm the class enforces uppercase).

**STOP-CHECK:** before declaring done, grep for `§ ` (section sign + space) across the codebase. Every match should be followed by ALL-CAPS text. Flag any that aren't.

---

## §2 · Remove em-dash from GettingStartedCard dismiss button

**File:** `app/components/GettingStartedCard.tsx`

Change the dismiss button label:
- Old: `Done — dismiss`
- New: `Dismiss`

Single word, no em-dash. Match the casing convention applied in §3 below if this button is DM Mono.

**Note:** The `Not in library —` em-dash in `RecipeBuilder.tsx` stays as-is. Do not change it.

---

## §3 · UPPERCASE two stray button labels

**Rule (design-system.md §1d):** Borderless DM Mono buttons render UPPERCASE.

Two violations:

**3a.** `app/components/MealPlanWeek.tsx` — the `+ Add` button (used on both mobile and desktop variants):
- Old: `+ Add`
- New: `+ ADD`

**3b.** `app/not-found.tsx` — the 404 CTA:
- Old: `Go home`
- New: `GO HOME →`

(Add the `→` to match the editorial CTA convention used elsewhere — `+ NEW RECIPE →`, `+ CREATE PLAN →`, etc.)

---

## §4 · Verify breadcrumb casing is enforced in code

**Audit listed:** `Recipe / New`, `Recipe / Edit`, `Pantry / New`, `Pantry / Edit`.

These should render DM Mono UPPERCASE (`RECIPE / NEW` etc.). Likely already correct visually because the breadcrumb class enforces `text-transform: uppercase`.

**Tasks:**
1. Find the breadcrumb component or class (likely something like `.breadcrumb`, `.form-crumb`, `.page-crumb`).
2. Confirm `text-transform: uppercase` is applied at the class level.
3. If the literal source strings are mixed-case but the class enforces uppercase, **leave the strings as-is** — the class is doing its job and the strings read more naturally in source.
4. If the class does NOT enforce uppercase (i.e. the strings only render uppercase because they were authored that way), add `text-transform: uppercase` to the class.

**Report back:** which option applied, and what (if anything) changed.

---

## §5 · Verify AddMealSheet date eyebrow casing is enforced in code

**File:** `app/components/AddMealSheet.tsx`

The audit shows the date eyebrow rendered as `§ {WEEKDAY, MONTH DAY}` — e.g. `§ THURSDAY, MAY 1`.

**Tasks:**
1. Find the date eyebrow class (likely a variant of `.eyebrow` or a sheet-specific class).
2. Confirm `text-transform: uppercase` applies.
3. If the JS is generating the date string with `toLocaleDateString` and inserting Title Case (`Thursday, May 1`), the CSS must uppercase it — don't fix this by uppercasing the JS string. CSS is the right layer.

**Report back:** confirmation that the eyebrow renders uppercase regardless of the JS-generated string casing.

---

## Reconciliation block

This brief is purely mechanical. No reconciliation against prior drafts — it's the first brief in Step 5.

**What's deliberately NOT in this brief (deferred to later 5x briefs):**
- Button register casing across the whole app (Recipes toolbar, Planner toolbar, Settings, RecipeBuilder, Recipe Detail) — needs a system-wide decision
- Empty-state CTA additions (Recipes/Pantry "no matches", Shopping no-plan, Shopping no-ingredients, Planner "nothing selected") — needs route decisions
- Form-page headline voice (`Edit Recipe`, `New Recipe`, `Edit Pantry Item`, `New Pantry Item`) — needs decision on whether to demote to breadcrumb-only or rewrite as editorial headlines
- Dashboard stats strip empty state — needs proper headline + lede + CTA structure
- Landing page italic density (cut `other`, `matrix`, `left off` italics) — needs landing copy work
- Landing page copy adjustments — separate pass

---

## Verification checklist

Before declaring done:

- [ ] Grep `§ ` across codebase. Every match has UPPERCASE text after it.
- [ ] Eyebrow class(es) include `text-transform: uppercase` so future drift is impossible.
- [ ] `app/components/GettingStartedCard.tsx` dismiss button reads `Dismiss`.
- [ ] `+ Add` in `MealPlanWeek.tsx` reads `+ ADD` (both mobile and desktop usages).
- [ ] `Go home` in `app/not-found.tsx` reads `GO HOME →`.
- [ ] Breadcrumb class enforces uppercase via CSS. Source strings can stay mixed-case if so.
- [ ] AddMealSheet date eyebrow renders UPPERCASE regardless of `toLocaleDateString` output.
- [ ] No string changes outside the ones explicitly listed above.

---

## Files likely touched

- `app/components/GettingStartedCard.tsx`
- `app/components/MealPlanWeek.tsx`
- `app/not-found.tsx`
- `app/home/page.tsx` (Dashboard stats eyebrow string, if uppercase fix needed)
- `app/settings/page.tsx` (Settings eyebrow string, if uppercase fix needed)
- `app/globals.css` (possibly — if any eyebrow class is missing `text-transform: uppercase`)

Plus verification reads on:
- `app/components/AddMealSheet.tsx`
- breadcrumb component(s) on form pages

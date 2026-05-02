# Brief 5E — Dashboard stats empty state + track fix + dialog voice

**Step:** 5 (Editorial pass and § convention)
**Status:** Ready to ship
**Depends on:** Nothing
**Blocks:** Step 5 closeout (this is the last copy-pass brief before closeout)

---

## Context (carrying over from 5A–5D)

Step 5 of the design pass is the editorial and copy audit. Briefs 5A through 5D handled mechanical fixes (eyebrow casing, button class enforcement, empty-state CTAs, form-page headlines + working-surface scale).

This brief handles the last three copy-related items in the audit:

1. Dashboard stats strip empty state — currently has eyebrow + CTA but the "headline" is doing instructional duty, not editorial duty. Drop the headline entirely; the strip is a quiet section that doesn't earn one. Keep eyebrow + lede + CTA.
2. Dashboard stats strip bottom hairline — when the strip is empty, the section-closing hairline that runs the full width below the stats doesn't render, leaving the strip unbounded.
3. Dialog title/body voice — the audit flagged inconsistencies (e.g. "Delete plan" vs "Remove this meal?") but didn't enumerate them. This brief audits and fixes.

---

## §1 · Dashboard stats empty state — three-element composition (one-off)

### Current state

After Brief 5E earlier draft was implemented:
- Eyebrow: `§ DASHBOARD STATS`
- Headline: `Choose your stats.` (Display or working scale — too prominent for the strip's position)
- Lede: `Pick three nutrition values to track here.`
- CTA: `CHOOSE STATS →`
- Container: left-rule ruled-block

### Problem observed in the rendered app

The headline is too loud for this position. The stats strip sits between the giant `Good morning, Jen Murse` greeting and the rest of the dashboard. A Display-scale headline competes with the greeting; a working-scale headline reads as orphaned mid-page.

The stats strip is a quiet section in a packed dashboard — it doesn't earn an editorial headline moment. Other empty states (planner "A blank week.", recipes "An empty library.", etc.) keep their headlines because they're full-page moments where the headline carries the room. Stats is a different case.

### Target state — drop the headline, keep three elements

```
§ DASHBOARD STATS
Pick three nutrition values to track here.
CHOOSE STATS →
```

Three elements:
- Eyebrow (unchanged)
- Lede (the existing "Pick three nutrition values to track here." copy stands on its own at body scale, no Display headline above it)
- CTA (unchanged in copy; renders UPPERCASE per 5B)

### Implementation

- Remove the `Choose your stats.` headline element entirely.
- Promote the lede to be the primary text element (still at body scale, ~13–14px DM Sans).
- Keep the existing left-rule ruled-block container — it works at this quieter scale.
- Keep eyebrow + CTA as-is.

### Why this is a one-off

This treatment applies to the dashboard stats empty state only. It's a deliberate exception driven by position:

- **Dashboard stats:** quiet inline section between the greeting and the rest of the dashboard. No headline.
- **All other empty states (planner "A blank week.", recipes "An empty library.", pantry "An empty pantry.", shopping, 404, etc.):** full-page editorial moments. Keep the four-element pattern (`§ EYEBROW / headline / lede / CTA`).

Document this exception in design-system.md alongside the empty-state pattern reference. The pattern stays the same; the dashboard stats slot is the noted exception.

### Visual verification

After implementation:
- Stats strip empty state reads as eyebrow + lede + CTA, top to bottom
- The left rule of the ruled-block runs the full height
- The text doesn't compete with the hero greeting above it
- Other empty states (planner, recipes, pantry, shopping, 404) are unchanged
- On mobile, the composition stacks correctly
- Confirm the populated state of the stats strip is unaffected (this brief only changes the empty composition)

---

## §2 · Dashboard stats strip — missing bottom hairline in empty state

### The bug

The dashboard stats strip is a horizontal section that's closed off at the bottom by a continuous `--rule` hairline running the full width of the page. This hairline separates the strip from the next section below ("TODAY'S KEY MEALS" or "THIS WEEK").

In the populated state (Image 2), this bottom hairline renders correctly. In the empty state (Image 1), the bottom hairline is missing — the strip dissolves into whitespace rather than being closed off as a section.

The unfilled progress tracks under each stat value (the per-stat thin lines) actually do render correctly in both states. The issue is only the strip-level bottom hairline.

### Root cause (likely)

Three possibilities; verify which applies:

1. **The bottom hairline is rendered on the populated stats container only.** The empty-state composition is rendered in a different wrapper that doesn't include the closing hairline.
2. **The empty-state component replaces the entire strip subtree** (rather than rendering inside the strip's existing layout), losing the structural hairline that lives on the strip wrapper.
3. **The hairline is on `border-bottom` of the last child element** (e.g. one of the stat cells), which doesn't exist in the empty state because there are no stat cells.

### Fix

The bottom hairline is a **section close** — it belongs to the strip itself, not to the contents inside it. It must render in both populated and empty states.

Move the `border-bottom: 1px solid var(--rule)` (or equivalent) onto the strip's outer wrapper element so it renders regardless of inner state. The empty-state composition should be a child of that wrapper, not a sibling that replaces it.

### Implementation

- Find the dashboard stats strip in `app/home/page.tsx` or its child component.
- Identify which element currently renders the bottom hairline in the populated state. Document the current structure.
- Restructure so the strip's outer wrapper carries the hairline. Both populated and empty states render as children of that wrapper.
- The empty-state composition (eyebrow + lede + CTA from §1) lives inside the wrapper, not in place of it.

### Visual verification

- Empty state: the bottom hairline renders the full width of the strip, closing the section.
- Populated state: the bottom hairline still renders correctly (no regression).
- The hairline is `1px solid var(--rule)` (verify against current populated-state value — match exactly).
- The hairline is the same visual weight in both states.
- Mobile and desktop both verified.

---

## §3 · Dialog voice rule + audit

### Lock the rule in design-system.md

Add a new sub-section to design-system.md under §5h (Modal / dialog) or as its own §5j:

> **Dialog voice:**
> - **Title:** sentence case, ends with `?` for confirmations or `.` for statements. Include the record name in quotes when available: `Delete "Almond Croissant Bars"?`. Generic fallback when no name: `Delete this recipe?`.
> - **Body:** sentence case, brief, factual. `This can't be undone.` is the canonical short body for destructive actions. Skip the body entirely if no extra context is needed.
> - **Confirm label:** single verb where possible (`DELETE`, `REMOVE`, `SAVE`). Renders UPPERCASE via the button class.
> - **Cancel label:** `CANCEL` (default ghost button).

### Audit every `dialog.confirm` call

Grep the codebase for `dialog.confirm` and produce a list of every instance with:
- File and line number
- Current title string
- Current body string (if any)
- Current confirmLabel string
- Whether it's marked `danger: true`

### Known fixes

From the audit so far:

| Surface | Current | Fix |
|---|---|---|
| MealPlanWeek | `Remove this meal?` / `This can't be undone.` / `Remove` | Already correct. No change. |
| Planner — delete plan | `Delete plan` (title only, no record name, no question mark) | Change to `Delete this plan?` with body `This can't be undone.` and confirmLabel `Delete`. If the plan has a name available, use `Delete "${planName}"?` instead. |
| Settings — reset goals | (audit needed — not in copy-audit) | Verify pattern. Likely `Reset goals to defaults?` with body explaining what's being reset. |
| Settings — remove member | (audit needed) | Verify pattern. Likely `Remove "${memberName}"?` with body explaining what removal does. |
| Ingredients — delete | (from `app/ingredients/page.tsx` "Confirm delete ingredient") | Verify and fix to pattern. |

### Apply the rule everywhere

For each `dialog.confirm` call surfaced by the grep:
- Verify title is sentence case, ends with `?` (confirms) or `.` (statements)
- Verify title includes record name in quotes when one is available
- Verify body (if present) is sentence case and factual
- Verify confirmLabel is a single verb
- Fix any that don't match. Report each fix.

### STOP-CHECK

- Confirm no `dialog.confirm` was migrated to a different signature (e.g. the legacy single-string form). All calls must use the structured object signature per `feedback_design_system_enforcement.md` §4.
- Confirm no dialog title was reduced to fewer than the required parts (e.g. removing the question mark to make it look "cleaner").

---

## Reconciliation block

This brief closes out the copy work in Step 5. After it ships, the remaining Step 5 items are:

- Landing italic density (Step 6 territory; can ship in 5 or move to 6)
- Landing copy adjustments (Step 6 territory; user has separate edits)
- Step 5 closeout — update master-plan.md decision log, mark Step 5 complete

Both landing items are deliberately deferred from this brief because they touch the marketing site, not the app, and benefit from being handled together with the italic typeface decision in Step 6.

---

## Verification checklist

Before declaring done:

- [ ] §1: Dashboard stats empty state renders three elements (eyebrow + lede + CTA). No headline. Lede is `Pick three nutrition values to track here.` All lowercase.
- [ ] §1: Lede renders at body scale (no Display or working-surface heading scale on this string).
- [ ] §1: Existing left-rule container retained around the composition (verify in code; if container is misbehaving, document).
- [ ] §1: Other empty states (planner "A blank week.", recipes "An empty library.", pantry, shopping, 404) unchanged — this is a one-off for the dashboard stats slot.
- [ ] §1: Mobile and desktop both verified.
- [ ] §2: Stats strip bottom hairline renders in both empty and populated states. Width matches across states. No regression on populated-state rendering.
- [ ] §3: design-system.md updated with the dialog voice rule.
- [ ] §3: Grep audit of `dialog.confirm` produced and reported. Every instance documented.
- [ ] §3: All non-conforming dialogs fixed. Each fix reported with file path and before/after strings.
- [ ] §3: Dialog signature is the structured object form everywhere (no legacy single-string calls).

---

## Files likely touched

- `app/home/page.tsx` (stats empty state composition + strip-bottom hairline fix)
- `app/components/DashboardStats.tsx` if it exists (stats strip wrapper + hairline placement)
- `app/meal-plans/page.tsx` (Delete plan dialog)
- `app/ingredients/page.tsx` (delete ingredient dialog)
- `app/settings/page.tsx` (reset goals, remove member dialogs)
- Any other file surfaced by the `dialog.confirm` grep
- `docs/design-system.md` (dialog voice rule)
- `app/globals.css` (possibly — if the strip-bottom hairline fix requires CSS structural changes)

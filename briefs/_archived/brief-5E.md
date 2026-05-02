# Brief 5E — Dashboard stats empty state + track fix + dialog voice

**Step:** 5 (Editorial pass and § convention)
**Status:** Ready to ship
**Depends on:** Nothing
**Blocks:** Step 5 closeout (this is the last copy-pass brief before closeout)

---

## Context (carrying over from 5A–5D)

Step 5 of the design pass is the editorial and copy audit. Briefs 5A through 5D handled mechanical fixes (eyebrow casing, button class enforcement, empty-state CTAs, form-page headlines + working-surface scale).

This brief handles the last three copy-related items in the audit:

1. Dashboard stats strip empty state — currently has eyebrow + CTA but the "headline" is doing instructional duty, not editorial duty. Needs a proper four-element composition.
2. Dashboard stats track render bug — when a stat has 0 value, the bottom rule (the unfilled progress track) doesn't render, leaving the stat visually un-anchored.
3. Dialog title/body voice — the audit flagged inconsistencies (e.g. "Delete plan" vs "Remove this meal?") but didn't enumerate them. This brief audits and fixes.

---

## §1 · Dashboard stats empty state — four-element composition

### Current state

- Eyebrow: `§ DASHBOARD STATS` (correct, from 5A)
- "Headline": `Choose 3 stats to track here.` (instructional, not editorial)
- CTA: `CHOOSE STATS →` (correct)
- Container: left-rule ruled-block (correct, per design-system.md §6d)

### Target state

```
§ DASHBOARD STATS
Choose your stats.
Pick three nutrition values to track here.
CHOOSE STATS →
```

Four elements:
- Eyebrow (unchanged)
- Headline: lowercase imperative ending in period — matches `Pick your color.`, `Welcome back.`, `Add a breakfast.`
- Lede: one short line explaining the strip's purpose
- CTA (unchanged in copy; renders UPPERCASE per 5B)

### Implementation

- Find the dashboard stats empty-state component (likely in `app/home/page.tsx` or a child component).
- Add the new headline element above the existing instructional copy.
- Convert the existing instructional copy into the lede position.
- Verify the ruled-block container still wraps the full composition (left rule should run the full height of the eyebrow + headline + lede + CTA).
- Apply the form-title scale from 5D to the headline (working-surface scale, ~22–32px clamp). The headline should not render at Display scale — this is a working surface, not an editorial bookend.

### Visual verification

After implementation:
- The composition reads as a unit: eyebrow → headline → lede → CTA, top to bottom
- The left rule of the ruled-block runs the full height
- The headline scale matches the working-surface scale established in 5D
- On mobile, the composition stacks correctly without breaking the rule
- The empty state is visually distinguishable from the populated state (which shows three stat values with progress tracks)

---

## §2 · Dashboard stats track render fix

### The bug

When a stat has a value of 0, the bottom rule (the unfilled progress track) doesn't render. The screenshot shows three stats reading `0` / `0g` / `0g` with empty space below where a track line should be. The populated state (real values) renders the track correctly: a fill portion in `--fg` with the rest in `--rule` grey.

### Root cause (likely)

Two possibilities; verify which:

1. **The track is conditionally rendered** — the component only draws the track when value > 0, with the assumption that "no value = no bar." This is wrong; the track is structural and should always render.
2. **The track is rendered via the fill element's background, not as a separate element** — at 0% width, the fill renders nothing, and there's no separate track element to show the unfilled portion.

### Fix

Make the track always render at full width in `--rule`. Make the fill render on top at whatever percentage of the track. Even at 0%, the track is still there.

Conceptually:

```
┌──────────────────────────────────┐  ← track (always full width, --rule)
│████████░░░░░░░░░░░░░░░░░░░░░░░░░░│  ← fill (variable width, --fg)
└──────────────────────────────────┘
```

At 0% value:

```
┌──────────────────────────────────┐  ← track still renders
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  ← fill is 0 width (invisible)
└──────────────────────────────────┘
```

### Implementation

- Find the stats progress bar component (likely in the dashboard stats strip — `app/home/page.tsx` or a child like `DashboardStats.tsx`).
- Verify how the track is currently rendered. Document the current approach.
- Restructure so the track is always present as its own element, and the fill is layered on top.
- Maintain the existing semantic color rule (per design-system.md §2e): track is `--rule`, fill is `--fg` for neutral, `--err` for over-cap, `--ok` for met-min-only-target.

### Visual verification

- A stat with value 0 shows the track at full width in `--rule` grey, with no visible fill.
- A stat with value above its goal shows the full track plus a `--fg` fill portion.
- A stat over its high goal shows the full track plus an `--err` fill portion.
- A stat at or above a min-only goal shows the full track plus an `--ok` fill portion.
- The track is the same visual weight (1px or 2px, whatever the current implementation) regardless of fill state.

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

- [ ] §1: Dashboard stats empty state renders four elements (eyebrow + headline + lede + CTA). Headline is `Choose your stats.` Lede is `Pick three nutrition values to track here.` Both lowercase, both end with period.
- [ ] §1: Headline scale matches working-surface scale established in 5D.
- [ ] §1: Left-rule container wraps the full composition.
- [ ] §1: Mobile and desktop both verified.
- [ ] §2: Stats track renders at full width regardless of value. Verified at 0, mid, and over-goal states.
- [ ] §2: Existing semantic color rule preserved (track is `--rule`; fill is `--fg` / `--err` / `--ok` per the existing logic).
- [ ] §3: design-system.md updated with the dialog voice rule.
- [ ] §3: Grep audit of `dialog.confirm` produced and reported. Every instance documented.
- [ ] §3: All non-conforming dialogs fixed. Each fix reported with file path and before/after strings.
- [ ] §3: Dialog signature is the structured object form everywhere (no legacy single-string calls).

---

## Files likely touched

- `app/home/page.tsx` (stats empty state composition + possibly track fix)
- `app/components/DashboardStats.tsx` if it exists (stats strip + track render)
- `app/meal-plans/page.tsx` (Delete plan dialog)
- `app/ingredients/page.tsx` (delete ingredient dialog)
- `app/settings/page.tsx` (reset goals, remove member dialogs)
- Any other file surfaced by the `dialog.confirm` grep
- `docs/design-system.md` (dialog voice rule)
- `app/globals.css` (possibly — if the stats track render fix requires CSS structural changes)

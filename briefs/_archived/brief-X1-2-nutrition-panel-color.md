# BRIEF X1-2 — Nutrition panel semantic color audit

**Status:** Backlog. Originally filed during 3B verification; revised April 30, 2026.
**Part of:** Future design pass, post-Step 3.
**Scope:** Audit + design exploration + implementation. Two-stage. The nutrition panel that appears on Planner (right-side slide-out) and Dashboard (stats strip), plus any other surface that renders nutrition bars + status callouts.
**Depends on:** Step 3 fully landed (token system, register migration, layout fixes). This brief refines color usage *within* the working register, not the register itself.
**Blocks:** Nothing.
**Supersedes:** brief-X1-nutrition-panel-color.md (original draft, written when the white working register was new).

---

## Why this brief

The nutrition panel uses three semantic color tokens (`--ok` green, `--warn` orange/amber, `--err` red) plus their tinted variants (`--ok-l`, `--warn-l`, `--err-l`). On the working register's white surface, the saturated semantic colors render slightly louder than they did on the previous beige — and the panel was already crowded with color before the migration.

Specific concerns surfaced during 3B verification and remain relevant:

1. **Three semantic colors stacking on adjacent rows.** The macro bars (Fat, Saturated Fat, Sodium, Carbs, Sugar, Protein, Fiber) each fill with a status color based on their value. Within one panel view, all three semantic colors can appear simultaneously across seven adjacent bars.

2. **Status callouts use tinted backgrounds that read similarly.** The `CALORIES -164KCAL BELOW MIN` (warn-l peachy-orange) sits next to `FAT +9G OVER LIMIT` (err-l pink-red) sits next to `PROTEIN -17G BELOW MIN` (warn-l peachy-orange again). The two warn-l rows and one err-l row are adjacent, and the hues are close enough that they read as variants of each other rather than as distinct severities.

3. **"Below min" vs. "over limit" use the same severity treatment but represent different kinds of problems.** Being below protein minimum is a target-not-met situation (informational, actionable). Being over fat limit is a constraint-violated situation (warning, may want to swap). Currently both render with the same warning-level visual weight.

4. **Saturated reds and greens render louder on white than on beige.** The white surface does not absorb saturation the way beige did. Deep `--err` red on white can read as alarming when the underlying state is more "heads up" than "alarm."

## What's wrong now

Looking at the planner nutrition slide-out (right panel) on the working register:

- Multiple progress bars filled with saturated `--ok` green, `--warn` amber, `--err` red — sometimes all three visible in one screenful.
- Three status callout rows using `--warn-l` (peachy-orange) and `--err-l` (pink-red) tinted backgrounds, with the visual difference between the two tints being smaller than the semantic difference between "warning" and "error."
- "Below min" warnings render with the same severity treatment as "over limit" warnings, even though they communicate different kinds of state.
- The dot at the start of each callout row is `--warn` or `--err` colored — adds another saturation point per row.

Looking at the dashboard stats strip:
- Each of the 3 user-configurable stats has its own 2px progress bar.
- Same semantic color logic likely applies (`--err` when over limit, etc.) — confirm during audit phase.
- At a smaller scale, the saturation issue is less acute, but the consistency question still applies: whatever rule governs the planner panel should govern the dashboard strip.

## Two-stage approach

This brief is **not yet implementable**. It needs design work first.

**Stage 1 — Audit + design exploration.**

Walk through every surface that currently uses semantic colors for nutrition data. Document the rules in use (when does a bar go red? when does a callout appear? what triggers warn vs err?). Survey the four directions below (and any others that emerge). Pick a direction. Lock the semantic-color policy.

Output of Stage 1 is a written policy: "These are the states the panel communicates. These are the colors used. Here's the rule for each."

**Stage 2 — Implementation brief.**

Based on the locked policy, write a real implementation brief with specific CSS changes, component updates, and verification steps. Then ship.

The reason for the two stages: this isn't a precision fix or a token swap. It's a question of *what the panel should communicate*, and the answer needs design judgment, not just code changes. Trying to write an implementation brief without resolving the policy first leads to half-committed work.

## Stage 1 — Directions to evaluate

### Direction A — Reduce semantic saturation on bars

Treat the bars as primarily neutral data visualization, with semantic color reserved for status callouts only.

- Filled bar portion: `--fg` ink (or a slightly lighter neutral)
- Unfilled bar portion: `--rule` neutral
- Bar fills `--err` red **only** when the value is over the strict limit (the over-limit case)
- Bar fills `--warn` amber **only** when approaching the limit (e.g. 90%+ of max)
- Bar stays neutral ink at all other states, including "under minimum"

This approach quiets the bars and lets the callout rows below carry the semantic load.

### Direction B — Differentiate "below min" from "over limit"

Today both render with warning-level treatment. Possible split:

- **Over limit / over max** → `--err` (red). Constraint violated. User probably wants to act.
- **Approaching limit (90%+)** → `--warn` (amber). Heads up. Could ignore.
- **Below minimum / target not met** → `--muted` neutral with a directional indicator. Informational. Not a warning per se. The label might be `+17g to target` rather than `-17g below min` to reframe the action.

This separates the two kinds of state the user is actually in: "I have too much of X" vs "I need more Y to hit my target." Different semantic weight, different visual treatment.

### Direction C — Reduce tinted background usage

Use semantic tints (`--ok-l`, `--warn-l`, `--err-l`) sparingly. Status callouts could become text-only ruled rows with a colored dot and inline text, no background fill. The dot does the semantic work; the text does the content; no background tint needed.

```
● CALORIES    -164kcal below min
● FAT         +9g over limit
● PROTEIN     -17g below min
```

With dots colored by semantic and text in `--fg` or `--muted` per severity. Removes three tinted background rectangles from one screenful.

### Direction D — Combine all three

Quiet the bars (Direction A), differentiate severities (Direction B), reduce tinted backgrounds (Direction C). The most opinionated direction; the cleanest result on the working register; the biggest behavioral change for users who currently rely on the existing color cues.

## Decisions Stage 1 needs to produce

Before this becomes implementable, the audit needs a position on:

1. **What states does the panel need to communicate?** (e.g. ok, approaching limit, over limit, below min, hit target — five states? Three? More?)
2. **What's the minimum number of semantic colors needed to communicate them?** (Two? Three? Could neutral-plus-one work?)
3. **What's the role of tinted backgrounds vs. text-only ruled rows?**
4. **Is there a hierarchy among the warning types?** (Over-limit louder than below-min? Or equal?)
5. **Does the dashboard stats strip follow the same rule, or does the smaller scale warrant a different treatment?**
6. **What's the `--ok` green for now?** Currently used for "in target range" but the panel doesn't really celebrate hitting target — it just stops warning. Is `--ok` actually doing work, or is its absence sufficient?

These need design judgment, not just implementation guidance.

## Surfaces in scope

Confirm during audit:

- **Planner nutrition slide-out** (the right-side panel opened via NUTRITION ›). The most complex surface. Multiple bars + multiple callout rows.
- **Dashboard stats strip** (per design-system.md §8c). Three user-configurable stats, each with a 2px progress bar. Same semantic logic likely applies but at smaller scale.
- **Recipe detail nutrition panel** (right column on `/recipes/[id]`). Has bars showing per-serving values vs. daily goals. Confirm whether this uses the same semantic logic — if so, in scope. If not, file separately.
- **Planner day-kcal progress bars** (under each day number in the week grid). Uses `--err` for over-goal. In scope.
- **Anywhere else the audit surfaces.** Settings → Daily Goals page may have preview bars; meal entries may show nutrient pills with semantic color; etc.

## Files most likely affected (Stage 2)

- The nutrition panel component (planner slide-out)
- The dashboard stats strip component
- The recipe detail nutrition panel component (if in scope)
- The planner day-kcal progress bar (if in scope)
- `globals.css` — semantic token usage in nutrition-bar classes, callout-row classes
- Any utility that determines which semantic color a bar renders with based on value (likely a `getNutrientStatus()` or similar helper)

## Verify before declaring done (Stage 2)

To be defined when Stage 2 brief is written. At minimum:

- The panel reads as quieter than it did before the audit, on white surfaces.
- Different severities are visually distinguishable from each other (not just from neutral).
- A user scanning the panel can identify which macros need attention without having to read every label.
- The semantic logic is documented in `design-system.md` (when does a bar go red? when does a callout appear? what's the rule for warn vs err?).
- Dashboard stats strip and planner panel use consistent logic at their respective scales.

## Out of scope

- The nutrition panel's information architecture — what data is shown, in what order, in what units. Unchanged.
- The slide-out animation or trigger interaction. Unchanged.
- The shopping list checkbox states (those use `--muted` neutral; not affected).
- Onboarding goal-setting screens (different surface, different color usage).
- The eight person theme colors (identity). Unrelated and unaffected.

## Notes for the next person

- This brief was filed during 3B verification because the white surface made the existing color logic feel busier than it had on beige. The underlying logic isn't broken, but it's worth a deliberate audit now that the substrate has changed.
- The four directions above are starting points for design discussion, not a menu to pick from. The right answer might be a combination, or something not listed.
- After Stage 2 lands, document the locked semantic-color rules in `design-system.md` §2. Currently the system has tokens (§2a) and a high-level rule that "red and green stay semantic" (§2b), but no clear policy on *when* each is used in practice.
- The original X1 brief was filed in late April 2026. By the time someone picks this up, multiple Step 3 briefs will have shipped — verify nothing in the nutrition panel has been touched in the meantime that resolves the original concerns.

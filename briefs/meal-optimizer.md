# Day / Template Optimizer — Spec (v1)

> **Build status (June 2026): IN PROGRESS.** Engine, endpoint, launcher hub, and
> optimizer surface are written and typecheck clean; the pure engine is
> unit-verified. Not yet exercised against a live authenticated session.
> Files: `lib/mealOptimizer.ts`, `app/api/meal-plans/[id]/optimize/route.ts`,
> `app/planner/DayOptimizer.tsx`, `DayOverflowMenu` in `app/planner/page.tsx`,
> `.opt-*` CSS in `app/globals.css`.
> Known deviations: (1) mobile optimizer is its own responsive sheet/full-screen
> overlay launched from the hub, not rendered inside the launcher sheet DOM;
> (2) Add is capped at one extra side/snack/beverage per day in v1.

Status: **Spec.** Math-based replacement for the
highest-value AI use case (day/plan nutrition optimization). $0 marginal cost,
deterministic, globally optimal at this library's scale. Works everywhere
including mobile (no MCP dependency).

Related context: the in-app AI chat is a candidate for removal (token cost). This
optimizer covers chat's single highest-value job natively. MCP + Claude Desktop
remains the path for genuinely AI-only work (recipe authoring, natural-language
recipe editing). See `docs/CHAT-ARCHITECTURE.md` and `docs/COSTS.md`.

**Sequencing decision (locked):** keep the in-app chat in place until this
optimizer is built, shipped, and proven stable. Only then revisit removing chat.
Do not pull chat ahead of having a working, dependable native replacement.

---

## 1. Purpose

Given a day of meals and 1–3 nutrition targets, find the combination of recipe
**swaps, removals, and (optional) additions** that best hits those targets — by
exhaustively evaluating the recipe library, drawing favorites first, respecting
meal types, and keeping any meals the user has pinned.

This optimizes the **interlock between meals to hit day totals.** It does not
change portions, invent recipes, or judge flavor.

---

## 2. Core concepts

| Term | Meaning |
|---|---|
| **Lane** | A meal-type grouping for the day (Breakfast, Lunch, Dinner, Snack, Side, Dessert, Beverage). A lane holds 0..N meals. |
| **Position** | One meal slot inside a lane. The optimizer chooses how many positions a lane has (within bounds) and which recipe fills each. |
| **Locked meal** | User-pinned. Contributes its fixed nutrition to the day total but is never changed. Counts toward its lane's floor. (The "always a shake for breakfast" case.) |
| **Swappable position** | Eligible for optimization. Its current recipe is *also* a candidate, so "no change" is always allowed. Can also resolve to "(none)" when Remove is enabled. |
| **Candidate set** | Recipes eligible to fill a position — filtered by lane's meal type, ranked favorites-first. |
| **Target nutrient** | One of 1–3 nutrients being optimized for. The objective. |
| **Cap guard** | Every *other* goal with a `highGoal` acts as a soft constraint, so fixing one nutrient can't quietly blow another. |

---

## 3. The lane model (swap + remove + add)

The day is a set of meal-type lanes. The optimizer chooses, per lane, **how many
meals** (within a count range) and **which recipes** fill them. The three
operations fall out of this one model:

- **Swap** — lane count stays the same; the recipe changes. The base case.
- **Remove / prune** — a position resolves to "(none)". (Day with two snacks →
  keep one, drop one.)
- **Add** — an additive lane gains one extra position. (Dinner with no side →
  Side lane goes 0→1, e.g. pan-seared tilapia + miso lentils.)

Because the scoring decides, structurally different days compete directly. A day
with dinner + side is evaluated **both** as "keep the side, optimize both" and
"drop the side, put a more robust recipe in dinner" — whichever scores better
wins, and the two surface as different variations the user picks between.
"Closest to today" preserves structure; "Best balance" may restructure.

### Scope controls

| Control | Effect | Default |
|---|---|---|
| **Swap** | replace within a lane | always on |
| **Remove** | a position may resolve to "(none)" | **on** |
| **Add** | one additive lane may gain +1 position | **opt-in toggle** |
| **Lock** (per meal) | force-kept; counts toward lane floor | user-set |

### Guardrails

- **Add applies only to "additive" lanes** — Side, Snack, Beverage. The optimizer
  never proposes a second Breakfast / Lunch / Dinner.
- **Add is capped at +1 per lane** (and a small total-per-day cap) so it can't
  stack meals to crank a target.
- **Variety:** the same recipe may not appear twice in a proposed day (hard rule).

---

## 4. Inputs

```
optimize(
  source:        { planId, date }  OR  { templateId }
  personId:      whose goals apply
  targets:       [nutrientId]   (1–3, ordered — first = primary)
  scope:         { swap: true, remove: true, add: false }
  mealLocks:     { mealId: locked }   (force-kept meals)
  candidatePool: favoritesFirst (default) | wholeLibrary
)
```

- **Default lock state:** all recipe meals swappable; the user locks what to keep.
- **Auto-locked, always (v1):**
  - Eating-out meals (no nutrition to optimize).
  - Ingredient-as-meal entries (eating a pantry item directly). *v2: make these
    swappable.*
  - Any position with no valid candidates of its lane's meal type.

  Auto-locked meals are shown as locked so the day total still accounts for them.

---

## 5. Candidate model

For each **swappable** position:

1. **Meal-type filter** — candidates = recipes whose category matches the lane's
   type. Breakfast positions draw only from Breakfast recipes. No cross-type swaps.
2. **Favorites-first** — default pool is the person's favorited recipes of that
   type. If a lane has too few favorites (threshold, e.g. <3) or the user flips to
   *whole library*, expand to all recipes of that type.
3. **Include current** — the recipe currently in the position is always a
   candidate, so the optimizer can legitimately leave it.
4. **Include "(none)"** when Remove is enabled — empties the position (prune).
5. **Data-quality filter** — exclude any recipe missing nutrition data for a
   *target* nutrient (the added-sugar null-poisoning case). You can't optimize
   what you can't measure.

---

## 6. Objective function

Each target nutrient's *direction* is derived from its goal type (per
design-system §2e), not chosen by the user:

| Goal type | Direction | Example |
|---|---|---|
| `highGoal` only (cap) | minimize / stay under | sodium, sat fat, added sugar |
| `lowGoal` only (minimum) | reach target | fiber, protein |
| both (band) | land inside [low, high] | protein 105–120g; calories if set as a band |

**Calories note:** obeys the same rule. If calorie goals are stored as a band
(low + high), the user gets "land near" behavior automatically; if only a cap,
"go under." No special-casing — verify the goal model at build time.

**Per-nutrient penalty** (normalized by the goal so different scales compare —
sodium mg vs fiber g):

```
cap (H):        below  → v/H                 (lower is better, for targets)
                over   → 1 + λ·(v−H)/H        (λ large)

minimum (L):    at/above → 0                 (meeting is the goal; no megadose reward)
                below    → (L−v)/L

band (L,H):     inside → 0
                below  → (L−v)/L
                above  → (v−H)/H
```

**Total score (lower = better):**

```
score =  Σ over targets    w_t · penalty_t        ← objective (1–3 nutrients)
       + Σ over other caps  C · overage_t          ← cap guard (heavy weight)
       + favorites tiebreak                        ← see §8
```

- **Equal weights** across targets (`w_t` equal). The user never sets weights;
  the variations express priority differences instead (see §8).
- **Cap guard** is a heavy *soft* constraint, not a hard filter — if the day is
  structurally over a cap no matter what, return the least-bad option and show it
  rather than returning nothing.
- Locked meals + chosen candidates are summed for every nutrient before scoring,
  so the optimizer always reasons about the **whole day total**, pinned meals
  included.

---

## 7. Search algorithm

- **Exhaustive** across the product of every lane's (count × candidate) options.
  At this scale (2–4 lanes × ~10–30 candidates) this is thousands to low
  hundred-thousands of evaluations — milliseconds.
- **Multi-meal lanes** (e.g. snacks, choose *k* of *n*) add the only combinatorial
  wrinkle; *n* is tiny, so still bounded.
- **Pruning fallback** if the space exceeds a threshold (~200k combinations, e.g.
  user unlocks everything with Add on against a large library): reduce each
  position to its top ~20 candidates by *solo* contribution toward the targets,
  then exhaust. Near-optimal, still fast. Log when pruning kicks in so the result
  is honest about being pruned.
- **Server-side.** The server already holds full recipe nutrition (the client
  lazy-loads it). New pure-function module, sibling to `lib/smartMealAnalysis.ts`,
  exposed via one endpoint. No AI dependency, no solver dependency.

---

## 8. Variation selection

Brute force scores *every* combination, so surfacing options is a selection
problem. Show up to 3, meaningfully distinct:

1. **Best balance** — global minimum of the equal-weight objective. Headline rec.
2. **Best for [primary target]** — minimum when the first-listed target is
   weighted highest. If the user picked only one target, this becomes "best for
   that nutrient ignoring cap guard" vs #1's "best while respecting caps."
3. **Closest to today** — among combinations that improve the objective past a
   threshold, the one with the fewest changes (fewest swaps/removes/adds). For
   people who don't want a full overhaul; tends to preserve day structure.

Rules:
- The three must be distinct recipe sets — fall through to next-best on collision.
- The **current day is always shown as the baseline** so every variation displays
  deltas against it.

**Favorites** stay *out* of the objective math (so they never override a real
nutritional win) and act as (a) the default candidate pool and (b) a tiebreaker
among near-equal scores — prefer the option using more favorites.

> *Generalization (note, not v1):* with 2–3 targets the principled variation set
> is the **Pareto frontier** — each option best on a different tradeoff. The three
> labels above are a friendly projection. Start with the labels; the frontier is
> there if richer variation is wanted later.

---

## 9. Output

Per variation:

- The recipe in each position, marked **changed / unchanged / locked / added /
  removed**.
- For each **target**: `current → proposed` with §2e status color (red over cap,
  green met-minimum, neutral otherwise).
- For each **other cap**: shown too, so the user can confirm nothing broke.
- A **templated one-line summary** from the numbers, no AI prose:
  *"Sodium −420mg · Protein +18g · 2 swaps, 1 added."*
- Change count.

Actions: **Apply** (writes via the existing meal-plan meal endpoints, same
confirm pattern as the chat's confirm-card) → then the existing **Save as
template** affordance. Re-optimizing a template uses the same engine with the
template's items as the source.

---

## 10. Edge cases

| Case | Behavior |
|---|---|
| Recipe missing a target nutrient's data | Excluded from candidacy. |
| Position has no valid same-type candidates | Auto-locked; noted in output. |
| All meals locked | "Nothing to optimize — unlock a meal to begin." |
| No improvement possible | "This day is already optimal for these goals." |
| Eating-out / ingredient meals present | Auto-locked (v1), counted correctly (eating-out = 0 nutrition). |
| Search space too large | Prune to top-K per position; flag that it was pruned. |

---

## 11. Non-goals (v1, deliberate)

- **No portion / serving changes.** All meals = 1 serving. Not touching how a
  recipe is divvied up — that's not the point of this feature.
- **No recipe creation or ingredient editing** — stays MCP/AI.
- **No cross-meal-type swaps.**
- **No whole-week optimization** — one day at a time. (Natural v2.)
- **No swapping ingredient-as-meal entries** — auto-locked in v1; v2 candidate.

---

## 12. Reuse vs. new

- **Reuse:** per-serving nutrition (recipe detail), day-total aggregation
  (`/api/meal-plans/[id]/day-analysis`), §2e status colors, meal-write endpoints
  (Apply), save-as-template flow.
- **New:** one `POST .../optimize` endpoint + a pure-function scoring/search
  module (testable in isolation; no AI, no solver dependency).

---

## 13. Open decisions (mockup-phase, not blockers)

1. **Add: opt-in or on by default?** Lean: opt-in.
2. **Which lanes are "additive"?** Lean: Side / Snack / Beverage.
3. **Calorie goal storage** — confirm cap vs band against the live goal model so
   the penalty shape is right. (Verify at build; no user decision needed.)
4. **⋯ menu crowding** — RESOLVED (both platforms): the day `⋯` becomes a
   **launcher hub** — every action (Optimize / Apply a template / Save / Manage) is
   an equal row that pushes its own screen. The apply-template list moves out of
   the menu into its own screen, so nothing competes and nothing gets lost. Desktop
   mirrors this. Desktop launcher popover mocked. **2-tap apply-template accepted**
   — the cleaner multi-action launcher is worth the extra tap.
5. **Results-screen color semantics** — the variations scoreboard wants
   "target satisfied = green / violated = red." This *extends* §2e, which treats
   under-cap as neutral (green only for met-minimum-no-cap). Decision pending:
   strict §2e (under-cap neutral) vs. scoreboard semantics (under-cap green).

## 13a. Locked decisions

- **Desktop:** mirrors the launcher model — the day `⋯` **popover** becomes the
  same launcher hub (Optimize / Apply a template / Save / Manage), each opening its
  own surface. "Optimize this day" opens the **full-screen editorial surface**
  (Compare/Shopping family) — enters from right, single bordered `✕` to close (no
  back/logo chrome), steps navigate in place. NOT a side sheet — the
  variations-review step is a side-by-side 3-column comparison that needs Compare's
  width. (Apply/Save/Manage open their existing desktop dialogs.) Desktop `⋯`
  launcher popover mocked in `mockup-meal-optimizer-desktop-launcher.html` —
  reuses the real `.mx-day-menu` popover shell with launcher rows.
- **The day `⋯` becomes a launcher hub (both platforms).** Previously the `⋯`
  sheet/popover mixed a launcher action (Optimize is one button starting a flow)
  with an inline workflow (the whole apply-template list). That hodgepodge is
  resolved: `⋯` is now a short, scannable menu where **every** day action is a row
  that pushes into its own screen —
  - Optimize this day → (picker → results)
  - Apply a template → (its own search + list screen; was inline)
  - Save as template → (existing save dialog)
  - Manage templates → (existing manage screen)

  All rows get equal weight (no filled-black hero bar — that was needed only while
  Optimize competed with an inline list; on a level launcher it's unnecessary).
  Optimize is ordered first. Cost accepted: applying a template is now 2 taps
  (open `⋯` → Apply) instead of 1 inline list — worth it for the clean model.
- **Mobile container:** the existing day `⋯` **bottom sheet** with an in-sheet
  navigation stack (iOS pushed-view pattern) — NOT a separate full-screen surface,
  NOT a ✕. Hub root shows the launcher rows; each pushes a screen that slides in
  from the right.
  - **Step nav:** a top back affordance only — `‹ Back` (returns to hub or prior
    step) / `‹ Adjust options` (results → picker). **No ✕** — mobile sheets dismiss
    by tapping the scrim / swiping down, per the app's sheet convention.
- **Two steps, one surface:** step 1 picker → Optimize → step 2 variations-review
  (both platforms).
- **Variation selection treatment:** the selected card/column turns its **border
  black** (grey → ink, single edge). NOT an inset ring inside the grey border —
  that double-lines. (Compare's `is-selected` inset ring looks clean only because
  its grid cells have no per-card border; bordered cards/columns need the
  border-color swap with collapsing borders.) Plus the filled circular ✓.
- **Keep affordance:** subtle padlock per meal row (faint outline = swappable,
  solid ink = kept), not a checkbox. Section helper carries the explanation.
- **Targets:** multi-select chips, hard cap of 3; helper line is a live counter
  (`N of 3 selected`); remaining chips disable at 3.
- **Direction readout:** ruled-block under the chips showing each target's
  inferred direction + goal number (↓ cap / ↑ minimum / ↕ band). Kept.

---

## 13b. Build: reuse existing classes/components — create NO new elements

The full-screen surface nests inside the **real app nav** — do not recreate nav.
The final must reuse existing classes; mocks approximate but the build inherits:

- **Page title + eyebrow** — `.form-title` class (weight 500, clamp 28–48px sans,
  -0.03em tracking). `§ OPTIMIZE` eyebrow = existing `.eyebrow` (9px mono, 0.14em).
- **Close (✕)** — the shared Compare/Shopping close button component. Don't author
  a new one.
- **Section headers** (picker `01 Goals` etc.) — existing `.section-head` /
  `.section-num` (600/13px mono, `--rule`) / `.section-label` (400/20px sans,
  -0.03em) / `.section-rule`. Match the Settings page pattern exactly.
- **Meal name + type** — reuse the **planner matrix** meal-name + meal-type-eyebrow
  classes so type matches the planner exactly (not the 20px dashboard meal-card).
- **Variation selection** — border-color swap to ink (NOT inset ring; see §13a) +
  the **Compare selection checkmark** component (black-filled circle, white tick).
  Desktop columns use collapsing borders (`margin-left:-1px`, selected raised via
  `z-index`) so the ink edge replaces the grey divider rather than double-lining.
- **Launcher hub** — the day `⋯` becomes equal-weight launcher rows (no hero bar).
  Reuse the existing `⋯` sheet/popover container + `.mx-day-menu-item` row pattern;
  each row pushes a screen. The apply-template list (`.mx-day-menu-item.is-template`
  rows + search) relocates to its own pushed screen, unchanged in styling. No new
  ✕/close component on mobile.
- **Nutrition bars / values** — reuse the recipe-detail / dashboard bar + value
  pattern; §2e color logic.
- **Buttons** — `.ed-btn-primary` (Apply), `.ed-btn-text` / ghost (Adjust options).
- **Keep lock, KEEP/scope checkboxes** — §5f checkbox + the lock affordance.

## 13c. Results footer (locked)

- **No "Save as template" button on the results screen.** Applying replaces the
  day; save-as-template is the existing day action afterward (avoids the
  contradiction with the footer note). Footer = `← Adjust options` (left) +
  `Apply [variation] →` (right) with a one-line note under Apply.

## 14. Next step

UI mockups:
- **OPTIMIZE trigger + goal/scope/lock picker** (which targets, scope toggles,
  per-meal locks, favorites toggle).
- **Variations-review screen** (the 3 labeled options with deltas vs baseline,
  Apply, Save as template).

# Good Measure — Matrix Planner View

## Spec follow-up notes

**Status:** Working notes on top of `good-measure-matrix-spec.md`
**Author:** Jen (with Claude)
**Date:** May 2026

---

## What this doc is

Not a rewrite of the spec. A second pass capturing where the thinking landed after a discussion. Reads alongside the original. Where the two conflict, this one is more recent and supersedes.

---

## What changed since the original spec

### 1. Matrix is a *what-if surface*, not a meal plan

The original spec treated matrix mode as an alternative way to *build* a meal plan. Reframe it:

The matrix is **ephemeral exploration**. You toggle into it to play with combinations, see tradeoffs, find a day that works. When you like one, you commit it — either back into the free-form planner (the actual plan), or as a saved day template (a reusable building block).

This framing resolves several open questions cleanly:

- **Relationship to copy-week:** Matrix doesn't compete with copy-week. Copy-week duplicates an existing day on the free-form planner. Matrix lets you *design* a day from scratch faster than the free-form planner does. The output is a day; what you do with it is your business.
- **Whether matrix becomes the default:** No. Matrix is the dialing-in mode. The free-form planner is where the *committed* plan lives. The toggle is non-modal.

### 2. The MCP → favorites → matrix pipeline is load-bearing

Matrix mode is only as good as the dropdown contents. With 40+ recipes per slot type, dropdowns are paralyzing. With 6, they're powerful.

The curation layer is **favorites**. The recommendation engine for what to favorite is **MCP + Claude**. The sequence is:

1. MCP scores the library against the user's goals → recommendations
2. User reviews and **favorites** the keepers (small, deliberate set)
3. Matrix runs on favorites only → tight dropdowns
4. Saved day plans crystallize favorite *combinations*

**Implication:** matrix mode shouldn't ship before:

- Favorites is extended to pantry items (small feature, currently recipe-only)
- A "seed your rotation" Playbook story exists for new matrix users (otherwise the empty-state experience is hostile)

Both are tracked as dependencies, not blockers — they can ship in any order, but matrix mode launching first creates a bad first impression.

### 3. Day shape — named templates, not archetypes

The original spec proposed per-day shape configuration with optional "smart defaults based on tags or past behavior." Land on the simpler answer:

**Saved day templates.** A user crafts a day's structure + content once, names it ("Workout day", "Cardio day", "Weekend"), and loads it into any day. No archetype layer. No per-day fiddling.

Saved templates are independent of the days they were created on. A template can be applied to any future day without affecting where it came from.

### 4. Color logic — three states, not four

Drop "yellow / close to limit." Match the rest of the app's nutrition color logic (§2e of the design system):

- **Green** — met-minimum target (lowGoal only, value ≥ lowGoal)
- **Red** — over a hard cap (highGoal exceeded)
- **Neutral** — everything else

No amber middle-ground. The design system rejected amber on nutrition bars for a reason; matrix mode inherits that.

### 5. Toggle location

Matrix mode is a peer of GRID / LIST / COMPARE on the planner toolbar — not a separate mode switch elsewhere in the chrome.

The planner toolbar may need a small rework to make room — it's getting crowded (date range, prev/next, this-week, cart, new-plan, edit, nutrition, person chips). A peer-toggle for matrix shouldn't push it over the edge. Worth a separate small spec for toolbar layout if/when this ships.

### 6. iOS is a separate conversation

The original spec's "On mobile this likely becomes a vertical stack with horizontal swipe between days" was forward-thinking but premature. Mobile (and iOS specifically) is now its own architectural question — see `future-data-architecture.md`.

For matrix-on-web today: target desktop. iPad will work on touch via the same web app. iPhone matrix is a Phase 2 problem.

---

## Updated approach summary

### Day shape

User builds **saved day templates** in matrix mode. Each template captures: slots active that day, what's in each slot, optional notes. Templates apply to any day. The free-form planner remains the canonical "what am I eating this week" surface.

### Dropdown contents

**Favorites filtered by slot tag** is the default population logic. A "Breakfast" slot shows favorited breakfast-tagged recipes + favorited pantry items where applicable.

If a user has zero favorites, the matrix shows an empty state with a CTA to the "Seed my rotation" Playbook story. Don't fall back to the full unfiltered list — that's the failure mode the curation layer is preventing.

### Per-slot rendering

Compact: dropdown showing recipe/item name + kcal. Click-through to the recipe detail is fine but not promoted. The point is to scan, not read.

### Live totals

Below each day column. Same eight metrics as today's planner sidebar. Three-state color logic (above). Tabular numbers. Counter-tick animation on change (existing pattern).

### Saved day templates

Named, household-scoped (not per-person). Load to any day. Manageable from a "Saved days" surface — probably a small section in Settings or a sidebar in matrix mode itself, TBD.

### Person toggle

Honored. Targets and color logic update per active person, same as the existing planner.

---

## Dependencies

1. **Favorites for pantry items** — currently recipe-only. Needs:
   - A favorite toggle on pantry items (UI + persistence)
   - Migration path (existing items default to unfavorited)
   - Bulk-favorite from a list (probably from Recipes-style multi-select)

2. **Playbook story #5: "Seeding my matrix rotation"** — needs:
   - Empty-state copy in matrix mode that links to it
   - The prompt itself (Claude generates a starter rotation based on a user description)
   - The "favorite Claude's picks" affordance — probably a multi-select on the Recipes page that highlights names matching a list

3. **Planner toolbar refactor** — small follow-up brief covering how to fit a matrix toggle without crowding. Maybe overflow into a `…` menu for less-used controls.

---

## Updated open questions

1. **Saved day templates — where do they live?** Two reasonable answers:
   - A small "Saved days" surface in matrix mode (sidebar or top strip)
   - A section in Settings → Day templates (more discoverable but less in-context)

2. **Pantry items in slots — how do they enter?** A frittata cup is both a pantry item (standalone) and arguably a snack. Probably: any pantry item with the `isMealItem` flag set is eligible to appear in slot dropdowns, filtered by slot type.

3. **Day-level notes** — useful in matrix mode (e.g. "batch cook night") but not currently a field on the planner's day model. Add it as part of this work? Defer?

4. **Mobile** — punt on iPhone matrix until phone navigation strategy is clearer. Web tablet (iPad Safari) will work fine on the desktop layout.

5. **Multi-week matrix** — the original spec scoped to single week. Still scoped that way. The question is whether week-level features (compare two weeks of matrix-built days) become desirable. Defer for now.

---

## Out of scope (still)

- Multi-week matrix view
- Algorithmic auto-suggestions ("here's the day with the best macro profile")
- Shopping list integration (matrix produces days; shopping list reads days; existing pipeline handles it)
- Sharing saved day templates across households

---

## How this gets sequenced

If/when matrix mode ships, rough order:

1. Favorites for pantry items (foundation)
2. Playbook story #5 + the seeding prompt (onboarding)
3. Matrix mode read-only — populate dropdowns, render totals, no save (core mechanic)
4. Saved day templates — create, name, load (the durable output)
5. Planner toolbar refactor (only if matrix toggle pushes it over)

Each is independently shippable. The full system is the sum of the parts.

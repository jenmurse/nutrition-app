# Good Measure — Playbook

> **⏸ On hold (June 16, 2026) pending the native/B2 work.** Going iOS/Android changes the AI surface these stories assume (MCP moves from a Claude Desktop install to a hosted remote connector; mobile flows differ). Authoring copy now would mean rewriting it after the migration — hold until the native shape is settled. The structure below still stands.

## Starter story library

**Status:** Draft — structure only, no copy yet. **Paused pending native (see banner).**
**Author:** Jen (with Claude)
**Date:** May 2026

---

## What this is

The Playbook is an in-app library of scenarios that show what Good Measure (+ MCP + Claude) can actually do. Six starter stories below. The audience for each is a deliberate cook who wants to use the app well, not a beginner needing onboarding.

Each story is a short narrative — the problem, the steps, the actual prompts to copy, screenshots of the outcome. Half recipe blog, half tutorial. Not a help center.

## Surface

Lives at `/playbook` with two shells:

- **Logged out** — rendered inside the marketing site chrome. CTAs route to `/waitlist` or `/invite`.
- **Logged in** — rendered inside the app chrome. CTAs become deep links into the relevant pages.

Same MDX/markdown body, layout wrapper switches on auth state.

Eventually a top-nav entry alongside Planner / Recipes / Pantry once ≥4 stories are written.

---

## Six starter stories

### 1. "Lowering my LDL"

**Audience:** Someone with a recent lipid panel who wants to bring saturated fat down and fiber up without becoming a diet person.

**Summary:** How to score the existing recipe library against an LDL-friendly profile using the MCP, identify the recipes already in your rotation that work, identify the ones to retire, and build a small rotation that hits the target most weeks.

**Teaches:** Recipe scoring prompts, the difference between `highGoal` (cap) and `lowGoal` (target), reading the nutrition panel color logic.

**Key actions:** Set daily goals in Settings → run the MCP scoring prompt → favorite the keepers → use matrix mode to build a week.

**Screenshots:** Settings goals page · MCP prompt + Claude's response · favorites filter in Recipes · matrix view with totals.

---

### 2. "Importing a recipe and dialing it in"

**Audience:** Someone paste-importing a recipe they like but want to adjust — less sugar, more fiber, a swap they already make in real life.

**Summary:** URL import flow → run the Optimization prompt with a constraint → paste Claude's revised version back into the recipe → save the modified version. The original stays untouched; the dialed version is the one you cook.

**Teaches:** URL import, Optimization prompt pattern, the paste-notes textarea, recipe duplication.

**Key actions:** Recipes → New → paste URL → Import → open recipe detail → Optimization section → copy prompt → paste result back.

**Screenshots:** Import row · imported recipe · Optimization prompt block · paste-notes textarea filled in · before/after nutrition panel.

---

### 3. "Sunday batch cook night"

**Audience:** Someone who wants to cook once and eat for several days but always feels like they planned the wrong portions or forgot the labor sequence.

**Summary:** Pick the dinner for batch night → use the Meal Prep prompt → get back a portion plan (how many servings, what containers, freezer vs fridge), a labor sequence (what goes in the oven while you sear), and a reheat strategy. Save the notes back to the recipe so next time it's documented.

**Teaches:** Meal Prep prompt pattern, the "save notes back to recipe" loop, planning around freezer space.

**Key actions:** Recipe detail → Meal Prep section → copy prompt → paste Claude's response into the save-notes textarea → save.

**Screenshots:** Meal Prep prompt block · Claude's response · saved notes on the recipe · the recipe later in the week showing those notes.

---

### 4. "Setting goals from my bloodwork"

**Audience:** Someone who has lab results and a vague sense of what to change but doesn't have nutrition targets they trust.

**Summary:** Paste your lab values + age + activity level into Claude with a structured prompt → get back recommended daily targets for kcal, protein, fat, sat fat, sodium, carbs, sugar, fiber → plug those into Settings → Daily Goals. From then on, every recipe and meal plan is being measured against goals that came from your actual numbers.

**Teaches:** Custom goal-setting prompt, how Settings Daily Goals feeds the entire nutrition layer, per-person goals for households.

**Key actions:** Settings → Daily Goals → use the linked prompt → fill in resulting values.

**Screenshots:** Empty Daily Goals form · Claude conversation showing prompt and reply · filled-in goals · dashboard now color-coded against those goals.

**Note:** This one needs a careful disclaimer — not medical advice, etc.

---

### 5. "Seeding my matrix rotation"

**Audience:** Someone opening matrix mode for the first time with 40+ recipes in their library and no clue which belong in the rotation.

**Summary:** Describe your week to Claude — workout schedule, household, time constraints, what you actually want to eat — and ask it to suggest 6 recipes per meal slot from your library. Favorite the suggested ones. Matrix mode now has tight, meaningful dropdowns from the first use.

**Teaches:** The MCP + favorites + matrix pipeline, why favorites is the curation layer, how matrix becomes useful only after curation.

**Key actions:** Planner → Matrix mode → empty-state CTA "Seed my rotation" → linked prompt → favorite Claude's picks → return to matrix.

**Screenshots:** Empty matrix · prompt + reply · favorites multi-select on Recipes · matrix populated.

**Depends on:** Matrix mode shipping. Favorites extended to pantry items.

---

### 6. "Cooking pescatarian in a meat-eating household"

**Audience:** Two-person household where one person has a dietary restriction (pescatarian, gluten-free, lactose-intolerant, allergy, ethical preference) and the other doesn't. They don't want to cook two separate dinners every night.

**Summary:** Set each person's restrictions in their profile, then ask Claude to find recipes where the protein or restricted ingredient is a *swappable component* — chicken→tofu, beef→mushrooms, regular pasta→GF pasta — so both people eat the same base dish with one component changed. Build the week from those recipes.

**Teaches:** Per-person restrictions in profile, household-aware prompts, why "swappable" recipes matter for mixed households.

**Key actions:** Settings → People → add restrictions → linked prompt → review suggestions → build week.

**Screenshots:** Person profile with restrictions field · prompt + reply · planner showing same dinner on both sides with different protein noted.

**Depends on:** Per-person restrictions field on the Person model (currently not present — small addition).

---

## Cross-cutting notes

- **Every story gets a copy-prompt button** on each code/prompt block. One-tap copy to clipboard. Maybe also a "last used" timestamp so users can see what they've already tried.
- **Every story should link out to the relevant settings/page in-app** when read by a logged-in user, and to `/invite` when read logged-out.
- **Screenshots are real, not mocked.** They come from Jen's actual data with names/numbers visible. Authenticity > polish.
- **Voice matches the rest of the app:** editorial, factual, slightly dry. No "Did you know?" or "Pro tip!" framing. The story is interesting on its own.

## To add as story #6 → "Saving the day that worked"

**Audience:** Someone who's been using the matrix for a week or two and notices that some days just hit — calories are right, protein is on, fiber where it should be — and wonders how to capture that.

**Summary:** Pick a day that pulled clean in the matrix totals. Hover/tap the day column header → ⋯ → "Save this day as template…" → name it ("Workout day", "Mediterranean"). The next time you're filling a future day, ⋯ → "Apply template" → click. The day fills.

**Teaches:** Day templates concept, the matrix + templates pipeline, why a "good day formula" is a reusable building block, naming conventions for variety.

**Key actions:** Matrix → ⋯ → Save · Matrix → ⋯ → Apply.

**Screenshots:** Matrix with totals strip showing green/met colors · ⋯ menu open with the Save option · Save dialog with name input · A future day filled from template.

**Depends on:** Day templates shipped.

## Stories that should exist eventually but aren't in the launch six

- "Adapting a restaurant dish I loved into something I cook"
- "Building a shopping list for a busy week"
- "Tracking how my protein hit changes when I add a workout day"
- "Comparing two versions of the same recipe I've been iterating on"
- "Migrating my Pestle library into Good Measure"
- "Cutting added sugar across a whole rotation" — depends on added-sugar tracking shipping (see `added-sugar-tracking.md`)
- "Cooking for two with different goals" — original story #6, kept as future addition. Pescatarian story above is the more concrete restriction-driven version; this would be the macro-target version.

---

## Open questions

1. Where in the marketing nav does Playbook go? Probably between Manifesto / Library and the CTA section — but worth designing.
2. Does every story end with a "Try this" CTA, or just optional ones? I'd lean every story has one.
3. Do we need a tag system for the stories (LDL, batch, household, etc.) or is 6 stories small enough to live as a single list?
4. Should logged-in users see a "Stories you haven't tried yet" affordance on the dashboard?

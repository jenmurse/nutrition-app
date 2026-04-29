# Brief 2H.2 — Count divergence & adjacent-card ring

**Status:** Ready for Claude Code
**Depends on:** 2H (merged), 2H.1 (in flight or merged)
**Sibling brief:** 2G.2 (sort interaction, sheet rhythm, layout shift)
**Blocks:** Step 2 closure (along with 2G.2 and 2I)

---

## Why

Two issues remain after 2H.1:

1. **`.ed-count` renders correctly on the recipes page ("65 RECIPES" sits right) but ~1px low on the pantry page ("225 ITEMS").** Same selector class, divergent rendering. A parent context is differing.

2. **Selected card rings stack incorrectly when two selected cards are adjacent.** The previous prediction was that two adjacent `box-shadow: 0 0 0 2px` rings would merge into a continuous 2px line. They don't — they double up to a visual 4px stroke in the gutter between them. This is more visible now that 2H landed and the rings actually render at all.

---

## Fix 1 — `.ed-count` divergence between recipes and pantry toolbars

### Step 1 — Inspect both contexts

The selector is shared. The behavior differs. The cause is in the parent.

Open DevTools and compare:
- Recipes page: `.ed-count` ("65 RECIPES") inside `.ed-toolbar` on the recipes page
- Pantry page: `.ed-count` ("225 ITEMS") inside `.ed-toolbar` on the pantry page

Compare for both:
- Computed `height` of the toolbar
- Computed `align-items` and `display` of the toolbar
- Computed `padding`, `margin`, `line-height`, `font-size`, `vertical-align` of `.ed-count`
- Whether `.ed-count` is a direct child of the same flex container in both, or whether it's wrapped differently (e.g., inside a `<div>` wrapper on one page but not the other)
- Any sibling element in one that doesn't exist in the other (e.g., a divider `|` glyph that might affect baseline)

Report findings before patching.

### Step 2 — Patch based on findings

Three likely root causes:

**Cause A — Different toolbar heights.** If the pantry toolbar is shorter (e.g., 40px vs 44px) and `align-items: center` is positioning relative to that height, the count inherits the difference. Fix: unify the toolbar heights, or make `.ed-count` use a fixed line-height that doesn't depend on parent.

**Cause B — Different sibling stack.** If pantry's count sits next to a divider (`|`) glyph and the divider is rendered slightly taller than the count, baseline alignment can drift. Fix: align using flex `align-items: center` and ensure the divider has matching line-height.

**Cause C — Wrapped differently.** If recipes-page count is a direct flex child but pantry-page count is wrapped inside an extra div, the wrapper's flex behavior differs. Fix: unwrap or normalize.

After identifying the cause, apply the smallest fix that brings both pages into alignment. Confirm the recipes-page count remains correct after the fix — don't fix pantry by breaking recipes.

### Verification

- [ ] Screenshot recipes toolbar at 100% and 200% zoom — count baseline aligned with siblings
- [ ] Screenshot pantry toolbar at 100% and 200% zoom — count baseline aligned with siblings
- [ ] Both screenshots placed side by side: the count sits at the same position relative to its toolbar in both

---

## Fix 2 — Adjacent selected card ring stacking

### Diagnosis (confirmed visually)

In compare mode with two adjacent cards selected, the box-shadows from each card (`box-shadow: 0 0 0 2px var(--fg)`) extend 2px outward in the shared gutter. Result: the gutter contains **both** shadows stacked, producing a visual 4px stroke instead of merging into a continuous 2px line.

The original 2H assumption ("they'll merge") was wrong. CSS box-shadows from sibling elements do not merge — they stack additively.

### Two real options

**Option A — Inset box-shadow (shadow draws inside the card box):**
```css
.recipe-grid-item.is-selected {
  box-shadow: inset 0 0 0 2px var(--fg);
  /* no z-index needed since shadow doesn't extend outside */
}
```
- Pro: shadow stays inside the card border, never overlaps gutter, no stacking with neighbors.
- Pro: gutter stays clean.
- Con: ring sits flush with the photo edge (and may visually clip the photo if the photo bleeds to the card edge — it does, per 2H investigation).
- Con: the inset shadow might appear inside the photo, looking like a frame on the photo rather than around the card.

**Option B — Outline with positive offset (draws outside the border-box, doesn't clip the photo):**
```css
.recipe-grid-item.is-selected {
  outline: 2px solid var(--fg);
  outline-offset: 0;
  position: relative;
  z-index: 2;
}
```
- Pro: outline draws outside the border-box, so it doesn't clip the photo (the photo's negative margin doesn't matter — outline is outside everything).
- Pro: when two adjacent elements both have an outline, the outlines **merge** at the shared edge rather than stacking. This is the standard browser outline behavior.
- Pro: simpler than the box-shadow workaround we did in 2H.
- Con: requires re-testing what 2H originally rejected — but 2H rejected `outline-offset: -2px` (negative, drawing inside the box). Positive `outline-offset: 0` is a different beast.

### Recommended path

Test Option B first. The original 2H reasoning that led to box-shadow was: "outline clips the photo because outline-offset is -2px." That's correct as stated. But the conclusion that "outline can't be used at all" went one step too far. With `outline-offset: 0` the outline draws outside the box, doesn't clip, and merges between siblings.

If Option B works as predicted, use it. If for some reason it doesn't merge cleanly between adjacent siblings, fall back to Option A and accept the inset look.

### Verification

For whichever option ships:

- [ ] Single selected card: clean 2px ring around the entire card, no clipping at the photo edge
- [ ] Two adjacent selected cards (horizontal neighbors): the shared edge between them shows a SINGLE 2px line, not a doubled 4px line
- [ ] Two adjacent selected cards (vertical neighbors): same
- [ ] Three or four adjacent selected cards in a row: the rings around the group read as a single continuous selection band, not as overlapping individual rings
- [ ] Compare-mode strip still renders above selected cards on scroll
- [ ] Edge-of-row cards (first column, last column): ring extends into page margin without overflowing
- [ ] Screenshot at 100% and 200% zoom for sign-off

### A note on Option A photo clipping

If Option B fails and we land on Option A (inset shadow), the photo bleed will create the same clipping behavior 2H originally diagnosed. In that case, we'll need to either:
- Shrink the photo's negative margin so it doesn't bleed past where the inset shadow draws, OR
- Accept that the inset shadow draws as a visible line on top of the photo's edge, effectively framing the image.

Don't make this trade-off unilaterally. If Option B fails, surface the failure, screenshot the Option A result, and we'll decide together.

---

## Out of scope

- Any chip / sort / sheet rhythm work (covered in 2G.2)
- The `.compare-strip-cta` button (treatment confirmed correct in 2G; no change)
- Any restructure of the recipe grid layout itself

---

## Doc updates after code lands

### `step2-audit.md`

Note 2H.2 with the two fixes logged. Record the final values used (`.ed-count` patch, the selected-card ring implementation) so future audits don't re-relitigate.

### `master-plan.md`

After 2G.2, 2H.2, and 2I all ship, mark Step 2 complete.

No design-system.md or mobile_ux.md updates needed — these are calibration fixes against existing patterns.

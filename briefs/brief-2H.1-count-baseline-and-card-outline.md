# Brief 2H.1 — Count baseline & card outline follow-ups

**Status:** Ready for Claude Code
**Depends on:** 2H (merged)
**Sibling brief:** 2G.1 (chip gap + underline width follow-ups)
**Blocks:** Step 2 closure (along with 2G.1 and 2I)

---

## Why

2H landed both fixes (removed `margin-top: -1px` on `.ed-count`, replaced outline with box-shadow on selected cards). Visual review on device shows two issues remain:

1. **"65 RECIPES" still reads ~1px high** relative to its toolbar siblings. Removing the negative nudge wasn't enough.
2. **Selected card ring sits flush against the photo and competes with the column rules.** No clipping, but the relationship reads tight and a little noisy where the ring meets the gutter.

Both are calibration issues, not structural ones.

---

## Fixes

### Fix 1 — `.ed-count` baseline recenter

**Diagnosis to confirm:** with `margin-top: -1px` removed, `.ed-count` is now relying purely on flex `align-items: center` for vertical alignment. DM Mono cap-height vs. surrounding DM Sans text may genuinely sit visually higher even when geometrically centered, because mono numerals tend to have a different visual weight distribution.

**Step 1 — Inspect:**
- Open the recipes page in DevTools.
- Inspect `.ed-count` and a sibling like `.cmp-mode-btn` or NAME label.
- Compare computed boxes: padding, line-height, font-size, vertical alignment relative to the toolbar's center line.
- Report findings before patching.

**Step 2 — Patch:**

Most likely answer: `margin-top: 1px` (a small recenter, opposite direction from the original `-1px` over-nudge). Try this first.

```css
.ed-count {
  /* ... existing rules ... */
  margin-top: 1px;
}
```

If `1px` is too much (now reads low), try `0.5px` — though half-pixel margins render inconsistently across browsers, so prefer line-height adjustment instead:

```css
.ed-count {
  line-height: 1; /* if currently inheriting a taller line-height */
}
```

If neither works, fall back to `transform: translateY(0.5px)` which renders as a sub-pixel shift without affecting layout. Surface findings before applying this — it's a last resort.

**Verification:**
- [ ] Screenshot the toolbar at 100% and 200% zoom
- [ ] All siblings (COMPARE, NAME, GRID, LIST, "N RECIPES", SEARCH, + NEW) align on a common baseline
- [ ] No visible 1px drift between `.ed-count` numeral and surrounding text

### Fix 2 — Selected card ring breathing room

**Current state (post-2H):** `box-shadow: 0 0 0 2px var(--fg); z-index: 1` on `.recipe-grid-item.is-selected`. No clipping. But:
- The ring sits flush against the photo edge with no breathing gap, so it reads like the ring is squeezing the image.
- In compare mode, where multiple cards are selected, rings interact with the column rules in the gutter and create visual noise where ring meets rule.

**Step 1 — Inspect:**

Open the recipes page in compare mode with 2+ cards selected. Look at:
1. **Ring vs photo edge.** Is the 0px gap between ring and photo causing tension, or is it fine and the issue is purely the gutter?
2. **Ring vs column rules.** When the box-shadow extends 2px into the gutter, does it cleanly cover the column rule, or does the rule peek through above/below the ring?
3. **Two adjacent selected cards.** Do their rings merge into a continuous selection band (good) or show a doubled stroke (bad)?
4. **Z-index stacking.** Does the ring on a selected card render above neighboring unselected cards' rules? Currently `z-index: 1` is applied — verify it's working.

Screenshot at 200% zoom and report before patching.

**Step 2 — Candidate fixes (do not apply unilaterally; surface findings first):**

**Option A — Ring with breathing gap.** Adds 1px cream gap between photo and ring:
```css
.recipe-grid-item.is-selected {
  box-shadow:
    0 0 0 1px var(--bg),     /* inner cream gap */
    0 0 0 3px var(--fg);     /* outer ink ring */
  z-index: 2;
}
```
This reads as "the photo is framed" rather than "the photo is ringed."

**Option B — Bump z-index, keep current ring.** If the issue is purely that the ring fights with the gutter rules, raising `z-index: 1` to `z-index: 2` may cleanly suppress the rule under the ring without changing the ring itself.
```css
.recipe-grid-item.is-selected {
  box-shadow: 0 0 0 2px var(--fg);
  z-index: 2;
}
```

**Option C — Thinner ring.** If 2px feels too heavy now that we can see it without clipping, try 1.5px:
```css
box-shadow: 0 0 0 1.5px var(--fg);
```

**Recommendation order:** start with Option B (smallest change, may resolve the gutter noise). If gutter still reads noisy, try Option A. Option C only if A still feels too heavy.

**Verification:**
- [ ] Single selected card: ring reads clean, no fight with neighbors
- [ ] Two adjacent selected cards (horizontal): rings read as one continuous selection band
- [ ] Two adjacent selected cards (vertical): same
- [ ] Compare mode strip still renders above selected cards on scroll
- [ ] Edge-of-row cards (first column, last column): ring extends into page margin without overflowing or causing horizontal scroll
- [ ] Screenshot at 100% and 200% zoom for sign-off

---

## Out of scope

- Any chip spacing or layout work (covered in 2G.1)
- The `.compare-strip-cta` button (treatment is correct, no change)
- Any restructure of how compare-mode selection is implemented logically

---

## Doc updates after code lands

### `step2-audit.md`

Note 2H.1 as a follow-up to 2H with the two calibration fixes logged. Record the final values used (`.ed-count` margin-top, selected-card box-shadow shape) so future audits don't re-relitigate.

### `master-plan.md`

After 2G.1, 2H.1, and 2I all ship, mark Step 2 complete.

No design-system.md or mobile_ux.md updates needed — these are calibration fixes against existing patterns.

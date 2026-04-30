# Brief 2H.3 — Selected card ring: switch to inset box-shadow

**Status:** Ready
**Depends on:** 2H.2 (merged)
**Blocks:** Step 2 closure

---

## Why

Visual review shows the current `box-shadow: 0 0 0 2px` ring on selected cards creates messy interactions whenever non-adjacent cards are selected. Rings from cards in different rows or separated by unselected cards sit near each other in gutters and read as broken/overlapping strokes rather than clean selection markers.

The fix is to keep the ring entirely inside each card's box.

## Patch

In `globals.css`, on `.recipe-grid-item.is-selected`:

Replace:
```css
box-shadow: 0 0 0 2px var(--fg);
z-index: 1;
```

With:
```css
box-shadow: inset 0 0 0 2px var(--fg);
```

The `z-index` and any `position: relative` added by 2H can be removed — they're no longer needed since the shadow stays inside the box.

## Expected behavior

- Ring draws 2px inside each selected card's edge.
- Sides and bottom: ring sits cleanly on the cream background of the card content area.
- Top: ring overlaps the top 2px of the photo (since photos extend to the card's top edge). This is acceptable — at 2px it's barely visible against most photos.
- Adjacent selected cards: each shows its own ring inside its own box, separated by the gutter. No stacking, no overlap.
- Non-adjacent selected cards (different rows, gaps between selections): same — every ring stays inside its own card. No more messy gutter interactions.

## Verification

- [ ] Single selected card: clean inset ring, no gutter interaction
- [ ] Two adjacent selected cards (same row): two distinct rings, gutter clean between them
- [ ] Two selected cards in different rows separated by unselected cards: each ring lives inside its own card, no gutter stroke artifacts
- [ ] Three or more selected cards in mixed positions: every ring contained, no visual noise in gutters
- [ ] Compare-mode strip still renders normally; no z-index conflicts since we removed z-index
- [ ] Screenshot the same selection pattern from the prior screenshot (3 cards across 2 rows) at 100% and 200% zoom for sign-off

## Out of scope

- Adjusting the photo bleed to leave breathing room at the top edge — out of scope unless the 2px overlap reads badly in practice
- Any other ring color or weight changes
- Anything in 2G/2G.1/2G.2/2H/2H.1/2H.2 territory

## Doc updates after code lands

`step2-audit.md`: log 2H.3 as the final selection ring fix. Note that the inset approach was chosen to avoid multi-card stacking issues that affected `box-shadow` outset and `outline` approaches.

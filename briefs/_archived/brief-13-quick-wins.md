# Brief 13 — Quick Wins: Over-Limit Warnings, MCP Prompt Cards, DESSERT Tag

**Status:** ready to implement
**Mockup:** none — these are small, scoped CSS changes consistent with existing locked decisions
**Dependencies:** none

---

## Why this brief exists

Three small surfaces still use legacy soft/tinted/pill styling that doesn't match the rest of the app's editorial register. Each one is a 5–15 minute fix on its own. Bundling them into one brief because they share the same underlying transformation: **drop the rounded fill, add a hairline left rule, let the type carry the weight.**

This is the same pattern that's already in use elsewhere — recipe steps, ingredient sections, jump nav. The work here is just bringing three stragglers into line.

---

## 1. Over-limit warning blocks (planner nutrition drawer)

### Where it lives

Planner page, nutrition drawer. The blocks that currently appear when a day's totals exceed the goal — e.g. `⚠ Fat +13g over limit`. These show as red-tinted rounded rectangles with a fill background.

### Current state

- Background fill: `var(--err-l)` (red-tinted)
- Rounded corners
- Card-like padding
- Reads as a soft alert / chip

### Target state — margin-note styling

```css
/* New treatment */
border-left: 2px solid var(--err);
background: none;
border-radius: 0;
padding: 4px 0 4px 12px;
color: var(--err);
font: 400 11px 'DM Mono';
letter-spacing: 0.04em;
text-transform: uppercase;
```

- No fill
- No border-radius
- No box outline
- Just a 2px red rule on the left, text in `--err`, sharp
- Spacing between stacked warnings: `gap: 8px` (was `gap: 12px` for the cards)

### Behavior

- Warnings appear when a tracked nutrient exceeds its goal (existing logic — don't change)
- Order: Calories first, then macros (fat, sat fat, sodium, carbs, sugar, protein, fiber) in nutrition canon order
- One block per over-limit nutrient (existing behavior)

### What to keep

- The `⚠` glyph at the start of each warning
- The "+Xg over limit" copy format

### What to remove

- The card container CSS class entirely
- Any `padding`, `background`, or `border-radius` on the warning element itself
- Any wrapper div that exists only to provide the tinted background

### Acceptance

- Warnings render as a vertical stack of left-ruled lines
- No visible card, fill, or radius
- The 2px red rule is the only visible non-text element
- Dark mode: same treatment, `--err` resolves to its dark-mode value automatically
- Identical at 1x and 2x DPI
- Mobile: same treatment, no breakpoint-specific override needed

---

## 2. MCP prompt cards (recipe detail)

### Where they live

Recipe detail page, two sections:
1. **Optimization** — "Use the MCP prompt below to analyze this recipe..."
2. **Meal Prep** — "Use the MCP prompt below to generate a meal prep plan..."

Each section currently contains a cream-tinted rounded rectangle holding the prompt text and a `COPY PROMPT` button.

### Current state

- Background fill: cream-tinted (likely `var(--bg-2)` or `var(--bg-3)`)
- `border-radius: var(--radius-md)` or similar
- Padding all around
- Reads as a card

### Target state — ruled block

```css
/* New treatment */
border-left: 2px solid var(--rule);
background: none;
border-radius: 0;
padding: 16px 0 16px 20px;
```

- No fill
- No border-radius
- 2px hairline-color rule on the left (`--rule`, NOT `--err` — these aren't warnings)
- Padding shifts to align with the left rule (no top/right/bottom padding inside a card; instead, breathing room comes from section spacing)

### Internal layout — keep as-is

- Section eyebrow header (e.g. `OPTIMIZATION`) sits ABOVE the ruled block, unchanged
- Tip text / prompt body inside the ruled block, DM Sans 13px, `color: var(--fg-2)`, `line-height: 1.7`
- `COPY PROMPT` button at the bottom of the block, follows existing toolbar CTA pattern (compact sharp black rectangle, `padding: 8px 14px`, `border-radius: 0`)
- Spacing between prompt text and button: `margin-top: 16px`

### Behavior

- No state change. Hover, click, and copy behavior all stay the same.

### What to remove

- Background fill on the prompt container
- Border-radius on the prompt container
- Any internal background-color overrides

### Acceptance

- Prompt content sits flush left against a 2px rule in `--rule` (warm grey)
- No fill, no radius, no card outline
- The COPY PROMPT button uses the canonical sharp toolbar treatment from Brief 12
- Both Optimization and Meal Prep use identical container styling — change once, both update
- Section eyebrow + ruled block reads as a continuous typographic unit, not two stacked cards

---

## 3. DESSERT category pill (recipe detail)

### Where it lives

Recipe detail page header area. Category tag (DESSERT, BREAKFAST, MAIN, SIDE, etc.) currently rendered as a rounded pill with a colored or tinted treatment.

### Current state

- `border-radius: var(--radius-pill)`
- Likely has a fill or contrast border
- Reads as a tag/badge

### Target state — sharp outlined tag

```css
.rd-tag {
  font: 400 9px 'DM Mono';
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 10px;
  border: 1px solid var(--rule);
  border-radius: 0;
  background: none;
  color: var(--fg-2);
}
```

- Sharp corners (radius 0)
- Hairline border in `--rule` (warm grey, matching the toolbar outlined button system)
- No fill
- Text in `--fg-2` (secondary)

### Note on the radius token table

Section 7 of the design system currently lists `.rd-tag` under the pill row. Update that table entry to move `.rd-tag` into the sharp / 0px row alongside meal-chip, dividers, form inputs, etc. The other items in the pill row stay — this is a one-component move.

### Behavior

- Category tags are display-only on recipe detail (no click target) — no hover state needed
- If they ever become interactive (filter by category), use the canonical filter-chip treatment, not a tag

### Acceptance

- DESSERT, BREAKFAST, MAIN, SIDE, etc. all render with zero radius and a `--rule` color border
- Hairline weight matches outlined buttons elsewhere in the app
- Visually rhymes with the toolbar's outlined COMPARE / GRID / LIST treatment
- Dark mode: `--rule` resolves automatically, no override needed

---

## Implementation order

If picking these off independently:

1. DESSERT tag (smallest, single CSS class change)
2. Over-limit warnings (single component, scoped to planner)
3. MCP prompt cards (touches two sections on recipe detail, but identical treatment)

If batching: doable in one pass, ~30 minutes total including review.

---

## What this brief does NOT touch

- The `⚠` glyph itself — keep as-is
- The COPY PROMPT button — that's the canonical sharp toolbar CTA, no changes
- Section eyebrow typography — keep as-is
- Any nutrition logic, MCP integration logic, or planner state
- The recipe detail page layout — only the three components above

---

## Cross-references

- Brief 12 — toolbar CTA primitives (sharp black rectangles)
- Brief 10 — index page edge-to-edge, hairline weight audit
- design-system.md §4a — `.ed-btn` and outlined button color (`var(--rule)`)
- design-system.md §7 — radius token table (needs `.rd-tag` entry update)

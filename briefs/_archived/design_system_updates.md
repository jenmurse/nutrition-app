## Design system

The canonical visual spec is `briefs/good_measure_design_system_v2.html` (Good Measure Design System v3). Open it in a browser to read.

**Before making any visual change, read §00 (How to use) first.** It defines the contract — what to swap (tokens, component internals, status patterns) vs. what to leave alone (page layouts for landing, dashboard, planner, recipe detail).

### Hard rules

- **Only the §02 type scale is sanctioned for product:** 9 · 11 · 13 · 16 · 20 · 28 · 36 · 48 · 64 · 80 · 96 · 128px. Sizes used inside the spec doc itself (12, 15, 17, 18, 22) are spec-typesetting only — do not ship them.
- **Do not redesign pages.** Landing, dashboard, planner, and recipe detail layouts stay as they are. Only swap tokens and component internals to match the spec.
- **Do not change the wordmark.** The wordmark direction is in flight (separate doc). The current upright sans "Good Measure" stays until that lands.
- **Do not introduce new colors.** Six person themes (§01) + three status hues (§03b) + paper/ink/rule. That's the whole palette.
- **Do not add icons or illustrations.** The system is type-led. Empty/error states are intentionally glyph-free.
- **Instrument Serif is italic-only, display-only (≥24px), used sparingly.** Never upright, never in body, never as decoration. See §02 for full rules.
- **Mobile: ship Pattern B (editorial rail) only.** Patterns A and C in §06 are documented for context — do not build them.

### How to ask for changes

Per-area sessions, not "apply the whole design system." Examples:
- "Update color tokens to match §01 + §03b. Don't touch components yet."
- "Refactor Button, Chip, and StatCell to match §03."
- "Replace planner over-limit indicators with §03b status pills."

## Design system

The canonical visual spec is `docs/design-system.html` (Good Measure Design System v3). Open it in a browser to read.

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
2. Per-session task list
Work through these in order. Each one is a separate Claude Code conversation — small, reviewable diffs.

Session 1 — Tokens
"Update our CSS custom properties / theme file to match §01 (Color), §02 (Type scale only — fonts + size ladder), and §03 (Spacing/Rules). Don't touch any components yet. Show me the diff."

Session 2 — Status colors
"Replace our status color tokens (success/warning/error) with the warm palette in §03b. The old saturated red/green are out; warm iron-oxide / olive / toasted ochre are in. Update only tokens — don't touch the components that use them yet."

Session 3 — Core components
"Refactor Button, Chip, Input, Toolbar, and StatCell to match §03 in the design system. Match exactly — borders, type, padding, hover states. Don't redesign; match the spec."

Session 4 — Status pattern (planner)
"On the planner's nutrition panel, replace the stacked text+icon over-limit rows with the ink-on-tint status pills documented in §03b. Layout of the panel stays the same; only the indicator pattern changes."

Session 5 — Toasts
"Add a toast component matching §05 (warm palette, bottom-center, 4-second dismiss, ink-on-paper inverted, always include Undo for destructive ops). Then replace the inline confirm/dismiss bar at the top of pages with toasts."

Session 6 — Modals
"Update our modal styling to match §05. Critical: destructive button stays ink-on-paper (NOT red fill). The word 'Delete' + modal context carries the warning."

Session 7 — Onboarding
"Lighten the onboarding chrome per §07: replace heavy ink rules with hairline (--rule, #D0CCC2). Remove the color-name labels under the swatches. Keep the layout."

Session 8 — Empty / Error states
"Update our empty and error states per §08. No glyphs, no illustrations. Type-led empty states; status pill (not icon) for errors. Keep copy editorial."

Session 9 — Mobile rail
"Implement Pattern B from §06 (editorial rail) for our mobile chrome. Single bottom rail
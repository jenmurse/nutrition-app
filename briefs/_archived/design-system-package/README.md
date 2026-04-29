# Good Measure — Design System v3

Machine-readable companion to `spec.html`. Read this first before making any visual change.

- **Visual reference:** `spec.html` (open in a browser)
- **Tokens:** `tokens.json` (single source of truth for values)
- **Component specs:** `components.md`

---

## Hard rules

These are non-negotiable. If a request seems to violate one of these, push back and confirm before proceeding.

### Type

- **Only the sanctioned scale ships:** `9 · 11 · 13 · 16 · 20 · 28 · 36 · 48 · 64 · 80 · 96 · 128px`. Sizes 12, 15, 17, 18, 22 appear inside the spec doc itself for spec-typesetting only — do NOT ship them. When in doubt, round to the nearest scale step.
- **Tracking discipline:** as size goes up, tracking gets tighter — never the other way around.
  - Headlines & display: always negative (−0.01em → −0.022em as size grows)
  - Body: always 0
  - Eyebrows / labels / caps: always positive (+0.12em to +0.16em)

### Instrument Serif (the italic display serif)

Used as a spice, not a sauce. Wrong-handed it fights DM Sans.

| Do | Don't |
|---|---|
| Italic only — never set the roman | Not in body — body italics stay DM Sans italic |
| Display sizes only (≥24px) | Not as decoration — eyebrows, labels, captions, numerals, wordmark |
| One word per headline, rarely two | Not as global `<em>` — scope to display contexts only |

### Color

- **Six person themes** (sage, coral, terra, cerulean, plum, slate) — accent only, surfaces stay paper.
- **Three status hues** (success, warning, error) — warm-shifted; ink-on-tint pills only, never icon+text banners, never as button fills.
- **Paper / ink / rule** for everything else.
- **No new colors.** That's the whole palette.

### Iconography

- The system is type-led. Do NOT add icons or illustrations.
- Empty and error states are intentionally glyph-free.

### Pages

- **Do not redesign** the landing page, dashboard, planner, or recipe detail. Their layouts are working. Only swap tokens and component internals.
- Only swap component internals to match the spec.
- Ask before adding new pages or sections.

### Wordmark

- **Do not change the wordmark from this doc.** Wordmark direction is in flight in a separate exploration. Until it lands, the live upright sans "Good Measure" stays.

### Mobile

- **Ship Pattern B (editorial rail) only.**
- Patterns A and C in the spec are documented for context — do not build them.
- Bottom rail is `Menu` + section index ("02/04 — Today"). NOT a tab bar.

---

## How to work through this

The spec is intentionally large. Do per-area sessions, not "apply everything." Each session = small, reviewable diff. Suggested order:

1. **Tokens** — wire up `tokens.json` to your CSS custom properties / theme file. No component changes yet.
2. **Status colors** — replace old success/warning/error tokens with the warm palette.
3. **Core components** — Button, Chip, Input, Toolbar, StatCell. Match `components.md` exactly.
4. **Status pattern (planner)** — replace stacked text+icon over-limit rows with status pills.
5. **Toasts** — replace inline confirm/dismiss bars at the top of pages with toasts.
6. **Modals** — destructive button stays ink-on-paper, NOT red fill.
7. **Onboarding** — lighten chrome (heavy ink rule → hairline; remove swatch labels).
8. **Empty / error states** — no glyphs; type-led; status pill (not icon) for errors.
9. **Mobile rail** — implement Pattern B.

When you start a session, state the scope. When in doubt, ask before changing anything outside the stated scope.

---

## What changed from v2 / live app

| # | Change | Affects |
|---|---|---|
| 01 | Status colors warm-shifted (saturated red/green → iron-oxide / olive) | Planner over-limit indicators most |
| 02 | Status pattern: stacked text+icon rows → ink-on-tint pills | Planner nutrition panel |
| 03 | Toasts replace inline confirm bars (warm palette) | Top-of-page confirmations everywhere |
| 04 | Modal destructive button stays ink (not red fill) | Delete dialogs |
| 05 | Onboarding chrome lightened (hairlines; no swatch labels) | Onboarding only |
| 06 | Empty / error states glyph-free; pill for errors | All empty + error surfaces |

Pages, layouts, copy voice, motion, and the wordmark are all unchanged.

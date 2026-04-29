# CLAUDE.md — Good Measure

You are working on the Good Measure product. A complete design system lives in `design-system-package/`. **Read it before making any visual change.**

- `design-system-package/README.md` — rules of use, hard constraints, suggested work order
- `design-system-package/tokens.json` — single source of truth for colors, type, spacing, motion
- `design-system-package/components.md` — per-component specs (Button, Chip, Input, Toolbar, StatCell, Status Pill, Toast, Modal, Mobile rail, etc.)
- `design-system-package/spec.html` — visual reference; open in a browser

## Non-negotiable rules

Before changing anything visual, confirm the request does not violate these. If it does, push back.

1. **Do not redesign existing pages.** Landing, dashboard, planner, recipe detail layouts stay. Only swap tokens and component internals.
2. **Do not change the wordmark.** Wordmark direction is in flight separately. Until it lands, the live upright sans "Good Measure" stays.
3. **Type scale is fixed:** 9, 11, 13, 16, 20, 28, 36, 48, 64, 80, 96, 128px. No other sizes ship.
4. **Tracking discipline:** headlines negative (tighter as size grows), body always 0, caps/labels always positive (+0.12 to +0.16em).
5. **Instrument Serif** is italic-only, display-only (≥24px), one word at a time. Never in body, never as decoration, never as global `<em>`.
6. **No new colors.** Six person themes + three status hues + paper/ink/rule. That's it.
7. **Status colors live only in pills**, never as button fills, never as icon+text banners.
8. **No icons or illustrations.** The system is type-led. Empty and error states are intentionally glyph-free.
9. **Mobile = Pattern B only** (editorial rail with Menu + section index). Do not build a tab bar. Patterns A and C are documented in the spec for context only — do not build them.
10. **No rounded corners** on cards, buttons, inputs. Only status pills get pill-radius.

## Working style

- Per-area sessions, not "apply everything." See README's suggested work order.
- State your scope at the start of each session.
- When in doubt, ask before changing anything outside the stated scope.
- When `tokens.json` and `components.md` disagree, **tokens.json wins**.

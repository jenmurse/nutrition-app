# Good Measure — Implementation Briefs

This folder contains self-contained briefs for Claude Code (or any implementer) to execute against the Good Measure codebase. Each brief is a single unit of work with clear intent, scope, changes, and verification.

## Current briefs

| # | Brief | Status | Est. time | Depends on |
|---|-------|--------|-----------|-----------|
| 01 | Background color — white to paper | Ready | 15 min | — |
| 02 | Bricolage Grotesque removal | Ready | 30 min | — |
| 03 | Coral accent reduction (SYS-01) | Ready | 1–2 hrs | 01 recommended first |
| 04 | Mobile bottom nav (verification of 03) | Ready | 10 min | 03 |
| 05 | Landing page build (Next.js port) | Ready | ½–1 day | 01, 02 |
| 05b | Landing scroll animations (phase 2) | Ready | ½ day | 05 |

## Recommended execution order

### Session 1 — Global cleanup (Waves 1–1.5)

Can all be done in a single session, in this order:

1. **BRIEF-01** — Background color. Purely mechanical CSS variable update. Immediate visible payoff.
2. **BRIEF-02** — Bricolage removal. Code hygiene. Zero visual change (should be).
3. **BRIEF-03** — Coral reduction. The big one. Affects ~10 distinct UI surfaces. Worth doing in one pass to avoid inconsistent state between commits.
4. **BRIEF-04** — Verify mobile nav. 10-minute check after BRIEF-03 ships.

**After this session:** the app is on paper bg, Bricolage is gone from the code, and coral is scoped to person theming only. This alone closes most of the visible gap between the app and the landing.

### Session 2 — Landing page base

5. **BRIEF-05** — Port the landing page HTML mockup into Next.js. Substantial work — componentization, route setup, basic scroll animations (simple reveal + sticky figures). Plan for a half-day to full day depending on codebase familiarity.

### Session 3 — Landing page motion layer (optional, can be deferred)

6. **BRIEF-05b** — Richer scroll animations (word-by-word hero, line-by-line manifesto, pull-quote scale, figure parallax, count-up numbers). Do *after* BRIEF-05 is in production and reviewed. These can wait — the basic landing stands on its own.

### Session 4+ — Page-specific work

Future briefs will cover:
- Building the `<PageHeader>`, `<RuledRow>`, `<SectionEyebrow>` components
- Applying page headers to Recipes/Pantry/Planner
- Killing Pantry Grid cards
- Planner meal entries → ruled rows
- Auth page redesign
- Onboarding copy/typography pass

These aren't written yet because they need design mockups reviewed first. The pattern will be: design mockup → Jen approves → brief written → Claude Code executes.

## How to use a brief

1. **Read the whole brief first.** Each has intent, scope, specific changes, and verification. Don't skip the "intent" section — it's how you handle edge cases.
2. **Make the changes on a branch.** One brief = one branch = one PR, generally.
3. **Run the verification steps.** Don't mark done without them.
4. **Use the provided commit message.** It's there for consistency and future grep-ability.
5. **Flag anything unexpected.** If the codebase doesn't match what the brief assumes (e.g., the coral is stored in a different variable than expected), pause and check with Jen or the design author before improvising.

## Conventions across briefs

- **Design tokens:** Briefs assume the design system uses CSS variables (`var(--bg)`, `var(--fg)`, etc.) as defined in `globals.css` or equivalent. If the project uses a different token system (e.g., Tailwind-only, styled-components theme), translate accordingly.
- **"Per-person theming":** The app has a `[data-theme="..."]` pattern that sets `--accent` based on the active person. This system must be preserved.
- **"Leave alone":** If a brief says "leave alone," that's a deliberate design decision, not an oversight. Don't improve what's already correct.
- **Reduced-motion:** Every animation must respect `prefers-reduced-motion: reduce`. This is non-negotiable.
- **Accessibility:** All changes must preserve or improve keyboard navigation, focus states, and screen reader semantics.

## What's NOT in these briefs

These briefs cover **visual and system-level design changes only**. They do not cover:
- API changes
- Database migrations
- Authentication flow logic (just styling of the auth page)
- Business logic (nutrition calculations, meal plan persistence, etc.)
- Deployment
- Testing setup

If implementing a brief reveals a need for non-design changes, flag it separately.

## Related documents

- **`APP-INVENTORY.md`** — The master plan. Every brief traces to a system-level or screen-level entry in this inventory.
- **`LANDING-BRIEF.md`** — Project context for the landing specifically.
- **`design-system.md`** — Source of truth for tokens, types, components.
- **`landing-direction-v5.html`** — The approved landing mockup (source for BRIEF-05).

# Landing Page Brief — v4

## What Good Measure is
A nutrition app for people who actually cook. Pantry + recipes + weekly planner for the whole household, with Claude (via MCP) reading your recipes and optimizing against your goals. Every ingredient is measured to the gram, calculated live. See `memory/app-overview.md` for the full picture.

## Where v4 landed
`public/landing-direction-v4.html` is an **editorial direction** — inspired by millydent.com (declarative + contextual pairings, gallery pacing) and publicofficial.co (sticky images, scrolling text). Warm paper bg (`#F5F4F0`), DM Sans + DM Mono, bold app-green accent (`#10A56C`) used sparingly as ink. Structure: hero → manifesto → 4 sticky chapters (Pantry, Recipes, AI-dark, Planner) → numbers spread → final CTA. Custom cursor with mix-blend-mode, IntersectionObserver reveal, sticky right-column images while left-column text scrolls past.

## What's been iterated (and why)
- Started as parallax scatter → felt gimmicky → moved to publicofficial-style sticky scroll
- Magazine language ("Issue N° 01", "End of issue") → stripped; editorial texture stays, magazine cosplay goes
- Hairline `rule-soft` separators → removed (felt cluttered)
- Forced hero height / scroll-down button → removed (didn't fit every viewport, felt overdesigned)
- Ornamental "—" kickers and `¶` marks → removed for cleaner app-native voice
- Counter column `01 / 04` → removed (redundant with numbered chapter titles)

## Open questions
- **Accent green boldness** — landing uses `#10A56C` (bolder than app's sage). User likes it; may influence app design over time.
- **Chapter pacing** — 4 sticky chapters may be too many; could consolidate.
- **Mobile polish** — desktop-first; mobile works but hasn't been deeply refined.
- **"See how it works" anchor** — tried, removed; page may still want a way to hint "scroll for more" from hero.

## Constraints
- Keep accent swappable via `--accent` CSS variable
- Accessibility non-negotiable (contrast, keyboard, reduced-motion already handled)
- DM Sans + DM Mono only — matches app
- Warm paper background, not cold white

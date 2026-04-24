# Landing Page Brief — v5

*Last updated April 2026. Supersedes v4.*

## What Good Measure is

A nutrition app for people who actually cook. Pantry + recipes + weekly planner for the whole household, with Claude (via MCP) reading your recipes and optimizing against your goals. Every ingredient is measured to the gram, calculated live. See `memory/app-overview.md` for the full picture.

## Where v5 landed

`landing-direction-v5.html` is the current approved mockup. **Editorial direction** — inspired by millydent.com (declarative + contextual pairings), publicofficial.co (sticky figures + scrolling text), and generally the voice of an independent print publication rather than a SaaS product page. Warm paper bg (`#F5F4EF`), DM Sans + DM Mono, muted sage accent (`#5A9B6A`) used sparingly for highlighted `<em>` words inside paragraphs only — never as a fill or button color.

### Structure

Top-to-bottom:

1. **Nav** — brand mark + wordmark lockup (frameless mark, currently placeholder pending brand decision), three right-side links: About · Sign In · `Get Started ↗` (primary CTA, black fill).

2. **Ticker** — horizontal scrolling row of five past-participle phrases separated by em-dashes: `Measured to the gram — Calculated, not estimated — Optimized by AI — Built for people who cook — Made in San Francisco`. Pure CSS animation, 52s linear infinite. Respects reduced-motion.

3. **Hero** — single h1: *"A nutrition app for people who actually cook."* at clamp(56px, 9vw, 120px), DM Sans 500, -0.035em. Beneath: a two-column meta row (date + location on left, role + year on right, mono 10px).

4. **Manifesto** — a tightly-written prose statement, roughly 4 paragraphs, about what the product is. All full-ink (`var(--fg)`), no greyed body text. Sets the voice for the whole page.

5. **Chapter 01 · The Library** (Pantry + Recipes) — two-column sticky-figure layout. Left column: scrolling text with chapter number, title (`The Library`), eyebrow (`§ Pantry + Recipes`), headline (*"Every ingredient, to the gram. Every recipe, calculated."*), and body copy. Right column: a sticky mock figure showing the pantry/recipes UI with `Fig. 01 · Pantry — Measured to the gram`-style captions.

6. **Chapter 02 · The Week** (Planner + AI) — same pattern as Chapter 01 but flipped. Content about the weekly planner and AI optimization. Chapter 02's mock figure includes a miniature planner grid showing the week's meals in ruled rows.

7. **Close** — signed: `— Jen Murse, Good Measure`. Mono dash, sans-serif name, no italic. Quiet and personal.

## Voice

The landing's voice is:
- **Declarative, not promotional.** "A nutrition app for people who actually cook." not "The nutrition app built for home cooks!!"
- **Specific, not aspirational.** "Every ingredient, to the gram." not "Track your nutrition like never before."
- **Calm, not urgent.** No countdown timers, no "Join 10,000+ cooks," no social proof. The manifesto is a reader's promise, not a marketing pitch.
- **Past-participle style.** "Measured to the gram. Calculated, not estimated. Built for people who cook." Every phrase is a property of the product, not a claim about the experience.
- **First-person closing.** "— Jen Murse, Good Measure." The product has a specific person behind it, signed like a letter.

This voice is non-negotiable. Any future copy edits must match register.

## What's been iterated (and why)

Earlier experiments that were tried and rejected — keeping this list so future decisions don't re-litigate them:

- **Parallax scatter layout** → felt gimmicky → moved to publicofficial-style sticky scroll
- **Magazine language** ("Issue N° 01", "End of issue") → stripped; editorial texture stays, magazine cosplay goes
- **Hairline rule-soft separators** → removed (felt cluttered)
- **Forced hero height + scroll-down button** → removed (didn't fit every viewport, felt overdesigned)
- **Ornamental `—` kickers and `¶` pilcrow marks** → removed for cleaner app-native voice
- **Counter column `01 / 04`** → removed (redundant with numbered chapter titles)
- **Bold green accent `#10A56C`** → replaced with muted sage `#5A9B6A` (bold green overwhelmed the type; sage harmonizes)
- **4 chapters** → consolidated to 2 (Library + Week). Each chapter now earns its room.
- **"AI-optimized via MCP" in ticker** → shortened to "Optimized by AI" (MCP is inside-baseball)
- **"Every recipe, live" as chapter headline** → changed to "Every recipe, calculated." (live implied streaming/real-time; calculated is specific to the methodology)
- **Middle-dot `·` as ticker separator** → replaced with em-dash `—` for legibility at 10px mono
- **Green dots between ticker phrases** → removed entirely; em-dash separator is cleaner
- **Custom cursor with mix-blend-mode** → dropped. Not memorable enough to justify the accessibility weirdness.
- **Numbers spread ("X ingredients, Y calculations")** → dropped. Felt like vanity metrics; didn't support the voice.
- **Final CTA section** → simplified; the final CTA is now just the signed close + a quiet inline "Get Started" link

## Design tokens

```css
--bg: #F5F4EF;       /* paper */
--fg: #1A1916;       /* near-black ink */
--fg-2: #36342F;     /* secondary ink (barely used on landing) */
--mute: #6B6860;     /* muted text */
--rule: #D0CCC2;     /* hairline */
--accent: #5A9B6A;   /* marketing sage — never a fill, only <em> highlights */
```

All type is DM Sans (400/500/600) or DM Mono (400/500). No other fonts.

## Constraints

- **Accessibility non-negotiable.** Contrast ratios, keyboard navigation, and reduced-motion support are already handled in v5; any port must preserve them.
- **Reduced-motion:** Both the ticker and the scroll-reveal animations must stop/skip when `prefers-reduced-motion: reduce`.
- **Fonts:** DM Sans + DM Mono only. No Bricolage, no serif, no display face.
- **Background:** Paper `#F5F4EF`. No white anywhere.
- **Accent:** Sage `#5A9B6A`, used only inside `<em>` tags within prose. Never as button fill, never as structural color.
- **CTAs:** Primary CTA (`Get Started ↗`) is black fill with paper text. Secondary links (`About`, `Sign In`) are mono uppercase, underline on hover.

## Open questions

- **Brand mark.** The mark used in v5 is a frameless two-tick lockup. Not final — pending Jen's decision. Implementation can use the v5 mark as-is and swap it in one place later.
- **Favicon.** Will need an inverted treatment (dark square, white ticks cut out) once the mark locks. Not blocking the landing build.
- **Secondary links in nav.** Currently just `About · Sign In · Get Started`. No About page exists yet — the link can point to `#manifesto` anchor for now, or be removed entirely.
- **SEO copy.** Meta title, description, and OG image copy not yet finalized; BRIEF-05 suggests defaults but they can be refined.

## Reference mockups

- **`landing-direction-v5.html`** — the approved mockup, source of truth for all visual and copy decisions
- **`landing-direction-v4.html`** — the previous iteration, kept for reference only; do not use as source

## Related documents

- **`app-overview.md`** — what Good Measure is (product, data model, architecture)
- **`design-system.md`** — app design system; landing inherits tokens but has its own voice
- **`APP-INVENTORY.md`** — master plan for app changes; landing is a single item in that plan (BRIEF-05)
- **`briefs/BRIEF-05-landing-page.md`** — implementation brief for porting v5 into Next.js

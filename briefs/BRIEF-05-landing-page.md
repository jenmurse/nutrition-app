# BRIEF-05 · Landing page build

## Why

We have a finalized HTML mockup of the landing page at `landing-direction-v5.html` (in the project root or design folder). This brief is about porting that mockup into the actual Next.js app as the public-facing landing page — properly componentized, with the scroll animations and sticky behaviors working, and using the same design tokens as the rest of the app.

The mockup is a single HTML file with inline CSS. Claude Code should treat it as the **source of truth for visual design and copy**, but should implement it as proper Next.js components using the project's conventions.

## Reference files

- **Source mockup:** `landing-direction-v5.html` — the approved design, all copy, all styles, all structure
- **Landing brief:** `LANDING-BRIEF.md` — project-level context (voice, history, constraints)
- **Scroll animations companion:** `briefs/BRIEF-05b-scroll-animations.md` — phase-2 motion layer (DO NOT implement in this brief; that's a follow-up)
- **Design tokens:** `globals.css` (or equivalent) — for CSS variable references
- **App design system:** `design-system.md` — for component conventions

## Intent

Implement the landing page in Next.js such that:
1. It renders at the root public route (likely `/` when logged out, or a dedicated `/landing` route if the logged-in dashboard owns `/`)
2. It's componentized cleanly — not a single 1000-line file
3. All scroll animations and sticky behaviors work as in the mockup
4. It inherits the app's global design tokens (fonts, colors, grain overlay if present)
5. It's accessible (reduced-motion handling, keyboard nav, semantic HTML)
6. It's fast (no unnecessary client-side JS, server-rendered where possible)

## Scope

**In scope:**
- All visible content from `landing-direction-v5.html`
- The sticky-figure scroll pattern in chapters 01 and 02
- The IntersectionObserver-based reveal animation for `.r` elements
- The horizontally-scrolling ticker (CSS animation, already self-contained)
- The brand mark + wordmark lockup in the nav (use the current frameless version — we can swap the mark later)
- All copy exactly as written in v5
- Responsive breakpoints as defined in the mockup

**Out of scope:**
- Building the auth form (that's a separate page; landing links to it but doesn't contain it)
- Creating the mark SVG as an asset (use the inline SVG from v5 or copy as-is for now; we're not committing to the final mark yet)
- Analytics/tracking (can be added later)
- A/B testing hooks

## Structural recommendations

### Route

- Place at `app/(marketing)/page.tsx` using a route group so it can have a different root layout (no app chrome, no bottom nav).
- Alternative: `app/page.tsx` with conditional rendering based on auth state — logged-out users see landing, logged-in users get redirected to `/home`.
- **Decision for Claude Code:** Check if the current app root `/` is the logged-in dashboard. If so, create `app/(marketing)/page.tsx` with its own layout. If the root is already the landing, update it in place.

### File structure

Recommended layout:

```
app/(marketing)/
  layout.tsx         # Marketing-only layout — no app nav, no bottom tabs
  page.tsx           # The landing page itself — composes sections
  components/
    LandingNav.tsx           # Top nav with brand lockup + CTAs
    Ticker.tsx               # The horizontal scrolling phrase ticker
    Hero.tsx                 # Hero section with h1 + meta
    Manifesto.tsx            # The "A nutrition app..." prose section
    Chapter.tsx              # Reusable chapter component (used for 01 and 02)
    ChapterFigure.tsx        # The mock visual inside a chapter (sticky on desktop)
    Close.tsx                # Final signed close
```

Each component should:
- Be a Server Component unless it needs client state (most should be server)
- Use the app's design tokens via CSS variables (`var(--fg)`, `var(--bg)`, etc.) or Tailwind classes that map to those tokens
- Have no inline styles except where unavoidable
- Have CSS in a co-located `.module.css` file or Tailwind classes

### Client components needed (marked `"use client"`)

Only the components that need browser APIs:
- **RevealObserver** — a client component that wraps children, applies the IntersectionObserver, adds `.in` class on intersect. Used as `<Reveal><SomeContent /></Reveal>`. Or implemented as a `useReveal()` hook applied to individual elements.
- **Ticker** — only if CSS animation isn't sufficient (but it is — the current mockup uses pure CSS). Can stay server.
- Everything else should be server-rendered.

## Specific implementation notes

### Copy and content

**Do not paraphrase or rewrite any copy.** Use the exact text from `landing-direction-v5.html`. That includes:
- Hero: "A nutrition app for people who *actually* cook."
- Ticker: "Measured to the gram · Calculated, not estimated · Optimized by AI · Built for people who cook · Made in San Francisco"
- Chapter 01 headline: "Every ingredient, *to the gram*. Every recipe, calculated."
- Chapter 02 headline: the weekly-plan copy from v5
- Close: "— Jen Murse, Good Measure"

If anything in v5 needs a copy change, it will come through a separate brief.

### The mark + wordmark lockup

The v5 file uses a specific frameless mark SVG. For now, **use exactly what's in v5** — don't try to build a perfect version. When the mark is finalized, a separate mini-brief will swap it in one place (one component or one SVG file).

### Scroll animations — scope for this brief

**In scope for BRIEF-05:** The two basic scroll behaviors from v5's mock HTML:

1. **Reveal on scroll (`.r` class in v5)** — simple fade-up-on-enter using IntersectionObserver
2. **Sticky chapter figures** — pure CSS `position: sticky` for the right column in each chapter

**Out of scope — deferred to BRIEF-05b:** A richer motion layer using GSAP or Motion One, including word-by-word hero reveals, line-by-line manifesto reveals, pull-quote scale animations, figure parallax differential, optimization numbers count-up, etc. These enhancements should come in a follow-up pass after the basic landing is working and reviewed. See `briefs/BRIEF-05b-scroll-animations.md` for the full phase-2 spec.

**Why separate these phases:** The basic landing should be shippable, reviewable, and in production before the richer motion layer is added. Trying to land both in one PR means either the base is delayed waiting for animation polish, or the animations get rushed. Separate the concerns.

**1. Reveal on scroll (`.r` class in v5):**

Every element that should fade-up-on-enter gets the `.r` class in v5. An IntersectionObserver adds `.in` when the element crosses threshold. CSS handles the transition.

Port this as either:
- A `<Reveal>` wrapper component that applies the observer to its children
- Or a `useReveal()` hook that accepts a ref and returns the current state

CSS:
```css
.r { opacity: 0; transform: translateY(20px); transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1); }
.r.in { opacity: 1; transform: translateY(0); }

@media (prefers-reduced-motion: reduce) {
  .r, .r.in { opacity: 1; transform: none; transition: none; }
}
```

**Critical:** reduced-motion handling. If `prefers-reduced-motion: reduce`, skip the observer entirely and apply `.in` to all elements immediately (as v5 does).

**2. Sticky chapter figures:**

Chapters 01 and 02 have a two-column layout where the left column is scrolling text and the right column is a sticky visual. Pure CSS — `position: sticky; top: 100px;` on the visual container. No JavaScript needed.

On tablet + mobile, the sticky becomes `position: static` so the layout stacks. Breakpoint in v5 is roughly 900px.

### The ticker

The phrase ticker at the top of the page is pure CSS — a horizontal flex row of spans with `animation: tick 52s linear infinite` translating from 0 to -50%. The content is duplicated (phrases repeated twice) so the wrap looks seamless.

Port this component as-is. One implementation note: ensure the duplication doesn't cause layout thrash. Using `display: flex; width: max-content` as v5 does is correct.

### Fonts

The landing uses DM Sans + DM Mono, same as the app. Use the existing font loading from the app's root layout; don't add a separate font import for the landing.

### Colors

The landing uses the same CSS variables as the app after BRIEF-01 (background `#F5F4EF`, ink `#1A1916`, etc). No new variables needed. If the landing has a specific "marketing accent" color (sage green `#5A9B6A` for highlighted em words), that can be a page-level override:

```css
/* Marketing-only — scoped to the landing layout */
.marketing-root {
  --accent: #5A9B6A;  /* marketing sage, not app's person-theme coral */
}
```

This ensures the landing's accent color is sage even when a person theme isn't active. Inside the app, `--accent` remains theme-driven (see BRIEF-03).

### The grain overlay

If the app has a grain overlay in root layout (per `design-system.md`), the landing inherits it automatically. If the marketing layout is separate and doesn't include the grain, either inherit from root or include it explicitly.

### Accessibility

- All sections have semantic HTML (`<section>`, `<article>`, `<header>`, `<nav>`, `<footer>`)
- `<h1>` appears once (the hero)
- Subsequent section titles are `<h2>`; chapter headlines within sections are `<h3>`
- The ticker has `aria-hidden="true"` (it's decorative)
- Keyboard: Tab should reach the CTAs (Get Started, Sign In). No keyboard trap. No weird custom interactions.
- Reduced-motion: respected for both reveal and ticker (ticker animation should stop if reduced-motion)

```css
@media (prefers-reduced-motion: reduce) {
  .tick-track { animation: none !important; }
  .r, .r.in { opacity: 1 !important; transform: none !important; transition: none !important; }
}
```

### SEO

- Title: `Good Measure — A nutrition app for people who actually cook.`
- Description: pull from v5's manifesto opening
- OG image: use existing `app/opengraph-image.tsx` if present

## What NOT to do

- Don't add analytics, tracking pixels, or third-party scripts
- Don't add a cookie banner (not needed unless required by policy; leave for later)
- Don't rewrite the copy — v5 is the source of truth
- Don't swap the mark for something else — use the v5 mark exactly, we'll replace it later
- Don't add features (email signup, newsletter, etc.) — the only CTAs are Get Started and Sign In
- Don't optimize performance aggressively at the cost of visual fidelity — e.g., don't replace the ticker CSS animation with a non-animated version
- Don't skip the sticky scroll behavior — that's a core part of what makes this landing work

## Verification

### Visual parity check

Open `landing-direction-v5.html` in one browser tab and the implemented Next.js page in another at the same viewport width. They should be visually indistinguishable at:
- Mobile (375px)
- Tablet (768px)  
- Desktop (1280px)
- Wide (1600px)

Differences in rendering engines for things like font smoothing are acceptable. Structural differences (missing section, wrong spacing, wrong color, wrong copy) are not.

### Behavior check

- [ ] The ticker scrolls horizontally continuously
- [ ] Reduced-motion preference stops the ticker
- [ ] Scrolling into chapters 01 and 02 triggers the sticky figure behavior on desktop
- [ ] Sticky figures become inline on tablet/mobile
- [ ] Reveal animations trigger as elements enter viewport
- [ ] Reduced-motion preference skips reveal animations (elements show immediately)
- [ ] All CTAs navigate to the correct places (Sign In → auth page, Get Started → auth page with signup tab active)
- [ ] All internal anchor links (if any) scroll smoothly

### Accessibility check

- [ ] Keyboard-only: Tab reaches all interactive elements in order
- [ ] Screen reader: major landmarks announced correctly (nav, main, footer)
- [ ] Focus states visible on all CTAs
- [ ] `prefers-reduced-motion: reduce` fully respected
- [ ] Color contrast: all text passes WCAG AA on the paper bg (the v5 copy should already meet this)

### Performance

- [ ] Lighthouse performance score 90+ on desktop
- [ ] LCP (Largest Contentful Paint) under 2.5s
- [ ] No layout shifts from late-loading fonts (the existing font setup should handle this with `display: swap`)
- [ ] JavaScript bundle is minimal — ideally just the reveal observer logic

## Commit message

```
feat: landing page (public marketing)

Ports landing-direction-v5.html into Next.js as the public-facing
landing page. Componentized into LandingNav, Hero, Ticker,
Manifesto, Chapter (×2), and Close. Uses app design tokens;
marketing accent scoped to landing layout only.

Implements:
- Sticky chapter figures on desktop (CSS position:sticky)
- Scroll-reveal animations via IntersectionObserver
- Horizontal phrase ticker (pure CSS animation)
- Reduced-motion support for all animations
- Responsive breakpoints matching v5 mockup

Part of the app/landing alignment work. See LANDING-BRIEF.md.
```

## Follow-up briefs (not in scope for this one)

- Swap the final brand mark once locked
- Add analytics / tracking
- Wire up a real newsletter form if that becomes a feature
- A/B test the hero copy

# Brief: Landing page redesign

> **Superseded copy note (June 15, 2026):** Shipped June 8, 2026, then the copy
> was rebalanced native-first after the in-app AI chat was hidden. Scenario 02 is
> now the **meal optimizer** (not "blank week → AI fills it"), AI is framed as the
> optional Claude Desktop layer, and the shopping list moved to Scenario 03. This
> brief is historical; the live copy is in `app/(marketing)/page.tsx`. See
> `docs/APP-INVENTORY.md` for the change log.

**Status:** Ready to implement
**Reference mock:** `landing-v6.html` (attached separately to this brief)
**Affects:** `app/page.tsx` (landing route), `app/globals.css` (new tokens + landing classes), plus new components under `app/components/landing/`

---

## Goal

Replace the current landing page with the v6 mock as a Next.js implementation. The mock is the spec for visual treatment, copy, and motion. Your job is to translate the mock into Next.js components that use the existing design system tokens, not to redesign anything along the way.

Every CSS value in the mock that looks like a hex code, a magic font-size, or a one-off letter-spacing must map to an existing token in `globals.css` or to a new token added explicitly in Step 1. No hardcoded visual values in component files. No inline styles for visual properties (color, type, padding). The only inline styles permitted are positional or dynamic (e.g. computed widths, scroll offsets).

---

## Step 1: Add new design tokens to globals.css

The current `globals.css` has tokens for colors, font-family, and a few layout values. The landing page introduces a few new things that need tokens before any component work begins.

**Add to `:root` in globals.css, in the existing token section:**

```css
/* ── TYPOGRAPHY TRACKING ── */
/* Three-step ladder for type register on landing + display surfaces */
--track-display: -0.02em;   /* large display headlines (hero, scenario heads, architecture, close) */
--track-content: -0.01em;   /* content-name register (recipe card names, beat headings) */
--track-body: 0;            /* body paragraphs — DM Sans default metrics */
/* --track-mono: 0.14em already exists in spirit as the chrome-tier mono tracking; add it formally */
--track-mono: 0.14em;

/* ── LANDING-SPECIFIC LAYOUT ── */
--landing-max: 1600px;      /* landing page container; differs from the app's 1100px */

/* ── MOTION ── */
/* --ease-out already exists. Add a token for the topbar engagement transition timing. */
--motion-engage: 320ms;
```

**STOP-CHECK 1.** Before continuing: confirm none of these token names collide with existing ones. If `--track-mono` already exists in the file, skip adding it; reference the existing one. If `--motion-engage` collides, rename to something distinct. Do NOT silently overwrite tokens.

---

## Step 2: Create the landing components directory

Create `app/components/landing/` with these components, each in its own file:

- `Topbar.tsx` — sticky wordmark + CTAs, with scroll-engaged state
- `Hero.tsx` — eyebrow + headline + sub + CTA pair + scroll hint
- `ImageBand.tsx` — full-bleed grid of food tiles (props: `tiles: { label, src? }[]`)
- `Interstitial.tsx` — full-bleed 2-tile grid (props: same shape, 2 tiles)
- `Callout.tsx` — small editorial block (props: `eyebrow, headline, body`)
- `Scenario.tsx` — head + beats + sticky stage with motion logic
- `ScenarioHead.tsx` — number + eyebrow + headline + lede (used inside Scenario)
- `Beat.tsx` — tag + heading + body (used inside Scenario)
- `Stage.tsx` — sticky visual container with state images (used inside Scenario)
- `Architecture.tsx` — eyebrow + display headline + body
- `Close.tsx` — eyebrow + headline + body + CTA pair
- `Footer.tsx` — slim legal row

Each component takes props for content. NO copy hardcoded inside components. Copy lives in `app/page.tsx` and gets passed down. This makes future copy edits trivial — change one place, not ten.

**STOP-CHECK 2.** Before continuing: have you created all 12 component files as empty stubs? Run `ls app/components/landing/` and confirm the count is 12. If any are missing, create them before writing any CSS or component logic.

---

## Step 3: Port the CSS classes from the mock

The mock uses class names like `.topbar`, `.hero`, `.scn`, `.beat`, `.stage`, etc. Port these classes into `globals.css` in a new section labeled `/* ── LANDING ── */`. Two rules:

**Rule A — token references only.** Every color must reference a token (`var(--bg)`, `var(--fg)`, `var(--rule)`, etc.). Every font-family must reference `var(--font-sans)` or `var(--font-mono)`. Every letter-spacing must reference one of the four `--track-*` tokens. Every layout value that already has a token (padding via `var(--pad)`, max-width via `var(--landing-max)`) must use it. No hex codes. No raw `'DM Sans'`. No raw `-0.03em` letter-spacing.

**Rule B — preserve clamp() values exactly.** The mock uses `clamp()` for fluid type and padding (e.g. `clamp(56px, 10vw, 148px)` for the hero h1). Copy these exactly. Don't round, don't simplify, don't substitute fixed values. These were tuned over many iterations.

**Class prefix:** all landing-specific classes get the `ln-` prefix to avoid collision with the existing `ed-` (editorial) and other prefixes. So `.topbar` becomes `.ln-topbar`, `.hero` becomes `.ln-hero`, `.scn` becomes `.ln-scn`, etc. Update component JSX to use these prefixed names.

**Motion classes:** the `.is-engaged` state class on topbar stays unchanged — it's a state modifier, not a base class.

**STOP-CHECK 3.** Before continuing: grep your new `globals.css` LANDING section for raw hex codes (`grep -E '#[0-9a-fA-F]{3,6}'`). The grep should return zero results. Also grep for `'DM Sans'` and `'DM Mono'` — also zero results (only `var(--font-sans)` and `var(--font-mono)` allowed). If either grep returns anything, fix before continuing.

---

## Step 4: Implement the components

Build each component to match the mock's HTML structure exactly. Reference the mock's source for the JSX shape.

A few specific notes:

**Topbar.** The scroll-engaged state needs a hook. Create `app/components/landing/useTopbarEngagement.ts`:

```ts
import { useEffect, useState } from 'react';

export function useTopbarEngagement(triggerRef: React.RefObject<HTMLElement>) {
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setEngaged(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [triggerRef]);
  return engaged;
}
```

Topbar reads the hero's ref (passed down from page.tsx) and applies `is-engaged` class when scrolled past.

**Scenario motion.** Create `app/components/landing/useScenarioMotion.ts`. This hook tracks which beat is currently active in the scenario and returns the index, used to switch which state image is visible in the Stage.

The mock's behavior: each beat has an IntersectionObserver with `rootMargin: '-45% 0px -45% 0px'`. When a beat enters that center band, it becomes active. The Stage's state at that index gets the `is-active` class.

Port this logic directly — don't refactor it into something fancier.

**Screenshot props.** Each scenario's Stage component takes an array of state objects: `{ src: string, alt: string }`. For each scenario, the page passes in the array. Initially, pass empty arrays or placeholder paths — Jen will fill in real screenshots later.

**Mark screenshot slots.** Inside every component that needs an image, add a code comment: `{/* SCREENSHOT SLOT: <description of what should go here> */}` so the slots are easy to find with grep.

**STOP-CHECK 4.** Before continuing: confirm each scenario's beats array length matches the Stage's states array length. Mismatch is a silent bug (extra beat → no image to show, extra state → unreachable image). Add a runtime check (`console.warn`) inside Scenario if the lengths differ.

---

## Step 5: Wire up app/page.tsx

`app/page.tsx` becomes the landing page composition. All copy lives here. Structure:

```tsx
export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  return (
    <>
      <Topbar triggerRef={heroRef} />
      <Hero ref={heroRef} eyebrow="..." headline="..." sub="..." />
      <ImageBand tiles={[...]} />
      <Scenario
        number="§ 01"
        eyebrow="The Library"
        headline="You found a recipe. Dial it in."
        lede="..."
        beats={[
          { tag: 'STATE A', heading: 'It enters exactly as published.', body: '...' },
          { tag: 'STATE B', heading: 'Ask for the version you actually want.', body: '...' },
          { tag: 'STATE C', heading: 'Keep the version that's yours.', body: '...' },
        ]}
        states={[
          { src: '/landing/scn-01-a.png', alt: 'Recipe import view' },
          { src: '/landing/scn-01-b.png', alt: 'Optimization prompt' },
          { src: '/landing/scn-01-c.png', alt: 'Saved new version' },
        ]}
      />
      {/* ... rest of the page composition */}
    </>
  );
}
```

Pull the copy directly from `landing-v6.html`. Every paragraph, every headline, every eyebrow, exactly as it appears in the mock. Do not paraphrase, summarize, or "improve" any copy. The copy was iterated extensively; treat it as locked.

**STOP-CHECK 5.** Before continuing: diff your `page.tsx` copy against the mock by reading both side-by-side. Every sentence in the mock body copy must appear verbatim in your `page.tsx`. If any is missing, paraphrased, or different in punctuation, fix it.

---

## Step 6: Handle the routes and CTAs

CTAs in the mock:

- Hero "See how it works ↓" — scrolls to `#scenario-01` (the first scenario)
- Hero "I have an invite →" — links to `/invite`
- Topbar "Have a code? →" — links to `/invite`
- Topbar "Sign in →" — links to `/login`
- Close "Join waitlist" — links to `/waitlist`
- Close "I have an invite →" — links to `/invite`
- Footer "Contact" — grep the codebase for an existing contact email (try `lib/seo.ts`, `app/layout.tsx`, README). If found, use it. If nothing exists, leave as `mailto:hello@withgoodmeasure.com` as a placeholder and flag in your handoff that Jen needs to confirm.
- Footer "Privacy" — links to `/privacy` (existing route)

These routes already exist in the app. Use Next.js `<Link>` for internal routes; plain `<a>` for `mailto:` and the scroll-down anchor.

**Smooth scroll for hero CTA:** the mock uses native `scroll-behavior: smooth` on `html`. Preserve this. The hero CTA is a plain `<a href="#scenario-01">` — no JS click handler needed.

---

## Step 7: Reduced motion

The mock's CSS includes:

```css
@media (prefers-reduced-motion: reduce) {
  .stage { position: static; }
  .scn-grid { display: block; }
  /* etc. */
}
```

Port these rules exactly. The collapse from sticky-stage to stacked-block is the accessibility fallback. Verify in browser DevTools by toggling reduced-motion in the emulation panel.

---

## Step 8: Mobile breakpoint

The mock breaks the sticky-stage layout below 880px and reverts to mobile stacked. Port the mobile CSS exactly. All scenarios, image bands, interstitials, and the architecture/close sections have explicit mobile rules in the mock — copy them.

---

## Step 9: Delete or archive the old landing

The current `app/page.tsx` content gets replaced. Archive the old version to `app/page.old.tsx.bak` first in case Jen wants to reference it. Do not delete the old file outright.

Any landing-specific CSS classes in `globals.css` from the previous landing should be removed in a separate cleanup pass — flag them in a comment block at the top of the new LANDING section like `/* TODO: sweep old landing classes once new is stable */`. Don't do the cleanup in this brief.

---

## Step 10: Paper-to-white sweep across marketing & auth surfaces

The new landing uses pure white (`#FFFFFF`) as its background, not paper (`#F5F4EF`). For visual coherence, every page that lives outside the authenticated app experience needs to match. These are the surfaces a friend-of-Jen will see before they sign in.

**Pages to convert paper → white:**

- `/` (the new landing — already on white from Step 3 above; included here for completeness)
- `/invite`
- `/login`
- `/waitlist`
- `/waitlist-success`
- `/privacy`
- The archived create-account page at `briefs/_archived/login-page-tabbed.tsx` (won't render today, but when restored for public launch it should already be on white)

**What changes inside the app (authenticated surfaces):** nothing. Dashboard, Planner, Recipes, Pantry, Settings, all detail and form pages, all sheets and modals keep paper (`#F5F4EF`). The split is clean: marketing/auth = white; app = paper.

**Implementation approach.** Do NOT change the `--bg` token's value globally — that would invert the whole app to white. Instead, scope the override.

Two options, pick one:

**Option A (preferred): per-route layout override.** Each of these routes uses a layout wrapper component that sets `background: #FFFFFF` directly on its root, overriding the global `--bg`. Add a new CSS class `.ln-surface` that sets `background: #FFFFFF` and apply it to the route's root container.

**Option B: a `--surface-bg` token.** Add a new token `--surface-bg: var(--bg);` in `:root`, then override it to `#FFFFFF` via a `data-surface="marketing"` attribute on the `<body>` or root container of each marketing route. Slightly more elaborate but more design-systemy.

Pick Option A for speed; we can refactor to Option B later if we add more marketing surfaces.

**Other elements that need paper→white attention on these routes:**

- Auth left panel (`/login`) — currently has paper bg; should be white.
- Auth right panel (`/login`) — same.
- Auth divider — stays `var(--rule)` (already neutral, works on both).
- Auth form inputs — bottom-border treatment already works on white.
- `/privacy` page body — confirm it has no inline `background` properties.
- Any code blocks or callouts on these pages using `var(--bg-2)` — those stay `var(--bg-2)` (the tan secondary surface still reads correctly on white as a tinted callout).

**STOP-CHECK 10.** Before continuing: visit `/`, `/invite`, `/login`, `/waitlist`, `/privacy` in dev. Each renders on white. Then visit `/home` (logged in). It still renders on paper. If any marketing route still shows paper, or any app route now shows white, fix before continuing.

---

## Step 11: Verification

After implementation, run through this checklist manually:

1. Visit `/` in dev. Hero renders at the correct scale. Topbar wordmark is 16px at rest.
2. Scroll past hero. Wordmark shrinks to 13px, CTAs fade in, hairline appears below topbar. All three transitions happen together over `--motion-engage` (320ms).
3. Each scenario's stage stays sticky while you scroll through its beats. The state image transitions as the active beat changes.
4. The architecture section fits in one viewport at standard heights (≥800px viewport). Eyebrow + headline + body all visible without scroll inside the section.
5. The close section + footer are reachable at the bottom. Scroll-snap doesn't trap you.
6. Mobile (`<880px`): sticky stages collapse to stacked layout. All sections are vertically scrollable.
7. Reduced motion toggle: sticky stages collapse to stacked. Topbar engagement still works (opacity changes only, no transforms).
8. Lighthouse accessibility audit: 95+. Any flag below that, address before shipping.

---

## What this brief does NOT cover

- Real screenshots for scenario states (Jen will provide separately)
- Food photography for image bands and interstitials (Jen will provide separately)
- OG image regeneration (separate brief, deferred to wordmark integration pass)
- Favicon update (separate brief, deferred)
- Analytics events on CTAs (out of scope; will be a follow-up if needed)

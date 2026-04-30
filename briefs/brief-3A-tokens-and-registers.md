# BRIEF 3A — Token system + register scoping (foundation)

**Part of:** Step 3 of the design pass (desktop chrome consistency, two-register surface, wordmark integration).
**Scope:** Single PR. CSS variable architecture only. No visual changes to surfaces beyond what falls out of the scoping mechanism. Foundation work — every other 3B–3G brief depends on this landing first.
**Depends on:** Nothing.
**Blocks:** 3B (app migration), 3D (layout fixes), 3E (auth), 3F (onboarding topbar). 3C (wordmark) is parallelizable.

---

## Why this brief

Surface tone is now two-register. Editorial surfaces (landing, auth, onboarding, OG card, email) keep the existing beige system. Working surfaces (app: dashboard, planner, recipes, pantry, settings, shopping, add meal, compare, all forms, all empty states) move to a white system with cooler neutrals. Both registers share identity colors, signal colors, and structural tokens — only paper, ink, body, muted, and rule shift.

This brief installs the token architecture and the route-scoping mechanism so 3B–3G can edit surfaces against a stable token foundation. No surface visuals change beyond what falls out of the scoping switch — landing, auth, onboarding stay beige; the app moves to white.

## Locked decision (from prior conversation)

Two registers, scoped via a `data-register` attribute on the layout root. Working register is the default (the app is the larger surface area); editorial register opts in via the attribute on landing/auth/onboarding routes.

| Token | Editorial register | Working register |
|---|---|---|
| `--bg` | `#F5F4EF` | `#FFFFFF` |
| `--bg-2` | `#EEEAE3` | `#F5F5F4` |
| `--bg-3` | `#E6E2D8` | `#ECECEA` |
| `--fg` | `#1A1916` | `#0A0A0A` |
| `--fg-2` | `#36342F` | `#2A2A2A` |
| `--muted` | `#6B6860` (warm) | `#6E6E6E` (neutral) |
| `--rule` | `#D0CCC2` (warm) | `#D8D8D6` (neutral) |

**Unchanged across registers** (same hex on both):
- All eight person theme colors (coral, terra, sage, forest, steel, cerulean, plum, slate)
- All `--accent-l` tinted variants (rgba alpha overlays)
- `--err`, `--err-l`, `--ok`, `--ok-l`, `--warn`, `--warn-l`
- All structural tokens (`--nav-h`, `--pad`, `--filter-h`, etc.)
- All radius tokens (still 0 except the locked `.mob-sheet` exception)
- Font tokens (`--font-sans`, `--font-mono`)

**Why this token list and not others.** Only seven tokens shift because only those are temperature-sensitive on paper. Person colors stay at full saturation regardless of paper (they sit on top, not in). Signal colors stay at the same hex because over-limit-red looks correctly alarming on both surfaces. Structural tokens have no color and no surface — they're just numbers.

## What's wrong now

The current token system in `globals.css` has a single set of values keyed to the editorial beige. Every surface in the app inherits those values, which means the dense working surfaces (planner, pantry list, recipes list) read muddy because the base paper is too warm and the secondary surfaces have insufficient gap. There's no mechanism to scope a different token set per route.

## Spec

### Approach

Two token sets, declared in `:root` and a sibling selector. The default `:root` declarations carry the working register (white). The editorial register is opted into via `[data-register="editorial"]`, which is applied to the layout wrapper of editorial routes.

```css
:root {
  /* Working register — default for app */
  --bg:    #FFFFFF;
  --bg-2:  #F5F5F4;
  --bg-3:  #ECECEA;
  --fg:    #0A0A0A;
  --fg-2:  #2A2A2A;
  --muted: #6E6E6E;
  --rule:  #D8D8D6;

  /* Identity tokens — unchanged across registers */
  --accent:    #5A9B6A;            /* default sage; theme-reactive */
  --accent-l:  rgba(90,155,106,0.10);

  /* Signal tokens — unchanged across registers */
  --ok:       #5A9B6A;
  --ok-l:     rgba(90,155,106,0.12);
  --err:      #B02020;
  --err-l:    rgba(176,32,32,0.10);
  --warn:     #C07018;
  --warn-l:   rgba(192,112,24,0.10);

  /* Structural tokens — unchanged */
  --nav-h:    50px;
  --pad:      40px;
  --filter-h: 38px;

  /* Type tokens — unchanged */
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
}

[data-register="editorial"] {
  --bg:    #F5F4EF;
  --bg-2:  #EEEAE3;
  --bg-3:  #E6E2D8;
  --fg:    #1A1916;
  --fg-2:  #36342F;
  --muted: #6B6860;
  --rule:  #D0CCC2;
}
```

**Why `:root` carries the working register.** The app is the larger, more dense, more often-rendered surface. Defaulting to white means any new route picks up the working register automatically. Editorial routes opt in explicitly. This is safer than the reverse (default editorial, opt into working) because forgetting to opt in on a new app surface produces a visible bug ("why is this dashboard beige?") instead of an invisible one ("why is this landing white?").

**Why the attribute lives at the layout root, not on `<html>` or `<body>`.** Putting it on `<html>` would require a route-aware effect to set/unset the attribute on every navigation, which adds risk. Layout-root scoping means each layout file declares its register declaratively, the variable cascade does the work, and there's no JavaScript involved. The attribute is conceptually the same as a CSS class but reads more semantically (`data-register="editorial"` says what it is).

### Implementation per route

**Editorial register routes** — apply `data-register="editorial"` to the layout root div:

- `/` (landing page)
- `/auth/sign-in`, `/auth/create-account`, `/auth/forgot`, any other auth route
- `/onboarding/*` (every onboarding step)

**Out of scope for this brief, deferred:** OG card generation and email templates. These render in environments that don't have the runtime CSS variable pipeline (server-side image generation, transactional email HTML inlining), so they need a different approach — likely inlining the editorial hex values directly. Handled when those surfaces get their own pass; not blocking 3A.

**Working register routes** — no attribute needed; default applies:

- `/dashboard` or `/` if the app's home is the dashboard for authed users
- `/planner` and any planner sub-routes
- `/recipes`, `/recipes/[id]`, `/recipes/new`, `/recipes/[id]/edit`
- `/pantry`, `/pantry/new`, `/pantry/[id]/edit`
- `/settings`
- `/shopping`
- `/meal-plans/add-meal` (Add Meal flow)
- `/meal-plans/compare` or wherever Compare lives
- All empty-state variants of the above

### File-level implementation pattern

Most likely the app uses a Next.js layout pattern (`app/layout.tsx`, `app/(marketing)/layout.tsx`, `app/(app)/layout.tsx`). Apply the attribute at the relevant route group's layout level:

```tsx
// app/(marketing)/layout.tsx
export default function MarketingLayout({ children }) {
  return (
    <div data-register="editorial" className="min-h-screen">
      {children}
    </div>
  );
}

// app/(auth)/layout.tsx
export default function AuthLayout({ children }) {
  return (
    <div data-register="editorial" className="min-h-screen">
      {children}
    </div>
  );
}

// app/(onboarding)/layout.tsx
export default function OnboardingLayout({ children }) {
  return (
    <div data-register="editorial" className="min-h-screen">
      {children}
    </div>
  );
}

// app/(app)/layout.tsx — no attribute, default working register
export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
```

If the routing structure is different (Pages router, no route groups, single root layout), apply the attribute conditionally on the layout root based on the current pathname:

```tsx
const editorialPaths = ['/', '/auth', '/onboarding'];
const isEditorial = editorialPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

return (
  <div {...(isEditorial && { 'data-register': 'editorial' })}>
    {children}
  </div>
);
```

The implementer should pick whichever pattern fits the existing routing architecture. The mechanism is what matters; the implementation shape can vary.

### Hardcoded hex audit

The token system already exists, but some files contain hardcoded hex values that bypass it. Sweep and replace.

Hex values to flag and replace with their token reference:

- `#F5F4EF` → `var(--bg)`
- `#EEEAE3` → `var(--bg-2)`
- `#E6E2D8` → `var(--bg-3)`
- `#1A1916` → `var(--fg)`
- `#36342F` → `var(--fg-2)`
- `#6B6860` → `var(--muted)`
- `#D0CCC2` → `var(--rule)`

Any of these appearing as literal hex in JSX (`style={{color: '#1A1916'}}` or `className="bg-[#F5F4EF]"`) or in CSS (`background: #F5F4EF`) will produce wrong rendering on the working register because the literal won't update with the cascade.

Some structural rgba values are okay as literals — `rgba(0,0,0,0.05)` for hairline shadows, `rgba(255,255,255,0.x)` for paper-on-ink overlays, etc. — because they don't reference the token system. Don't over-correct.

The eight person theme hex values (`#E84828`, `#C45C3A`, `#5A9B6A`, `#2D7D52`, `#4A7AB5`, `#2B90C8`, `#8B5A9E`, `#5C7080`) are also okay as literals because they don't shift across registers. These usually appear in a theme map file or color picker config; leave them alone.

### Hover and overlay tokens (verify, do not redefine)

Hover states often use `opacity` or `var(--bg-3)` already. Verify:

- Outlined buttons hovering to `var(--bg-3)` — works on both registers automatically (the token shifts).
- Text-button hover via `opacity: 0.85` — works on both.
- Filled-black buttons hovering via `opacity: 0.9` — works on both.

If any hover state uses a hardcoded hex (`hover:bg-[#EEEAE3]`), replace with the token (`hover:bg-[var(--bg-2)]` if Tailwind arbitrary values are in use, or move the hover into a CSS class).

### Dark mode (untouched)

The existing `data-theme="dark"` mechanism stays as is. Dark mode tokens are not part of this brief. If dark mode uses hardcoded hex values that conflict with the new register system, flag them but don't fix in this PR — dark mode pass is its own future step.

If `data-theme="dark"` and `data-register="editorial"` need to coexist at some point, the cascade order is: dark-mode tokens defined under `:root[data-theme="dark"]` should win over the working defaults, and `[data-register="editorial"][data-theme="dark"]` would carry the editorial-dark variant. Not in scope for this brief; just don't break the dark-mode tokens that exist.

## Files most likely affected

- `globals.css` (or wherever token declarations live) — primary edit
- `app/(marketing)/layout.tsx` (or equivalent) — add `data-register="editorial"`
- `app/(auth)/layout.tsx` (or equivalent) — add `data-register="editorial"`
- `app/(onboarding)/layout.tsx` (or equivalent) — add `data-register="editorial"`
- `app/(app)/layout.tsx` (or equivalent) — verify no attribute applied
- Various component files — sweep for hardcoded hex matching the seven tokens above and replace

## Verify before declaring done

Visual:

- Open landing page (`/`) on desktop — renders on `#F5F4EF` beige with warm ink and warm hairlines. Identical to current.
- Open auth (`/auth/sign-in`) — renders on `#F5F4EF` beige (this is brief 3E's territory for the white-panel kill, but the page background should already be beige after this brief; the white right-panel issue is separate).
- Open onboarding step 1 — renders on `#F5F4EF` beige.
- Open dashboard — renders on `#FFFFFF` white. **This is the visible change of this brief.** Ink is harder, hairlines are cooler-neutral, muted is cooler-neutral. The dashboard hero, stat cards, this-week strip, all the editorial structures are intact — only the paper tone shifts.
- Open planner — renders on white. Day grid hairlines are `#D8D8D6` (cooler). Today column tint (`var(--accent-l)`) appears unchanged because rgba overlays don't shift across registers.
- Open recipes (list and grid) — white. Recipe row hairlines, eyebrow muted text, all updated to the working register tokens.
- Open pantry (list and grid) — white. The dense list now reads cleanly because the base is white instead of beige.
- Open recipe detail — white. Body text in `#2A2A2A`, headlines in `#0A0A0A`, mono labels in `#6E6E6E`.
- Open recipe form, pantry form — white.
- Open settings — white.
- Open shopping — white.
- Open Add Meal step 1 and step 2 — white.
- Open Compare — white.
- All empty states (empty pantry, empty recipes, empty planner) — white.

Tokens:

- Inspect any element in DevTools on landing, confirm `getComputedStyle(el).backgroundColor` resolves to `rgb(245, 244, 239)` (the editorial beige).
- Inspect any element in app (dashboard, planner, etc.), confirm bg resolves to `rgb(255, 255, 255)`.
- Inspect a hairline rule on landing, confirm border-color resolves to `rgb(208, 204, 194)` (warm rule).
- Inspect a hairline rule in app, confirm border-color resolves to `rgb(216, 216, 214)` (neutral rule).

Identity colors:

- Switch active person from Jen (coral) to Garth (sage) on dashboard, planner, anywhere theme-reactive — accent updates exactly as before. No regression.
- Today column tint on planner — same intensity on white as on beige (it's an alpha overlay).
- Avatar dots, person-pill identity markers — unchanged.

Signal colors:

- Trigger an over-limit warning on the planner nutrition view — `--err` and `--err-l` render unchanged.
- Trigger a successful save toast or notification bar — `--ok` renders unchanged.

Grep checklist:

- `#F5F4EF` (literal hex) — should not appear in JSX or CSS except in the token declaration in `globals.css`
- `#EEEAE3` — same
- `#E6E2D8` — same
- `#1A1916` — same
- `#36342F` — same
- `#6B6860` — same
- `#D0CCC2` — same
- `bg-[#F` (Tailwind arbitrary value) — should not appear except for the eight person theme hex values
- `data-register=` — should appear exactly in editorial layout files (marketing, auth, onboarding)

Functional:

- Navigate between editorial and working routes (e.g. landing → sign-in → dashboard → settings → sign-out → landing). The register switch happens at navigation; no flash of wrong tokens, no flicker.
- Page reload on an app route — defaults to working register tokens immediately (no flash of editorial register before opt-out).
- Page reload on a landing route — defaults to working register briefly only if `data-register` is applied via JavaScript after hydration. If using the route-group layout pattern, the attribute is in the SSR HTML and there is no flash. **The brief recommends route-group / layout-level scoping specifically to avoid this flash.**

Performance:

- The CSS-variable cascade approach has zero performance cost. Variables resolve at paint time. No JavaScript execution required for register switching when implemented at the layout level.

## Out of scope

- Any visual change to surfaces beyond the token shift. Layout, chrome, button styles, headlines — all untouched in this brief.
- Wordmark integration. That's brief 3C and runs in parallel.
- The Add Meal alignment fix, Compare nav restoration, Shopping toolbar kill. Those are 3D.
- The auth white-panel kill. That's 3E.
- The onboarding topbar simplification. That's 3F.
- Settings, recipe grid, planner cart icon, onboarding preset card stragglers. Those are 3G.
- **OG card and email templates.** These render in environments outside the runtime CSS variable pipeline and need inline editorial hex values. Deferred to a future pass; not part of any current Step 3 brief.
- Mobile nav redesign. That's its own step after Step 3 lands.
- Italic typeface decision. That's Step 6.
- Dark mode register coexistence. Future work.

## Notes for the implementer

- The token approach lets us ship 3B (app migration to white) as essentially "verify nothing broke" because the tokens already do the work. 3B's actual brief is mostly an audit pass with screenshots of every app surface confirming they read correctly on white. If this brief lands cleanly, 3B is small.
- If you find any place where a component renders incorrectly after this brief (e.g. text becomes invisible because it was hardcoded to `#1A1916` and now sits on white instead of beige), that's a sweep target for 3B. Don't try to fix every drift in 3A; just install the foundation cleanly.
- The cooler `--muted` and `--rule` on the working register are deliberately a small step from the warm versions. Don't over-cool. `#6E6E6E` is barely different from `#6B6860` in print, but on a white surface vs. a beige surface, the warm version reads as "tinted" and the neutral version reads as "right." If during verification anything looks too cold or too clinical, flag it rather than tweaking values silently.
- The `--accent-l` rgba tints use the accent color's RGB at alpha 0.10. They render the same intensity on white and beige because alpha compositing doesn't care about the underlying paper. If today column or any other accent-tinted surface looks too bright or too dim on white, the fix is the alpha value, not the base color — but again, flag rather than silently change.
- After this brief lands, update `design-system.md` to reflect the two-register architecture. Add a `§ 2e. Surface registers` section under the existing color section with the locked tables. Don't update the doc as part of this PR — flag for follow-up.


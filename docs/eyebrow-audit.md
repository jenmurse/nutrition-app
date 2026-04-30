# Eyebrow Audit

Status: Audit + proposal · Do not implement yet  
Date: 2026-04-30

---

## Named CSS Classes (current state)

| Class | Size | Weight | LS | Color | Notes |
|---|---|---|---|---|---|
| `.es-eyebrow` | 9px | — (400) | 0.14em | var(--muted) | EmptyState component |
| `.auth-eyebrow` | 9px | — (400) | 0.18em | var(--muted) | Login, reset-password |
| `.ob-eyebrow` | 9px | — (400) | 0.14em | var(--muted) | Onboarding steps, centered |
| `.ob-topbar-left/right` | 9px | — (400) | 0.14em | var(--muted) | Onboarding topbar |
| `.cmp-eyebrow` | 11px | 400 | 0.16em | var(--muted) | Compare overlay |
| `.pl-shop-eyebrow` | 11px | 400 | 0.16em | var(--muted) | Shopping |
| `.pl-add-eyebrow` | 11px | 400 | 0.16em | var(--muted) | Add Meal steps |
| `.lp-feat-eyebrow` | 9px | — | 0.1em | rgba(17,17,17,.75) | Marketing feature list |
| `.manifesto-eyebrow` | 10px | — | 0.16em | var(--mute) | Marketing manifesto |
| `.opt-eyebrow` | 8px | — | 0.14em | var(--mute) | Marketing optimization block |
| `.pq-eyebrow` | 10px | — | 0.16em | var(--mute) | Marketing pull quote |

Marketing classes (`.lp-feat-eyebrow` etc.) are scoped to `.mkt` and isolated from app styles — excluded from proposal.

---

## Instance Table

| PAGE | TEXT | SIZE | LS | ROLE | CSS / PATH |
|---|---|---|---|---|---|
| **Compare overlay** | § NUTRITION COMPARISON | 11px | 0.16em | a | `.cmp-eyebrow` |
| **Shopping** | § MAR 3–9 (dynamic date range) | 11px | 0.16em | a | `.pl-shop-eyebrow` |
| **Add Meal step 1** | § STEP ONE · APR 30 (dynamic) | 11px | 0.16em | a | `.pl-add-eyebrow` |
| **Add Meal step 2** | § STEP TWO · APR 30 (dynamic) | 11px | 0.16em | a | `.pl-add-eyebrow` |
| **Login** | § SIGN IN | 9px | 0.18em | a | `.auth-eyebrow` |
| **Login** | § CREATE ACCOUNT | 9px | 0.18em | a | `.auth-eyebrow` |
| **Login** | § RESET PASSWORD | 9px | 0.18em | a | `.auth-eyebrow` |
| **Reset password** | § SET NEW PASSWORD | 9px | 0.18em | a | `.auth-eyebrow` |
| **Onboarding topbar** | § ONBOARDING | 9px | 0.14em | e | `.ob-topbar-left` |
| **Onboarding step** | § WELCOME | 9px | 0.14em | a | `.ob-eyebrow` |
| **Onboarding step** | § YOUR PROFILE | 9px | 0.14em | a | `.ob-eyebrow` |
| **Onboarding step** | § YOUR HOUSEHOLD | 9px | 0.14em | a | `.ob-eyebrow` |
| **Onboarding step** | § DAILY GOALS | 9px | 0.14em | a | `.ob-eyebrow` |
| **Onboarding step** | § READY | 9px | 0.14em | a | `.ob-eyebrow` |
| **Recipe detail** | [TAG] e.g. DESSERT | 11px | 0.16em | b | inline Tailwind, `[id]/page.tsx:473` |
| **Recipe detail** | [META] e.g. 1 SERVING · 30 MIN PREP | 11px | 0.16em | f† | inline Tailwind, `[id]/page.tsx:484` |
| **Recipe detail** | RECIPE / EDIT | 9px | 0.12em | c | inline Tailwind, `[id]/page.tsx:402` |
| **Recipe detail** | SCALE (above scale buttons) | 9px | 0.14em | d | inline Tailwind, `[id]/page.tsx:551` |
| **Recipe detail** | PER SERVING · VS GOALS | 9px | 0.14em | d | inline Tailwind, `[id]/page.tsx:608` |
| **Recipe detail** | [INGREDIENT SECTION] e.g. PRODUCE | 9px | 0.1em | d | inline Tailwind, `[id]/page.tsx:570` |
| **Recipe detail** | OPTIMIZATION NOTES | 9px | 0.1em | d | inline Tailwind, `[id]/page.tsx:706` |
| **Recipe detail** | MEAL PREP NOTES | 9px | 0.1em | d | inline Tailwind, `[id]/page.tsx:777` |
| **Home** | § DASHBOARD STATS | 9px | 0.15em | a‡ | inline Tailwind, `home/page.tsx:347` |
| **Home** | THIS WEEK | 9px | 0.18em | d | inline Tailwind, `home/page.tsx:400` |
| **Home** | TODAY | 9px | 0.18em | d | inline Tailwind, `home/page.tsx:413` |
| **Home** | [MEAL TYPE] e.g. BREAKFAST | 9px | 0.15em | b | inline Tailwind, `home/page.tsx:475` |
| **Home** | [STAT LABEL] e.g. CALORIES | 9px | 0.14em | d | inline Tailwind, `home/page.tsx:369` |
| **Home** | [DATE] e.g. APR 30 | 9px | 0.14em | f | inline Tailwind, `home/page.tsx:333` |
| **Empty states (all pages)** | § NO PLAN THIS WEEK | 9px | 0.14em | a | `.es-eyebrow` |
| **Empty states (all pages)** | § NOTHING TODAY | 9px | 0.14em | a | `.es-eyebrow` |
| **Empty states (all pages)** | § NO RECIPES YET | 9px | 0.14em | a | `.es-eyebrow` |
| **Empty states (all pages)** | § NO MATCHES | 9px | 0.14em | a | `.es-eyebrow` |
| **Empty states (all pages)** | § NO INGREDIENTS YET | 9px | 0.14em | a | `.es-eyebrow` |
| **Empty states (all pages)** | § INGREDIENT NOT FOUND | 9px | 0.14em | a | `.es-eyebrow` |
| **Empty states (all pages)** | § RECIPE NOT FOUND | 9px | 0.14em | a | `.es-eyebrow` |
| **Empty states (all pages)** | § SELECT A PLAN | 9px | 0.14em | a | `.es-eyebrow` |
| **Empty states (all pages)** | § NOT FOUND (404) | 9px | 0.14em | a | `.es-eyebrow` |
| **Error page** | Sync error | 9px | 0.14em | f | `.es-eyebrow` — anomaly: no §, not truly an eyebrow |

**† Meta line** (1 SERVING · 30 MIN PREP): changed to 11px/0.16em this session alongside the tag. It describes the recipe rather than locating the user — see decision point below.

**‡ § DASHBOARD STATS**: has § prefix but lives on a working-register page inside a content section (not above an h1). Role is ambiguous — see decision point below.

---

## Role Key

| Role | Description | Current sizes |
|---|---|---|
| **a** — Page-level editorial marker | §-prefixed, above an `h1`, locates the user | 9px (auth, onboarding, empty states) or 11px (compare, shopping, add meal) |
| **b** — In-content category tag | Bare, above a content card title or within a list row | 9px–11px |
| **c** — Form crumb | Slash-separated, above a form headline | 9px |
| **d** — Body section label | Labels a UI section, control group, or stat panel *within* page body | 9px |
| **e** — Topbar locator | Appears in the page topbar, not above content | 9px |
| **f** — Other | Doesn't cleanly fit; flagged | — |

---

## Decision (2026-04-30)

**Single token: 9px / 400 / 0.14em / var(--muted)** — everywhere, no exceptions.

Changes made:
- `.cmp-eyebrow`, `.pl-shop-eyebrow`, `.pl-add-eyebrow`: 11px/0.16em → 9px/0.14em
- `.auth-eyebrow`: 0.18em → 0.14em (size was already 9px)
- Recipe detail tags (DESSERT etc.): 11px/0.16em → 9px/0.14em
- Recipe detail meta line: 11px/0.16em → 9px/0.14em

No change: `.es-eyebrow`, `.ob-eyebrow`, `.ob-topbar-left`, all home page inline labels, recipe body labels — already at 9px/0.14em.

---

## Original Proposal (superseded)

### How many tokens: 2

The split is clear from the inventory: two meaningfully different uses exist, with no clean way to collapse them.

**Token A — eyebrow-editorial**
```
11px / 400 / 0.16em / var(--muted)
```
Use when: sitting above a page `h1` or content card title. Always at the top of a visual unit. §-prefixed (roles a, b-above-headline) or bare form crumb (role c).

**Token B — eyebrow-body**
```
9px / 400 / 0.14em / var(--muted)
```
Use when: labeling a UI control group, a section within dense body content, or a stat panel. The label is *inside* the page rather than above its headline.

The working register (home, recipe detail body) is dense and data-heavy — 11px eyebrows throughout the body would compete with content. The editorial surfaces (auth, onboarding, shopping, compare) are open and typographically driven — 9px is undersized against their display headlines.

### The rule

> **Use Token A when the eyebrow introduces a headline or names a page/screen. Use Token B when the eyebrow labels a control group, panel, or inline section within body content.**

Quick test: if you removed the eyebrow, would a headline follow? → Token A. If the eyebrow labels something alongside body content? → Token B.

---

### Changes required under this proposal

**Migrate to Token A (9px → 11px, standardise to 0.16em):**

| Class / location | Current | Change |
|---|---|---|
| `.auth-eyebrow` | 9px / 0.18em | → 11px / 0.16em |
| `.ob-eyebrow` | 9px / 0.14em | → 11px / 0.16em |
| `.es-eyebrow` | 9px / 0.14em | → 11px / 0.16em |
| Home `§ DASHBOARD STATS` inline | 9px / 0.15em | → 11px / 0.16em |
| `RECIPE / EDIT` inline | 9px / 0.12em | → 11px / 0.16em |

**No change (already Token A):**
- `.cmp-eyebrow`, `.pl-shop-eyebrow`, `.pl-add-eyebrow` — 11px / 0.16em ✓
- Recipe detail tags (DESSERT) — 11px / 0.16em ✓

**No change (Token B, stays 9px):**
- SCALE, PER SERVING · VS GOALS, Optimization Notes, Meal Prep Notes, ingredient section names — all role d in recipe detail body
- THIS WEEK, TODAY, meal type headers (BREAKFAST etc.), stat labels, date display — all role d/f in home

**Defer to Brief 3F:**
- `.ob-topbar-left` (§ ONBOARDING) — topbar, out of scope here

---

### Decision points (need a call before implementing)

**1. `.es-eyebrow` on working-register pages**
Empty states like § NO RECIPES YET appear inside working-register pages (white, dense). Bumping `.es-eyebrow` to 11px makes them consistent with editorial markers but may look heavy next to 9px body content. Options: (a) accept 11px everywhere — the empty state is a full-panel state, not inline; (b) create two empty-state eyebrow values matched to register.

**2. Recipe meta line (1 SERVING · 30 MIN PREP)**
Changed to 11px/0.16em this session alongside the recipe tags eyebrow. Under this proposal it's role f — it describes the content rather than naming it, making it more Token B. Revert to 9px/0.14em, or keep 11px because it visually pairs with the tag above the `h1`?

**3. Home `§ DASHBOARD STATS`**
Has § prefix but sits inside a working-register section, not above an `h1`. Could go Token A (it has §, it locates) or Token B (it's a section label within body). If Token A: → 11px inline fix. If Token B: stays 9px but consider whether § is appropriate here at all.

# Good Measure — Design + Brand Pass · Master Plan

**Status legend:**
✓ done · → in progress · ☐ pending · ◇ decision needed · ⊘ deferred / parked

---

## 0 · Where this plan came from

This is the merged plan from the creative-direction memo (April 28) and the conversation that followed. It absorbs Claude Design's brand system pages where they hold up, pushes back where I think they don't, and resequences the work so dependencies are clean.

Companion docs:
- `design-system.md` — implementation source of truth (existing)
- `app-overview.md`, `mobile_ux.md`, `onboarding.md` — feature/architecture references
- This doc — what's being changed and in what order

When this plan and the existing design-system.md conflict, this plan is the forward direction; design-system.md gets updated as work lands.

---

## 1 · Locked direction (decisions already made)

These are settled. Don't relitigate without a strong reason.

### Brand principles
- ✓ **"Brand is paper & ink. Color belongs to the person."** — Claude Design's brand line is the single sentence the system runs on.
- ✓ **The dot is what gets measured.** — One asset, four meanings (person / present moment / unit / decision). Used scarcely, not as wallpaper.
- ✓ **Two typefaces only — DM Sans + DM Mono.** Italic serif explored (Instrument Serif) and ultimately removed entirely in Step 6. No serif, no italic anywhere in the system.
- ✓ **Sharp is default. Round = identity (the dot only). Pill = legacy stragglers.**

### FAB
- ✓ **Killed.** Round black FAB on Recipes/Pantry violates "the dot is the singular human thing inside rectangles" — a black disc as a generic nav glyph is exactly what the dot doctrine forbids. Replace with `+ NEW` text button in toolbar (matches desktop pattern).

### Auth white panel
- ✓ **Killed.** White isn't paper, white isn't ink, white doesn't belong. Auth sits on `--bg` like every other form. Vertical hairline (desktop) / horizontal hairline (mobile) does the visual division.

### Sign Out location (mobile)
- ✓ **Moves to Menu sheet.** Last item below Settings in the menu list. Removes the bottom-of-Settings burial.

### Menu rail behavior (mobile)
- ✓ **Stays constant on every screen** as global orientation. Mobile child screens have no top back-bar — navigation is contextual via cancel/save form actions and the persistent Menu in the bottom rail. The bottom rail's right slot adapts per page: section locator on parent screens, primary action on screens with one (SHARE on Shopping), or status locator on screens that need it (date/person on Add Meal). Locked in 2D.2.

### Mobile child-screen navigation
- ✓ **No top back-bar on mobile child screens.** Navigation is contextual via cancel/save form actions and the persistent Menu in the bottom rail. No `← BACK` row on form pages (New Recipe, Edit Recipe, New Pantry Item, Edit Pantry Item, Shopping, Add Meal). The previous rule ("always `← BACK`") is superseded by this. Locked in 2D.2.

### Bottom sheet corners
- ✓ **8px top corners, hardcoded on `.mob-sheet`.** Round signals the surface slid up from below rather than appeared. This is the only exception to the sharp-default rule. Token `--radius-xl` removed — value is hardcoded directly in CSS. Locked in 2E.

### + NEW PLAN placement (mobile)
- ✓ **Planner toolbar, right side.** Outlined (not filled), mirrors desktop pattern. Filled black reserved for single primary CTA per page.

### Mobile planner toolbar (final shape)
- ✓ **Single row:** date range left, person chip + `+ NEW PLAN` right. 44px.
- ✓ **PREV/NEXT dropped.** Week navigation via swipe on day strip. Date range text stays as editorial locator.
- ✓ **SHOPPING in menu sheet.** Reachable from multiple entry points; menu sheet is the right home.
- ✓ **NUTRITION on day-header.** Contextual to day + person. `VIEW NUTRITION ›` link below kcal bar on single-person views. Hidden on Everyone view. Not in menu sheet.
- ✓ **Person chip height** matches toolbar button height. Pill shape locked (identity exception); height is not.

### Wordmark direction
- ✓ **`good · measure` lowercase, dot center, dot is the favicon/app-icon/OG mark.** Solo wordmark, no separate mark needed. Dot color: ink (B&W only — never theme color in the wordmark). Specs and final variation TBD in Step 1.

### Type scale (corrected)
- ✓ **Tracking is steeper than Claude Design's notes.** Treat their visuals as spec, their notes as conservative. New tracking ladder:

| Scale | Px | Tracking | Line-height | Use |
|---|---|---|---|---|
| Hero (dashboard) | 160 / 11.5vw | −0.04em | 0.91 | Dashboard greeting |
| Hero (landing) | 96 | −0.035em | 1.00 | Landing hero |
| Display | 64 | −0.03em | 1.05 | Page titles, empty state headlines |
| Title | 40 | −0.025em | 1.10 | Recipe titles, card titles |
| Section | 24 | −0.02em | 1.20 | Chapter heads, toolbars |
| Body | 14 | 0 | 1.55 | Paragraph default |
| Body lede | 18 | 0 | 1.55 | Paragraph below display headlines (NEW token) |
| Eyebrow | 9 UPPERCASE | +0.14em | — | All mono labels |

---

## 2 · Open decisions

These need answers before or during the relevant step. Tracked here so we don't lose them.

| ID | Question | Resolution | Status |
|---|---|---|---|
| Q1.1 | Bottom sheet top-corner radius: sharp / 8px / 12px / keep 20px | **8px — hardcoded on `.mob-sheet`. Token `--radius-xl` removed (Approach B).** | ✓ resolved in 2E |
| Q1.2 | Toolbar icons (cart, chart, view toggles, filter): ghost no-fill / sharp outlined / text labels only | Text labels only on mobile — shipped in Step 3 | ✓ resolved in Step 3 |
| Q4.1 | Form crumb pattern (`RECIPE / NEW` vs `§ RECIPE / NEW`) | Single `§ NEW` / `§ EDIT` eyebrow — path-style breadcrumbs removed | ✓ resolved in 5D |
| Q4.2 | `§ STEP ONE` on Add Meal — keep or simplify | Working-surface eyebrow convention applied; § confirmed correct | ✓ resolved in Step 5 |
| Q5.5 | Nutrition sheet over-limit warning treatment: keep `--err-l` fill (current) or convert to left-rule margin-note | `.err-chip` tinted fill kept for over-limit; `.warn-chip` plain ruled row for below-min. Design-system updated to match. | ✓ resolved in Step 3 |
| Q11.1 | Mobile landing running bar: drop / single label / marquee | Dropped entirely — wordmark + SIGN IN is enough on mobile | ✓ resolved in Step 11 |
| Q11.2 | Desktop landing running bar labels: keep statement-style or convert to section anchors | Kept statement-style — four locked labels (CALCULATED, NOT ESTIMATED · MEASURED TO THE GRAM · PLANNED BY THE WEEK · OPTIMIZED BY GOAL) | ✓ resolved in Step 6 |

---

## 3 · The work, sequenced

Twelve steps. Steps 1–2 are foundational; 3–6 are the bulk of the visual work; 7–12 are application across surfaces.

### STEP 1 — Wordmark exploration and lock ✓

**Why first:** Brand mark gates onboarding topbar, auth chrome, landing nav, mobile header treatment, favicon/OG, and emails. Lock this and seven downstream decisions become mechanical.

**Output:** A single visualization showing:
1. Weight comparison: DM Sans 500, 600, 700 set in the wordmark
2. Case comparison: lowercase vs uppercase (control)
3. Dot spacing: tight / medium / generous
4. Dot position: x-height-middle vs baseline-aligned
5. Dot size: ~0.4× cap vs ~0.6× cap vs ~0.8× cap
6. Wordmark in context: nav (50px tall), auth topbar, onboarding topbar
7. Favicon test: dot alone at 16/24/32/48px, paper on ink and ink on paper
8. App icon test: dot at ~18px on a 64px ink rounded-square

**Decision criteria:**
- Reads as "good measure" first, "good·measure" second (i.e. the dot enacts measurement, doesn't replace word-spacing)
- Holds up at nav size (~13px), auth size (~18px), and onboarding size (~24px)
- Dot favicon is legible at 16px

**Lock outputs:**
- Final wordmark variation
- DM Sans weight, tracking, dot size, dot position, sidebearings
- Favicon spec (dot size on square, paper-on-ink direction)
- App icon spec
- OG card spec

---

### STEP 2 — Linework and radius audit ✓

**Why second:** Sets the rules every chrome decision depends on. Decides whether things round, half-round, or sharp.

**Output:** A documented sweep of every surface listing what's there now and what changes.

**Known stragglers to fix:**
- Search input on Recipes/Pantry mobile toolbar (rounded bordered + magnifier) → hairline-underline only
- Planner mobile toolbar cart + chart icons (rounded fill tiles) → text labels (per Q1.2)
- Recipe grid/list view toggle + filter buttons on mobile (rounded squares) → text or ghost
- Recipe detail "Scale 1× 2× 4× 6×" pills → sharp segmented control or sharp chips
- Recipe detail "○ FAVORITE" prefix circle → remove (the dot is reserved; this isn't an identity dot)
- Pantry form CATEGORY and DEFAULT UNIT dropdowns (visible rounded borders) → bottom-border-only
- Onboarding native `<select>` dropdowns → styled to match
- Bottom sheet top corners ✓ — 8px hardcoded on `.mob-sheet`, `--radius-xl` removed (2E)
- Onboarding contextual tip box rounded corners ✓ — already sharp in code; confirmed in 2E audit

**Token changes:**
- `--radius-pill: 0` (was 9999px legacy)
- `--radius-md: 0` (was 12px)
- `--radius-lg: 0` (was 16px)
- `--radius-xl` removed entirely (2E) — 8px hardcoded on `.mob-sheet` directly (Approach B)

**Lock outputs:**
- Updated radius tokens in design-system.md
- Punch list of every component class with stale radius

---

### STEP 3 — Mobile chrome rebuild ✓

**Substeps:**

| Substep | Description | Brief | Status |
|---|---|---|---|
| 3a | Index toolbars (Recipes, Pantry) — hairline search, text toggles, FAB removed | 2A, 3B | ✓ |
| 3b | Planner toolbar — icons → text, `+ NEW PLAN`, person chip | 2B–2B.2 | ✓ |
| 3c | Bottom sheets — 8px corners, hairline top, backdrop variants | 2E | ✓ |
| 3d | FAB removal from Recipes / Pantry | 2A | ✓ |
| 3e | Form chrome — native selects, rounded → sharp | 3B | ✓ |
| 3A | Token system + register migration (hardcoded color sweep) | 3A | ✓ |
| 3B | Full app migration audit + color cleanup | 3B | ✓ |
| 3D-2 | Add Meal redesign — fixed rail, recipe grid, editorial layout | 3D-2 | ✓ |
| 3D-3 | Add Meal precision fixes — X alignment, search placeholder, mobile Screen 1↔2 transition | 3D-3 | ✓ |
| 3E-2 | Auth rebuild — paper bg, explicit divider element, Instrument Serif `<em>` | 3E-2 | ✓ |
| 3F-2 | Onboarding topbar — wordmark left, step counter right, `§ ONBOARDING` removed | 3F-2 | ✓ |
| 3G-2 | Stragglers — Settings SAVE outlined, grid typographic cell, cart hidden on empty planner, preset underline | 3G-2 | ✓ |

**Step 3 complete.** Dead code sweep also ran April 30 (4 unused `.module.css` files, `DailySummary.tsx`, 95 HTML mockups, dead globals.css classes removed).

---

### STEP 4 — Mobile design edits ✓

**Original scope shipped:** Back-button pattern, Sign Out location, Menu sheet, bottom rail behavior on child screens — all landed in 2D.2 and 2F.

**Rescoped scope shipped (Apr 30–May 1):**

| Brief | Description | Status |
|---|---|---|
| MOB-Q1 | Five quick mobile cleanups: bg bleed fix, topbar alignment, auth hairline, settings header padding, pantry icon audit | ✓ |
| MOB-CLEANUP-1 | Spacing and visual corrections pass | ✓ |
| MOB-CLEANUP-1B | Top-bar chip-to-hamburger gap: restructured trigger to `width: auto; padding: 0 var(--pad) 0 8px; margin-right: calc(-1 * var(--pad))` for true 8px visual gap | ✓ |
| MOB-1 | Mobile top bar replaces bottom rail as primary chrome | ✓ |
| MOB-2 | Dashboard person pulldown: styled dropdown, 1-person static chip logic | ✓ |
| SHOP-1 | Shopping: plan-scoped navigation, EmptyState component for empty state | ✓ |
| MOB-3 | Recipe edit ingredients: 3-row card layout on mobile via CSS grid + `display: contents` | ✓ |
| MOB-4 | Add Meal converted to full-overlay two-step bottom sheet; scrim covers full viewport; step 1 at 75vh expands to step 2 at `calc(100dvh - 60px)` via CSS max-height transition | ✓ |

**Also shipped (May 1, desktop + cross-platform):**
- Recipe grid: uniform row heights (`grid-auto-rows: calc(18.75vw + 110px)` at 4-col), all cards get `border-bottom`, `nth-last-child` stripping removed
- Compare overlay: clicking Recipes nav while open now closes it
- Person pulldowns (mobile planner + dashboard): `border: 1px solid var(--rule)` + `box-shadow: 0 4px 12px rgba(0,0,0,0.08)` — matches filter dropdown
- Planner day strip: `padding-left/right: 12px` (calibrated value, not `var(--pad)`)

---

### STEP 5 — Editorial pass and § convention ✓

**Shipped across briefs 5A–5E (May 2, 2026).** Scope expanded beyond the original § audit to include button casing enforcement, empty-state CTAs, form-page headline rewrites, working-surface scale split, dialog voice rule, dashboard stats one-off, and several bug fixes. Deferred landing items (italic density, landing copy edits) moved to Step 6 — they're tightly coupled to the italic typeface decision.

**Briefs shipped:**
- **5A** — Eyebrow casing enforced UPPERCASE app-wide. `Done — dismiss` → `Dismiss`. `+ Add` → `+ ADD`. `Go home` → `GO HOME →`.
- **5B** — Button casing rule locked in design-system.md §1d. 43 button-related classes audited. Source string cleanup across 10 files.
- **5C** — Empty-state CTAs added/fixed. `CLEAR FILTERS →` on Recipes/Pantry. Planner SELECT A PLAN → `A week to plan.` + CTA. Shopping no-ingredients → `OPEN PLANNER →`. Dashboard NOTHING TODAY → `+ ADD MEAL →` with prefilled date+person. EmptyState `lede` made optional.
- **5D** — Form-page headline voice locked. Path-style breadcrumbs (`RECIPE / NEW`) → single-word § eyebrows (`§ NEW`). Headlines: `A new recipe.`, `Edit this recipe.`, `A new pantry item.`, `Edit this pantry item.`. Working-surface scale extended to Add Meal and Shopping.
- **5E** — Dashboard stats empty state simplified to eyebrow + lede + CTA (no headline). Strip-bottom hairline fixed. Dialog voice rule locked. All `dialog.confirm` calls audited and brought to spec.

**Lock outputs in design-system.md:** §1d button casing rule, §5j dialog voice rule, §6h empty-state composition pattern (including dashboard stats three-element exception), §8j form-page patterns.

---

### STEP 6 — Type system + copy pass ✓

**What shipped:** Italic serif (Instrument Serif) was removed entirely rather than locked. The system is DM Sans + DM Mono only — no third typeface, no italic anywhere. Auth and landing copy updated in the same pass.

**Decisions landed:**
- No italic serif. `<em>` convention retained only for dashboard greeting (theme-accent color, not italic).
- Landing hero headline: "Measure what matters." — replaces the earlier version.
- Auth create account: "Set up your kitchen." Auth sign in: "Pick up where you left off."
- Running bar locked: four statement labels (CALCULATED, NOT ESTIMATED · MEASURED TO THE GRAM · PLANNED BY THE WEEK · OPTIMIZED BY GOAL).
- § METHOD (PullQuote) section removed from landing. Landing is now: §00 Hero / §01 Manifesto / §02 ChapterLibrary / §03 ChapterWeek / §04 Close.
- Landing headline-to-body gap normalized to 24px across all sections.

See decision log for full entry (May 2).

---

### STEP 7 — Auth screen ✓

Shipped as **brief-3E-2**. Locked decisions:
- White right panel removed — auth now sits on `--bg` (paper) like every other form surface.
- Vertical hairline divider is an explicit `<div class="auth-divider" />` in a `1fr 1px 1fr` grid. Not a `border-right`.
- Mobile: stacks at 760px, `.auth-divider { display: none }`, editorial top / form bottom.
- `§ SIGN IN` / `§ CREATE ACCOUNT` eyebrow stays.
- Italic `<em>` on headlines uses Instrument Serif italic, `color: inherit` (black). Distinct from the sage `<em>` accent convention.

Remaining from original Step 7 scope: locked wordmark not yet applied to auth topbar (→ Step 9 wordmark integration pass). Italic pass pending Step 6 decision.

---

### STEP 8 — Onboarding ✓

Shipped as **brief-3F-2** + follow-up April 30.

- Topbar: wordmark left (DM Sans 700 18px), step counter right (DM Mono 9px +0.14em muted).
- `§ ONBOARDING` label permanently removed — redundant.
- No wordmark or check icon in the body of any step — topbar wordmark is the only brand moment.
- Body bookend content (Welcome: eyebrow + headline + lede + CTA; Complete: eyebrow + headline + lede + CTA). No decorative elements.

Remaining: locked wordmark application to onboarding topbar (→ Step 9 wordmark integration pass). Italic pass pending Step 6 decision.

---

### STEP 9 — Wordmark integration pass ☐ (expanded scope, formerly "Landing nav")

**Why this step exists:** The locked wordmark (`good · measure`, DM Sans 700, −0.02em, dot spec) is not yet applied to any surface. All current surfaces use a placeholder. This step is the single pass that integrates it everywhere at once.

**Surfaces in scope:**
- Landing nav (desktop + mobile)
- Auth topbar (`.auth-nav`)
- Onboarding topbar (`.ob-topbar-wm`)
- Main app nav / any other wordmark occurrence in the app shell

**Items:**
- Apply locked wordmark HTML/CSS to all four surfaces
- Desktop landing nav: wordmark left, running-bar labels middle, `SIGN IN` right
- Mobile landing nav: wordmark left, `SIGN IN` right; drop running bar (per Q11.1)
- Verify tap targets meet 44px floor on mobile
- Verify wordmark renders correctly at each size (nav ~13–14px, auth ~14px, onboarding ~18px)

**Depends on:** Step 1 wordmark lock ✓ (already done)

**Lock outputs:**
- Wordmark consistent across all surfaces
- Design-system.md updated with final wordmark CSS snippet

---

### STEP 10 — Type leading and tracking pass ✓

**Shipped May 2.** Full type audit across all surfaces. Key decisions locked:

- **Weight system:** 700 = data numbers. 600 = content names + wordmark. 500 = editorial headlines. 400 = everything else.
- **DM Sans tracking:** -0.03em everywhere in-app.
- **DM Mono tracking — two tiers:** 0.06em (nutrition panel data labels), 0.14em (all general UI chrome). No other values.
- Section numbers (01, 02…): DM Mono 600, 0.14em, color `var(--rule)`.
- Instruction step numbers: 9px DM Mono 400, 0.14em, `var(--muted)`, baseline-aligned.
- Meal card titles: 20px DM Sans 600, -0.03em. Class `.meal-card-name`.
- `font-light` (300) removed everywhere — floor is 400.
- `font-serif` alias swept from codebase.
- Manifesto `.pay` span `margin-top: -0.08em` removed (leading now uniform).

Full spec in design-system.md §1b–§1e.

---

### STEP 11 — Surface coherence check ✓

**Shipped May 2.** Full sweep of all screens desktop + mobile as part of the type audit pass. No straggler radii, no font-serif, no font-light, no off-spec tracking values found and left unresolved.

---

### STEP 12 — Email templates ☐

**Why last:** All visual decisions locked. Mechanical refresh.

**Templates:**
1. Email confirmation (sign up)
2. Magic link / passwordless
3. Password reset
4. Email change confirmation
5. Household invite (custom)

**Spec per template:**
- Wordmark (locked) at top, paper background
- Hairline rule below header
- Single editorial chapter eyebrow + DM Sans 500/700 headline (matches Title token, 40px)
- Body in DM Sans 14px, line-height 1.55
- Single sharp black CTA
- DM Mono 9px footer with link to web/legal
- No em-dashes, no decorative italic, no rounded buttons
- Plain-text fallback that reads cleanly

**Lock outputs:**
- 5 email templates updated in Supabase

---

## 4 · Out of scope for this pass

- RLS implementation (deferred per APP-INVENTORY.md)
- Account deletion flow (deferred)
- Recipe import improvements
- MCP package updates
- Performance work
- Dark mode pass (the tokens exist but no surface audit yet)

---

## 5 · How we'll work

- One step at a time, with mocks before code where it helps
- Every locked decision lands here in this doc with date and short rationale
- Open decisions get answered inline when we reach the step that needs them
- design-system.md gets updated as work lands, not at the end
- I'll flag when a decision in one step makes a downstream step easier or harder than expected

---

## 6 · Decision log (running)

| Date | Decision | Step |
|---|---|---|
| Apr 28 | Brand line: "Brand is paper & ink. Color belongs to the person." | 0 |
| Apr 28 | Dot doctrine: one mark, four meanings (person/moment/unit/decision) | 0 |
| Apr 28 | FAB killed | 4 |
| Apr 28 | Auth white panel killed | 7 |
| Apr 28 | Sign Out → Menu sheet (mobile) | 4 |
| Apr 28 | Menu rail constant + child-owned back buttons | 4 |
| Apr 28 | + NEW PLAN → planner toolbar right | 3 |
| Apr 28 | Wordmark direction: lowercase `good · measure`, dot is favicon, dot is B&W | 1 |
| Apr 28 | Italic serif typeface: Instrument deferred, alternatives to audition | 6 |
| Apr 28 | Type scale corrected: tracking steeper than Claude Design's notes | 0 / 10 |
| Apr 28 | Body lede token added (18px DM Sans 400, 1.55) | 0 / 10 |
| Apr 28 | **Wordmark locked**: lowercase `good · measure`, DM Sans 700, −0.02em base, g→o pair −0.05em via wrapping span | 1 |
| Apr 28 | **Dot locked**: visually equal to x-height, 0.32em sidebearings, x-height middle, ink only | 1 |
| Apr 28 | **Spacing rule**: dot diameter relates to caps, dot spacing relates to counters — both reference the typeface | 1 |
| Apr 28 | **Favicon**: graduated dot ratio, 50% at 16/24px, 44% at 32px+ | 1 |
| Apr 28 | **App icon (PWA-bound)**: 18% dot ratio, iOS-spec corner radius, maskable variant | 1 |
| Apr 28 | **Mark = dot, isolated** — no separate logo mark; dot inside wordmark IS the mark | 1 |
| Apr 28 | **HTML brand sheet abandoned** — CSS abstraction broke the wordmark render. Kept original visual reference + markdown spec instead. Tune the dot CSS value at integration time, against visual reference. | 1 |
| Apr 28 | **Brief 2A landed** — Mobile recipes/pantry toolbar: `.ed-search` hairline, text toggle GRID/LIST, text FILTER, FAB removed, `+ NEW` / `+ ADD` outlined buttons | 2 |
| Apr 28 | **Brief 2B landed** — Mobile planner toolbar rebuilt as two-row; cart/chart icons → text labels; `+ NEW PLAN` outlined added | 2 |
| Apr 28 | **Brief 2B.1 landed** — Planner toolbar collapsed to single row; SHOPPING moved to menu sheet; NUTRITION moved to day-header `VIEW NUTRITION ›`; `+ NEW PLAN` mobile flow stacked inputs; Shopping back link genericized | 2 |
| Apr 28 | **Brief 2B.2 landed** — PREV/NEXT dropped from mobile planner toolbar; swipe-on-day-strip for week nav; person chip height matched to toolbar buttons; `← BACK` rule applied to Shopping; NUTRITION chevron encoding fixed | 2 |
| Apr 28 | ~~**Mobile back-link rule locked**~~ — *Superseded by 2D.2 below.* Was: Always `← BACK`; `← BACK TO X` retired. | 2 / 4 |
| Apr 28 | **NUTRITION placement locked** — Contextual to day/person; `VIEW NUTRITION ›` below kcal bar on single-person planner view. Not in menu sheet. Hidden on Everyone view. | 2 |
| Apr 28 | **SHOPPING placement locked** — In menu sheet (reachable from multiple entry points). Removed from planner toolbar. | 2 |
| Apr 28 | **Planner toolbar mobile/desktop fully split** — `.pl-toolbar` desktop-only; `.pl-mob-toolbar` mobile-only. Future changes must touch both. | 2 |
| Apr 29 | **Brief 2D.2 landed** — Removed top back-bars from all form pages (New/Edit Recipe, New/Edit Pantry Item, Shopping, Add Meal). Refactored Shopping → `/shopping` (sibling route), Add Meal → `/meal-plans/add-meal` (child route). Removed `BottomRailContext` entirely (~900 lines deleted). Bottom rail right slot now has three variants: section locator on parent screens, SHARE on Shopping, date/person status on Add Meal. ADD TO PLAN button changed from outlined to filled black. Button hierarchy findings (filled-black on active toggle states) flagged for 2G. | 2D.2 |
| Apr 29 | **Mobile child-screen navigation rule locked** — No top back-bar on child screens. Navigation via cancel/save actions + persistent Menu. Right rail slot adapts per page. Replaces the Apr 28 `← BACK` rule. | 2D.2 |
| Apr 29 | **Brief 2E landed** — `--radius-xl` token removed (Approach B: 8px hardcoded on `.mob-sheet`). `--ease-drawer` token removed (unreferenced). `.mob-sheet` got `border-top: 1px solid var(--rule)` hairline. LandingScreenCycle demo sheet aligned to match real sheet (8px corners, 360ms, `var(--ease-out)`). All sheet chips and ContextualTip confirmed already sharp — no code changes needed there. | 2E |
| Apr 29 | **Bottom sheet corners locked** — 8px top corners hardcoded on `.mob-sheet`. Only exception to the sharp-default rule. Token `--radius-xl` removed. | 2E |
| Apr 29 | **Briefs 2F, 2F.1, 2G, 2G.1, 2G.2, 2H, 2H.1, 2H.2, 2H.3 landed** — Bottom rail signout divider, toggle underline rule system-wide, chip gap (24px desktop/16px mobile), sort direction inline arrow, recipes toolbar count baseline (`line-height: 1`), compare-mode inset card ring (`box-shadow: inset 0 0 0 2px var(--fg)`). Active state convention locked: 1.5px underline + ink text; never filled-black on toggles, never accent on state. | 2F–2H.3 |
| Apr 29 | **Brief 2I landed — Step 2 complete** — Radius tokens `--radius-md`, `--radius-lg`, `--radius-pill` all set to `0`. Two pill exceptions (`.hm-mob-person-chip`, `.mob-filter-badge`) hardcode `9999px` directly. Easing and accent-color leaks swept (`.cmp-overlay`, `.pl-swap-btn`, settings sidebar active indicator, MealPlanWeek selection state). System is grep-clean. Step 3 (mobile chrome rebuild) is unblocked. | 2I |
| Apr 30 | **Briefs 3A + 3B landed** — Full token system and register migration. Hardcoded hex values swept and replaced with CSS variables. White register (`data-register="white"`) added. All surfaces migrated to correct register. | 3A/3B |
| Apr 30 | **Brief 3D-2 landed** — Add Meal fully redesigned. Fixed left rail (meal type + Pantry Items), recipe grid with typographic ghost cells, editorial eyebrow/headline, footer. Desktop layout matches recipe detail X alignment. Rail uses nested `<span class="am-rail-label">` for tight underlines. | 3D-2 |
| Apr 30 | **`position: fixed` rail rule locked** — Rails must be siblings of the animated/scroll container, never children. CSS `transform` on an ancestor breaks `position: fixed`. Applies to Add Meal rail, jump nav, settings nav. | 3D-2 |
| Apr 30 | **Recipe grid typographic cell locked** — Cells without images are their own cell type: `display: flex; flex-direction: column; justify-content: flex-end` on the article element. Ghost photo div removed. Content bottom-anchored within cell. Mobile gets `aspect-ratio: 4/3` for visual mass. Display type: `clamp(28px, 2.8vw, 38px)` desktop, `clamp(40px, 10vw, 64px)` mobile. | 3D-2 |
| Apr 30 | **Brief 3D-3 landed** — Add Meal X alignment fixed (am-content `padding-left: 132px` to land at 196px total). Search placeholder: DM Mono 9px uppercase `FIND RECIPE…` / `FIND ITEM…`. Mobile Screen 1↔2 transition: AnimatePresence `mode="popLayout"`, direction-aware, 320ms `--motion-step`. | 3D-3 |
| Apr 30 | **Brief 3E-2 landed — Step 7 complete** — Auth rebuilt to paper bg. Vertical hairline is explicit `<div class="auth-divider" />` in `1fr 1px 1fr` grid. Auth headline `<em>` = Instrument Serif italic, black (not sage accent). | 3E-2 / Step 7 |
| Apr 30 | **Brief 3F-2 landed — Step 8 complete** — Onboarding topbar: wordmark left, step counter right. `§ ONBOARDING` permanently removed. Body wordmark and check icon removed from Welcome/Ready screens. | 3F-2 / Step 8 |
| Apr 30 | **Brief 3G-2 landed** — Settings SAVE button outlined. Grid typographic fallback for recipes without images. Cart button hidden on empty planner state. Goal preset underline for active selection. | 3G-2 |
| Apr 30 | **Nutrition panel semantic color locked (§2e)** — `--ok` and `--warn` removed as bar fill colors. Only `--err` used on bars (over-limit only). All other bars neutral `--muted`. Below-min callout: plain ruled row, no tinted bg, copy `+Xg to target`. Over-limit callout: tinted red err-chip retained. | X1-2 |
| Apr 30 | **Dead code sweep complete** — Removed: 4 unused `.module.css` files, `DailySummary.tsx`, 95 HTML mockup files from `/public/`, dead globals.css classes (`.fill-warn`, `.ob-wordmark`, `.ob-check-icon`). Archived superseded brief drafts to `briefs/_archived/`. | X2-2 |
| Apr 30 | **Step 3 complete.** Steps 7 + 8 also complete. Next: Steps 5/6 (copy pass + typeface lock), Step 9 (landing nav, combined), Step 10 (type leading pass). | — |
| Apr 30–May 1 | **MOB-Q1 landed** — Five quick mobile cleanups batched: bg bleed fix, topbar alignment, auth hairline, settings header padding, pantry icon audit. | 4 |
| Apr 30–May 1 | **MOB-CLEANUP-1 + 1B landed** — Spacing and visual corrections pass. Chip-to-hamburger gap fixed: trigger restructured to `width: auto` with inline padding so glyph-to-chip gap is exactly 8px at any viewport width. | 4 |
| May 1 | **MOB-1 landed** — Mobile top bar replaces bottom rail as primary navigation chrome. | 4 |
| May 1 | **MOB-2 landed** — Dashboard person pulldown: styled dropdown with `border: 1px solid var(--rule)`, hairline dividers between items. 1-person view shows static chip (no dropdown). | 4 |
| May 1 | **SHOP-1 landed** — Shopping: plan-scoped navigation, EmptyState component for zero-items state, date range min-width fix. | 4 |
| May 1 | **MOB-3 landed** — Recipe builder ingredient rows reflow to 3-row card on mobile via CSS grid. `.ing-main { display: contents }` lets children participate in parent grid directly. Field labels (Amount / Unit / Preparation) visible on mobile, hidden on desktop. | 4 |
| May 1 | **MOB-4 landed** — Add Meal converted to full-overlay two-step bottom sheet (`AddMealSheet`). Renders via `createPortal`. Backdrop `.mob-sheet-backdrop--above-nav` covers full viewport including top bar. Step 1 (picker) at `maxHeight: 75vh`; step 2 (browse) at `maxHeight: calc(100dvh - 60px)`. Transition is CSS max-height, not a cross-slide. Do NOT add `sheet-delay-touch` — it overrides the `sheetUp` animation. | 4 |
| May 1 | **Planner day strip padding locked** — `padding-left/right: 12px` (not `var(--pad)` = 28px which was too inset, not 0 which overshot edges). | 4 |
| May 1 | **Person pulldown dropdown style locked** — `border: 1px solid var(--rule)` + `box-shadow: 0 4px 12px rgba(0,0,0,0.08)` on both planner and dashboard mobile dropdowns. Matches desktop filter tag dropdown exactly. | 4 |
| May 1 | **Recipe grid uniform row heights locked** — `grid-auto-rows: calc(18.75vw + 110px)` (4-col) / `calc(25vw + 110px)` (3-col) / `auto` (mobile). All cards carry `border-bottom`; no `nth-last-child` stripping. | 4 |
| May 1 | **Step 4 complete.** Remaining mobile surfaces: recipe detail, auth/onboarding expression. | — |
| May 2 | **Brief 5A landed** — Eyebrow casing enforced UPPERCASE at component level. `Done — dismiss` → `Dismiss` (em-dash removed). `+ Add` → `+ ADD` in MealPlanWeek. `Go home` → `GO HOME →` in 404. Breadcrumb and AddMealSheet date eyebrow casing verified as enforced via class. `§ ` convention audited app-wide; marketing strings deferred to Step 6. | 5A |
| May 2 | **Brief 5B landed** — Button casing rule locked in design-system.md §1d: all button labels render UPPERCASE regardless of register; class handles it, source strings may be mixed-case. 43 button-related classes audited; one fix (`.mob-sheet-clear`). RecipeBuilder, AddMealSheet, and login button source strings uppercased. | 5B |
| May 2 | **Brief 5C landed** — Empty-state CTAs added/fixed. `CLEAR FILTERS →` on Recipes and Pantry no-matches states. Planner SELECT A PLAN confirmed as Case A (reachable when user deletes current plan while others exist); headline → `A week to plan.` + `+ CREATE PLAN →` CTA. Shopping no-ingredients: `+ ADD MEALS →` → `OPEN PLANNER →`. Dashboard NOTHING TODAY → `+ ADD MEAL →` with `todayISO` local date and `planId` prefilled. EmptyState `lede` prop made optional. | 5C |
| May 2 | **Brief 5D landed** — Form-page headline voice locked. Path-style breadcrumbs (`RECIPE / NEW`) → single `§ NEW` / `§ EDIT` eyebrows. Headlines lowercase, sentence case, period: `A new recipe.`, `Edit this recipe.`, `A new pantry item.`, `Edit this pantry item.` Working-surface scale (`clamp(22px, 2.4vw, 32px)`) extended to Add Meal (`.pl-add-title`) and Shopping (`.pl-shop-title`). | 5D |
| May 2 | **Working-surface vs editorial scale split locked** — Headlines split by user intent: editorial bookends (landing, auth, onboarding bookends, dashboard hero, full-page empty states, 404) at Display scale (`clamp(36px, 4.4vw, 64px)`); working surfaces (forms, Add Meal, Shopping) at form-title scale (`clamp(22px, 2.4vw, 32px)`). Step 10 will verify the split system-wide. | 5D |
| May 2 | **Brief 5E landed** — Dashboard stats empty state: three-element composition (eyebrow + lede + CTA; no headline — strip is a quiet inline section that doesn't earn an editorial moment). Strip-bottom hairline moved to outer wrapper so it renders in both states. Dialog voice rule locked in design-system.md §5j: title sentence case ending `?` or `.`, body brief and factual, confirm label single verb UPPERCASE. All `dialog.confirm` calls audited; fixes: `Delete plan` → `DELETE` confirm label; `Remove ${name}?` → `Remove "${name}"?`; `Sign out` → `SIGN OUT`. | 5E |
| May 2 | **Step 5 complete.** Editorial pass and § convention done across the app. Landing italic density and landing copy adjustments absorbed into Step 6 — they're tightly coupled to the italic typeface decision. | — |
| May 2 | **Step 6 complete — italic serif removed entirely.** Instrument Serif removed. System is DM Sans + DM Mono only. `<em>` convention retained only for dashboard greeting (theme-accent color, not italic). Auth `<em>` italics removed. Landing hero: "Measure what matters." Auth create account: "Set up your kitchen." Auth sign in: "Pick up where you left off." Running bar locked to four statement labels. § METHOD section removed from landing. Landing headline-to-body gap normalized to 24px. | 6 |
| May 2 | **Steps 10 + 11 complete — type audit.** Weight system locked (700/600/500/400 with specific semantic roles). DM Sans -0.03em everywhere. DM Mono two-tier tracking: 0.06em (data labels) / 0.14em (chrome). Section numbers → DM Mono 600. Instruction step numbers → 9px DM Mono 400 0.14em. Meal card titles → 20px 600 `.meal-card-name`. `font-light` swept to 400. `font-serif` alias removed. Manifesto `.pay` margin-top removed. Full spec in design-system.md §1b–§1e. | 10 / 11 |


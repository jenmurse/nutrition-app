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
- ✓ **Two typefaces + one italic serif accent.** — DM Sans, DM Mono, plus an italic-only serif for display emphasis. Italic serif is "spice not sauce" — display only (24px+), one word per headline, never in body, never in wordmark, never decorative.
- ✓ **Sharp is default. Round = identity (the dot only). Pill = legacy stragglers.**

### Italic serif typeface
- ◇ **Open: Instrument Serif vs alternative.** Instrument is having a moment which makes leaning into it feel less original. Park this exploration for the copy pass — fonts to audition: GT Sectra, Editorial New (free), Domaine Display, Tiempos Headline, Migra. Decision deferred to Step 6.

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

| ID | Question | My recommendation | Status |
|---|---|---|---|
| Q1.1 | Bottom sheet top-corner radius: sharp / 8px / 12px / keep 20px | **8px — hardcoded on `.mob-sheet`. Token `--radius-xl` removed (Approach B).** | ✓ resolved in 2E |
| Q1.2 | Toolbar icons (cart, chart, view toggles, filter): ghost no-fill / sharp outlined / text labels only | Text labels only on mobile — icons aren't earning their weight | ◇ decide in Step 3 |
| Q4.1 | Form crumb pattern (`RECIPE / NEW` vs `§ RECIPE / NEW`) | Leave as metadata, no § | ◇ decide in Step 5 |
| Q4.2 | `§ STEP ONE` on Add Meal — keep or simplify | Keep — § marks editorial chapter, "STEP ONE" alone reads as wizard chrome | ◇ decide in Step 5 |
| Q5.5 | Nutrition sheet over-limit warning treatment: keep `--err-l` fill (current) or convert to left-rule margin-note (per design-system.md spec) | Keep current fill — it's working. Update the doc to match implementation. | ◇ decide in Step 3 |
| Q11.1 | Mobile landing running bar: drop / single label / marquee | Drop entirely. Wordmark + SIGN IN is enough. | ◇ decide in Step 11 |
| Q11.2 | Desktop landing running bar labels: keep statement-style or convert to section anchors (`§ PREMISE / METHOD / INVITATION`) | Keep as is — working, distinctive | ◇ decide in Step 11 |

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

### STEP 4 — Mobile design edits ☐ (rescoped)

**Original scope shipped:** Back-button pattern, Sign Out location, Menu sheet, bottom rail behavior on child screens — all landed in 2D.2 and 2F.

**Rescoped scope:** Mobile-specific design edits surfaced by a mobile audit. Original IA items are done; this step now covers whatever the mobile audit surfaces — polish, rhythm, editorial expression on small screens, anything that doesn't fit elsewhere. Run the audit first, then define the punch list.

---

### STEP 5 — Editorial pass and § convention ☐

**Why fifth:** Voice and convention rules. Doesn't depend on visual locks; could happen in parallel with Step 3, but listing here for ordering clarity.

**§ rule (locked):** Use `§` to introduce an editorial headline. Don't use it on UI labels, controls, or metadata.

**Audit:**
- Walk every `§` usage in the app + landing
- Walk every place a `§` should be added
- Form crumbs (`RECIPE / NEW`) — Q4.1 decides

**Editorial pass items:**
- Verify all empty states use `§ EYEBROW / Display headline / lede / outlined CTA` pattern
- Verify shopping list / add meal headers consistent
- Onboarding bookend pages use `§ WELCOME` / `§ READY` (already do)
- Onboarding interior steps use `§ YOUR PROFILE` / `§ YOUR HOUSEHOLD` / `§ YOUR GOALS` (already do)

**Lock outputs:**
- One-paragraph rule in design-system.md
- All § usage consistent

---

### STEP 6 — Italic serif decision and copy pass ☐

**Why sixth:** Touches landing, auth, onboarding, possibly empty states. Italic typeface choice and copy line-edits done together because they affect each other.

**6a · Italic typeface audition**
- Current candidate: Instrument Serif italic
- Alternatives to test: GT Sectra, Editorial New (free, PangramPangram), Domaine Display, Tiempos Headline, Migra
- Lock: 1 italic serif for the whole system
- Set rule: italic only, 24px+, never in body, never in wordmark, never decorative, scope to display contexts via specific class (not global `<em>`)

**6b · Italic application audit**
Walk every italic moment with the rule "spice not sauce":
- Landing hero `actually` ✓ (one word)
- Landing section 02 `other` ◇ (third italic on the page — does it earn it?)
- Landing section 04 `matrix` ◇ (fourth italic — getting close to wallpaper)
- Auth `left off` ◇ (two words — Claude Design says "rarely two")
- Brand system pages `paper & ink`, `human and singular`, `italic serif` — these are doc usage, not product

**Discussion:** With three italic moments on the landing, are we still in spice territory? My push: keep landing hero italic, convert section 02 and 04 to bold or upright. Auth `left off` — convert to bold (clearer at sign-in scale where serif italic is dramatic). Confirm with you.

**6c · Em-dash strip on landing**
Specific edits already drafted in creative-direction.md (Section 7). Six em-dashes to replace with comma / period / colon.

**6d · Specific line edits**
Drafted in creative-direction.md. Walk through each.

**Lock outputs:**
- Italic typeface chosen + loaded
- Landing copy revised
- Em-dashes gone
- Italic moments locked per surface

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

### STEP 10 — Type leading and tracking pass across all surfaces ☐

**Why tenth:** With Step 1's type scale locked, sweep every surface and verify each headline uses the right token.

**Items:**
- Dashboard hero: 11.5vw / −0.04em / 0.91 line-height
- Landing hero: 96px / −0.035em / 1.0 line-height
- Auth lede, onboarding bookend, empty state headlines: 64px display token (−0.03em / 1.05)
- Recipe titles, page titles: 40px title token (−0.025em / 1.10)
- Section heads inside long-scroll pages: 24px section token (−0.02em / 1.20)
- All eyebrows: 9px DM Mono UPPERCASE / +0.14em
- Body lede paragraphs (under display headlines): 18px / 0 / 1.55 — NEW token

**Lock outputs:**
- Type tokens defined in design-system.md
- Every surface verified to use the right token

---

### STEP 11 — Surface coherence check ☐

**Why eleventh:** Final sweep before emails. Walk through every screen on desktop + mobile and verify:
- Wordmark consistent
- Linework consistent
- Type tokens applied
- § convention applied
- No straggler radii
- No magnifier icons
- No FAB
- No auth white
- Italic moments per Step 6 decision
- Mobile back buttons present on child screens
- Sign Out only in Menu sheet on mobile

**Output:** Pass/fail per screen, fix punch list.

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


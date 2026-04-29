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
- ✓ **Stays constant on every screen** as global orientation. Child screens (New Recipe, New Pantry Item, Add Meal, Shopping) carry their own `← BACK` row at top. Bottom rail keeps `Menu | NN/NN — SECTION` always.

### Mobile back-link copy
- ✓ **Always `← BACK`.** Page eyebrow + title provide orientation; the back link's only job is to navigate one step up. `← BACK TO X` labels are wrong on screens reachable from multiple entry points and redundant everywhere else. Applies to all mobile back-row links. Desktop breadcrumb patterns unaffected.

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
| Q1.1 | Bottom sheet top-corner radius: sharp / 8px / 12px / keep 20px | 8px — quietly rounded enough to read as a sheet without iOS-default | ◇ decide in Step 3 |
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

### STEP 2 — Linework and radius audit ☐

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
- Bottom sheet top corners (currently 20px) → 8px (per Q1.1 recommendation)
- Onboarding contextual tip box rounded corners → sharp + left rule (matches over-limit warning pattern)

**Token changes:**
- `--radius-pill: 0` (was 9999px legacy)
- `--radius-md: 0` (was 12px)
- `--radius-lg: 0` (was 16px)
- `--radius-xl: 8px` (was 20px) — sheet top corners only

**Lock outputs:**
- Updated radius tokens in design-system.md
- Punch list of every component class with stale radius

---

### STEP 3 — Mobile chrome rebuild ☐

**Why third:** The biggest piece of visual work. Linework and wordmark are locked, so chrome decisions are now mechanical.

**Substeps:**

**3a · Index toolbars (Recipes, Pantry)**
- Replace bordered rounded search with hairline-underline search (no magnifier)
- Replace rounded square buttons with text-button toggles `GRID / LIST` and text `FILTER`
- Active state = baseline 1.5px underline
- `+ NEW` text button replaces FAB

**3b · Planner toolbar**
- Cart icon → text `SHOPPING` (or `SHOPPING ›`)
- Chart icon → text `NUTRITION ›`
- Add `+ NEW PLAN` (sharp black) right side
- Person chip stays as pill (locked identity exception)
- Date controls (`PREV NEXT THIS WEEK`) collapse if width-tight

**3c · Bottom sheets**
- Top corners 8px (or whatever Q1.1 lands on)
- Drag handle stays
- Backdrop variants (`.mob-sheet-backdrop`, `.mob-sheet-backdrop--above-nav`) unchanged

**3d · FAB removal**
- Remove FAB component from Recipes index, Pantry index
- Confirm `+ NEW` text button is the only primary action
- Remove the round-black-circle stack from globals.css

**3e · Form chrome alignment**
- All native `<select>` dropdowns → custom styled with bottom-border only OR keep native but strip rounded border
- All form rounded borders → sharp or hairline-underline

**Lock outputs:**
- Mobile recipes/pantry/planner toolbars in production
- Sheet radius lock
- All FAB code removed

---

### STEP 4 — Mobile information architecture ☐

**Why fourth:** Decisions are largely locked already (Section 1 above). This step is implementation.

**Items:**
- New Recipe screen gets `← BACK TO RECIPES` top row (matches Add Meal pattern)
- New Pantry Item gets `← BACK TO PANTRY` top row
- Sign Out moves from Settings bottom to Menu sheet last item
- Menu sheet adds `Sign Out` row (with hairline above it separating from nav items)
- Bottom rail labels stay constant on child screens (`02/04 — PLANNER` even when on a child screen, since it indicates the section the user is logically in)

**Lock outputs:**
- Mobile back-button pattern consistent across all child screens
- Sign Out in one location only

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

### STEP 7 — Auth screen ☐

**Why seventh:** Brand mark + linework + italic typeface all locked. Auth is one focused screen.

**Items:**
- Right panel goes from white to `--bg` (paper)
- Inputs stay bottom-border-only (already correct)
- Vertical hairline divider between editorial half and form half on desktop; horizontal hairline on mobile
- Wordmark in topbar = new locked wordmark
- `§ SIGN IN` / `§ CREATE ACCOUNT` eyebrow stays
- Italic on lede — apply Step 6 decision
- Hero scale and tracking — apply Step 1 type scale (matches landing hero size)

**Lock outputs:**
- Auth desktop + mobile rebuilt to spec

---

### STEP 8 — Onboarding ☐

**Why eighth:** Same dependencies as auth.

**Items:**
- Topbar wordmark (left) — apply locked wordmark
- Topbar step counter (right) — verify mono spec matches Step 1 type scale (DM Mono 9–11px, +0.14em)
- Hairline below topbar stays
- Step 1 (Welcome) and Step 5 (Complete) wordmark in body uses locked wordmark
- Theme picker dot circles — verify they read as the dot system (not just generic radio buttons)
- Italic on bookend headlines — apply Step 6 decision (`measure what matters` is the most-likely italic candidate, only word that needs emphasis)
- Native `<select>` — replace per Step 2 (already in linework punch list but worth tracking here)

**Lock outputs:**
- Onboarding desktop + mobile rebuilt to spec

---

### STEP 9 — Landing nav ☐

**Why ninth:** Brand mark + linework locked.

**Items:**
- Desktop nav: wordmark left (locked version), running-bar labels middle, `SIGN IN` right
- Verify running-bar labels fit at design width without truncation
- Mobile nav: wordmark left, `SIGN IN` right; drop running bar entirely (per Q11.1)
- Verify tap targets meet 44px floor on mobile

**Lock outputs:**
- Landing nav desktop + mobile rebuilt

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
| Apr 28 | **Mobile back-link rule locked** — Always `← BACK` on mobile. Page eyebrow + title provide context. `← BACK TO X` labels retired. Applies to all mobile back-row links; desktop unaffected. | 2 / 4 |
| Apr 28 | **NUTRITION placement locked** — Contextual to day/person; `VIEW NUTRITION ›` below kcal bar on single-person planner view. Not in menu sheet. Hidden on Everyone view. | 2 |
| Apr 28 | **SHOPPING placement locked** — In menu sheet (reachable from multiple entry points). Removed from planner toolbar. | 2 |
| Apr 28 | **Planner toolbar mobile/desktop fully split** — `.pl-toolbar` desktop-only; `.pl-mob-toolbar` mobile-only. Future changes must touch both. | 2 |


# Step 2 — Linework + Radius Audit

**Status:** Audit pass · April 28, 2026
**Output of:** Step 2 of the design pass (master-plan.md)
**Source for:** the implementation brief that follows

---

## 0 · Purpose and approach

The locked design system says "sharp is default; round = identity (the dot only); pill = legacy holdover." But the implemented app has drift — radii on inputs, sheets, dropdowns, and tile icons that contradict the rule. Mobile especially has reverted to iOS-app conventions on chrome surfaces while the content is editorial.

This audit walks every surface in the screenshots, names every corner/border/icon-button decision currently shipping, and proposes the change. Output is a punch list keyed to design-system.md tokens.

What this audit is NOT:
- A redesign. Surfaces stay where they are; only their corners, borders, and icon treatments change.
- A spec for the work itself. That's the brief that follows. This is the source data.

What goes into design-system.md after Step 2 lands:
- Updated radius token values
- Updated icon-button rules
- Updated sheet/modal radius rule
- A list of what's shipped vs what's pending

---

## 1 · The locked rules (for reference while reading)

| Rule | Source |
|---|---|
| Sharp = default. Round = identity (the dot). Pill = legacy. | design-system.md §4 |
| Outlined button border = `var(--rule)`, never black or `--err`. | design-system.md §5a |
| Destructive buttons outlined in `--rule`, **never filled black**. Filled black is for single primary CTA per page. | enforcement §2 |
| No magnifier icon on search. Hairline underline only. | Locked in earlier session, mobile-ux.md §search |
| All modals/dialogs sharp, sized to content, no pill buttons inside. | design-system.md §5h, brief 16d, brief 18 |
| Toolbar icon buttons currently fill `--bg-3` no border, but flagged as "legacy holdover." | design-system.md §5g |
| Bottom sheet top corners use `--radius-xl: 20px`, the only round-corner exception. | design-system.md §4b |
| Active states for chips and view toggles = 1.5px baseline underline, not pill fill. | design-system.md §5b, §5c |
| Identity markers (avatar, person pill, theme swatch, checkbox, radio) stay round. | design-system.md §4a |
| Heart favorite icons removed. | design-system.md §12 |
| **Filled black** = single primary CTA per page (Sign In, Get Started, Save). **Outlined** = everything else, including secondary creation actions like `+ NEW`, `+ NEW PLAN`, `+ ADD`. Hierarchy lives in fill, not in size or position. | design-system.md §5a, brief 16d |
| **Pill exceptions kept:** `.hm-mob-person-chip` (mobile dashboard person tabs) and `.mob-filter-badge` (notification count badge). Everything else sharp. | enforcement §1 |
| `var(--accent)` / `var(--cta)` / `var(--accent-l)` reserved for identity markers only — NEVER on focus borders, hover states, selection backgrounds, or `::selection`. | enforcement §2 |
| Easing is always `var(--ease-out)` = `cubic-bezier(0.23, 1, 0.32, 1)`. Never `linear`, `ease-in-out`, or `ease-in` for UI. | enforcement §3 |
| Locked durations: {120, 240, 280, 320, 360, 420}ms. Any deviation is a bug unless intentional. | enforcement §3 |

---

## 2 · The audit, surface by surface

For each surface: **current** describes what's shipping (from the screenshots), **target** describes what should be there per the rules, **change** is the punch-list entry.

### 2a · App nav (desktop)

**Current:** Wordmark left ("Good Measure" Title Case, DM Sans 700, ~13px). Three tab links middle. Person switcher pills (round, identity-correct). Settings gear icon. SIGN OUT text link right. All sharp where it matters.

**Target:** Wordmark replaced with locked `good · measure` lowercase wordmark per Step 1. Tabs and other elements unchanged. SIGN OUT moves out of nav once mobile parity lands (Step 4); on desktop it's currently fine.

**Change:** Wordmark swap (deferred to Step 7 surface application). No linework changes.

---

### 2b · Mobile menu rail (bottom)

**Current:** "Menu" text label left, "NN/NN — SECTION" mono right. Sharp hairline above. No corner issues. This is the editorial rail (Option B) we locked.

**Target:** Same. Plus on child screens (New Recipe, New Pantry Item, Add Meal, Shopping), child screens carry their own `← BACK TO X` row at the top while the rail stays constant.

**Change:** No linework changes. IA-only changes are tracked in Step 4.

---

### 2c · Mobile recipes/pantry index toolbar (the worst offender)

**Current (per `mobile_recipe_list.png`, `mobile_recipe_grid.png`, `mobile_pantry_list.png`):**
- Search input: bordered rounded rectangle (~10px radius) with magnifier icon inside, `Search recipes...` placeholder
- View toggle (grid/list): bordered rounded square buttons (~6px radius) with grid/list icons, active state filled black
- Filter button: bordered rounded square (~6px radius) with sliders icon
- FAB (round black, bottom-right) for `+ NEW`

**Target:**
- Search input: hairline-underline only, no magnifier, DM Mono UPPERCASE placeholder ("SEARCH" or "FIND RECIPE"), bottom border darkens on focus. Per `.ed-search` spec and the locked "no magnifier" rule.
- View toggle: text-only DM Mono `GRID / LIST`, active state = 1.5px baseline underline. Per `.ed-toggle` spec.
- Filter: text-only DM Mono `FILTER`, no icon, no border, no fill. Tapping opens the existing filter bottom sheet.
- FAB: removed. `+ NEW` becomes a sharp black `.btn-primary` text button on the right of the toolbar.

**Change items:**
- **C-1** Replace mobile recipe/pantry search input with `.ed-search` style (hairline underline, no magnifier).
- **C-2** Replace view toggle with text-only `.ed-toggle` style (baseline underline active state).
- **C-3** Replace filter button with text-only `FILTER` link.
- **C-4** Remove FAB component. Replace with `+ NEW` outlined text button on the right of the toolbar (matches desktop pattern — outlined, not filled, since `+ NEW` is a secondary action, not the page's single primary CTA).
- **C-5** Toolbar adopts `padding: 0 var(--pad)` and `52px` height per the existing toolbar spec — verify it matches.

---

### 2d · Mobile planner toolbar

**Current (per `mobile_planner.png`):**
- Date range left ("APR 26 – MAY 2") · prev/next arrows · cart icon (filled `--bg-3` rounded tile) · chart icon (filled `--bg-3` rounded tile) · person chip pill right
- No `+ NEW PLAN` button anywhere

**Target (two-row toolbar — locked):**
- Row 1 (44px): Date range · prev/next labels · person chip pill (right)
- Row 2 (44px): SHOPPING › · NUTRITION › · `+ NEW PLAN` outlined (right)
- Total toolbar height ~88px

**Change items:**
- **D-1** Cart and chart icons become text labels: `SHOPPING ›` and `NUTRITION ›`. Style: DM Mono 9px UPPERCASE, no border, no fill, hover `var(--fg)`.
- **D-2** Add `+ NEW PLAN` button as `.btn-outline` (sharp outlined, `var(--rule)` border) — not filled — matching the desktop planner toolbar. Filled black is reserved for the single primary CTA per page; `+ NEW PLAN` is secondary.
- **D-3** Toolbar wraps to two rows. Row 1 holds locator/identity (where you are, who you are). Row 2 holds actions (what you can do). Hairline divider between the rows.
- **D-4** Person chip pill stays in Row 1 right side (locked identity exception).

---

### 2e · Mobile planner day-focused view

**Current (per `mobile_planner.png`):** 7-day strip top, day-focused content below (TUESDAY 28, kcal bar, BREAKFAST/LUNCH/DINNER ruled rows). All sharp, all editorial. No issues.

**Target:** Same.

**Change:** None.

---

### 2f · Mobile recipe detail

**Current (per `mobile_recipe_detail.png`):**
- Photo top, BREAKFAST eyebrow, recipe title (sharp, editorial)
- Action buttons row: EDIT / DUPLICATE / DELETE — sharp outlined per spec ✓
- "○ FAVORITE" with circle prefix glyph
- Section heads `01 Ingredients` editorial ✓
- Scale buttons `1× 2× 4× 6×` — pill-shaped chips

**Target:**
- All same except:
- FAVORITE glyph: remove the circle prefix. Either replace with no prefix (just `FAVORITE`) or use a star/check sigil. Decision: drop the prefix entirely. The action's state (active vs not) is communicated by text style — active = ink, inactive = muted.
- Scale buttons: convert to a chip pattern matching the locked `.filter-chip` style (DM Mono 9px UPPERCASE, no fill, no border, active = 1.5px baseline underline). Set as `1× 2× 4× 6×` UPPERCASE-style (or keep numerals — confirm), spaced like a toolbar control row.

**Change items:**
- **F-1** Remove circle prefix on FAVORITE.
- **F-2** Replace pill-shaped scale buttons with baseline-underline chips. They're not identity, they're a state control.

---

### 2g · Mobile recipe form (new recipe / edit recipe)

**Current (per `mobile_recipe_new.png`, `mobile_recipe_edit.png`):**
- Eyebrow `RECIPE / NEW`, title "New Recipe" — sharp editorial ✓
- Import field with paste-input + IMPORT outlined button + UPLOAD FILE outlined button — both sharp outlined ✓
- Section heads `01 Basics`, `02 Photo`, `03 Ingredients` — editorial ✓
- Form inputs: bottom-border-only ✓
- Native `<select>` dropdowns (SERVING UNIT, PREP TIME) — bordered rounded, native iOS appearance
- Ingredient row inputs (Almond flour, qty, cup) — sharp ✓
- "Preparation (optional)" field — bottom-border ✓
- Drag handles (·· prefix on each ingredient row) — fine
- Section heads visible, but no back button at top of screen — orphaned form

**Target:**
- All same except:
- Native `<select>` dropdowns: replace with custom-styled dropdowns, bottom-border-only, with a `▾` caret right-aligned. OR: keep native but strip the rounded border via Tailwind `appearance-none` + custom borders. Either way, end result matches form input style.
- Add `← BACK TO RECIPES` row at top, mirroring shopping-list and add-meal patterns.

**Change items:**
- **G-1** Replace native `<select>` styling with bottom-border + custom caret. (Implementation detail: keep native `<select>` for accessibility, just reset `appearance: none` and apply form-input styling + a `::after` caret if possible, otherwise an inline span.)
- **G-2** Add `← BACK TO RECIPES` row at top of New Recipe / Edit Recipe screens (mirrors shopping pattern).

---

### 2h · Mobile pantry form (new pantry item)

**Current (per `mobile_pantry_new.png`):**
- Eyebrow `PANTRY / NEW`, title "New Pantry Item" — editorial ✓
- Section heads `01 Lookup`, `02 Details` — editorial ✓
- USDA search input + USDA LOOKUP outlined button — sharp ✓
- ITEM NAME bottom-border input ✓
- CATEGORY: native `<select>` — bordered rounded, OTHER label
- DEFAULT UNIT: native `<select>` — bordered rounded, "g (grams)" label
- No back affordance at top

**Target:** Same fixes as 2g.

**Change items:**
- **H-1** Same as G-1 — strip rounded borders from native dropdowns.
- **H-2** Add `← BACK TO PANTRY` row at top.

---

### 2i · Mobile auth screens

**Current (per `mobile_auth_sign_in.png`, `mobile_auth_create.png`):**
- Topbar wordmark + ← BACK ✓
- Editorial top half (eyebrow `§ SIGN IN`, headline "Pick up where you left off.", lede)
- White-bg form half: SIGN IN / CREATE ACCOUNT tabs (active = baseline underline ✓), email + password inputs (bottom-border ✓), SIGN IN button (sharp filled black ✓), OR separator, CONTINUE WITH GOOGLE outlined button ✓
- The split is visually jarring at the form-half cutover (paper → white)

**Target:**
- Form half goes paper (`var(--bg)`), no white. Hairline divider between editorial and form halves stays.
- All other elements unchanged.

**Change items:**
- **I-1** Form half background `var(--bg)`. Remove white. Done in Step 7 (auth surface application), but tracked here as part of the radius/linework dependency — the white surface is itself a system contradiction.

---

### 2j · Mobile onboarding

**Current (per `mobile_onboarding_*.png`):**
- Topbar `§ ONBOARDING` left, step label right, hairline below — editorial ✓
- Welcome screen: wordmark, eyebrow, headline, lede, GET STARTED filled button ✓
- Step screens: eyebrow, headline, lede, NAME bottom-border input, theme picker dots (round, identity-correct) ✓, BACK ghost + CONTINUE filled buttons ✓
- Native `<select>` dropdown for "household type" or similar may exist on later steps — not visible in screenshots, flag for verification

**Target:** Same. Verify no native `<select>`s with rounded borders.

**Change items:**
- **J-1** Audit onboarding steps 2/3/4 (household, goals) for any native `<select>` rendering. If found, apply same fix as G-1.

---

### 2k · Onboarding contextual tip (dashboard)

**Current (per `mobile_onboarding_checklist.png`):** "SWITCHING BETWEEN PEOPLE" tip card — purple `--accent-l` background, purple `--accent` left border (vertical 2-3px rule), eyebrow + body. Rounded corners (~10px) on the entire card.

**Target:** Sharp corners. Left rule + tinted fill is the right pattern (matches over-limit warning style and is documented in onboarding.md §3 styling). Just make it sharp.

**Change item:**
- **K-1** Contextual tip card: `border-radius: 0`. Keep tinted fill + left rule.

---

### 2l · Bottom sheets (filter, nutrition)

**Current (per `mobile_nutrition.png`, plus filter sheet referenced):**
- Sheet top corners: `--radius-xl` (20px) — soft rounded
- Drag handle ✓
- Sticky header inside sheet with title + X close
- Content (nutrient rows, over-limit warnings as fill cards)
- Animation easing: `cubic-bezier(0.32, 0.72, 0, 1)` per mobile_ux.md — **but enforcement file says always `var(--ease-out)` = `cubic-bezier(0.23, 1, 0.32, 1)`. One is stale.**

**Target:**
- Sheet top corners: 8px (slightly rounded — reads as "this is a sheet" without iOS-default feel) OR sharp (no radius at all, full hairline rule top edge). Decision: **8px**. Sheet should still read as a separable surface from the content beneath, but tighter than 20px.
- Animation: align to `var(--ease-out)` per the enforcement rule. The mobile_ux.md description of the curve is descriptive of what was shipped; the enforcement rule is what should ship. Match enforcement.

**Change items:**
- **L-1** Update `--radius-xl: 8px`. Audit whether anything else uses `--radius-xl` and fix that too.
- **L-2** Verify the over-limit warning rows inside the nutrition sheet — they currently use `--err-l` fills, which is consistent with the desktop implementation. Design-system.md §5b describes them as "left rule margin-notes" but the actual implementation is fill-based. The fill version is working visually. Decision: **keep the fill, update design-system.md to reflect implementation reality.** This is consistent with enforcement §2 — `--err-l` is forbidden on *selection states*, not on actual over-limit semantic warnings.
- **L-3** Audit sheet animation easing — confirm it uses `var(--ease-out)`. If it doesn't, change to match. Update mobile_ux.md to remove the conflicting curve description.

---

### 2m · Toolbar icon buttons across the app

**Current:** Per design-system.md §5g, toolbar icon buttons are pill-shaped (`--radius-pill`), `--bg-3` fill, no border. The doc explicitly flags this as "legacy holdover; will be reviewed in stragglers pass." That review is now.

**Surfaces using this pattern:**
- Mobile planner toolbar — cart, chart (already covered above; converting to text labels per D-1)
- Mobile recipe/pantry toolbars — view toggles, filter (already covered; converting to text per C-2/C-3)
- Anywhere else?

**Target:** Pattern is retired. Default goes to text labels for toolbar utility actions. Any remaining icon-only buttons should be ghost (no fill, no border, hit area expanded via `::before`) and only used where truly needed (e.g. close X on sheets, drag handles).

**Change items:**
- **M-1** Remove `.toolbar-icon-btn` from globals.css after C-2/C-3/D-1 land.
- **M-2** If any close/X buttons remain (sheet headers, modal headers), verify they're ghost-style (transparent bg, hairline border or no border, sharp corners).

---

### 2n · FAB (Recipes, Pantry)

**Current:** 52px round black circle, bottom-right above bottom rail. The only round-black element in the app outside identity dots.

**Target:** Removed. `+ NEW` text button moves into the toolbar.

**Change item:**
- **N-1** Delete FAB component, FAB CSS, all references. Verify no other surface depends on it.

---

### 2o · Modals and confirmation dialogs

**Current per brief 16d sweep:** All confirmation dialogs (delete recipe, remove member, revoke invite, etc.) and action dialogs (select meal type, add to meal plan) should already be sharp + outlined per design-system.md §5h.

**Target:** Same. Verify the post-16d state is still in place — no regressions.

**Change item:**
- **O-1** Visual verification pass on all modals during Step 11 (surface coherence check). No active code changes expected.

---

### 2p · Form input borders globally

**Current:** Bottom-border-only inputs are the locked spec (`design-system.md §5d`). Should be applied everywhere. Audit for stragglers.

**Target:** Same.

**Change item:**
- **P-1** During implementation, grep for any input with full border or rounded border in the app code. Convert to bottom-border-only.

---

### 2q · Radius tokens in CSS

**Current values (design-system.md §4b):**
```css
--radius-md:   12px;   /* legacy — reserved for landing mockup cards only */
--radius-lg:   16px;   /* legacy — reserved for shopping list modal */
--radius-xl:   20px;   /* mobile bottom sheet top corners only */
--radius-pill: 9999px; /* legacy — keep until last pill is swept */
```

**Target values:**
```css
--radius-md:   0;      /* legacy use eliminated */
--radius-lg:   0;      /* legacy use eliminated */
--radius-xl:   8px;    /* mobile bottom sheet top corners only */
--radius-pill: 0;      /* legacy holdover swept */
```

The shopping list modal — currently using `--radius-lg: 16px` per the comment — should be sharpened to match every other modal. Same for landing mockup cards (decision: also sharp; landing should rhyme with the app, not float in its own card aesthetic).

**Change items:**
- **Q-1** Set radius tokens to the target values above.
- **Q-2** Audit shopping list modal — convert from `--radius-lg` to sharp.
- **Q-3** Audit landing mockup card components — convert from `--radius-md` to sharp.
- **Q-4** Grep for hardcoded `border-radius: 4px / 6px / 8px / 12px / 16px / 20px` outside the bottom-sheet usage and convert to 0 unless explicitly justified.

---

## 3 · Punch list (consolidated)

This is what gets sent to implementation. Each line is a single, scoped change.

### Mobile recipes/pantry toolbar (3a–c)
- **C-1** Search → hairline-underline, no magnifier
- **C-2** View toggle → text labels (GRID/LIST) with baseline-underline active
- **C-3** Filter → text label, no icon
- **C-4** FAB removed; `+ NEW` text button in toolbar
- **C-5** Toolbar height/padding verified to spec

### Mobile planner toolbar (3d) — two-row layout
- **D-1** Cart and chart icons → text labels (SHOPPING ›, NUTRITION ›)
- **D-2** Add `+ NEW PLAN` outlined button (not filled) — matches desktop
- **D-3** Toolbar wraps to two rows: row 1 = locator/identity, row 2 = actions
- **D-4** Person chip stays Row 1 right (identity exception)

### Mobile recipe detail (3f)
- **F-1** Remove circle prefix on FAVORITE
- **F-2** Replace pill scale buttons with baseline-underline chips

### Mobile recipe form (3g)
- **G-1** Strip rounded borders on native `<select>` dropdowns
- **G-2** Add `← BACK TO RECIPES` row (covered in Step 4 IA, but stays here for tracking)

### Mobile pantry form (3h)
- **H-1** Same as G-1
- **H-2** Add `← BACK TO PANTRY` row (Step 4 IA)

### Auth (3i)
- **I-1** Form half background `var(--bg)` (Step 7 surface, dependency tracked here)

### Onboarding (3j-k)
- **J-1** Audit later onboarding steps for native `<select>` stragglers
- **K-1** Contextual tip card → sharp corners

### Bottom sheets (3l)
- **L-1** `--radius-xl: 8px`
- **L-2** Update design-system.md to reflect over-limit fill pattern

### Cleanup (3m-n)
- **M-1** Delete `.toolbar-icon-btn` legacy class
- **M-2** Verify ghost-style close X buttons
- **N-1** Delete FAB component and CSS

### Tokens (3q)
- **Q-1** Update radius token values
- **Q-2** Sharpen shopping list modal
- **Q-3** Sharpen landing mockup cards
- **Q-4** Grep + audit for hardcoded radius values

### Verify (3o-p)
- **O-1** Modal visual verification pass (Step 11)
- **P-1** Form input border global audit
- **P-2** Audit easing curves on all animations — confirm `var(--ease-out)` is used. Flag any `linear` or `ease-in-out` for replacement.

### Before-declaring-done grep checklist (3r)

Per enforcement §5, run this before claiming any change in this audit is complete:

- `rounded-` (Tailwind classes) — should not appear except on documented exceptions
- `border-radius:` (CSS) — flag any non-zero value not in the legacy exceptions list
- `var(--accent)` / `var(--cta)` / `var(--accent-btn)` / `var(--err-l)` — verify each usage is identity, not chrome
- `linear` / `ease-in-out` in transitions or animations — should not appear on UI elements
- Animation durations not in {120, 240, 280, 320, 360, 420}ms — flag any deviation

Track this as **R-1** in the implementation brief.

---

## 4 · Decisions to confirm before brief

These are open questions inside this audit. I have a recommended answer for each. Confirm or push back.

| ID | Question | Recommendation | Status |
|---|---|---|---|
| Q-2.1 | Bottom sheet top radius: 8px / sharp / keep 20px | **8px** | ◇ confirm |
| Q-2.2 | Toolbar utility action style: text labels / ghost icons | **text labels** | ◇ confirm |
| Q-2.3 | Mobile recipes/pantry search placeholder copy: "SEARCH" mono / "Search recipes..." sentence-case | **"SEARCH" mono** to match toolbar register | ◇ confirm |
| Q-2.4 | FAVORITE glyph: drop entirely / star sigil / check sigil | **drop entirely** — text + state communicates it | ◇ confirm |
| Q-2.5 | Scale buttons (1× 2× 4× 6×): keep numerals / convert to chips with text | **keep numerals, chip-style** (baseline underline active) | ◇ confirm |
| Q-2.6 | Over-limit warning treatment: keep current `--err-l` fill / convert to left-rule margin-note per spec | **keep fill, update doc** | ◇ confirm |

---

## 5 · Out of scope for this audit

Things noticed during the audit but deferred:

- **Recipe edit ingredient row layout** — the qty / unit / preparation field arrangement reads slightly cramped at 375px. Not a radius/border issue. Belongs in a future mobile polish pass.
- **Pantry list edit/delete buttons** — they're square and sharp ✓ but feel slightly heavy with both visible at all times. Mobile UX deferred this from swipe-to-reveal; not a linework issue.
- **Person chip caret on planner** — has a small `▾` next to the person name. Caret is fine, no radius issue.
- **Color palette changes** — out of scope for Step 2.
- **Type changes** — Step 10.

---

## 6 · What this enables

Once Step 2 lands, downstream steps become much smaller:

- **Step 3 (Mobile chrome rebuild)** is now mostly mechanical — the punch list above IS the work.
- **Step 4 (Mobile IA)** keeps its independent items (back buttons, sign out location, new plan placement) but inherits the toolbar style from this work.
- **Step 7 (Auth)** has a clean spec for the form half background.
- **Step 8 (Onboarding)** has a clean spec for the contextual tip and any straggler dropdowns.

The remaining steps don't depend on more linework decisions — they depend on these landing.

---

## 7 · Open question I want to flag separately

**Should we ship Step 2 as one big PR or split it?**

Three reasonable splits:

1. **Token sweep first** (Q-1 through Q-4): change radius tokens, sweep CSS, cause whatever visual regressions land. Then fix surfaces. This breaks more things at once but the cleanup is global.
2. **Surface-by-surface**: ship mobile recipes toolbar, then mobile pantry toolbar, then mobile planner toolbar, etc. Each PR is small and verifiable. Slower overall.
3. **One big PR**: everything in this punch list at once. Easiest to review as a whole; hardest to bisect if something regresses.

My recommendation: **#2, surface by surface**, in this order: recipes toolbar → pantry toolbar → planner toolbar → recipe detail → forms → sheets → tokens cleanup last. Tokens last because they're the global blast radius; doing it last lets the surface-level work catch any straggler radii that the token change would otherwise mask.

Confirm before I write the brief.

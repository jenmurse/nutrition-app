# Good Measure — Remaining Work

Tracker for what's left to do, design decisions locked, known stragglers, and open questions. For design rules, see [design-system.md](design-system.md) and [feedback_design_system_enforcement.md](feedback_design_system_enforcement.md).

---

## What's left (as of June 2026)

### Queued — features with planning docs

**1. Playbook stories** — `briefs/playbook-stories.md`
Six starter stories outlined, story #6 ("Saving the day that worked") added. Shell at `/playbook` (logged-out + logged-in chrome) plus the content for each story. Content authorship is the blocker.

**Shipped, retained for reference:** `briefs/day-templates.md`, `briefs/added-sugar-tracking.md`, `briefs/pantry-seeding.md` — all built; briefs kept for historical context.

### Smaller follow-ups

- **Per-person dietary restrictions on Person model.** Depends on Playbook story #6 (Pescatarian household). Adds the data field, picker filters, and allergen-warning UI.

### Post-launch design pass

| Step | Description | Status |
|---|---|---|
| Step 9 | Wordmark integration pass — apply wordmark to all surfaces (landing nav, auth topbar, onboarding topbar, app nav). Current spec: DM Sans 600, 13px, -0.03em, Title Case ("Good Measure") | ☐ |
| Step 10 | Type leading and tracking pass | ✓ Done May 2 |
| Step 11 | Surface coherence check | ✓ Done May 2 |
| Step 12 | Email templates | ✓ Done May 3 |

### Deferred indefinitely

**RLS (Row Level Security).** Documented in `rls_plan.md`. Not blocking launch.

---

## Design decisions locked

These are settled. Do not re-litigate without a strong reason.

For full rationale and code examples, see `design-system.md`. Headlines:

**From earlier sessions:**
- No page headers on index pages. Dashboard's "Good morning, Jen" is the only h1 moment in the app.
- Sharp is the default shape. Round = identity markers only. Pill = legacy holdover.
- Theme color = identity. Black = everything else. Red/green = semantic.
- Outlined button border = `var(--rule)` (warm grey, never black).
- Settings left rail stays as bare numbered labels. Not adopting the landing's two-column descriptor pattern.
- DESSERT-style category labels are bare eyebrows, no container.
- MCP prompts and paste-notes textareas use the same container (left rule, no fill, sharp).
- Over-limit warnings use margin-note styling (left rule in `--err`, no tinted fill).
- Index pages break to full viewport width. Forms / detail / settings / auth / onboarding stay at 1100px max-width.

**Locked this session (April 26–27):**
- Filled black is reserved for one primary action per page. Outlined is the default for everything else.
- Onboarding wizard is single-column centered, all five steps. Continuity with auth comes from typography, not layout.
- Sage `<em>` accent on onboarding bookends only (Welcome, Complete). Dropped on interior steps.
- Onboarding chrome aligns to content column max-width on each step.
- Person and HouseholdInvite are paired by default. Tracked-only is an explicit Settings-only checkbox.
- Empty state pattern: "An empty X" / "A blank X" headlines with mono eyebrow + DM Sans 500 36px headline + DM Sans 13px lede + outlined CTA. No icons.
- Confirmation dialogs and action dialogs share the same visual language: sharp corners, outlined destructive in `var(--rule)`, ghost cancel, sharp buttons throughout.
- Account deletion — shipped. Immediate hard delete scoped to logged-in user. Sole-member households delete all household data; multi-member households preserve recipes and pantry. UI in Settings §06. Full decision in `decisions-pending.md`.

**Locked this session (April 30 — first batch):**
- Auth hairline divider is an explicit `<div class="auth-divider" />` in a `1fr 1px 1fr` grid — not a `border-right` on the editorial panel. Makes the divider a structural grid element.
- ~~Auth headline `<em>` = Instrument Serif italic~~ — superseded by May 2 Step 6. Instrument Serif removed entirely. Auth headlines are plain DM Sans, no italic.
- `position: fixed` rails must be siblings of the animated scroll container, never children. A CSS `transform` on an ancestor (including entrance animations) breaks `position: fixed` by creating a new containing block. Applies to all rails: jump nav, Add Meal `.am-rail`, settings nav.
- Add Meal rail underline uses a nested `<span class="am-rail-label">` so the underline hugs text width rather than spanning the full 140px button.
- Onboarding topbar: wordmark (`Good Measure`, DM Sans 600, 13px, -0.03em) left, step counter right. `§ ONBOARDING` label permanently removed — redundant with step counter and body eyebrow.

**Locked this session (May 2 — typography audit):**
- **Two-tier DM Mono tracking.** `0.06em` for data contexts (nutrition panel category labels: CALORIES, FAT, etc.). `0.14em` for all general UI chrome (nav links, eyebrows, form labels, tags, buttons). No other tracking values in use.
- **DM Sans tracking: -0.03em everywhere** within the app. No range, no exceptions.
- **Weight system locked.** 700 = data numbers (tabular, hero stats). 600 = content names (meal cards, recipe cards, wordmark, section numbers). 500 = editorial headlines (dashboard greeting only). 400 = everything else.
- **Section numbers (01, 02…) are DM Mono 600**, not DM Sans 700. Color `var(--rule)`.
- **Instruction step numbers redesigned.** 9px DM Mono 400, 0.14em, uppercase, `var(--muted)`. Baseline-aligned with step text, 32px min-width, gap-4.
- **Meal card titles: 20px DM Sans 600**, -0.03em, line-height 1.15. Class `.meal-card-name`.
- **`font-light` (300) removed entirely.** Minimum weight is 400. Loading states and all other uses swept to `font-normal`.
- **`font-serif` swept from codebase.** Was a Tailwind alias for DM Sans — renamed to `font-sans` for accuracy. No surface uses serif typography.
- **Manifesto leading fixed.** `.pay` spans had `margin-top: -0.08em` tightening the gap between the two sentence groups. Removed — all four lines now use uniform `line-height: 1.05` spacing.

**Locked this session (May 2 — Step 6):**
- **Italic system removed.** No `<em>` italics on any surface. Theme-accent `<em>` convention retained for dashboard greeting only.
- **Two-typeface system.** DM Sans + DM Mono. Instrument Serif removed.
- **Sage is no longer a brand color.** Sage is the default theme color (used when no person is selected — auth, onboarding bookends, landing). On in-app surfaces the accent shifts with the active person's theme. The brand is paper and ink only; color belongs to the person.
- **Landing hero is "Measure what matters."** — replaces "A nutrition app for people who actually cook." Echoes onboarding Welcome headline on purpose.
- **Auth Create account headline is "Set up your kitchen."** — replaces "Cook the way you actually cook."
- **Running bar is four labels** — *CALCULATED, NOT ESTIMATED · MEASURED TO THE GRAM · PLANNED BY THE WEEK · OPTIMIZED BY GOAL*.
- **§ METHOD (PullQuote) section removed from landing.** Landing is now §00 Hero, §01 Manifesto (§ Premise), §02 ChapterLibrary, §03 ChapterWeek, §04 Close (§ Invitation).
- **Landing headline-to-body gap normalized to 24px across all sections.** `.ch-text { gap: 24px }` (§02, §03), `.close-col { gap: 24px }` (§04), `.hero-bottom { margin-top: 20px }` (§00 — intentionally tighter given larger headline scale).

**Locked this session (May 2 — Step 5 editorial pass):**
- **Button casing rule** — all button labels render UPPERCASE via `text-transform: uppercase` at the class level; source strings may be mixed-case. Applies to every button class. Exception: `.mob-menu-item` (sentence case at 36px, content register).
- **Working-surface vs editorial scale split** — Editorial bookends (landing, auth, onboarding bookends, dashboard hero, full-page empty states, 404) use Display scale (`clamp(36px, 4.4vw, 64px)`). Working surfaces (forms, Add Meal, Shopping) use form-title scale (`clamp(22px, 2.4vw, 32px)`).
- **Form-page headline pattern** — Single `§ NEW` or `§ EDIT` eyebrow replaces path-style breadcrumbs. Headline is lowercase DM Sans, sentence case, ends with period: `A new recipe.`, `Edit this recipe.`, `A new pantry item.`, `Edit this pantry item.`
- **Dialog voice rule** — Title: sentence case, ends `?` (confirms) or `.` (statements), record name in quotes when available. Body: brief and factual. Confirm label: single verb UPPERCASE (`DELETE`, `REMOVE`, `SAVE`). Structured object form `dialog.confirm({ title, body, confirmLabel, danger })` everywhere — no legacy single-string calls.
- **Empty-state composition** — Standard four-element pattern: `§ EYEBROW / Headline sentence. / Lede. / CTA →`. Dashboard stats strip is a deliberate three-element exception (no headline) — quiet inline section between greeting and rest of dashboard.
- **§ convention** — `§` introduces editorial headlines only. Not used on UI labels, controls, or metadata. Enforced UPPERCASE via class.

**Locked this session (May 1):**
- Add Meal on mobile is a bottom sheet, not a page flow. `AddMealSheet` renders via `createPortal` at `document.body`. Backdrop is `.mob-sheet-backdrop--above-nav` (z-index 290, covers the top bar). Step 1 (picker) at `maxHeight: 75vh`; step 2 (browse) at `maxHeight: calc(100dvh - 60px)`. Transition is CSS `max-height 360ms var(--ease-out)` — the sheet expands in place, no cross-slide. Do NOT add `sheet-delay-touch` to this sheet: that class overrides the `animation` property and kills the `sheetUp` slide-in.
- Recipe builder ingredient rows (mobile): `.ing-row` uses CSS grid (`20px 1fr 36px`). `.ing-main` uses `display: contents` so its children participate directly in the parent grid. Three visual rows: drag+name+delete, Amount+Unit, Preparation. Labels (`.ing-field-label`) are visible on mobile, `display: none` on desktop. Desktop is unchanged flex layout.
- Recipe grid uniform row heights: `grid-auto-rows: calc(18.75vw + 110px)` (4-col) and `calc(25vw + 110px)` (3-col) scale the row to column width so every row matches photo height + 2-line title + 24px bottom pad. Mobile resets to `grid-auto-rows: auto`. All cards get `border-bottom` — nth-last-child border stripping removed (it broke partial last rows).
- Person pulldowns on mobile (planner + dashboard): `border: 1px solid var(--rule)` + `box-shadow: 0 4px 12px rgba(0,0,0,0.08)` — identical to the filter tag dropdown on desktop.
- Compare overlay: clicking Recipes in the top nav while the overlay is open now closes it. Same-page Link clicks don't trigger a route change, so a capture-phase click listener on `a[href="/recipes"]` closes `compareOpen`.
- Planner day strip: `padding-left/right: 12px`. Not `var(--pad)` (28px — too inset) and not 0 (cells overshoot the nav boundaries). 12px is the calibrated value.

**Locked this session (April 30 — second batch):**
- Onboarding Welcome and Ready screens: no wordmark or check icon in the body. Topbar wordmark is the only brand moment. Center body wordmark and animated check icon both removed as visual clutter.
- Nutrition bar color policy (§2e): three-way logic keyed on goal type. `highGoal` exceeded → `--err` red. `lowGoal` only, value ≥ target → `--ok` green. Everything else → neutral. `--warn` amber removed from all nutrition bars. Callout rows: `.warn-chip` (plain, no bg) for below-min, `.err-chip` (tinted red) for over-limit. Dashboard stats strip follows the same three-way rule.
- Dead code sweep completed (April 30): removed 4 unused `.module.css` files (`meal-plans`, `MealPlanWeek`, `DailySummary`, `settings`), `DailySummary.tsx` component, 95 HTML mockup files from `/public/`, dead globals.css classes (`.fill-warn`, `.ob-wordmark`, `.ob-check-icon`). Superseded brief drafts archived to `briefs/_archived/`.

**Shipped this session (June 2 — Pantry seeding + recipe matcher + dashboard per-person):**

- **Pantry seeding shipped.** 110 curated USDA-sourced starter ingredients seeded into every new household on onboarding complete. `lib/starter-pantry.ts` is the single source of truth (name + category). `lib/pantry-seed.ts#seedPantryForHousehold(id)` is idempotent — skips households that already have ingredients. Wired into `PATCH /api/persons/[id]` when `onboardingComplete=true`. Bootstrap done via `scripts/seed-global-ingredients.ts` (USDA fetch + GlobalIngredient + GlobalIngredientNutrient + cache populate; explicit fdcId overrides for items USDA search returns nonsense for; fallback-on-404 for Foundation IDs that vanish from `/food`).
- **Getting Started checklist task** renamed `Add your first ingredient` → `Review your starter pantry` with new descriptive copy.
- **ContextualTip `starter-pantry`** at the top of `/pantry` — one-time, server-dismissed via PersonContext.
- **SELECT mode on pantry toolbar.** Click SELECT → right-side controls swap to `{n} selected · SELECT ALL · DELETE · DONE`. Grid cards get a checkbox inline in the category-row; list rows get one at the start with `bg-2` highlight. SELECT ALL respects current filter/search. `DELETE /api/ingredients/bulk` endpoint with household-scoped delete + count return.
- **Recipe-import matcher (`lib/ingredientMatcher.ts`) smarter.** Expanded STOPWORDS to include prep adjectives (`raw`, `dried`, `frozen`, `canned`, `cooked`, `boneless`, `skinless`, `lean`, `large`, `medium`) and size descriptors. Bidirectional substring containment (so `onion` matches `Yellow onion` via reverse direction). Naive plural singularization in token matching (`carrots → carrot`, `eggs → egg`, `berries → berry`). Should reduce duplicate stubs when importing recipes against the seeded pantry.
- **Dashboard stats moved per-person.** New `Person.dashboardStats` CSV column (default `calories,protein,fiber`). `PUT /api/persons/[id]` accepts `dashboardStats` (array or CSV). Settings and Home both read/write through the selected Person via PersonContext. localStorage migration on first read so existing setups carry over. Switching people now shows each person's own selection.
- **Added Sugar dashboard tile** — `STAT_KEY_MAP` and `STAT_CANONICAL_ORDER` in `app/home/page.tsx` updated to include `added-sugar`. Selecting it in Settings now actually renders on dashboard + meal cards.

**Shipped this session (June 2 — Added Sugar tracking):**

- **New `addedSugar` Nutrient row** (id 17, orderIndex 6, between Sugar and Protein). Polymorphic schema means no migration needed — just an INSERT plus orderIndex bumps to protein/fiber.
- **Null-poisoning aggregation:** Recipe per-serving totals and matrix daily totals render `—` (unknown) when any contributing ingredient lacks an `addedSugar` value. Distinct from explicit `0g` for whole foods.
- **USDA whole-food whitelist** in `lib/usdaAddedSugar.ts` — when USDA omits "Sugars, added" (typical for raw produce, meats, oils, grains, etc.), the food's category determines whether to default to 0 or stay null. Fixes a latent sugar/added-sugar precedence bug in 4 mapping locations.
- **Backfill script** `scripts/add-added-sugar-nutrient.ts` — idempotent. Inserts the Nutrient row + renumbers orderIndexes + writes `addedSugar = 0` rows for whitelisted GlobalIngredient and household Ingredient entries. Run once against Railway.
- **Onboarding presets** (Maintain / Lean / Build) all default `addedSugarHighGoal: 25g`.
- **Settings:** GOALS_LAYOUT slots Added Sugar next to Sugar (5 left / 4 right). Dashboard stat selector now includes Added Sugar as a checkbox option.
- **Pantry forms** render the input polymorphically (no code change needed beyond the data layer).
- **Pantry grid card** shows Added Sugar as a 9th row.
- **Recipe detail panel** shows Added Sugar row with `—` + contextual hint (margin-note style) when unknown.
- **Recipe compare table** includes Added Sugar.
- **Matrix daily totals** show 9 rows; Added Sugar slotted between Sugar and Protein per Variant A of the mockup.
- **Mockup** at `public/mockup-added-sugar.html`.
- Intentionally NOT updated: pantry list and recipe list cards (compact 4-stat displays by design).

**Shipped this session (June 1–2 — Matrix slot order syncs, day-template save-over + drag-reorder):**

- **Matrix slot order moved server-side.** New `MealPlan.slotOrder` column (CSV) + `PATCH /api/meal-plans/[id]/slot-order` endpoint. Planner reads from `plan.slotOrder`, falls back to legacy localStorage on first load and silently uploads + clears the legacy key.
- **Save over an existing day template.** New `PUT /api/day-templates/[id]/snapshot` replaces a template's items from a (planId, date). Save-as-template dialog gains an "or update an existing template" pulldown — picking one flips the dialog into replace mode with a "Replace contents" confirm button. Keeps id, name, personId.
- **Drag-to-reorder templates** in the manage sheet. New `DayTemplate.sortIndex` column + `PATCH /api/day-templates/reorder` endpoint. ⋮⋮ drag handle on each row with HTML5 drag-and-drop, 2px top-border drop indicator, opacity dimming on the source. List endpoints (app + MCP) sort by `[sortIndex asc, createdAt desc]`. Optimistic UI with revert on failure.
- **Manage sheet polish:** removed "Saved {date}" from row meta (just name + person attribution + item count now).

**Shipped this session (June 1 — MCP write tools):**

- **7 new MCP write tools** registered in `mcp/src/index.ts`, published as `good-measure-mcp@1.4.1`:
  - Planner: `add_meal`, `remove_meal`, `update_meal`, `swap_meal`
  - Day templates: `list_day_templates`, `save_day_template`, `apply_day_template`
- **4 new Bearer-auth API routes** under `/api/mcp/*` mirroring the cookie-auth app endpoints:
  - `meal-plans/[id]/meals/route.ts` (POST)
  - `meal-plans/[id]/meals/[mealId]/route.ts` (PATCH with swap support, DELETE)
  - `day-templates/route.ts` (GET with `?personId=` filter, POST)
  - `day-templates/[id]/apply/route.ts` (POST — mirrors smart-merge on append)
- Pattern: thin Bearer-auth wrappers using `getMcpAuth()`, logic duplicated inline (not refactored — short enough that duplication is cleaner than indirection).
- `swap_meal` is a PATCH extension that accepts `recipeId`/`ingredientId` and clears the opposite field set.
- `get_meal_plan_week` now includes `mealLogId` in both the JSON response and the formatted text output (`[log:N recipe:N]`) — required so Claude can target a specific log for update/remove/swap. Fixed in 1.4.1.
- Once-Claude-Desktop-reloads, Claude can analyze a plan against goals and write changes back with user confirmation. Verified end-to-end on June 1 (add, save+apply day template, update servings, remove meals).

**Shipped this session (May 31 – June 1):**

*Major: Matrix planner system*
- `/planner` is the primary Planner route. `/meal-plans` still works but is no longer in any nav; can be retired entirely once stable.
- Matrix is a 7-day × N-slot grid. Slot rows: Breakfast / Lunch / Dinner default; Snack / Side / Dessert / Beverage appear when any meal of that type exists on the week. Rows are server-derived from MealLogs (cross-device consistent).
- Per-cell picker: favorites-first (recipes + pantry items), with "Browse all X recipes →" footer that opens a right-side sheet. Multi-select toggle pattern — click any row to add/remove. Inline `−/+` stepper with editable number input. Smart step size (10 for grams/ml).
- "Also add to [person]" chip mirrors picks to other household members' plans for the same week.
- Drag-reorder slot labels (HTML5 drag). Drag-between-cells to move/swap meals.
- Day-column ⋯ menu (desktop) / toolbar ⋯ (mobile) for day templates (see below).
- Daily totals strip below each column: 8 metrics, three-state colour (over / met / empty).
- Today highlight uses `var(--accent-l)` to match dashboard week strip.
- Full toolbar built out: range, prev/next/this-week, cart icon, + NEW PLAN (with copy-from-previous dialog).

*Major: Day templates*
- New `DayTemplate` + `DayTemplateItem` models. Household-scoped, with `personId` for attribution chip.
- Endpoints: GET/POST `/api/day-templates`, PATCH/DELETE `/api/day-templates/[id]`, POST `/api/day-templates/[id]/apply`.
- Save dialog with item breakdown. Apply confirm with Replace/Append (black primary, not red — apply is user-initiated, not destructive in the way Delete is).
- **Smart merge on append**: items matching `(recipeId + mealType)` for recipes, or `(ingredientId + mealType + unit)` for ingredients, sum servings/quantity into the existing log instead of stacking duplicates.
- Silent skip for items whose referenced recipe/ingredient was deleted; toast surfaces the count.
- Manage sheet (right-side) with search, inline rename, per-row attribution chip + colour dot.

*Major: Favorites system extended*
- `IngredientFavorite` model added, person-scoped.
- Star glyph (`★/☆`, 14px DM Mono globally, 17px mobile) on pantry grid + list, recipe grid + list, recipe detail header, pantry detail header.
- "Favorites" filter chip on pantry + recipes index toolbars.
- Picker filters non-favorited recipes/pantry items but always shows what's currently in the cell (so user can remove items applied via template that weren't favorited).

*URL rename*
- `/ingredients` → `/pantry`. Permanent redirect via `next.config.mjs`. API endpoints stay at `/api/ingredients` (correct data-model name). Nav links updated.

*Status colours*
- `--ok` `#4A6B3A → #2F8B33` (cleaner green). `--err` `#A33A28 → #CC3823` (signal red). `--warn` `#9C5E1F → #C97A1A` (amber, was brown). Tints lifted proportionally. About 15–25% more saturation so 9–11px tabular numbers read as actual signal, not "two shades of dark text."

*Mobile padding unification*
- `--pad` clamp min lowered `28px → 18px` to match matrix. Recipe grid cards bumped `16px → 18px`. Now consistent across nav, dashboard, settings, recipe detail, pantry, recipes, matrix.

*New Plan dialog*
- + NEW PLAN button on the matrix opens a small dialog: week date input + "Copy from previous plan" dropdown. Submit creates empty or duplicates via existing `POST /api/meal-plans/[id]/duplicate` endpoint.

*Various polish*
- Mobile day-strip person picker moved to top bar (matches dashboard pattern).
- Recipe list nutrition matches pantry styling (9px mono with space between number and label, "kcal" → "CAL").
- Daily totals labels: full words on desktop (Calories / Sat Fat / Sodium / etc.), abbreviated on mobile.
- Quantity display spacing fix ("1 can" not "1can"). Custom unit display for "other"-type ingredients (shows actual unit name like "oz" instead of "OTHER").
- iOS Safari chrome cache fix for backdrop closes — `flushSync` + `scrubOverlays()` (theme-color cycling, opaque-white safe-area panels, scroll dispatch).
- Global `themeColor` `#E8E8E8 → #FFFFFF` so iOS Safari chrome stays clean.
- Mobile slot `:hover` scoped to `@media (hover: hover)` to fix sticky iOS hover state after touch.
- Browse-all sheet picks now actually add to the cell (closure timing race fixed; refactored `pickRecipe` → `addRecipeAt(recipeId, slot, date)` with explicit params).
- Various optical-alignment nudges (nav wordmark, date range, recipe card eyebrows, dashboard hero, slot labels).
- Recipe + pantry list mobile: star glyph inline next to name (was stacked below).

**Shipped this session (May 28):**
- **Toolbar primary buttons → black fill** — NEW PLAN, + New recipe, + Add pantry changed from `ed-btn-outline` to `ed-btn-primary` (black bg, white text) across planner, recipes, and ingredients pages. Improves discoverability.
- **Planner PREV/NEXT navigation fixed** — buttons were silently doing nothing at boundaries. Fixed with `currentPlanIdx` computed at render, `disabled` prop, and `ed-btn-text:disabled { opacity: 0.3 }` CSS.
- **USDA lookup Enter key** — pressing Enter on the USDA search input now fires the lookup (both create and edit ingredient forms). The 500ms debounce on keystroke still fires automatically; Enter triggers immediately.
- **Add Meal inline expand (Option A)** — meal chips expand inline with servings/qty input + ADD TO PLAN button. CSS moved to global scope (was scoped to mobile media query, breaking desktop). Padding uses `8px` globally; mobile full-sheet overrides with `var(--pad)`.
- **"Also add to [person]" moved inline** — checkboxes now appear inside the inline expand (below ADD TO PLAN), not in a detached footer. Both desktop (`add-meal/page.tsx`) and mobile (`AddMealSheet.tsx`) supported.
- **Mobile AddMealSheet: "Also add to" added** — was completely missing on mobile. Now fetches matching plans for other household members and posts to all selected plan IDs.
- **Mobile planner: EDIT mode contextual toolbar** — EDIT button appears in the main toolbar row (alongside NEW PLAN). When tapped, the entire toolbar row transforms into a contextual edit bar (`{n} selected · DELETE · DONE`), then restores on DONE. No second row.
- **Hairline between chip and expand removed** — on both mobile and desktop.
- **Garbled servings text removed** — `{recipe.servingSize} {recipe.servingUnit} / serving` context text removed from expand; chip subtitle already shows this.

**Shipped this session (May 3):**
- **Invite-only gate** — `/invite` page (two-step: code validation → signup form). Single shared `INVITE_CODE` env var. Server-side validation only.
- **Waitlist** — `/waitlist` and `/waitlist-success` pages. Entries saved to `Waitlist` table in Railway Postgres. Admin view at `/admin/waitlist` (password-gated).
- **Landing CTAs updated** — hero and close section now point to `/waitlist` and `/invite` instead of `/login?signup=1`.
- **Login page** — sign-in only. Create Account tab removed and archived at `briefs/_archived/login-page-tabbed.tsx`. Household invite links (`?invite=token`) still trigger signup mode.
- **Account deletion** — Settings §06. Immediate hard delete scoped to logged-in user. Full decision in `decisions-pending.md`.
- **Email templates** — 5 of 6 Supabase templates refreshed with locked visual language and token_hash flow. See Step 12 above.

---

## Open questions

1. **Brand mark** — current interim spec: DM Sans 600, 13px, -0.03em, Title Case ("Good Measure"). Designed SVG wordmark still pending. Step 9 covers applying it across all surfaces.
2. **`/meal-plans` retirement** — the classic planner still works at its URL. Once the matrix has run for a few weeks without issues, delete the route and its supporting components.
3. **Dashboard "Today's meals" reskin** — mockup at `public/mockup-dashboard-planner.html` showing the editorial 3-column cards reskinned to match the matrix slot-row style with a totals strip. Decided to keep the existing layout for now (per session notes) — revisit if the visual coherence gap starts to matter.
4. ~~**Account deletion**~~ — shipped (May 3). See `decisions-pending.md`.

Resolved this session, no longer open:
- ~~Mobile recipes card view~~ — deferred to post-launch design pass
- ~~Onboarding mockup direction~~ — resolved (single-column centered)
- ~~Compare selection overlay~~ — confirmed shipped
- ~~Mobile bottom sheet Add Meal~~ — shipped (MOB-4, May 1)
- ~~Recipe builder ingredient rows mobile~~ — shipped (MOB-3, May 1)
- ~~Recipe grid borders + uniform row heights~~ — shipped (May 1)
- ~~Mobile top bar chip-to-hamburger gap~~ — shipped (MOB-CLEANUP-1B, May 1)
- ~~Type leading~~ — landing headline-to-body gap standardized to 24px across all sections (May 2)
- ~~Recipe detail mobile layout~~ — fixed May 2: removed placeholder image for no-image recipes, corrected top padding (zeroed rd-hero top pad in base rule, preserved only for has-image), fixed title overflow with `overflow-wrap: break-word` and `min-width: 0` on grid children
- ~~Type leading and tracking pass (Step 10)~~ — completed May 2
- ~~Surface coherence check (Step 11)~~ — full audit completed May 2

---

## How this doc has evolved

The prior `APP-INVENTORY.md` was a 700-line audit at the start of the design reset. Then it became a smaller tracker for what's left. Now most of that tracker has shipped, and the remaining work is a single coherent design pass plus one deferred decision.

After the design pass, this doc may stop being useful as a tracker and become purely historical. At that point, `decisions-pending.md` carries the active forward-looking work.

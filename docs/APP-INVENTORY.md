# Good Measure — Remaining Work

Tracker for what's left to do, design decisions locked, known stragglers, and open questions. For design rules, see [design-system.md](design-system.md) and [feedback_design_system_enforcement.md](feedback_design_system_enforcement.md).

---

## What's left

### In-flight queue: empty

All briefs from the April 26–27 sessions have shipped and verified. The visual reset, onboarding flow, dashboard polish, dialog sweep, empty states, and Person/Invite model are all in production.

What remains is the design pass and a few deferred decisions.

### Queued — remaining design pass steps

Steps 1–5 of the design pass are complete. What remains:

| Step | Description | Status |
|---|---|---|
| Step 6 | Italic serif decision + landing copy pass (italic density + em-dash strip + copy edits, all in one pass) | ☐ |
| Step 9 | Wordmark integration pass — apply locked `good · measure` wordmark to all surfaces (landing nav, auth topbar, onboarding topbar, app nav) | ☐ |
| Step 10 | Type leading and tracking pass — verify every surface uses the correct type token | ☐ |
| Step 11 | Surface coherence check — full sweep of every screen, desktop + mobile | ☐ |
| Step 12 | Email templates — refresh 5 Supabase templates with locked visual language | ☐ |

**Also still open:**
- Recipe detail mobile layout
- Auth/onboarding mobile expression
- The overall mobile editorial language question (connects to brand mark and linework decisions)

This pass is post-launch polish, not a launch blocker.

### Deferred indefinitely

**RLS (Row Level Security).** Documented in `rls_plan.md`. Not blocking launch.

**Account deletion strategy.** Tracked in `decisions-pending.md`. Wipe-user dev script handles testing in the meantime.

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
- Account deletion strategy is deferred. Wipe-user dev script handles testing.

**Locked this session (April 30 — first batch):**
- Auth hairline divider is an explicit `<div class="auth-divider" />` in a `1fr 1px 1fr` grid — not a `border-right` on the editorial panel. Makes the divider a structural grid element.
- Auth headline `<em>` ("left off.", "actually cook.") = Instrument Serif italic, `color: inherit` (black). Distinct from the sage `<em>` accent used on landing and dashboard — do not conflate the two `<em>` conventions.
- `position: fixed` rails must be siblings of the animated scroll container, never children. A CSS `transform` on an ancestor (including entrance animations) breaks `position: fixed` by creating a new containing block. Applies to all rails: jump nav, Add Meal `.am-rail`, settings nav.
- Add Meal rail underline uses a nested `<span class="am-rail-label">` so the underline hugs text width rather than spanning the full 140px button.
- Onboarding topbar: wordmark (`Good Measure`, 18px DM Sans 700) left, step counter right. `§ ONBOARDING` label permanently removed — redundant with step counter and body eyebrow.

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

---

## Open questions

For the next session:

1. **Linework audit framework** — what to measure, what's the criteria for adding or removing rules?
2. **Brand mark** — designed wordmark or stick with DM Sans 700? References to pull?
3. **Mobile editorial expression** — what does the mobile version of this design system look like?
4. **Type leading** — measure the gap between landing/auth/onboarding headlines and standardize
5. **Account deletion** (in `decisions-pending.md`) — when does this need to be answered?

Resolved this session, no longer open:
- ~~Mobile recipes card view~~ — deferred to post-launch design pass
- ~~Onboarding mockup direction~~ — resolved (single-column centered)
- ~~Compare selection overlay~~ — confirmed shipped
- ~~Mobile bottom sheet Add Meal~~ — shipped (MOB-4, May 1)
- ~~Recipe builder ingredient rows mobile~~ — shipped (MOB-3, May 1)
- ~~Recipe grid borders + uniform row heights~~ — shipped (May 1)
- ~~Mobile top bar chip-to-hamburger gap~~ — shipped (MOB-CLEANUP-1B, May 1)

---

## How this doc has evolved

The prior `APP-INVENTORY.md` was a 700-line audit at the start of the design reset. Then it became a smaller tracker for what's left. Now most of that tracker has shipped, and the remaining work is a single coherent design pass plus one deferred decision.

After the design pass, this doc may stop being useful as a tracker and become purely historical. At that point, `decisions-pending.md` carries the active forward-looking work.

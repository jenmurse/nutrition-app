# BRIEF 3B — App migration to working register (white) — audit and sweep

**Part of:** Step 3 of the design pass.
**Scope:** Single PR. Audit and sweep across every app surface to verify the working register tokens render correctly, fix any drift surfaced by the move from beige to white, and clean up hardcoded color values not caught by 3A's automated audit.
**Depends on:** 3A (tokens and register scoping) must be landed and verified before this brief starts.
**Blocks:** Nothing. Layout briefs (3D, 3E, 3F, 3G) can run in parallel after 3A and 3B both land — but most of the visual review for those briefs assumes 3B has surfaced any token-related issues first.

---

## Why this brief

Brief 3A installed the two-register token system. Every app route now defaults to the working register (`--bg: #FFFFFF`, cooler muted/rule). In theory, every component using `var(--bg)`, `var(--fg)`, `var(--rule)`, etc. updates automatically.

In practice, three categories of drift will surface only when the app is rendered on white:

1. **Hardcoded hex values** that 3A's grep audit missed (e.g. inline styles in JSX, Tailwind arbitrary values with `#` prefixes, third-party component overrides).
2. **Components that visually depended on warm paper** — e.g. an element whose contrast was acceptable on `#F5F4EF` because of the warm cast, but which reads thin or wrong on white.
3. **Outline borders, shadows, or hover backgrounds** that were tuned to the warm system and now read too heavy or too light on white.

This brief is a deliberate audit pass across every app surface. The goal is to surface and fix drift before any layout/chrome work in 3D–3G runs into it.

## What's wrong now (predicted)

After 3A lands, the following surfaces will need a careful pass:

**High-confidence drift candidates:**
- Hover states on outlined buttons (the `var(--bg-3)` hover fill on white reads as a different gray than on beige; verify it still feels like a hover)
- The today-column tint on the planner (`var(--accent-l)` overlay — should still read correct on white, but verify intensity)
- Photo backgrounds in recipe grid (any image surrounded by white instead of beige changes the visual weight of the image; verify the rule lines still anchor the grid)
- Stat-card hairlines on dashboard (the airy spacing relies on hairlines that are now `#D8D8D6` instead of `#D0CCC2`; verify they still bound the cards visually)
- Settings code-block backgrounds (`var(--bg-2)` is `#F5F5F4` on white, much closer to base than the beige version was; verify code blocks still read as set-apart)
- Pantry list rows and recipe list rows (cool muted on white may read more clinically than warm muted on beige; flag if it crosses into "spreadsheet")
- The compare table (already strong, but the warm muted on beige gave it character — verify on white)

**Medium-confidence drift candidates:**
- Empty states (the wide expanses of paper around centered headlines may feel different on white than beige)
- Add Meal step 1 ruled rows (currently centered, will be left-aligned in 3D — for now just verify the existing layout reads correctly on white)
- Form inputs (bottom-border-only inputs; the `var(--rule)` hairline is now cooler — verify the input is still legible as an input)
- Notification bar (`var(--bg-2)` background on a `var(--bg)` page — the gap between them is now `#FFFFFF` vs `#F5F5F4`, a 5-point gap; may need flagging if too subtle)

**Lower-confidence drift candidates that may surface unexpectedly:**
- Charts and data visualizations (any inline chart styling)
- Drag-and-drop ghost states on planner
- Selected-row highlights anywhere
- Focus rings (verify they still have enough contrast on white)
- Any disabled state styling

## Spec

### Audit method

For each surface listed below, the implementer:

1. Opens the surface in a fresh browser at desktop width (1440px) and mobile width (375px).
2. Visually compares against the corresponding screenshot in `/mnt/project/desktop_*.png` and `/mnt/project/mobile_*.png` — but expecting white instead of beige. The structural layout should be identical; only the paper tone has changed.
3. Notes any element that reads wrong: invisible text, missing borders, overheavy borders, hover states that don't register, tints that look off.
4. Inspects DevTools to confirm computed styles match the expected tokens (run `getComputedStyle($0).backgroundColor` on suspicious elements; should resolve to `rgb(255, 255, 255)` for `var(--bg)` etc.)
5. Files a findings list per surface. Fixes go into this same PR.

### Surfaces to audit (desktop + mobile each)

**Dashboard.** The hero ("Good evening, Jen" with the giant accent-colored name), three stat cards across the top, today's key meals row, this-week strip at the bottom. Verify all hairlines hold the structure on white. Verify the accent name still reads as identity-coded and not as "loud" on the cooler ground.

**Planner.** Toolbar with date range and prev/next. Day grid with today-column tint. Meal cards within each day. Person tabs. New plan button. The nutrition slide-out panel (open it). The Everyone view (switch to it).

**Recipes — list view.** Toolbar with category filter chips, sort, search, view toggle, +NEW. List rows with photo thumbnails, recipe name, category eyebrow, nutrition summary on the right. Empty state if you can trigger it.

**Recipes — grid view.** Same toolbar. Grid cells with photos. **Grid cells without photos** — currently render with muted ghost text; this brief leaves the empty-state rendering alone (3G handles that), just verify the muted ghost text doesn't disappear into white.

**Recipe detail.** Hero image, title, source link, EDIT/DUPLICATE/DELETE buttons, jump nav on the left. Ingredients section with ruled rows. Nutrition summary panel. Instructions section with numbered steps. Optimization and Meal Prep blocks (with their COPY PROMPT buttons and bordered prompt text blocks).

**Recipe form (new + edit).** Top breadcrumb, title, jump nav, all sections (Basics, Photo, Ingredients, Method, Nutrition). Ingredient rows with their inline qty/unit inputs. Method step rows. The Tags row with checkboxes (verify checkbox visual on white).

**Pantry — list view.** Toolbar with All/Items/Ingredients tabs, count, view toggle, search, +ADD. List rows with item name, category eyebrow, calorie/macro summary, edit/delete row controls.

**Pantry — grid view.** Same toolbar. Grid cells with item nutrition data (the strongest screen in the build per earlier review). Verify the airy density still works on white.

**Pantry form (new + edit).** Lookup section, Details section with name/category/unit, custom unit settings sub-block, standalone-item checkbox, Nutrition section with all numeric inputs.

**Settings.** All five sections: People (with avatar + theme picker), Daily Goals (per-person tabs + min/max numeric inputs), Dashboard (stat checkbox list), MCP Integration (the code block with config table, the prompt example block), Data (export/import). The bordered config-path table inside MCP — verify hairlines.

**Shopping.** The full shopping list with category sections, ingredient rows, hide-checked toggle, share button. **This page changes structurally in 3D — for 3B, just verify the existing layout reads on white without breaking.**

**Add Meal step 1.** Centered (for now) eyebrow + title, ruled rows for meal types, BACK button. **Layout changes in 3D — for 3B, just verify the centered layout reads on white.**

**Add Meal step 2.** Centered (for now) eyebrow + title, RECIPES/ITEMS toggle, search and category filter chips, two-column recipe list, BACK / ADD TO PLAN row at bottom.

**Compare.** **Has the wrong nav model in production (the back-bar replaces primary nav). 3D fixes this.** For 3B, verify the comparison table itself renders correctly on white. The table is the strongest data design in the build; ensure the cool muted on white doesn't drain its character.

**All empty states.** Empty planner, empty recipes (list and grid), empty pantry. Each has a centered eyebrow + display headline + lede + outlined CTA. Verify the centered editorial moment still feels like a moment on white.

**Onboarding checklist on dashboard.** When a new user has the checklist showing on dashboard, verify the ruled rows and checkbox styling still read correctly on white. (The full onboarding flow stays editorial register — that's not in 3B's scope.)

### Common issues to watch for and how to fix

**Issue: Element invisible or near-invisible on white.**
- Likely cause: hardcoded `color: '#1A1916'` or `background: '#F5F4EF'` that's still rendering against the old beige in someone's stale state.
- Fix: replace with `color: var(--fg)` or `background: var(--bg)`. Verify in DevTools the computed value is correct.

**Issue: Border looks too heavy on white.**
- Likely cause: someone hardcoded `1px solid var(--rule)` to a literal hex like `#999` or used `border-width: 1px` where `0.5px` was intended.
- Fix: confirm the rule reference is `var(--rule)`. If the visual is still too heavy, flag for adjustment but don't change `--rule` itself in this brief — that's a system-wide token tweak.

**Issue: Hover state doesn't register.**
- Likely cause: hover background was `var(--bg-3)` which on beige was `#E6E2D8` (visible) but on white is `#ECECEA` (also visible but different). Or hardcoded hex.
- Fix: verify the hover token is `var(--bg-3)`. If it's not registering, check the opacity/filter approach in `feedback_design_system_enforcement.md` — most hovers should use opacity on text or the bg-3 fill on shapes. Don't deepen the hover; it should feel quiet.

**Issue: Photo edges feel sharp / cut off.**
- Likely cause: an image previously bled into the warm beige paper and now contrasts hard against white.
- Fix: verify there's no missing wrapper or border-radius that should be 0. Photos are sharp by design (no rounded corners) so this is expected — but if a recipe photo without a clear edge looks "cut out," consider a 1px hairline frame in `var(--rule)`. **Only add this if the issue is widespread; don't over-correct on a single recipe.**

**Issue: Mono labels feel too quiet.**
- Likely cause: cool muted (`#6E6E6E`) on white may read as more "system" and less "editorial" than warm muted on beige did. This is the deliberate trade-off of the working register.
- Fix: do not adjust. The whole point of cool neutrals on white is they're meant to be quiet. If something feels like it really needs to pop, that's a content/hierarchy problem, not a color problem.

**Issue: A specific component wasn't using tokens at all.**
- Likely cause: legacy component, third-party integration, or a quick-fix from before the system was in place.
- Fix: refactor to use tokens. If it's a third-party component being styled with overrides, scope the overrides to the relevant `:root[data-register]` selector if needed (probably won't be — most third-party components should accept the working register defaults fine).

### Hardcoded hex audit (manual sweep)

3A's automated grep covered the seven token hex values. This brief covers the long tail. Run these greps and review every match:

```
# Generic hex patterns
grep -rE "#[0-9A-Fa-f]{6}" --include="*.tsx" --include="*.ts" --include="*.css" --include="*.scss"

# Tailwind arbitrary color values
grep -rE "(bg|text|border|ring|fill|stroke)-\[#" --include="*.tsx"

# Inline style with literal colors
grep -rE "(color|background|backgroundColor|borderColor):\s*['\"]" --include="*.tsx"

# rgba and rgb values that might be hardcoded
grep -rE "rgb\(|rgba\(" --include="*.tsx" --include="*.ts" --include="*.css"
```

For each match, decide:

- **Replace with token** if the value matches one of the system tokens (`#1A1916` → `var(--fg)`).
- **Leave alone** if it's a structural rgba (e.g. `rgba(0,0,0,0.05)` for shadow), a person theme color (the eight identity hexes), or a signal color (`#B02020` `--err`, `#5A9B6A` `--ok`).
- **Flag** if it's an unfamiliar hex that doesn't match any token. Add a comment in the PR linking to the line and let the implementer's design eye decide.

### Specific file/component areas worth deliberate review

These are predicted hotspots. Implementer should check these even if grep comes back clean:

- **Person color theme map** — wherever the eight theme hexes are defined. Confirm it's a single source of truth (not duplicated in multiple files). No changes; just confirm structure.
- **Chart components** — any inline chart styling (Recharts, Chart.js, custom). Charts often have hardcoded color arrays.
- **PDF/print styles** — if any (probably not yet) — these typically don't use CSS variables and may carry hardcoded colors.
- **Email-template-style components** — anything that renders HTML for emails or transactional notifications, even within the app surface, may have inline styles. (Note: actual email templates are out of scope per 3A.)
- **Drag-and-drop styling** — react-dnd or similar libraries often inject inline styles for drag previews; verify these don't carry stale color values.
- **Modal/dialog overlays** — the backdrop typically uses `rgba(0, 0, 0, x)` which is fine, but verify the dialog itself uses `var(--bg)` not a hardcoded color.

## Files most likely affected

This is a sweep, so files affected are unpredictable. Likely candidates:

- Any component file with inline styles (`style={{...}}`)
- Any component file using Tailwind arbitrary values (`bg-[#...]`, `text-[#...]`)
- `globals.css` — any custom CSS rules that hardcode colors instead of referencing tokens
- Chart component files
- Drag-and-drop preview components
- Any utility CSS files outside `globals.css`

The PR will likely have many small file changes (a hex-to-token swap here, a hover-state verification there) and no single large change. That's expected for an audit pass.

## Verify before declaring done

This brief's verification is more involved than most because the audit itself is the work. Three layers of verification:

### Layer 1 — Token compliance

For each surface in the audit list above:

- Open in DevTools, inspect at least three random elements per surface, and confirm computed `background-color`, `color`, and `border-color` resolve to the working register values:
  - bg: `rgb(255, 255, 255)`
  - bg-2: `rgb(245, 245, 244)`
  - bg-3: `rgb(236, 236, 234)`
  - fg: `rgb(10, 10, 10)`
  - fg-2: `rgb(42, 42, 42)`
  - muted: `rgb(110, 110, 110)`
  - rule: `rgb(216, 216, 214)`
- Any element whose computed values don't match a token (e.g. an element resolving to `rgb(208, 204, 194)` somehow — that's the editorial rule leaking through) needs investigation.

### Layer 2 — Visual coherence

For each surface:

- Take a screenshot at desktop and mobile widths.
- Compare side by side with the existing `/mnt/project/desktop_*.png` and `/mnt/project/mobile_*.png` (which are on beige).
- Confirm the only visible change is paper + neutral temperature. No structural shifts, no new alignment issues, no missing elements.
- If something *does* shift structurally, that's a regression introduced by 3A's token wiring — investigate before assuming it's a 3B-fix issue.

### Layer 3 — Hover, focus, and active states

For each interactive element across surfaces:

- Hover state on outlined buttons — visible but quiet (`var(--bg-3)` fill should register as a subtle gray on white).
- Hover state on text-mono buttons — color shift from `var(--muted)` to `var(--fg)`.
- Focus state on form inputs — bottom border darkens from `var(--rule)` to `var(--fg)`.
- Active state on filter chips, view toggles, person tabs — 1.5px ink underline below the label, no shift in baseline.
- Disabled states on any button — verify still legible (`opacity: 0.5` typical pattern).

If any state doesn't register on white, the hover/focus token used was tuned for beige and needs adjustment. Most likely fix: confirm the token reference, then verify the visual is still clearly different from the default state.

## Out of scope

- **Layout changes.** Add Meal alignment, Compare nav, Shopping toolbar — all 3D's territory. 3B verifies existing layouts render on white; it doesn't fix layout problems.
- **Wordmark integration.** 3C handles the wordmark sweep across all surfaces. 3B's audit excludes any element that's part of wordmark integration.
- **Auth and onboarding.** Both stay on the editorial register. They're not part of 3B's audit because they shouldn't have moved to white.
- **Token value adjustments.** If the cooler muted feels too cool somewhere, flag it but don't change `--muted` in this brief. Token tweaks are system-wide and need their own consideration.
- **Empty-state rendering for recipe grid.** 3G addresses the typographic fallback. 3B just verifies the existing fallback doesn't disappear.
- **Settings primary action distribution.** 3G handles the People SAVE downgrade. 3B verifies the existing buttons render on white.
- **Mobile nav redesign.** Out of scope for all of Step 3.
- **Performance optimization, accessibility audit, or any non-visual concern.**

## Notes for the implementer

- This brief is a "small fixes everywhere" PR. Expect many tiny commits, not one big change. That's correct.
- Don't try to make everything look better than it currently does on beige. The goal is *parity*, not improvement. Improvements happen in 3D–3G's targeted briefs. Resist the urge to "while I'm in here, let me also..."
- If you find a piece of drift that requires a meaningful rework (more than a one-line fix), file it as a finding and surface it before fixing — it may belong in a different brief.
- The cooler muted/rule on white is intentional and may feel slightly more "tech" than the warm beige version. That's the trade-off we accepted. If it feels too tech overall after this brief lands, the fix is layout breathing room and editorial moments (3D's territory), not warming up the neutrals.
- If during the audit you find the dashboard hero (the giant accent-colored name) reads "louder" on white than it did on beige — that's expected and correct. The accent has more contrast against pure white. It's identity reading at full strength now. This is one of the wins of the migration.
- After this brief lands, the working register is fully shipped across the app. 3D–3G can proceed against a stable visual foundation.
- The Compare screen will look "wrong" after this brief because its chrome is structurally broken (missing primary nav). That's fixed in 3D. Don't try to fix it in 3B; just verify the table itself renders on white.


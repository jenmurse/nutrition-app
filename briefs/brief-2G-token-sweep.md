# BRIEF 2G — Token sweep + global verification

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. App-wide. Last brief in Step 2.
**Depends on:** Briefs 2A, 2B, 2C, 2D, 2E, 2F should all be merged before this one. This brief catches what they missed.
**Blocks:** Steps 3+ of the master plan.

---

## Why this brief

Briefs 2A–2F handle specific surfaces. This brief is the global cleanup that catches every straggler radius, every accent-color leak, every wrong easing curve, and every legacy holdout. It's the work that should leave the system fully in compliance with the locked design system as of April 28, 2026.

This brief has two parts:
1. **Token updates** — set the legacy radius tokens to 0
2. **Audit pass** — grep across the codebase, fix every leak

After this brief, the strict enforcement rules from `feedback_design_system_enforcement.md` should pass cleanly across the codebase.

## What's wrong now

Three categories of cleanup:

1. **Radius tokens carry legacy non-zero values:**
   - `--radius-md: 12px` — listed as "legacy, reserved for landing mockup cards only"
   - `--radius-lg: 16px` — listed as "legacy, reserved for shopping list modal"
   - `--radius-pill: 9999px` — listed as "legacy, keep until last pill is swept"

2. **Stragglers across the codebase** — places where Tailwind `rounded-*` classes, hardcoded `border-radius` values, or accent color usage in chrome may have slipped through prior sweeps.

3. **Doc inconsistencies** — `mobile_ux.md` and `design-system.md` contain stale claims that don't match what's been locked or what shipped via 2A–2F.

## Spec

### Q-1 · Update radius tokens

In `globals.css`:

```css
:root {
  --radius-md:   0;     /* was 12px — landing mockup cards now sharp */
  --radius-lg:   0;     /* was 16px — shopping list modal now sharp */
  --radius-xl:   8px;   /* mobile bottom sheet top corners only — locked exception */
  --radius-pill: 0;     /* was 9999px — pill exceptions now use direct CSS */
}
```

The two locked pill exceptions (`.hm-mob-person-chip`, `.mob-filter-badge`) should set `border-radius: 9999px` directly in their class definitions, not reference the token. This way, setting `--radius-pill: 0` doesn't accidentally affect them.

```css
.hm-mob-person-chip {
  border-radius: 9999px;  /* identity exception — locked */
  /* ... */
}
.mob-filter-badge {
  border-radius: 9999px;  /* small badge — locked */
  /* ... */
}
```

### Q-2 · Sharpen shopping list modal

The shopping list pop-up modal currently uses `--radius-lg: 16px`. After Q-1 sets that to 0, the modal becomes sharp automatically. Verify visually that the modal still reads correctly with sharp corners.

If anything in the shopping modal references `--radius-lg` and looks broken with 0, fix the specific case but keep the token at 0.

### Q-3 · Sharpen landing mockup cards

The landing page has mockup card components that previously used `--radius-md: 12px`. After Q-1 sets that to 0, they become sharp. Verify the landing still reads correctly.

If a mockup card needs to retain a specific radius for visual reasons (e.g., it's mimicking an iPhone screenshot with rounded corners), use a hardcoded value in that component's CSS rather than the token. This makes the exception explicit.

### Q-4 · Grep audit and fix

Run these greps across the codebase. Each match needs review.

#### Tailwind `rounded-*` classes

```bash
grep -rE "(rounded-sm|rounded-md|rounded-lg|rounded-xl|rounded-2xl|rounded-3xl|rounded-full|rounded(?![a-z]))" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js"
```

For each match, review:
- Is this on an identity marker (avatar dot, person chip, theme swatch, checkbox, radio)? → Keep but use direct CSS not Tailwind class.
- Is this on the mobile bottom sheet top corners? → Should use `--radius-xl`.
- Is this on the locked `.hm-mob-person-chip` or `.mob-filter-badge`? → Keep with hardcoded 9999px in their class.
- Anything else? → Remove the class. Element becomes sharp.

#### Hardcoded non-zero border-radius

```bash
grep -rE "border-radius: *(?!0|var\(|50%|9999px)" --include="*.css" --include="*.tsx"
```

For each match: same logic as above. Convert to 0 unless it's one of the documented exceptions.

#### Accent color in chrome

```bash
grep -rE "(var\(--accent\)|var\(--cta\)|var\(--accent-btn\)|var\(--accent-l\))" --include="*.css" --include="*.tsx" --include="*.jsx"
```

For each match, verify:
- Is this on an avatar dot, person chip, selected day in week view, or contextual tip card? → Keep (identity).
- Is this on a focus ring, hover state, link color, or selected-but-non-identity state? → Replace with `var(--fg)`.
- Is this on a `bg-[var(--err-l)]` for selection (not over-limit warning)? → Replace with `var(--bg-2)` (per enforcement §2).

#### Wrong easings

```bash
grep -rE "(transition.*linear|transition.*ease-in-out|transition.*ease-in[^-]|animation.*linear|animation.*ease-in-out|cubic-bezier\(0\.32,)" --include="*.css" --include="*.tsx"
```

For each match, replace with `var(--ease-out)` which is `cubic-bezier(0.23, 1, 0.32, 1)`.

The `cubic-bezier(0.32, 0.72, 0, 1)` from the legacy mobile sheet animation should already be fixed by Brief 2E, but re-check.

#### Wrong durations

Locked durations: 120, 240, 280, 320, 360, 420ms.

```bash
grep -rE "(transition.*[0-9]+ms|animation.*[0-9]+ms)" --include="*.css" --include="*.tsx"
```

For each match, verify the duration is in the locked set. If not, fix to the nearest locked value:
- < 200ms → 120ms (hover/focus) or 240ms (counter tick)
- 200-300ms → 280ms (button toggle)
- 300-340ms → 320ms (hairline reveal)
- 340-400ms → 360ms (sheet/modal)
- > 400ms → 420ms (page enter)

Anything > 600ms should not exist for UI; flag.

#### Magnifier icons

```bash
grep -r "magnifier\|search-icon\|magnify" --include="*.tsx" --include="*.jsx"
```

Should not appear after Brief 2A. Verify nothing remains.

#### FAB references

```bash
grep -rE "(\.fab|FAB|floating-action|mob-fab)" --include="*.tsx" --include="*.jsx" --include="*.css"
```

Should not appear after Brief 2A. Verify the component, CSS class, and any onboarding tip references are all removed.

### Doc updates

After all greps clear:

1. **`design-system.md` §4b** — update the radius token table to reflect new values:
   ```
   --radius-md:   0;     (was 12px legacy)
   --radius-lg:   0;     (was 16px legacy)
   --radius-xl:   8px;   (was 20px — reduced for less iOS-default feel)
   --radius-pill: 0;     (was 9999px legacy; pill exceptions hardcode direct values)
   ```

2. **`design-system.md` §5g** — update the toolbar icon button section. Remove the legacy fill-tile pattern; replace with the text-label pattern that 2A and 2B established. Note the two locked pill exceptions explicitly.

3. **`design-system.md` §5b** — update the over-limit warning section. The current doc describes "left rule margin-notes." The actual implementation uses tinted fill (`var(--err-l)`). Update the doc to reflect implementation: tinted fill is correct for over-limit semantic warnings; left-rule margin-note style is reserved for sidebar notes (per existing enforcement rule on `var(--err-l)` not being used for selection states).

4. **`mobile_ux.md`** — update the toolbar pattern section. Remove the description of `box-shadow: 0 2px 8px rgba(0,0,0,0.06)` if it's stale. Update the planner toolbar to describe the new two-row layout. Update the sheet animation curve to `var(--ease-out)`. Update the search field section to remove the magnifier icon mention.

5. **`feedback_design_system_enforcement.md`** — verify it's still accurate after all the above. Add a note that as of Step 2 of the design pass, all stragglers should be cleared and these rules should grep-clean across the codebase.

## Files most likely affected

- `globals.css` — token updates, possibly some component class fixes
- Various `.tsx` files — Tailwind class removals, accent color fixes
- `design-system.md`, `mobile_ux.md`, `feedback_design_system_enforcement.md` — doc updates

## Verify before declaring done

Visual:
- Walk every key surface (dashboard, planner, recipes index + detail + new + edit, pantry index + new + edit, settings, auth, onboarding, shopping, add-meal). Nothing should look visibly different from the post-2F state EXCEPT:
  - Any element that was using a legacy `--radius-md` or `--radius-lg` is now sharp.
  - Any element using a non-locked easing or duration is now using the locked one.
- Bottom sheet top corners: still 8px (set by Brief 2E, verified here).
- Person chip pill: still pill (locked exception).
- Filter badge pill: still pill (locked exception).
- Avatar dots, theme swatches, checkboxes, radios: still circles (identity, locked).
- Everything else: sharp.

Grep checklist (run final time):
- All seven greps from Q-4 above clear without violations
- The audit's R-1 checklist runs clean

Doc verification:
- `design-system.md` matches what shipped
- `mobile_ux.md` matches what shipped
- `feedback_design_system_enforcement.md` references are all current

## Out of scope

- Step 3 work (mobile chrome rebuild) — that's after Step 2.
- Adding new patterns — this brief only sweeps existing patterns.
- Brand mark integration — Step 7 onwards.
- Type leading audit — Step 10.

## Notes for the implementer

- This brief is the longest, but the work is mechanical: grep, review, fix, re-grep. The tedious part is reading every match and deciding whether it's an exception or a leak.
- Run the greps in this order: tokens first, then Tailwind classes, then accent colors, then easings, then durations. Fixing the tokens first means many of the downstream issues resolve automatically.
- If you find an issue that's genuinely ambiguous (e.g. a `rounded-md` on a surface where it might be intentional), flag it for me rather than making a unilateral call. I'll review and decide.
- This brief is the gate to Step 3. After this lands, the system should grep-clean and the rest of the design pass can build on a known-clean foundation.

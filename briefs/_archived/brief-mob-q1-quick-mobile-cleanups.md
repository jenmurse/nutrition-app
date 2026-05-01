# BRIEF MOB-Q1 — Quick mobile cleanups (batched)

**Part of:** Step 4 mobile audit.
**Scope:** Single PR. Multiple small mobile fixes batched together. No structural changes.
**Depends on:** Nothing.
**Blocks:** Nothing.

---

## Why this brief

Five small mobile issues identified in the Step 4 audit. None require visual evaluation or design decisions -- they're targeted fixes against locked rules. Batched here to avoid five separate PRs.

---

## Fix 1 — Edge-to-edge background on cream pages

### Problem

On landing, auth, and onboarding screens (cream `--paper` background), the iOS status-bar safe-area zone and the bottom safe-area zone render white instead of cream. This breaks the page color and creates visible bands at the top and bottom edges. White-bg pages don't show the issue because the bleed area happens to be the same color.

### Fix

Set the page background on `<html>` (not just on a `<main>` or page-level div), so the safe-area insets bleed the correct color.

Approach: use a `data-theme` attribute on `<html>` driven by route.

```css
html { background: var(--bg); }
html[data-theme="paper"] { background: var(--paper); }
```

In the layout code, set `data-theme="paper"` on `<html>` for these routes:
- `/` (landing)
- `/sign-in`, `/create-account`, and any other auth routes
- `/onboarding/*`

For all other routes, no `data-theme` attribute (defaults to white via `var(--bg)`).

Inside these pages, ensure no wrapping container has its own white background that would block the bleed. Wrappers should be `background: transparent` or inherit.

### Verification

- On iPhone Safari, open the landing page. The status-bar zone shows cream, not white. Same for the home indicator zone at the bottom.
- Same check for sign-in, create-account, and each onboarding step.
- Dashboard, planner, recipes, pantry, shopping, settings, recipe detail, recipe edit — all still show white safe-area zones (unchanged).
- No regressions on desktop — `data-theme="paper"` applies the same color but desktop has no safe-area inset to care about.

---

## Fix 2 — Onboarding and auth topbar alignment

### Problem

The wordmark on the onboarding topbar sits more inset from the left edge than the wordmark on the dashboard. The right-side text ("WELCOME", "STEP · 01 / 03") is also more inset than the dashboard's person chips. This is because the onboarding page is `position: fixed` and bypasses the layout's safe-area handling, so it carries its own padding that doesn't match the layout's `var(--pad)`.

Auth screens have a similar issue.

### Fix

Update `.ob-topbar` and `.auth-nav` to use `var(--pad)` for left/right padding, matching the layout's padding token used by all other pages.

```css
.ob-topbar {
  padding-left: var(--pad);
  padding-right: var(--pad);
  /* preserve existing safe-area-inset-top padding */
}

.auth-nav {
  padding-left: var(--pad);
  padding-right: var(--pad);
}
```

If `var(--pad)` is already in use but a different number is being applied, find and remove the override.

### Verification

- Open the dashboard on mobile. Note the X position of the wordmark's left edge, and the X position of the person chips' right edge.
- Open onboarding step 1. The wordmark left edge sits at the same X. The "WELCOME" right edge sits at the same X.
- Open sign-in. The wordmark left edge sits at the same X. The `← BACK` right edge sits at the same X.
- Open onboarding step 2 (and 3, 4 if present). Same alignment.

---

## Fix 3 — Remove auth hairline between lede and form toggle

### Problem

On the sign-in and create-account screens, a hairline divider sits between the editorial section (eyebrow + headline + lede) and the SIGN IN / CREATE ACCOUNT toggle. It reads as a bureaucratic divider in a layout otherwise built on whitespace.

The hairline that's part of the toggle's underline state (the underline beneath the active tab) is correct and stays. Only the section divider above the toggle is removed.

### Fix

In the auth page CSS, remove the `border-top` (or `border-bottom`) that creates the divider between the editorial section and the form section on mobile.

The vertical spacing between the lede and the toggle should remain whatever it is now -- only the rule line is removed.

If the divider is `.auth-divider` with `display: none` on mobile already, this fix may already be partially in place; confirm and remove any remaining mobile-only divider styling.

### Verification

- Open sign-in on mobile. No hairline between "All measured to the gram." (lede) and "SIGN IN | CREATE ACCOUNT" (toggle).
- Same on create-account.
- The toggle's active-tab underline remains.
- Desktop is unchanged (the desktop layout has its own vertical divider between editorial and form columns, which stays).

---

## Fix 4 — Settings page header

### Problem

The Settings page on mobile (and desktop) jumps straight into "01 People" with no page-level header. Every other non-index feature page in the app has an editorial header (eyebrow + headline). Settings should match.

### Fix

Add an editorial page header at the top of `/settings`, above the "01 People" section.

```html
<header class="page-header">
  <p class="eyebrow">§ SETTINGS</p>
  <h1>Your preferences.</h1>
</header>
```

Use the existing page-header / eyebrow / h1 classes from other pages (Recipe Detail, Shopping, etc.) -- do not introduce new classes. Match exact styling, spacing, and clamp values.

### Verification

- `/settings` on mobile shows `§ SETTINGS` eyebrow and "Your preferences." headline above the "01 People" section.
- Same on desktop.
- The eyebrow and headline use the same type styles as other page headers.
- Vertical spacing between the new header and the "01 People" section feels consistent with how other pages space their header from their first section.

---

## Fix 5 — Pantry list edit/delete icon sizing

### Problem

On the mobile pantry list, the edit (pencil) and delete (×) buttons are sized correctly as tap targets but the glyphs inside them look small and the boxes feel oversized relative to the glyph weight.

### Fix

Increase the glyph size inside the edit and delete buttons on mobile pantry list rows.

- Edit pencil SVG: bump from current size to 16px or 18px (whichever matches the visual weight of the × better -- they should look paired).
- × glyph: increase font-size from current to 16-18px.

The button box dimensions stay the same (preserves tap target). Only the icon inside grows.

If the buttons are square with `border: 1px solid var(--rule)`, that border treatment stays. If padding inside the button needs adjustment to keep the icon centered after the size bump, adjust accordingly.

### Verification

- Open pantry list on mobile. Edit and delete icons feel proportional to the button box.
- Tap targets unchanged in dimension.
- Desktop pantry rows are unchanged (the mobile-specific styling shouldn't bleed; verify the desktop edit/delete actions still hidden behind hover or whatever the current desktop pattern is).

---

## Out of scope

- Bottom rail removal / moving menu to top -- separate brief, requires visual mock review.
- Recipe edit ingredients restructure -- separate brief, requires visual mock review.
- Settings copy decisions beyond "§ SETTINGS / Your preferences." -- this is the placeholder; final copy can be revisited in Step 5 editorial pass.
- Recipe list mobile thumbnail sizing -- not addressed here; can roll into Step 11.
- Onboarding step 4 preset card visual weight -- selected state is correct as shown; leave as is.

---

## Files most likely affected

- `app/layout.tsx` (or root layout) — `data-theme` attribute logic on `<html>`
- `globals.css` — `html` and `html[data-theme="paper"]` background rules
- Onboarding topbar component / styles — padding fix
- Auth nav component / styles — padding fix, divider removal
- Settings page component — add page header markup
- Pantry list row component / styles — icon size bump

---

## Notes for the implementer

- For Fix 1, the cleanest implementation is a layout-level effect that sets `<html data-theme="...">` based on the current route. Check whether Next.js app router conventions already have a pattern for this; if so, use it.
- For Fix 4, do not invent new typography for the Settings header. Reuse the existing `.page-header` (or equivalent) classes -- consistency across pages is the goal.
- For Fix 5, do not change the button border, border-radius, or background. Only the inner glyph size and (if needed) the inner padding to keep alignment.

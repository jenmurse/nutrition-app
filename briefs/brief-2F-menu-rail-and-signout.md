# BRIEF 2F — Mobile menu rail polish + Sign Out relocation

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. Mobile only. Bottom menu rail + menu sheet + Settings page.
**Depends on:** Nothing.
**Blocks:** Nothing.

---

## Why this brief

Three small but cumulative improvements to mobile global navigation:

1. **Menu rail label** currently reads `Menu | 03/04 — RECIPES` style. The `NN/NN` numerator implies a sequence (this is section 3 of 4) but the four sections (Home/Planner/Recipes/Pantry) don't have a meaningful order. Drop the numbering and keep just the section name.

2. **Sign Out is buried** at the bottom of Settings on mobile. Move it to the menu sheet as the last item below the nav list. The menu sheet is the global-controls surface; sign out is a global control.

3. **Menu rail label** also currently uses sentence-case "Menu" which is inconsistent with the rest of the editorial chrome (everything else is DM Mono UPPERCASE). Restyle to match.

## What's wrong now

Per `mobile_dashboard.png`, `mobile_recipe_list.png`, `mobile_settings_sign_out.png`:

1. Bottom rail reads `Menu | 01/04 — HOME` — has the NN/NN numerator and "Menu" is sentence case.
2. Settings page has a `[ SIGN OUT ]` outlined button at the very bottom, after the Data section.
3. The menu sheet (per `mobile_menu.png`) lists Home / Planner / Recipes / Pantry / Settings — no Sign Out option.

## Spec

### Menu rail — drop NN/NN, restyle label

Bottom rail markup becomes:

```html
<button class="menu-rail-btn">MENU</button>
<span class="menu-rail-section">HOME</span>
```

```css
.menu-rail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 var(--pad);
  border-top: 1px solid var(--rule);
  background: var(--bg);
}
.menu-rail-btn,
.menu-rail-section {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  background: none;
  border: 0;
}
.menu-rail-btn { color: var(--fg); }      /* "MENU" is the active control */
.menu-rail-section { color: var(--muted); } /* section label is metadata */
```

- Both labels DM Mono 9px UPPERCASE.
- "MENU" is the tap target — slightly more prominent (color `--fg`).
- Section name on the right is metadata (color `--muted`).
- No NN/NN numerator. No separator character. The space between them is visual separation enough.

The section name updates based on the current page:
- `/` (Dashboard) → `HOME`
- `/planner` → `PLANNER`
- `/recipes` → `RECIPES`
- `/recipes/[id]`, `/recipes/new`, `/recipes/[id]/edit` → `RECIPES` (child screens still report parent)
- `/pantry` → `PANTRY`
- `/pantry/[id]/edit`, `/pantry/new` → `PANTRY`
- `/settings` → `SETTINGS`
- `/shopping`, `/planner/add-meal` → `PLANNER` (these are children of planner)

### Sign Out — move to menu sheet

In the menu sheet, after the nav list (Home / Planner / Recipes / Pantry / Settings), add a divider and a Sign Out item:

```html
<div class="menu-sheet">
  <button class="close-btn">CLOSE</button>
  <ul class="menu-nav-list">
    <li><a href="/">Home</a></li>
    <li><a href="/planner">Planner</a></li>
    <li><a href="/recipes">Recipes</a></li>
    <li><a href="/pantry">Pantry</a></li>
    <li><a href="/settings">Settings</a></li>
  </ul>
  <hr class="menu-sheet-divider" />
  <button class="menu-signout">Sign out</button>
</div>
```

Style for the Sign Out item — ruled row, DM Sans, NOT mono (matches the rest of the menu list which uses DM Sans 22px):

```css
.menu-sheet-divider {
  border: 0;
  border-top: 1px solid var(--rule);
  margin: 24px 0 0;
}
.menu-signout {
  display: block;
  width: 100%;
  text-align: left;
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--fg);
  background: none;
  border: 0;
  padding: 16px 0;
  cursor: pointer;
}
.menu-signout:hover { color: var(--fg); opacity: 0.8; }
```

The Sign Out is left-aligned, lowercase-style "Sign out" (sentence case), matching the visual weight of the other menu items but separated by the hairline divider above it. This communicates "still part of the menu, but a different category — the action-on-yourself category."

### Remove Sign Out from Settings on mobile

Delete the Sign Out button at the bottom of `/settings` on mobile. The remaining sections (Export, Import) stay where they are. Don't add Sign Out anywhere else on the Settings page.

On desktop, Sign Out stays in the top-right nav (no change). The desktop nav already has space and convention for account controls. Only mobile changes.

```jsx
// In Settings page, scope the Sign Out removal to mobile
{/* Sign Out moved to menu sheet on mobile */}
{!isMobile && <SignOutButton />}
```

OR more cleanly, just delete the SignOut button entirely from Settings and ensure both mobile (menu sheet) and desktop (top nav) carry it. If desktop top-right already has Sign Out, this is a pure deletion.

### Confirm before signing out

Tapping Sign Out triggers a confirmation dialog (existing pattern):

```ts
dialog.confirm({
  title: 'Sign out?',
  body: 'You\'ll need to sign in again to access your data.',
  confirmLabel: 'Sign out',
  danger: false,
})
```

The dialog uses the locked confirmation pattern (sharp corners, outlined buttons in `var(--rule)`, ghost cancel) per design-system.md §5h and brief 16d.

`danger: false` because sign out isn't destructive — data is preserved. No need to use the destructive treatment.

## Files most likely affected

- Bottom rail component (mobile)
- Menu sheet component (mobile)
- Settings page component (remove Sign Out button on mobile, or remove entirely if desktop is also covered elsewhere)
- `globals.css` — `.menu-rail`, `.menu-rail-btn`, `.menu-rail-section`, `.menu-signout`, `.menu-sheet-divider`

## Verify before declaring done

Visual:
- On every mobile page, the bottom rail reads `MENU | SECTIONNAME` — both DM Mono 9px UPPERCASE. No NN/NN. No separator dash.
- "MENU" is in `var(--fg)`, section name is in `var(--muted)`.
- Tap MENU. Sheet opens with: Home / Planner / Recipes / Pantry / Settings, then a hairline divider, then "Sign out" as a row matching the other menu items.
- Tap Sign Out → confirmation dialog appears with the locked confirmation styling.
- Confirm Sign Out → user is signed out and redirected appropriately.
- Open mobile Settings page — no Sign Out button at the bottom anymore.
- Desktop top nav: Sign Out is still in the top-right (unchanged).

Functional:
- Menu rail "MENU" tap opens the sheet.
- Section label updates correctly when navigating between pages.
- For child screens (e.g. New Recipe), the section label shows the parent ("RECIPES") not the child ("NEW RECIPE").
- Sign out from menu sheet works — uses the existing sign-out flow (whatever was happening when the Settings button was tapped).
- Sign out confirmation dialog matches the locked pattern.

Grep checklist:
- "01/04" / "02/04" / "03/04" / "04/04" string patterns — should not appear in the rail anymore
- `Menu` (sentence case) in the rail — should be `MENU` UPPERCASE
- Sign Out button in Settings — should not appear on mobile
- `rounded-` (Tailwind) on rail or menu sheet — should not appear
- `linear` or `ease-in-out` on rail or sheet animations — should not appear

Edge cases:
- Settings page accessed on desktop — Sign Out still appears in top nav, NOT in Settings.
- Onboarding flow — the menu rail is hidden during onboarding (per onboarding.md §1, "TopNav is hidden on the /onboarding route"). The bottom rail should also be hidden. Verify.
- Auth pages — same, no rail.

## Out of scope

- The menu sheet's primary nav list (Home / Planner / Recipes / Pantry / Settings) — unchanged in this brief.
- The menu sheet open/close animation — unchanged (already correct per Brief 2E once that lands).
- Desktop nav layout — unchanged.
- Adding shopping/nutrition shortcuts to the menu sheet (mentioned in the planner toolbar mock as Option 2) — we picked Option 1 for the planner, so the menu sheet stays focused on global nav + sign out.

## Notes for the implementer

- The desktop top nav has Sign Out as a text link top-right per `desktop_dashboard.png`. Verify it stays there. Don't remove it from desktop.
- If a confirmation dialog system isn't yet wired up via `dialog.confirm()`, use whatever the existing app convention is — but ensure the dialog uses the locked sharp/outlined visual pattern, not legacy rounded.
- After this brief lands, the menu sheet pattern is one of the most-used surfaces in the app. Consider that if the sheet itself has any rounded radii or other stragglers, those should already be handled by Brief 2E (sheet radius). If not, flag.

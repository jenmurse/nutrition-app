# BRIEF 2F — Mobile menu rail polish, Sign Out relocation, rail visual weight, auto-focus audit

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. Mobile only. Bottom menu rail + menu sheet + Settings page + list-page auto-focus audit.
**Depends on:** 2D.2 and 2E (both landed). 
**Blocks:** Nothing.

---

## Why this brief

Five cumulative improvements to mobile global navigation and chrome:

1. **Menu rail label** currently reads `Menu | 03/04 — RECIPES` style. The `NN/NN` numerator implies a sequence (this is section 3 of 4) but the four sections (Home/Planner/Recipes/Pantry) don't have a meaningful order. Drop the numbering and keep just the section name.

2. **Menu rail label** currently uses sentence-case "Menu" which is inconsistent with the rest of the editorial chrome (everything else is DM Mono UPPERCASE). Restyle to match.

3. **Sign Out is buried** at the bottom of Settings on mobile. Move it to the menu sheet as the last item below the nav list. The menu sheet is the global-controls surface; sign out is a global control.

4. **Rail visual weight** — the rail's hairline is the same 0.5px `--rule` as content hairlines, so it doesn't read as chrome. The eye sees the rail as an extension of the page rather than a bounding boundary. Heavier rule on the rail's top edge fixes this.

5. **Auto-focus bug across list pages** — the same auto-focus issue we caught on Add Meal step 1 is present on at least the recipes grid page (first recipe gets a focus underline on page load). Likely affects other list pages too. Audit and fix everywhere.

## What's wrong now

Per `mobile_dashboard.png`, `mobile_recipe_list.png`, `mobile_recipe_grid.png`, `mobile_settings_sign_out.png`, and visual review:

1. Bottom rail reads `Menu | 01/04 — HOME` — has the NN/NN numerator and "Menu" is sentence case.
2. Settings page has a `[ SIGN OUT ]` outlined button at the very bottom, after the Data section.
3. The menu sheet (per `mobile_menu.png`) lists Home / Planner / Recipes / Pantry / Settings — no Sign Out option.
4. The rail's border-top is 0.5px `--rule` — same as every content hairline. The rail blends with the page rather than reading as chrome.
5. On the recipes grid page (and likely others), the first list item gets an auto-focus underline on page load. Combined with this brief's heavier rail rule, every list page would have two prominent black lines without the auto-focus fix.

## Spec

### 1. Menu rail — drop NN/NN, restyle label, heavier rule

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
  border-top: 1px solid var(--fg);  /* heavier than --rule, signals chrome */
  background: var(--bg);
}
.menu-rail-btn,
.menu-rail-section {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: none;
  border: 0;
}
.menu-rail-btn { color: var(--fg); }      /* "MENU" is the active control */
.menu-rail-section { color: var(--muted); } /* section label is metadata */
```

Key changes from current:
- "MENU" mono uppercase (was "Menu" sans sentence case).
- Section label mono uppercase, no NN/NN prefix, no separator dash. Just `RECIPES` not `03/04 — RECIPES`.
- Border-top is `1px solid var(--fg)` (was `0.5px solid var(--rule)`). This is the chrome boundary — heavier than content hairlines, dark instead of muted. Signals "below this is chrome, above is content."

The right slot adapts per page following 2D.2's three-variant pattern. This brief addresses only the parent-screen variant (section locator). The Shopping (SHARE) and Add Meal (date · person) variants stay as established in 2D.2.

The section name updates based on the current page:
- `/` (Dashboard) → `HOME`
- `/planner` or `/meal-plans` → `PLANNER`
- `/recipes` → `RECIPES`
- `/recipes/[id]`, `/recipes/new`, `/recipes/[id]/edit` → `RECIPES` (child screens still report parent)
- `/pantry` → `PANTRY`
- `/pantry/[id]/edit`, `/pantry/new` → `PANTRY`
- `/settings` → `SETTINGS`

The following routes have their own right-slot variants per 2D.2 — DO NOT show a section name here:
- `/shopping` → `SHARE` action (already implemented)
- `/meal-plans/add-meal` → `DAY, MMM DD · PERSON` status (already implemented)

If anything in those routes is still rendering as a section locator, fix it to match its established variant.

### 2. Sign Out — move to menu sheet

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

Style for the Sign Out item — DM Sans, NOT mono (matches the rest of the menu list which uses DM Sans 22px):

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

The Sign Out is left-aligned, sentence-case "Sign out", matching the visual weight of the other menu items but separated by the hairline divider above it. This communicates "still part of the menu, but a different category — the action-on-yourself category."

### 3. Remove Sign Out from Settings on mobile

Delete the Sign Out button at the bottom of `/settings` on mobile. The remaining sections (Export, Import) stay where they are. Don't add Sign Out anywhere else on the Settings page.

On desktop, Sign Out stays in the top-right nav (no change). The desktop nav already has space and convention for account controls. Only mobile changes.

```jsx
{!isMobile && <SignOutButton />}
```

OR more cleanly, just delete the SignOut button entirely from Settings and ensure both mobile (menu sheet) and desktop (top nav) carry it.

### 4. Confirm before signing out

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

### 5. Auto-focus audit across list pages

Same pattern as the Add Meal step 1 auto-focus bug from 2D.2. The first list item on multiple pages gets a focus underline on page load, which combined with this brief's heavier rail rule would create double-heavy-line visual noise.

Pages to audit and fix:
- Recipes grid (`/recipes` with grid view) — confirmed bug
- Recipes list (`/recipes` with list view)
- Pantry grid (`/pantry` with grid view)
- Pantry list (`/pantry` with list view)
- Planner day cells (`/meal-plans` or `/planner`)
- Add Meal step 1 (`/meal-plans/add-meal`) — fixed in 2D.2 follow-ups, verify still working
- Add Meal step 2 (`/meal-plans/add-meal` step 2) — verify
- Dashboard cards (`/`)
- Shopping ingredient list (`/shopping`)

For each, verify:
- Page renders with no item in any focused/active visual state on mount
- Same `requestAnimationFrame` blur fix used for Add Meal step 1
- No `:focus-visible` styles persisting on the first child of the list
- No CSS class like `.selected` or `.active` being applied by default

Fix pattern (from Add Meal step 1):
```ts
useEffect(() => {
  requestAnimationFrame(() => {
    (document.activeElement as HTMLElement)?.blur();
  });
}, []);
```

Plus CSS:
```css
.list-item:focus-visible {
  outline: none;
}
```

Apply globally if there's a shared list-item class, or per-page if each list has its own class.

## Files most likely affected

- Bottom rail component (mobile)
- Menu sheet component (mobile)
- Settings page component (remove Sign Out button on mobile)
- `globals.css` — `.menu-rail`, `.menu-rail-btn`, `.menu-rail-section`, `.menu-signout`, `.menu-sheet-divider`
- Various list components or pages — grep for `autoFocus`, `useEffect.*focus`, list item classes with focus-visible styles

## Verify before declaring done

Visual:
- On every mobile parent page, the bottom rail reads `MENU | SECTIONNAME` — both DM Mono 9px UPPERCASE. No NN/NN. No separator dash.
- "MENU" is in `var(--fg)`, section name is in `var(--muted)`.
- Border-top above rail is `1px solid var(--fg)` — visibly heavier and darker than content hairlines. The rail reads as a decisive chrome boundary.
- On Shopping: rail shows `MENU | SHARE` (per 2D.2). Heavier rule applies.
- On Add Meal: rail shows `MENU | TUE, APR 28 · JEN` (per 2D.2). Heavier rule applies.
- Tap MENU. Sheet opens with: Home / Planner / Recipes / Pantry / Settings, then a hairline divider, then "Sign out" as a row matching the other menu items.
- Tap Sign Out → confirmation dialog appears with the locked confirmation styling.
- Confirm Sign Out → user is signed out and redirected appropriately.
- Open mobile Settings page — no Sign Out button at the bottom anymore.
- Desktop top nav: Sign Out is still in the top-right (unchanged).
- Open recipes grid page on mobile — no underline on the first recipe.
- Same for recipes list, pantry grid, pantry list, planner, dashboard, shopping list, Add Meal steps 1 and 2.

Functional:
- Menu rail "MENU" tap opens the sheet.
- Section label updates correctly when navigating between pages.
- For child screens (e.g. New Recipe), the section label shows the parent ("RECIPES") not the child ("NEW RECIPE").
- Sign out from menu sheet works — uses the existing sign-out flow (whatever was happening when the Settings button was tapped).
- Sign out confirmation dialog matches the locked pattern.
- All list pages render with no focus state on the first item on initial load.

Grep checklist:
- "01/04" / "02/04" / "03/04" / "04/04" string patterns — should not appear in the rail anymore
- `Menu` (sentence case) in the rail — should be `MENU` UPPERCASE
- Sign Out button in Settings — should not appear on mobile
- `border-top: 0.5px solid var(--rule)` on the rail — should be `1px solid var(--fg)`
- `rounded-` (Tailwind) on rail or menu sheet — should not appear
- `linear` or `ease-in-out` on rail or sheet animations — should not appear
- `autoFocus` on list items or first list children — flag and remove
- `:focus-visible` styles on list items that produce visible underlines or borders — flag and audit

Edge cases:
- Settings page accessed on desktop — Sign Out still appears in top nav, NOT in Settings.
- Onboarding flow — the menu rail is hidden during onboarding (per onboarding.md §1, "TopNav is hidden on the /onboarding route"). The bottom rail should also be hidden. Verify.
- Auth pages — same, no rail.
- Dashboard cards on first load — no auto-focus on first card.

## Out of scope

- The menu sheet's primary nav list (Home / Planner / Recipes / Pantry / Settings) — unchanged in this brief.
- The menu sheet open/close animation — unchanged (already correct per 2E).
- Desktop nav layout — unchanged.
- Adding shopping/nutrition shortcuts to the menu sheet — we kept those out per existing decisions.
- Subtle bg tint on the rail — held in reserve. Heavier hairline alone is the test for whether the rail feels like chrome. If after this brief the rail still doesn't feel chrome enough, we revisit with a tint pass. Don't add a bg tint in this brief.
- Active toggle filled-black state on sheet chips — that's 2G's button audit, not 2F.

## Notes for the implementer

- The desktop top nav has Sign Out as a text link top-right per `desktop_dashboard.png`. Verify it stays there. Don't remove it from desktop.
- The heavier rail rule (1px var(--fg)) is a deliberate inconsistency with the 0.5px var(--rule) used everywhere else. This is the point. Chrome should look different from content. Document this as a locked rule when you update design-system.md (in a future housekeeping pass after this brief lands).
- The auto-focus audit is preventative. We caught it on Add Meal step 1 in 2D.2 follow-ups, but the same pattern likely exists on other list pages and we want to fix all of them at once before the heavier rail rule makes the symptom more visible.
- After this brief lands, the design system docs will need another housekeeping update: log the heavier rail rule, update the menu rail spec, document the auto-focus fix pattern. Don't update docs as part of this PR — flag for follow-up.

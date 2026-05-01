# BRIEF MOB-1 — Top bar replaces bottom rail

**Part of:** Step 4 mobile audit.
**Scope:** Single PR. Structural change to mobile chrome architecture. Removes the bottom rail across all app pages (excluding landing, auth, onboarding which never had it). Adds a top bar pattern.
**Depends on:** Nothing.
**Blocks:** MOB-2 (chip/pulldown changes are scoped to the dashboard's right slot, which this brief defines).

---

## Why this brief

The current mobile pattern has a persistent bottom rail with `≡ MENU` on the left and a contextual right slot (section name, action, status). It was added to make the web app feel app-like.

In practice it's not earning that weight. Three problems:

1. **Visual competition with Safari's chrome.** Safari's URL bar and back/forward controls live at the bottom on iOS. Stacking the rail above them creates a busy lower edge with two competing chrome layers.

2. **The right slot does the wrong job most of the time.** On Settings it says SETTINGS. On Pantry it says PANTRY. The page content already orients the user. The rail is repeating page state in mono labels rather than surfacing useful actions.

3. **The screens that look "weird" in the audit all looked weird because of the rail.** Recipe lists, planner, pantry — every page with its own toolbar already has the same row of controls (search/filter/+NEW, date range/person/+NEW PLAN, etc.) directly above content. The rail at the bottom is a third chrome layer below the content layer.

This brief moves menu access to the top of the page, drops the rail, and lets each page own its own contextual chrome via a single top bar.

---

## The new pattern

A single 50px top bar at the top of every app page. Always visible. `border-bottom: 1px solid var(--rule)`. Padded with `var(--pad)` left and right.

Two slots:

- **Left:** wordmark on most pages, back link on flow pages (Add Meal step 2).
- **Right:** menu access (hamburger glyph), or contextual content (date · person on Add Meal flow), or a combination on Dashboard.

The bottom rail is removed entirely from app pages. Sub-toolbars (the search/filter/+NEW row on Recipes, the date range/person/+NEW PLAN row on Planner, etc.) stay where they are — they sit directly below the top bar on their respective pages.

### Slot mapping per page

| Page | Top bar left | Top bar right |
|---|---|---|
| Dashboard | Wordmark | `[person pulldown] [☰]` (see MOB-2 for pulldown details) |
| Planner | Wordmark | `[☰]` (planner sub-toolbar still has its own date/person/+NEW PLAN row below) |
| Recipes (grid/list) | Wordmark | `[☰]` (recipes sub-toolbar still has its own search/filter/+NEW row below) |
| Pantry | Wordmark | `[☰]` (pantry sub-toolbar still has its own search/filter/+ADD row below) |
| Shopping | Wordmark | `[☰]` (the editorial header `§ APR 26 – MAY 2 / A week of meals.` sits below; SHARE moves into the page header next to HIDE CHECKED, not the top bar) |
| Settings | Wordmark | `[☰]` |
| Recipe detail | Wordmark | `[☰]` |
| Recipe new / edit | `← BACK` | `[☰]` |
| Pantry new / edit | `← BACK` | `[☰]` |
| Add Meal step 1 | `← BACK` | `[☰]` |
| Add Meal step 2 | `← BACK` | `FRI, MAY 1 · JEN` (date · person, mono 9px muted; replaces hamburger on this flow screen since the back link is already in the left slot and the right slot is doing real orientation work) |

**Add Meal step 2 is the one exception** where the right slot is contextual content (date · person) instead of the hamburger. Rationale: Add Meal is a focused flow with `← BACK` already in the left slot, the user is mid-task, and the date/person is genuinely orienting. On every other page the hamburger lives in the right slot.

### Top bar markup pattern

```html
<header class="topbar">
  <div class="topbar-left">
    <!-- Either wordmark OR back link -->
    <a href="/dashboard" class="wordmark">Good Measure</a>
    <!-- OR -->
    <button class="back-link">← BACK</button>
  </div>
  <div class="topbar-right">
    <!-- Page-specific content + menu trigger -->
    <button class="menu-trigger" aria-label="Open menu">
      <svg class="menu-glyph" viewBox="0 0 18 12" width="18" height="12">
        <line x1="0" y1="1" x2="18" y2="1" stroke="currentColor" stroke-width="1"/>
        <line x1="0" y1="6" x2="18" y2="6" stroke="currentColor" stroke-width="1"/>
        <line x1="0" y1="11" x2="18" y2="11" stroke="currentColor" stroke-width="1"/>
      </svg>
    </button>
  </div>
</header>
```

### Top bar styles

```css
.topbar {
  height: 50px;
  padding: 0 var(--pad);
  border-bottom: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: inherit;
}

.topbar .wordmark {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--fg);
  text-decoration: none;
}

.topbar .back-link {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  background: transparent;
  border: none;
  padding: 8px 0;
  cursor: pointer;
}
.topbar .back-link:hover { color: var(--fg); }

.topbar .topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar .menu-trigger {
  width: 44px;
  height: 44px;
  margin-right: -10px; /* visual alignment to var(--pad) edge while preserving 44px tap target */
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background: transparent;
  border: none;
  color: var(--fg);
  cursor: pointer;
}

.topbar .right-slot-text {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
```

### Hamburger glyph

3 horizontal lines, 18px wide, 12px tall, 1px stroke, `currentColor` (so it inherits `var(--fg)`). No border, no background, no label — just the glyph. The visual glyph is small but the tappable button is 44x44.

Tapping the hamburger opens the existing mobile menu sheet (see mobile_ux.md "Menu sheet"). No change to the sheet itself in this brief.

---

## What gets removed

The current mobile bottom rail. All of it.

- Remove the persistent rail component from the layout.
- Remove the right-slot-driven-by-route logic (`PLANNER`, `RECIPES`, `PANTRY`, etc.).
- Remove the `--bottom-nav-h` CSS variable if it isn't used elsewhere; if it is, leave it but stop applying it to the layout.
- Remove the `border-top: 1px solid var(--fg)` heavier-than-hairline rule that was specific to the bottom rail (per design-system.md §8h locked exception). With no rail, no exception is needed.
- Remove `padding-bottom` reservations for the rail height across pages. The page's bottom edge is now the iOS safe-area inset only.

The mobile menu sheet itself (`Home / Planner / Recipes / Pantry / Shopping / Settings / Sign out`) stays exactly as is. Only its trigger location changes — from the bottom-left rail to the top-right hamburger.

---

## What stays the same

- The mobile menu sheet (overlay opened by tapping hamburger).
- The sheet's nav items, divider, sign-out behavior.
- All sub-toolbars on individual pages (recipes search/filter row, planner date/person row, pantry search/filter row).
- All bottom sheets (filter sheet, sort sheet, person picker, add-meal sheet).
- The FAB on Recipes/Pantry list pages — still positioned where it currently is, just measured against the new bottom (no rail).
- All page content layouts.
- Desktop: completely unchanged. The top bar pattern is mobile-only (`@media (max-width: 640px)`).

---

## Specifics on the FAB

The current FAB on Recipes and Pantry sits 16-20px above the bottom rail. With the rail gone, the FAB needs a new bottom anchor. Use `bottom: max(20px, env(safe-area-inset-bottom) + 8px)` so the FAB sits clear of the iOS home indicator on devices that have one and clear of the bottom edge on devices that don't.

Alternatively, since the new `+ NEW` button now lives in the recipes/pantry sub-toolbar at the top, consider whether the FAB is still needed at all. The toolbar `+ NEW` is the same action.

**Recommendation:** Remove the FAB on Recipes and Pantry. The sub-toolbar `+ NEW` / `+ ADD` button is sufficient. One primary action, one entry point. Less visual chrome.

If kept, the FAB needs the bottom-anchor update above. Confirm during implementation.

---

## Verification

**Visual:**
- Every app page (Dashboard, Planner, Recipes, Pantry, Shopping, Settings, Recipe detail, Recipe edit, Pantry edit, Add Meal flows) has the new top bar with the correct slot mapping.
- Bottom rail is gone. No `≡ MENU` on the bottom edge of any app page.
- The hamburger glyph in the top right opens the existing menu sheet.
- The menu sheet's content and behavior are unchanged.
- On Add Meal step 2, the right slot shows `FRI, MAY 1 · JEN` (or current equivalent), not a hamburger.
- On flow pages with `← BACK` in the left slot, the wordmark does not also appear.

**Layout:**
- The top bar's left/right padding equals `var(--pad)`. The wordmark's left edge and the hamburger's right edge align with the page content's left/right edges.
- The top bar's bottom border is `1px solid var(--rule)`.
- Sub-toolbars on Planner, Recipes, Pantry sit directly below the top bar with no gap.

**Behavior:**
- Tapping the hamburger opens the menu sheet.
- Tapping outside the sheet, tapping Close, tapping a nav item, or pressing Escape all dismiss the sheet (existing behavior).
- Tapping a back link navigates to the parent (existing behavior).
- The wordmark on the top bar links to the dashboard `/` (or the existing wordmark target).

**No regressions:**
- Desktop is unchanged on every page.
- The mobile menu sheet's contents and styling are unchanged.
- All sub-toolbars and their interactions are unchanged.
- All bottom sheets (filter, sort, person picker, add meal) still work.
- All page content layouts and scroll containers are unchanged.

**FAB (if removed):**
- The Recipes and Pantry list pages no longer show the FAB.
- The `+ NEW` / `+ ADD` button in each page's sub-toolbar is the only entry point to the new-item form.

**FAB (if kept):**
- The FAB sits at `bottom: max(20px, env(safe-area-inset-bottom) + 8px)`.
- The FAB does not overlap Safari's chrome at the bottom of the viewport.

---

## Out of scope

- The dashboard's right-slot composition (person chips vs pulldown) — covered in MOB-2.
- The 1-person household logic for person chips — covered in MOB-2.
- Any changes to the mobile menu sheet's contents, styling, or behavior.
- Any changes to bottom sheets or other overlay surfaces.
- Recipe edit ingredients restructure — covered in MOB-3.
- Desktop layout — completely untouched.
- Email templates, onboarding flow content, auth flow content.
- Adding new pages or routes.

---

## Files most likely affected

- Layout component (`app/layout.tsx` or equivalent) — remove bottom rail, add top bar.
- Mobile bottom rail component — delete.
- Mobile top bar component — new (or repurpose if a top-nav skeleton exists).
- Recipe edit / Pantry edit / Add Meal flow components — left-slot back link logic.
- Add Meal step 2 component — right-slot date · person rendering.
- `globals.css` — add `.topbar`, `.topbar-left`, `.topbar-right`, `.menu-trigger`, `.menu-glyph` styles. Remove `--bottom-nav-h` if unused. Remove the `.bottom-rail` (or equivalent) styles.
- FAB component — either remove from Recipes/Pantry, or update bottom anchor.
- mobile_ux.md — update the "Bottom rail" section to "Top bar"; update z-index reference if anything changes; update the recipe-list / pantry-list FAB note.

---

## Notes for the implementer

- The hamburger glyph should use `currentColor` for stroke so it picks up `var(--fg)` automatically. This means the same component works on light and dark backgrounds without theme-specific overrides.
- The 44x44 tap target with the visual glyph offset to align with `var(--pad)` is intentional — Apple's HIG floor for tap targets is 44px, but a 44px glyph would feel bulky and unbalanced against the wordmark. Use a smaller visual glyph inside a larger invisible hit area.
- Per the locked rule from MOB-Q1 and prior briefs, mobile back-link copy is always `← BACK`. This brief inherits that rule and doesn't introduce variants.
- When removing the bottom rail, audit for any place that references `--bottom-nav-h` in calculations (sheet heights, FAB positions, scroll containers). Update or remove each reference.
- This brief intentionally does not change the menu sheet itself. The sheet is fine; only its trigger location is moving.

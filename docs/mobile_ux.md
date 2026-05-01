---
name: Mobile UX
description: Mobile pattern reference and architectural notes — bottom nav, sheets, FAB, portals, z-index
type: project
originSessionId: b2b14d40-fa64-4681-b5de-e1b1f5236cad
---
# Mobile UX

Pattern reference and architectural notes. For specific pixel-level details, trust the actual code — small details drift faster than this gets updated. The patterns themselves (portals, sheets, FAB, z-index stack) are stable.

The app is mobile-first in approach: rather than squeezing desktop layouts onto small screens, mobile gets its own interactions, information architecture, and content priority for touch. Most of that work has shipped; remaining mobile items are polish, not architecture.

---

## Patterns in production

### Bottom rail (replaces the old "bottom nav" mental model)

The mobile bottom edge has two surfaces with distinct roles:

**Bottom rail (persistent chrome):**
- Always visible at the bottom of the viewport on every page except `/onboarding` and auth routes
- Height: `calc(var(--bottom-nav-h) + env(safe-area-inset-bottom))`
- `border-top: 1px solid var(--fg)` — heavier than content hairlines. Locked exception; do not normalize to `var(--rule)`. See design-system.md §8h.
- Left: `≡ MENU` control (inline SVG glyph + 6px gap + "MENU" in DM Mono 9px uppercase `var(--fg)`)
- Right slot adapts per page: section name (`RECIPES`), action (`SHARE`), or status (`TUE, APR 28 · JEN`)
- Full spec in design-system.md §8h

**Menu sheet (overlay, opened by tapping MENU):**
- Full-screen overlay (`position: fixed; inset: 0; background: var(--bg); z-index: 400`)
- Nav items: Home, Planner, Recipes, Pantry, Shopping, Settings — 36px DM Sans sentence case
- The 36px DM Sans is intentionally different from the 9px mono rail — the sheet is a content surface, not chrome
- Hairline divider above Sign out; Sign out at same 36px weight/sentence case
- Sign out triggers `dialog.confirm` (danger: false) before executing
- Dismiss: tap outside, tap Close, tap nav item, or Escape key

### Bottom sheets

- Built around `createPortal(el, document.body)` to escape the `<main overflow-hidden>` stacking context. Without portal, sheets render behind the bottom nav.
- **Top corners: 8px, hardcoded on `.mob-sheet` (`border-radius: 8px 8px 0 0`). No CSS token** — `--radius-xl` was removed in brief 2E. This is the one locked exception to the sharp-default rule: round signals the surface slid up from below rather than appeared. Bottom corners stay 0.
- **Border-top: `1px solid var(--rule)`** — hairline at the top edge, curves with the 8px corners. Added in 2E.
- Animation: `sheetUp 360ms var(--ease-out) both` (easing = `cubic-bezier(0.23, 1, 0.32, 1)`, duration = 360ms per locked spec). Slide from `translateY(100%)` to `0`. The `--ease-drawer` iOS spring curve (`cubic-bezier(0.32, 0.72, 0, 1)`) was removed in 2E — do not reintroduce it.
- Drag handle at top, `.sheet-delay-touch` to avoid iOS tap-through bugs.
- Backdrop has two variants:
  - `.mob-sheet-backdrop` — covers full viewport including the nav (full dim).
  - `.mob-sheet-backdrop--above-nav` — stops at the top of the nav, leaving the nav undimmed.
- Sticky headers inside sheets MUST use `display: flex; flex-direction: column` to prevent margin collapse on the drag handle when sticky activates.

### FAB (floating action button)

- 52px circle, positioned just above the bottom nav.
- Used on Recipes and Pantry list pages for the primary "+ New" action.
- Hidden on desktop (where the toolbar `+ New` button takes its place).

### Toolbar pattern

- 44px height, `border-bottom: 1px solid var(--rule)`
- Padded with `var(--pad)` horizontally
- Text-label buttons (filter, view toggles): DM Mono 9px uppercase, `var(--fg-muted)` default, `var(--fg)` active with 1.5px underline. No fill tiles. No accent color on active states.
- Planner mobile toolbar: two-row layout — top row for dates/navigation, bottom row for actions. `overflow-x: auto` for the date range.

### Search field

- No magnifier icon as a default — it reads as decorative clutter.
- Hairline underline, plain text input.
- Where a search icon does appear (recipes/pantry mobile bars use it because the field shares space with chips), it sits inside the input via the `.mob-search-input--icon` modifier.

### Filter sheet (Recipes + Pantry)

- A "Filter" button opens a bottom sheet containing all filter chips and sort controls.
- Replaces the dense desktop toolbar that doesn't fit at mobile widths.
- Chips and the DONE button render in canonical sharp black. Active toggle state: 1.5px ink underline + `var(--fg)` text. Never filled black, never accent color. All chips inside sheets are sharp — locked in Brief 2E.

**Filter/sort chip layout inside `.mob-sheet`:** `display: flex; flex-wrap: wrap` with `gap: 16px 24px` and `align-items: baseline`. Never grid with equal-width cells — that produces underlines wider than the labels they belong to.

**Sort sheet:** No separate Ascending / Descending row. The active sort field shows its direction inline as `↑` or `↓` after the label, with a continuous underline under both. Tap the active field to flip the arrow. (Implemented via `handleMobSortField`, locked in Brief 2G.2.)

**Mobile sheet section rhythm:** eyebrow → first chip row = 12px; chip row → next chip row = 16px; section end → next eyebrow = 32px.

### Planner mobile

- The 7-day desktop grid is hidden entirely (`display: none`) — horizontal scroll through 7 columns at 375px is the worst possible mobile UX.
- Mobile shows the day-focused view by default (one day at a time).
- Meal entries on mobile use ruled rows (no card backgrounds, no soft tiles) — this is the **target pattern** that desktop now matches, not the other way around.
- Toolbar is `overflow-x: auto` to allow scrolling for the date range and action buttons.

### Recipe detail mobile

- Sticky header `.rd-mob-header` shows the recipe name and a back button on scroll. Anchored at `top: 0`.
- Hero section stacks (image moves above the title via `order: -1`).
- Two-column Ingredients / Nutrition layout collapses to single column.

### Pantry list rows mobile

- Action buttons (edit / delete) are always visible on mobile, not hidden behind hover or swipe.
- Buttons are square (`border-radius: 0`) with `--rule` border, matching the desktop sharp-corner system.

### Person chips (mobile)

- Pill chips with a colored dot + name (kept as pill — identity marker, exception to the sharp-corner rule).
- Scaling rule: full name when ≤3 people in the household, initial only when 4+.
- Classes: `.hm-mob-person-chip`, `.hm-mob-person-chip.on`.

### Add Meal mobile (two-screen flow)

Add Meal on mobile is a two-screen flow inside a single route (`/meal-plans/add-meal`):

- **Screen 1 — Picker:** meal type list (Breakfast, Lunch, Dinner, etc. + Pantry Items). Tapping a meal type sets direction to `'forward'` and transitions to Screen 2.
- **Screen 2 — Browse:** recipe grid/search with an `← BACK` button. Tapping back sets direction to `'back'` and returns to Screen 1.

**Transition:** Framer Motion `AnimatePresence mode="popLayout"` with direction-aware variants.
- Forward (Screen 1 → 2): incoming from right (`x: 16 → 0`), outgoing exits left (`x: 0 → -16`). Concurrent crossfade.
- Back (Screen 2 → 1): incoming from left (`x: -16 → 0`), outgoing exits right (`x: 0 → 16`). Same concurrent crossfade.
- Duration: 320ms · easing: `cubic-bezier(0.4, 0.0, 0.2, 0.2)` — matches `--motion-step` CSS token. Do not delete this token.
- `useReducedMotion()` collapses x-translation to 0; opacity crossfade only.
- Both screens have the eyebrow anchored at the same Y position. They translate horizontally as a unit — no vertical jog.

**Search input:** `FIND RECIPE…` / `FIND ITEM…` placeholder in DM Mono 9px uppercase (matches `/recipes` toolbar search). Placeholder swaps based on mode.

**Desktop:** Screen 1 never shows on desktop — the meal type rail is always visible. The two-screen flow is mobile-only.

### Auth mobile

- Split layout stacks at 760px: editorial top, form bottom.
- Editorial left → top section; form right → bottom section. `.auth-divider { display: none }`. Editorial section gets `border-bottom: 1px solid var(--rule)` for the horizontal divide.
- Outer wrapper is `.auth-page { height:100%; overflow-y:auto }` so the form scrolls on viewports too short to fit it. The layout's `<main>` is `overflow-hidden` so every page must own its own scroll.
- Top nav (`.auth-nav`): wordmark left, `← Back` mono right. Present on both desktop and mobile.

### Onboarding mobile

- `.ob-page` is `position: fixed; inset: 0` — locks to the visual viewport so iOS Safari's auto-"scroll input into view" (triggered by `autoFocus` on inputs) can't drag the topbar under the status bar.
- `.ob-body` (`flex:1; overflow-y:auto`) owns the internal scroll; any iOS scroll-into-view affects only that pane.
- `.ob-topbar` carries its own safe-area padding because the layout-level safe-area (see "Scroll & safe-area" below) doesn't apply when the page is `position:fixed` outside `<main>`.

---

## Patterns explicitly NOT in the system

### Swipe-to-reveal actions

Considered for ingredient/recipe list rows. Not implemented — action buttons are always visible on mobile instead. The argument for swipe-to-reveal is iOS-native; the argument against is that implementing it well requires a gesture library and the always-visible buttons aren't actively breaking anything. Skipped for marginal UX gain. May revisit if the always-visible buttons start to feel cluttered.

### Settings drill-down nav

Considered for the long Settings scroll. Not implemented — Settings is short enough that scrolling works fine, and adding drill-down adds two extra interactions to change one preference. The `.set-mob-jump` pill nav was prototyped and removed.

### Top page headers on index pages

The locked decision is "no page headers on index pages" — the dashboard's "Good morning, X" is the only h1 moment in the app. Mobile inherits this rule.

---

## Scroll & safe-area architecture

**Layout owns global safe-area.** The layout's `<main className="app-main flex-1 overflow-hidden">` carries `padding-top: max(env(safe-area-inset-top), 24px)` on mobile. This pushes every page below the iOS status bar/notch in one place — pages don't need their own `env(safe-area-inset-top)` paddings on top chrome. The `max()` floor is required: iOS Safari can return 0 for `env(safe-area-inset-top)` in cross-app handoff states (e.g. tapping a link in Gmail that opens in Safari), and without the floor the page content renders under the status bar.

**Pages own their own scroll.** Both `<body>` and `<main>` are `overflow-hidden`, so every page must provide an internal scroll container (typically `flex-1 overflow-y-auto` on its content div). Pages that forgot to do this stranded users on short viewports — e.g. the auth page until `.auth-page` was added.

**Onboarding bypasses the layout entirely** with `position: fixed; inset: 0` and handles its own safe-area on `.ob-topbar`. The reason is that iOS auto-scroll-into-view for focused inputs would otherwise drag the entire document up under the status bar.

**Marketing pages restore native scroll** via `html[data-marketing] { overflow-y: auto !important }` and override `overscroll-behavior-y` to `auto` on mobile so pull-to-refresh works (the app shell has `overscroll-behavior-y: none` to suppress rubber-band).

## Implementation notes

**Detect mobile in code, not just CSS.** Use `useMediaQuery('(max-width: 640px)')` for components where the data structure or component architecture differs between mobile and desktop, not just the layout. Example: the Planner uses different views entirely on mobile, so it needs a JS check.

**Preserve desktop experience.** All mobile changes should be mobile-only. Desktop stays as-is. The `sm:` breakpoint is at 640px in the Tailwind config.

**Test on real device.** The browser preview tool uses `pointer: fine` (desktop), so touch behaviors won't reproduce there. iPhone testing remains the validation step.

**Portal rendering for any overlay.** Any sheet, modal, or floating element that needs to overlay the bottom nav MUST use `createPortal(el, document.body)` because `<main overflow-hidden>` creates a stacking context that traps z-index. This bit us multiple times before we standardized on portals.

**Auto-focus on list pages.** Browser and Next.js navigation can leave focus on the first interactive element after a route change, causing a visible `:focus-visible` underline on the first list row. This conflicts with the editorial design (especially visible against the heavier rail rule). Fix pattern — add this as the first `useEffect` in every list-style page component:

```ts
useEffect(() => {
  const id = requestAnimationFrame(() => {
    (document.activeElement as HTMLElement)?.blur();
  });
  return () => cancelAnimationFrame(id);
}, []);
```

Applied to: recipes, ingredients (pantry), home, meal-plans, shopping, add-meal. Apply to any future list-style page. This is distinct from intentional `autoFocus` on form inputs opened by user action (inline add-member form, modal inputs) — those are correct and should not be removed.

**iOS tap-through.** When opening a bottom sheet from a button, iOS may fire a synthetic click on the sheet's underlying element after the sheet animates in. Mitigation: `onTouchEnd` with `e.preventDefault()` on the trigger button. Verify on physical device when adding new sheet triggers.

### z-index reference

| Layer | z-index | Element |
|---|---|---|
| Bottom nav | 50 | Fixed nav bar |
| Add-meal portal | 60 | Renders via `createPortal` — exits main stacking context |
| Sheet backdrop | 290 | `.mob-sheet-backdrop` variants |
| Sheet | 300 | `.mob-sheet` |
| Modal overlay | 600 | Desktop centered dialogs |

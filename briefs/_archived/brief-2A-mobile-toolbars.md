# BRIEF 2A — Mobile recipes/pantry index toolbar

**Part of:** Step 2 of the design pass (linework + radius audit).
**Scope:** Single PR. Mobile only. Recipes index and Pantry index pages.
**Depends on:** Nothing.
**Blocks:** None of the subsequent 2B-2G briefs.

---

## Why this brief

The mobile Recipes and Pantry index toolbars currently use bordered rounded inputs, magnifier icons, rounded square icon-buttons, and a round-black FAB. None of these match the locked editorial system. The desktop toolbars on these same pages already use the correct pattern (hairline-underline search, text-only `GRID/LIST` toggle, outlined `+ NEW` button). This brief brings mobile into parity with desktop.

## What's wrong now

Looking at `mobile_recipe_list.png`, `mobile_recipe_grid.png`, `mobile_pantry_list.png`:

1. **Search input** — bordered rounded rectangle with magnifier icon inside, sentence-case placeholder. Should be hairline-underline only, no magnifier.
2. **View toggle** (grid/list buttons on Recipes) — bordered rounded squares with grid/list icons, active state filled black. Should be text-only `GRID / LIST` with baseline-underline active state.
3. **Filter button** — bordered rounded square with sliders icon. Should be text-only `FILTER`, no icon.
4. **FAB (`+`)** — round black floating circle bottom-right above the bottom rail. Should be removed entirely. The primary action becomes a `+ NEW` outlined button in the toolbar.

## Spec for each change

### C-1 · Search input

Replace the current bordered rounded mobile search with the existing `.ed-search` style from desktop:

```css
.ed-search input {
  border: 0;
  border-bottom: 1px solid var(--rule);
  border-radius: 0;
  background: transparent;
  padding: 4px 2px;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--fg);
  outline: none;
}
.ed-search input::placeholder {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.ed-search input:focus { border-bottom-color: var(--fg); }
```

- **Placeholder copy:** `SEARCH` (uppercase mono) — matches the rest of the toolbar register
- **No magnifier icon.** Remove the icon entirely. The hairline + UPPERCASE placeholder reads as a search field; an icon adds noise.
- **Width:** flex-grow to fill available toolbar space, with a sensible min-width (~120px).

### C-2 · View toggle (Recipes only — Pantry has its own pattern)

Replace the bordered rounded square buttons with text-only toggle:

```css
.ed-toggle a {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  padding: 3px 0 2px;
  border-bottom: 1.5px solid transparent;
  transition: color 120ms var(--ease-out), border-color 120ms var(--ease-out);
}
.ed-toggle a:hover { color: var(--fg); }
.ed-toggle a.is-active { color: var(--fg); border-bottom-color: var(--fg); }
```

Markup: `GRID / LIST` (or `GRID  ·  LIST` with a separator if cleaner). Active state = baseline 1.5px underline below the text. No fill, no border, no rounded square.

**Important — baseline anchoring:** the inactive state must reserve the underline's vertical space via `border-bottom: 1.5px solid transparent`. Without this, activating the state shifts the text up by 1.5px. See design-system.md §5c.

### C-3 · Filter button

Replace the bordered rounded square sliders-icon button with a text-only link:

```html
<button class="filter-trigger">FILTER</button>
```

Style identical to `.ed-toggle a` but always single-state (no toggle behavior). Tapping opens the existing filter bottom sheet — that interaction stays the same.

If a notification badge is needed when filters are active (e.g. "2 filters applied"), use the existing `.mob-filter-badge` pill pattern (locked exception). Position absolute, top-right of the FILTER text, small.

### C-4 · `+ NEW` button (replaces FAB)

Add an outlined sharp button on the right side of the toolbar:

```css
.btn-outline {
  background: none;
  color: var(--fg);
  border: 1px solid var(--rule);
  border-radius: 0;
  padding: 8px 14px;
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.btn-outline:hover { border-color: var(--fg); }
```

Text: `+ NEW` for Recipes, `+ ADD` for Pantry (matches desktop labels exactly).

**Important — outlined, not filled.** Filled black is reserved for the single primary CTA per page (Sign In, Get Started, Save). `+ NEW` and `+ ADD` are creation actions but secondary on an index page; outlined is correct.

### C-5 · Toolbar layout

```
[ SEARCH (flex-grow) ]   GRID / LIST   FILTER   + NEW
```

For Pantry (no view toggle):
```
[ SEARCH (flex-grow) ]   FILTER   + ADD
```

- Toolbar height: 52px
- Horizontal padding: `var(--pad)` on each side
- Gap between elements: 14–16px
- Border-bottom: hairline `var(--rule)` (the existing pattern)
- No box-shadow on the toolbar

### N-1 · Remove FAB

Delete:
- The FAB component from Recipes index and Pantry index
- The CSS for the FAB (round black 52px circle, position fixed bottom-right)
- Any FAB-related class names like `.mob-fab`, `.fab`, etc.
- Any z-index assignments tied to the FAB

If anything references the FAB elsewhere (e.g. dashboard onboarding tip "tap the + button"), update the copy to reference the toolbar `+ NEW` button instead.

## Files most likely affected

- Mobile recipes toolbar component (search field, view toggle, filter, FAB)
- Mobile pantry toolbar component (search field, filter, FAB)
- `globals.css` — FAB CSS to delete; verify `.ed-search`, `.ed-toggle`, `.btn-outline` exist and are scoped correctly for mobile
- Tailwind classes on the toolbar JSX — strip `rounded-md`/`rounded`/`rounded-full` patterns

The desktop toolbar is the reference. If desktop renders correctly today, the mobile fix is essentially "use the same component classes."

## Verify before declaring done

Visual:
- Mobile Recipes: open the index. Toolbar shows `SEARCH` field (no icon, hairline underline), `GRID / LIST` text toggle (active = baseline underline), `FILTER` text link, `+ NEW` outlined button.
- Mobile Pantry: open the index. Toolbar shows `SEARCH` field, `FILTER` text link, `+ ADD` outlined button.
- No FAB anywhere on either page.
- Active state of the view toggle reads as a baseline underline directly below the text — not a fill, not a pill, not a border.
- The `+ NEW` and `+ ADD` buttons are outlined in `var(--rule)`, NOT filled black.

Grep checklist (run before declaring done):
- `rounded-` (Tailwind) — should not appear on toolbar elements
- `border-radius:` non-zero values — flag any
- `var(--accent)` / `var(--cta)` / `var(--accent-l)` on toolbar elements — should not appear
- References to FAB / `mob-fab` / `fab` — should not appear after this brief lands
- `linear` or `ease-in-out` in any animations on the toolbar — should not appear
- Magnifier icon SVGs in the toolbar — should not appear

Functional:
- Search field: typing filters the list as before (no functional change).
- View toggle: tapping GRID switches to grid view; tapping LIST switches to list view.
- Filter: tapping opens the existing filter bottom sheet (no change to sheet behavior).
- `+ NEW` / `+ ADD`: tapping opens the New Recipe / New Pantry Item form as before.

Mobile-only:
- These changes apply at mobile breakpoint only (`max-width: 640px` per `mobile_ux.md` implementation notes).
- Desktop toolbars are unchanged — verify no regressions on desktop Recipes and Pantry.

## Out of scope

- Adding `← BACK TO RECIPES` row to the New Recipe form — that's Brief 2D.
- Token sweep (`--radius-pill`, `--radius-md`, etc.) — that's Brief 2G.
- Filter sheet internal styling — already handled in prior briefs.
- Pantry list view edit/delete buttons — they're already sharp ✓.
- Any change to desktop.

## Notes for the implementer

- This brief is intentionally narrow. Don't sweep the codebase for other rounded radii in this PR — that's Brief 2G's job.
- If the mobile recipes/pantry toolbar component is shared between mobile and desktop, the changes should be scoped via a media query (`@media (max-width: 640px)`) so desktop is untouched. If they're separate components, edit the mobile one only.
- The Pantry index has filter chips (ALL / ITEMS / INGREDIENTS) inside the filter sheet, not in the toolbar. Don't touch the chip styling here — focus only on the toolbar.

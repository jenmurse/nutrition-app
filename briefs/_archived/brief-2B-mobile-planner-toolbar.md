# BRIEF 2B — Mobile planner toolbar

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. Mobile only. Planner page (`/planner` or equivalent route).
**Depends on:** Nothing. Independent of Brief 2A.
**Blocks:** Nothing.

---

## Why this brief

The mobile planner toolbar currently uses filled tile-style icon buttons (cart, chart) and is missing a `+ NEW PLAN` action entirely. Once a meal plan exists, there's no way to create a new one from the planner page on mobile. This brief converts the icons to text labels, adds the missing action, and restructures the toolbar into two rows so everything fits at 375px.

## What's wrong now

Looking at `mobile_planner.png`:

1. **Cart icon** — filled `var(--bg-3)` rounded square tile (~6px radius). Reads as iOS-default toolbar icon, not editorial.
2. **Chart icon** — same tile treatment.
3. **No `+ NEW PLAN` button** — the planner has no way to start a new plan once one exists. Empty state has `+ CREATE PLAN` but that's only for the empty state.
4. **Single-row toolbar overflow-scrolls** — per current `mobile_ux.md`, the toolbar uses `overflow-x: auto`. After we add `+ NEW PLAN` and convert icons to text, this single-row approach won't fit cleanly at 375px.

## Spec

### Two-row toolbar layout

The mobile planner toolbar wraps to two rows. Total height ~88px (44 + 44).

```
ROW 1 (44px) — locator and identity
  Apr 26 — May 2    ‹ PREV    NEXT ›                    [● JEN ▾]
  ──────────────────────────────────────────────────────────────── hairline

ROW 2 (44px) — actions
  SHOPPING ›    NUTRITION ›                          [+ NEW PLAN]
  ──────────────────────────────────────────────────────────────── hairline
```

- Row 1 holds: where you are (date range, prev/next) + who you are (person chip, right side)
- Row 2 holds: what you can do (Shopping, Nutrition, New Plan)
- Hairline divider between Row 1 and Row 2
- Hairline divider below Row 2 (separates toolbar from day strip)
- Horizontal padding: `var(--pad)` on each side of each row
- Gap between elements: 12–14px

### D-1 · Replace cart icon with text

The cart icon (`var(--bg-3)` filled rounded tile) becomes a text link:

```html
<button class="planner-toolbar-action">SHOPPING ›</button>
```

```css
.planner-toolbar-action {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  background: none;
  border: 0;
  padding: 8px 4px;
  cursor: pointer;
  transition: color 120ms var(--ease-out);
}
.planner-toolbar-action:hover { color: var(--fg); }
```

Tapping opens the existing shopping list screen — interaction unchanged.

### D-2 · Replace chart icon with text

Same pattern. `NUTRITION ›` text link replaces the chart icon. Tapping opens the existing nutrition summary bottom sheet — interaction unchanged.

### D-3 · Add `+ NEW PLAN` button (outlined)

Add to Row 2, right side:

```html
<button class="btn-outline">+ NEW PLAN</button>
```

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

**Outlined, not filled.** Per the system rule: filled black is reserved for the single primary CTA per page; `+ NEW PLAN` is secondary. This matches the desktop planner exactly.

Tapping starts a new plan — open the same flow as the empty-state `+ CREATE PLAN` action.

### D-4 · Person chip stays Row 1 right

The existing person chip pill (with colored dot + name + caret) is locked as an identity exception per design-system.md §4a. It stays Row 1 right side, unchanged.

### Two-row implementation

The toolbar structure becomes:

```jsx
<div class="planner-toolbar">
  <div class="planner-toolbar-row">  {/* Row 1 */}
    <span class="date-range">Apr 26 — May 2</span>
    <button class="prev">‹ PREV</button>
    <button class="next">NEXT ›</button>
    <span class="spacer" />
    <PersonChip />
  </div>
  <div class="planner-toolbar-row">  {/* Row 2 */}
    <button class="planner-toolbar-action">SHOPPING ›</button>
    <button class="planner-toolbar-action">NUTRITION ›</button>
    <span class="spacer" />
    <button class="btn-outline">+ NEW PLAN</button>
  </div>
</div>
```

```css
.planner-toolbar-row {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 var(--pad);
  gap: 12px;
  border-bottom: 1px solid var(--rule);
}
.planner-toolbar-row .spacer { flex: 1; }
```

### Date prev/next labels

Keep the `‹ PREV` and `NEXT ›` text labels. Bare arrows `‹ ›` were considered but rejected — labeled text is more obvious as a control and reads as editorial chrome. Style as DM Mono 9px UPPERCASE muted, hover to `var(--fg)`.

## Files most likely affected

- Mobile planner toolbar component (single file likely)
- `globals.css` — add `.planner-toolbar`, `.planner-toolbar-row`, `.planner-toolbar-action` if they don't exist; remove the legacy `.toolbar-icon-btn` references on this page
- Verify `.btn-outline` is reachable from this component

## Verify before declaring done

Visual:
- Mobile planner toolbar shows two rows of editorial chrome with a hairline between them.
- Row 1: date range, prev/next, person chip pill on right.
- Row 2: SHOPPING and NUTRITION text links left, `+ NEW PLAN` outlined button right.
- No filled tile-style icons remain.
- `+ NEW PLAN` is outlined (`var(--rule)` border, no fill), NOT filled black.
- Toolbar fits cleanly at 375px viewport without horizontal scroll.

Functional:
- SHOPPING tap opens the existing shopping list screen.
- NUTRITION tap opens the existing nutrition summary bottom sheet.
- `+ NEW PLAN` tap opens the new plan flow (same as empty-state CREATE PLAN).
- PREV/NEXT navigation works as before.
- Person chip switches users as before.

Grep checklist:
- `rounded-` (Tailwind) — should not appear on the planner toolbar
- `border-radius:` non-zero — flag any
- `var(--accent)` / `var(--accent-l)` on toolbar chrome — should not appear
- References to cart/chart SVG icons on this toolbar — should not appear
- `linear` or `ease-in-out` on toolbar transitions — should not appear

Edge cases:
- At 320px viewport (smallest supported) — does the toolbar still fit? If `+ NEW PLAN` runs into the SHOPPING/NUTRITION text on Row 2, drop the spacer's flex-basis and reduce gap to 10px. Don't shorten the text labels.
- With a 4+ person household — the person chip uses initial only (not full name). Verify Row 1 still fits.

Mobile-only:
- These changes apply at mobile breakpoint only. Desktop planner toolbar unchanged.

## Out of scope

- The 7-day strip / day cells below the toolbar — unchanged.
- Day-focused content (BREAKFAST / LUNCH / DINNER ruled rows) — unchanged.
- Nutrition bottom sheet internal layout — Brief 2E will handle the radius.
- Shopping list screen — unchanged.
- The planner empty state — unchanged.

## Notes for the implementer

- The current single-row scrolling toolbar is in `mobile_ux.md` as the documented pattern. After this brief lands, update that doc to reflect the two-row pattern. (Or flag for me to update separately.)
- If you find any other surfaces using the legacy filled-tile `--bg-3` icon button pattern, leave them — Brief 2A handles recipes/pantry; this brief handles planner; tile icons elsewhere should be flagged but not fixed in this PR.
- The desktop planner has `+ NEW PLAN` outlined in its toolbar — use that as the visual reference for how the button should look at the mobile size.

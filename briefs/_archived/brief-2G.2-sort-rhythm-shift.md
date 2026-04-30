# Brief 2G.2 — Sort interaction, sheet rhythm, layout shift

**Status:** Ready for Claude Code
**Depends on:** 2G (merged), 2G.1 (in flight or merged)
**Sibling brief:** 2H.2 (card outline + count baseline divergence)
**Blocks:** Step 2 closure (along with 2H.2 and 2I)

---

## Why

Visual review on device after 2G.1 surfaced three issues that aren't covered by either parent brief:

1. **The Ascending / Descending row in the mobile sort sheet is awkward.** It floats below the sort field row with no clear attachment, and the relationship between which field is active and which direction is current is implicit. We're going to remove the row entirely and append a direction arrow to the active sort field.

2. **Vertical rhythm in the mobile sort/filter sheet is inconsistent.** The gap between an eyebrow (SORT BY, CATEGORY) and its first row of chips reads similar to the gap between rows of chips, so eyebrows don't visually attach to the content they label.

3. **Tapping a chip causes a layout shift on the add-meal screen (and likely elsewhere).** When a chip becomes active, the underline gets added as `border-bottom`, which pushes everything below the chip down by ~1.5px. The fix: every chip should reserve transparent border-bottom space in its inactive state.

---

## Fix 1 — Sort field with appended direction arrow

### Interaction model

- Each sort field is a tappable label: NAME, CALORIES, FAT, SAT FAT, SODIUM, CARBS, SUGAR, PROTEIN, FIBER.
- One field is always active. The active field shows the underline treatment AND a direction arrow appended after the label, separated by a thin space (CSS: `margin-left: 0.4em` on the arrow).
- **Tap an inactive field** → it becomes active, direction defaults to ascending (`↑`). The previously active field returns to inactive (no underline, no arrow).
- **Tap the active field** → direction flips. `↑` becomes `↓`, or vice versa.
- **Tap the active field again** → flips back.
- A new field always starts at ascending. Direction does NOT carry across fields.

### Visual

- Arrow characters: `↑` (U+2191) and `↓` (U+2193).
- Arrow uses the same font, size, color, and weight as the label (DM Mono, 9px, uppercase context, `var(--fg)` when active).
- The underline runs **under both the label and the arrow** as one continuous stroke (the active state is a unified "field + direction" unit).

### Implementation

For each sort field button (`.mob-sheet-sort-btn` or whatever it's named after 2G):

```jsx
<button
  className={`mob-sheet-sort-btn ${isActive ? 'on' : ''}`}
  onClick={handleSortFieldTap}
>
  {label}
  {isActive && (
    <span className="mob-sheet-sort-arrow">
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  )}
</button>
```

```css
.mob-sheet-sort-btn {
  /* existing 2G underline treatment, but now the underline must extend under the arrow too */
  display: inline-flex;
  align-items: baseline;
  /* the underline is on the button itself, not on a child, so it naturally spans both */
}

.mob-sheet-sort-arrow {
  margin-left: 0.4em;
  /* inherits color, font, size from the button */
}
```

### Tap handling

```js
const handleSortFieldTap = (field) => {
  if (field === activeSortField) {
    setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
  } else {
    setActiveSortField(field);
    setSortDirection('asc');  // always reset to ascending on a new field
  }
};
```

### Remove

- The entire Ascending / Descending row inside the mobile sort sheet (`.mob-sheet-dir-btn` and its container row). Delete the JSX, delete the CSS, delete any state that's now redundant.
- Confirm `sortDirection` state is now driven solely by the field-tap handler above.

### Verification

- [ ] Tap NAME (inactive) → CALORIES (currently active) deactivates, NAME becomes active with `↑`.
- [ ] Tap NAME again → arrow flips to `↓`.
- [ ] Tap NAME a third time → arrow returns to `↑`.
- [ ] Tap FAT → NAME deactivates, FAT becomes active with `↑` (not `↓`, even if NAME was descending).
- [ ] Underline runs continuously under "CALORIES ↑" without a gap between the label and the arrow.
- [ ] No Ascending / Descending row visible anywhere in the sort sheet.
- [ ] Sort actually sorts correctly in both directions on the recipe list behind the sheet.

---

## Fix 2 — Mobile sheet vertical rhythm

### Spec

Inside `.mob-sheet`, the rhythm between sections should be:

- **Eyebrow → first row of chips:** `12px` (label is tightly attached to the content it labels)
- **Chip row → next chip row (within the same section):** `16px` (proportional, smaller than section break)
- **Section end → next eyebrow:** `32px` (a clear section break)
- **First eyebrow from sheet top edge:** `28px` (existing, verify)
- **Last chip row to sheet bottom edge:** `28px` minimum (existing, verify)

### Implementation

Apply at the parent container level. Likely the cleanest path is a single `.mob-sheet-section` wrapper:

```css
.mob-sheet-section {
  margin-top: 32px;  /* section break */
}
.mob-sheet-section:first-child {
  margin-top: 28px;  /* sheet top */
}

.mob-sheet-section-eyebrow {
  margin-bottom: 12px;  /* eyebrow → first row */
}

.mob-sheet-chip-row + .mob-sheet-chip-row {
  margin-top: 16px;  /* row → next row */
}
```

### Verification

- [ ] SORT BY eyebrow visually attaches to the NAME/CALORIES/FAT row below it
- [ ] CATEGORY eyebrow visually attaches to the ALL/BREAKFAST/LUNCH row below it
- [ ] The space between SORT BY's chip rows and CATEGORY's eyebrow reads as a clear section break (visibly larger than the inter-row gap inside SORT BY)
- [ ] Pantry filter sheet has the same rhythm even though it has fewer sections

---

## Fix 3 — Reserve transparent border to prevent layout shift on tap

### Diagnosis

When a chip becomes active and gets `border-bottom: 1.5px solid var(--fg)`, it adds 1.5px of new height. Inactive chips don't reserve that space, so activating one pushes everything below down.

### Fix

Every underline-treated chip (system-wide) should declare:

```css
.chip-class-name {
  border-bottom: 1.5px solid transparent;
  /* ... existing styles ... */
}

.chip-class-name.on {
  border-bottom-color: var(--fg);
  /* note: do NOT redeclare border-bottom shorthand, just change color */
  color: var(--fg);
}
```

The transparent border is reserved in the inactive state. Activating only changes the color. No layout shift.

### Targets

This is a system-wide audit. Apply to every selector 2G converted to underline:

- `.mob-sheet-chip` and its sort/category variants
- `.set-person-chip`
- `.scale-chip` (verify both desktop and mobile)
- `.mob-sheet-sort-btn` (after Fix 1)
- Any `.add-meal-chip` or whatever the meal-type tabs on the add-meal screen are called
- `.set-mob-jump-btn`
- Any chip group on the planner (`.pl-person-chip`, `.pl-nut-chip`, `.pl-add-filter-chip`) — these likely already use this pattern correctly per the original grep, but verify
- `.auth-tab` — verify
- `.scale-chip` (mobile) — verify

### Verification

- [ ] Add-meal screen: tap BREAKFAST, then LUNCH, then DINNER in sequence. The chip row stays vertically pinned. Recipe list below does not shift.
- [ ] Mobile filter sheet: tap chips in SORT BY and CATEGORY. The sheet contents below the active chip don't shift.
- [ ] Settings JEN/GARTH: tap to switch. The Daily Goals form below does not shift.
- [ ] Recipe scale chips: tap 1x → 2x → 4x. The ingredient list below does not shift.

If a chip group is found to NOT have the layout shift bug (e.g., planner chips already render correctly), still confirm the inactive state declares `border-bottom: 1.5px solid transparent` for consistency. If it uses a different mechanism (e.g., `::after` pseudo-element for the underline), document that the layout shift is avoided and move on. Don't force a uniform implementation if an existing pattern is already shift-free.

---

## Out of scope

- Card outline / count baseline divergence (covered in 2H.2)
- Desktop sort UI restyle — desktop already shows `NAME ▼ ↑` which is roughly the right pattern. Don't change desktop in this brief unless the implementer finds the chip layout-shift bug there too, in which case apply Fix 3 to it.

---

## Doc updates after code lands

### `design-system.md`

Update the active-state rule entry to add:
> Active toggle chips must reserve `border-bottom: 1.5px solid transparent` in their inactive state to prevent layout shift on activation. Only the border color changes when the chip becomes active.

Add a note under the toggle/chip section:
> Sort field controls use a single tap target per field. The active field shows a continuous underline running under both the label and an appended direction arrow (`↑` or `↓`). Tapping the active field flips the arrow. There is no separate Ascending/Descending control.

### `mobile_ux.md`

Update the filter sheet pattern:
> Sort sheets do not have a separate Ascending / Descending row. The active sort field shows its direction inline as `↑` or `↓` after the label, with a continuous underline under both. Tap the active field to flip the arrow.

Add the rhythm spec:
> Mobile sheet section rhythm: eyebrow → first chip row = 12px; chip row → next chip row = 16px; section end → next eyebrow = 32px.

### `step2-audit.md`

Note 2G.2 with the three fixes logged.

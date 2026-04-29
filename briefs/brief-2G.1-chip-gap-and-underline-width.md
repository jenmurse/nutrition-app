# Brief 2G.1 — Chip gap & underline width follow-ups

**Status:** Ready for Claude Code
**Depends on:** 2G (merged)
**Sibling brief:** 2H.1 (count baseline + card outline follow-ups)
**Blocks:** Step 2 closure (along with 2H.1 and 2I)

---

## Why

2G landed the underline rule cleanly. Visual review on device surfaced two follow-up issues that fall out of the rule change but weren't anticipated in the original brief:

1. **Chip spacing is too tight after underline treatment.** When chips were filled boxes, each chip's padding (~12px horizontal) plus a small `gap` between them produced enough breathing room. Now that chips are text-only with an underline, the previous gap values feel cramped and labels read as one continuous run. Visible on:
   - Desktop settings → Daily Goals → JEN / GARTH (nearly touching)
   - Desktop add-meal → meal type chips (BREAKFAST / LUNCH / DINNER / SIDE / SNACK / DESSERT / BEVERAGE all crammed in one row)
   - Likely affects any other surface where 2G converted filled-box chips to underline.

2. **Mobile filter sheet underlines are too wide.** The category chip row in `.mob-sheet` uses a grid layout (`display: grid` with equal-width cells). Each chip's underline stretches the full cell width even though the text is shorter. The underline ends up underlining empty space rather than hugging the word. With 9 chips visible (ALL through FAVORITES), the rows read as a stripe of disconnected lines rather than labeled selections.

The pantry filter sheet only has 3 chips (ALL / ITEMS / INGREDIENTS), so the same bug is present but barely visible. Recipe sheet exposes it.

---

## Fixes

### Fix 1 — Chip gap calibration (system-wide, all underline-treatment chips)

Wherever 2G converted a filled-box chip group to underline, the inter-chip gap needs recalibration.

**Targets:**
- `.set-person-chip` row (settings → Daily Goals)
- `.mob-sheet-chip` row (mobile filter sheet, both recipes and pantry)
- Any chip group on the add-meal screen (meal type tabs)
- Recipe scale chips (`.scale-chip`) on desktop — verify gap; mobile already worked
- Any other group 2G touched

**Rule to apply:**
- Desktop: `gap: 24px`
- Mobile: `gap: 16px`

**Implementation note:** prefer setting these at the chip-group container level rather than on each chip. If a single shared utility class makes sense (e.g. `.chip-row`), use it. If not, set per-component but use the same values.

**Verification:** for each chip group, eyeball that:
- Adjacent labels read as discrete items, not as one phrase
- The gap reads similar across desktop and mobile (just sized down on mobile)
- Underlines don't visually overlap or come close to overlapping

### Fix 2 — Mobile filter sheet underline width

**File:** wherever `.mob-sheet` chip rows are laid out (likely `globals.css` or a sheet component).

**Current:** chip row uses grid with equal-width cells, so underlines stretch to cell width.

**Fix:** switch chip rows inside `.mob-sheet` from grid to flex-wrap. Chips should auto-size to their text content, and the underline should hug the word.

```css
.mob-sheet-chip-row {  /* or whatever the existing class is */
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;  /* row gap, column gap */
  align-items: baseline;
}

.mob-sheet-chip {
  /* width: auto; — confirm no inherited width is overriding */
  flex: 0 0 auto;
}
```

**Notes:**
- `align-items: baseline` matters because the underline sits below the text baseline. With multi-row wrapping, baseline alignment keeps underlines visually consistent across rows.
- Row gap `16px` and column gap `24px` is a starting suggestion. Adjust if visual review shows otherwise. The row gap should be larger than chip height feels like — if labels overlap their underlines onto the row below, increase row gap.
- Audit ALL chip groups inside `.mob-sheet`, not just CATEGORY. Sort field chips (NAME / CALORIES / FAT / SAT FAT / SODIUM / CARBS / SUGAR / PROTEIN / FIBER) likely have the same problem since they were also previously filled boxes.
- Don't change the chip's internal styling (text color, underline, padding) — that's set correctly by 2G. This fix is purely about the parent layout.

### Fix 3 — Verify all 2G surfaces

Walk every surface 2G touched and verify:
- [ ] Mobile recipe filter sheet — chips read as discrete items, underlines hug text
- [ ] Mobile pantry filter sheet — same
- [ ] Mobile recipe sort sheet (sort field chips, sort direction) — same
- [ ] Desktop settings → Daily Goals → person chip — JEN / GARTH have visible breathing room
- [ ] Desktop add-meal → meal type chips — read as a row of discrete labels
- [ ] Desktop recipe detail → scale chips — gap looks right
- [ ] Mobile settings → jump nav — underline treatment intact, no spacing issues

Any other location surfaced during the walk: log it and apply the same gap rule.

---

## Out of scope

- The "65 RECIPES" baseline drift (covered in 2H.1)
- The compare-mode card outline ring/gutter relationship (covered in 2H.1)
- New rule changes — the underline rule from 2G stands. This brief only adjusts spacing and layout containers.

---

## Doc updates after code lands

### `design-system.md`

Update the active-state rule entry to include the spacing addendum:
> Inter-chip gap when underline-treated: `24px` desktop, `16px` mobile, applied at the chip-group container level. Do not use grid layouts that force equal-width cells — chips must auto-size to their text so underlines hug labels rather than cells.

### `mobile_ux.md`

Add to the filter sheet pattern:
> Filter and sort chip rows inside `.mob-sheet` use `display: flex; flex-wrap: wrap` with `gap: 16px 24px` and `align-items: baseline`. Never grid with equal-width cells — that produces underlines wider than the labels they belong to.

### `step2-audit.md`

Note 2G.1 as a follow-up to 2G with the two fixes logged.

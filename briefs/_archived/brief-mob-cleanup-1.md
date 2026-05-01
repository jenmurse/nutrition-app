# BRIEF MOB-CLEANUP-1 — Post-MOB-1 spacing, alignment, and visual corrections

**Part of:** Step 4 mobile audit cleanup.
**Scope:** Single PR. Visual corrections across mobile chrome, planner, recipes, pantry, settings, recipe detail. No structural changes. No new components.
**Depends on:** MOB-1 (top bar), MOB-2 (person pulldown). Ship after both are in.
**Blocks:** Nothing.

---

## Why this brief

MOB-1 shipped the top bar and removed the bottom rail. MOB-2 shipped the person pulldown. This brief corrects spacing and visual issues surfaced during the post-MOB-1/2 review pass. All items are small, targeted, and non-structural.

---

## Fix 1 — Menu sheet animation: slide from top

### Problem
The mobile menu sheet still slides up from the bottom. The trigger moved to the top right. The sheet should follow its trigger.

### Fix
Change the menu sheet's enter/exit animation from a bottom-up translate to a top-down translate.

```css
/* Before */
.mob-sheet {
  transform: translateY(100%);
}
.mob-sheet.open {
  transform: translateY(0);
}

/* After */
.mob-sheet {
  transform: translateY(-100%);
  top: 0;
  bottom: auto;
  border-radius: 0 0 8px 8px; /* was 8px 8px 0 0 */
}
.mob-sheet.open {
  transform: translateY(0);
}
```

The sheet drops down from the top of the viewport. The border-radius exception flips — rounded corners now appear on the bottom edge (the sheet slides down and reveals its bottom corners). Top corners are sharp because they sit flush against the top of the screen.

Duration and easing are unchanged: 360ms, `var(--ease-out)`.

### Verification
- Tap hamburger. Sheet slides down from the top.
- Dismiss sheet (tap outside, tap CLOSE, tap a nav item). Sheet slides back up.
- Rounded corners on the bottom edge of the sheet. Top corners sharp.
- Animation duration feels the same as before.

---

## Fix 2 — REGENERATE button on Settings: outlined not filled

### Problem
REGENERATE in the MCP Integration section renders as a filled black primary button. Per the locked rule, filled black is reserved for the single primary commit per task context. SAVE GOALS is the primary commit for Settings. REGENERATE is a secondary action managing an already-committed state (a token that exists). It should be peers with REVOKE next to it.

### Fix
Change REGENERATE from `.btn-primary` (or equivalent filled class) to `.btn-outline` (outlined, `var(--rule)` border, no fill).

REVOKE is already outlined — no change needed there.

### Verification
- REGENERATE renders with hairline border, no fill, same visual weight as REVOKE.
- SAVE GOALS remains the only filled black button on the Settings page.

---

## Fix 3 — Settings page header: match Edit Pantry type size

### Problem
The `§ SETTINGS` eyebrow and "Your preferences." headline use the display/empty-state heading size (large clamp, ~36-64px). Settings is a form/detail page. It should use the same header style as Edit Pantry Item — a smaller section-weight heading, not the editorial display size.

### Fix
The Settings page header should use the same markup classes as the Edit Pantry / Edit Recipe page headers:
- Eyebrow: `§ SETTINGS` — 9px DM Mono uppercase `var(--muted)`. Same as `PANTRY / EDIT`.
- Headline: "Your preferences." — same font-size, weight, and tracking as "Edit Pantry Item" (approximately 28-32px, 700, -0.02em). Not the display clamp.

Do not introduce new type styles. Find the class used by "Edit Pantry Item" and apply it here.

Same fix on mobile — no separate clamp needed since the section-weight heading is already appropriately sized at mobile widths.

### Verification
- Desktop Settings: eyebrow and headline match the visual size of the Edit Pantry header. Left edge aligns with the content column.
- Mobile Settings: headline is not display-sized. Roughly the same visual weight as "01 People" / "02 Daily Goals" section headers.
- No change to the section headers within Settings (People, Daily Goals, etc.) — those are correct.

---

## Fix 4 — Wordmark: slightly larger across all screens

### Problem
The wordmark reads slightly small in the top bar, especially compared to the page content below it.

### Fix
Increase wordmark font-size from `13px` to `15px` on the `.topbar .wordmark` class.

Apply the same change to the auth topbar (`.auth-nav .wordmark`) and onboarding topbar (`.ob-topbar .wordmark`) so all three contexts are consistent.

### Verification
- Wordmark reads with slightly more presence in the top bar.
- Consistent size across: app top bar, auth pages, onboarding pages.
- Does not feel oversized relative to the hamburger or person chip.

---

## Fix 5 — Dashboard person chip: border color `var(--rule)` not `var(--accent)`

### Problem
The dashboard person chip/pulldown renders with an accent-colored border (`var(--accent)`, coral for Jen). The locked rule is: accent marks identity. The dot inside the chip carries the identity signal — the border doesn't need to double it. The planner person pulldown correctly uses `var(--rule)` (grey) border. Dashboard should match.

### Fix
On the dashboard person chip/pulldown, change the border from `var(--accent)` to `var(--rule)`.

The dot inside the chip remains `var(--accent)`. Only the border changes.

```css
.hm-mob-person-chip {
  border: 1px solid var(--rule); /* was var(--accent) */
}
```

### Verification
- Dashboard person chip has a grey hairline border.
- The accent dot inside is unchanged.
- Planner person pulldown unchanged (already correct).
- No other accent borders introduced.

---

## Fix 6 — Dashboard chip + hamburger gap: tighten

### Problem
The gap between the person chip and the hamburger glyph on the dashboard top bar is too wide (~16px). They're a functional pair and should sit closer together.

### Fix
Reduce the gap between the person chip and the hamburger trigger inside `.topbar-right` on the dashboard to `8px`.

```css
/* Dashboard topbar right slot */
.hm-topbar-right {
  gap: 8px; /* was ~16px */
}
```

If the gap is set at the shared `.topbar-right` level (affecting all pages), scope this change to dashboard only so other pages' right slots aren't affected.

### Verification
- Dashboard: person chip and hamburger sit visibly closer together.
- Other pages: hamburger position in the right slot unchanged.

---

## Fix 7 — Hamburger: symmetric inset with wordmark

### Problem
The hamburger glyph's right edge sits closer to the screen edge than the wordmark's left edge. The asymmetry is visible (~4-6px difference).

### Fix
The hamburger trigger uses a 44x44 tap target with the visual glyph offset to align with the right edge. The negative margin that offsets the glyph needs to match the left side.

Measure the wordmark's left edge distance from the screen edge (should be `var(--pad)`, approximately 20px on mobile). Set the hamburger's visual glyph right edge to the same distance from the right edge.

```css
.topbar .menu-trigger {
  width: 44px;
  height: 44px;
  margin-right: -12px; /* adjust until visual glyph right edge = wordmark left edge distance */
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
```

Adjust the `margin-right` value until the glyph is optically symmetric with the wordmark. The exact value depends on the current `var(--pad)` mobile value — dial it in visually.

### Verification
- Wordmark left edge and hamburger glyph right edge are at the same distance from their respective screen edges.
- 44px tap target is preserved.
- Test on 375px and 390px widths.

---

## Fix 8 — Planner toolbar row: padding matches top bar

### Problem
The planner toolbar row (APR 26 – MAY 2 / person chip / + NEW PLAN) has less horizontal padding than the top bar. After the hamburger alignment fix, all rows should share the same left/right boundary.

### Fix
Set the planner toolbar row's left and right padding to match `var(--pad)` (the same value used by the top bar).

The + NEW PLAN button's right edge should sit at the same horizontal position as the hamburger glyph's right edge in the top bar.

```css
.pl-toolbar {
  padding-left: var(--pad);
  padding-right: var(--pad);
}
```

If the + NEW PLAN button currently has extra right padding or margin pushing it further right, remove it.

### Verification
- Left edge of "APR 26 – MAY 2" aligns with left edge of wordmark.
- Right edge of + NEW PLAN button aligns with right edge of hamburger glyph.

---

## Fix 9 — Planner day/date strip: alignment with toolbar content

### Problem
After MOB-1, the day strip overcorrected and is now too inset — the SU and SA day cells sit further from the screen edges than the content in the toolbar rows above them. The day strip should align with the content inside the toolbar, not exceed it.

### Fix
The day strip left/right padding should produce the same visual left/right boundary as the text content of the toolbar row above it. Specifically:

- The left edge of the SU day cell content should align with the left edge of "APR 26 – MAY 2" in the toolbar row above.
- The right edge of the SA day cell content should align with the right edge of the + NEW PLAN button above.

This is the same `var(--pad)` value as the top bar and toolbar rows. If a previous fix applied a larger padding value to the day strip, revert it to `var(--pad)`.

```css
.pl-day-strip {
  padding-left: var(--pad);
  padding-right: var(--pad);
}
```

The 7 day cells are equally distributed within the remaining width. Do not add additional inset beyond `var(--pad)`.

### Verification
- SU day cell left edge aligns with the left edge of "APR 26" text in the toolbar row.
- SA day cell right edge aligns with the right edge of the + NEW PLAN button.
- Day cells remain equally spaced across the full available width.
- Active day accent treatment unchanged.

---

## Fix 10 — Recipes and Pantry toolbar: top padding, left/right padding

### Problem
The toolbar row on Recipes (SEARCH / GRID / LIST / FILTER / + NEW) and Pantry (SEARCH / FILTER / + ADD) has two issues:
- Insufficient top padding — it sits too tight below the top bar hairline.
- Left/right padding narrower than the top bar — SEARCH starts too close to the left edge, + NEW / + ADD ends too close to the right.

### Fix
Add top padding to the toolbar row and set left/right padding to `var(--pad)`.

```css
.rcp-toolbar,
.pt-toolbar {
  padding: 12px var(--pad);
}
```

The search input may need to be slightly narrower to accommodate the consistent left/right padding alongside the other toolbar elements (GRID/LIST/FILTER/+NEW). This is acceptable — the search input is flexible width and can compress slightly.

### Verification
- Recipes toolbar: SEARCH left edge aligns with wordmark left edge. + NEW right edge aligns with hamburger glyph right edge. Visible top padding above the toolbar content.
- Pantry toolbar: SEARCH left edge aligns with wordmark left edge. + ADD right edge aligns with hamburger glyph right edge. Visible top padding.
- The toolbar content (labels, button) is vertically centered within the padded row.
- Search input still usable — not too narrow.

---

## Fix 11 — Recipe detail photo: edge to edge

### Problem
The recipe detail page shows the photo with horizontal padding (inset from screen edges). The recipe grid shows photos full-bleed to screen edges. A user tapping a recipe card in the grid sees the photo shrink inward on the detail page, creating a mismatch.

### Fix
On mobile, the recipe detail hero photo should be edge-to-edge and flush directly below the top bar hairline — no gap between the nav bottom border and the photo top edge, no horizontal padding, no border-radius.

```css
@media (max-width: 640px) {
  .rd-hero-image {
    width: 100vw;
    margin-left: calc(-1 * var(--pad));
    margin-top: 0;
    border-radius: 0;
    display: block; /* removes inline bottom gap */
  }
}
```

If the recipe detail page has a content wrapper with `padding-top`, the photo must either sit outside that wrapper or use a negative top margin to cancel the padding. The photo should be the first element the user sees below the top bar with zero vertical gap.

The content below the photo (eyebrow, title, servings, source, action buttons) retains `var(--pad)` horizontal padding and normal top padding. Only the photo is edge-to-edge and flush.

Desktop recipe detail photo treatment is unchanged.

### Verification
- Recipe detail on mobile: photo extends to both screen edges with no side padding.
- Photo top edge sits flush against the top bar's bottom hairline — no white gap between them.
- Content below the photo (DESSERT eyebrow, recipe title, 9 SERVINGS, etc.) has normal horizontal and vertical padding.
- Desktop recipe detail is unchanged.
- Photo aspect ratio is maintained — no stretching.

---

## Fix 12 — Desktop Settings header: vertical position

### Problem
The `§ SETTINGS` eyebrow and "Your preferences." headline sit too high on the desktop Settings page. The page header's top edge doesn't align with the first item in the left jump nav (01 PEOPLE). The content column and the nav column should start at the same vertical position.

### Fix
Adjust the top padding of the Settings page header so its top edge aligns with the top of the jump nav's first item.

Check how the Edit Pantry page aligns its `PANTRY / EDIT` eyebrow with the jump nav's `01 LOOKUP` item — the Settings header should use the same `padding-top` value.

Do not change the type size or weight (those are already correct after Fix 3). Only the vertical position changes.

### Verification
- Desktop Settings: the `§ SETTINGS` eyebrow top edge is at the same vertical position as the `01 PEOPLE` jump nav item.
- Matches the vertical alignment of Edit Pantry's `PANTRY / EDIT` eyebrow relative to its `01 LOOKUP` jump nav item.
- Mobile Settings is unchanged by this fix (mobile has no jump nav).

---

## Out of scope

- MOB-2 implementation (person pulldown) — separate brief.
- MOB-3 (recipe edit ingredients) — separate brief.
- Add Meal screen top bar pattern — Add Meal step 2 currently has a duplicate `← BACK` row (one in the top bar, one below the hairline). These screens need a pattern decision. Covered in a separate brief (MOB-4).
- Any other spacing issues not listed here.
- Desktop layout changes — all fixes here are mobile-only except Fix 2 (REGENERATE button), Fix 3 (Settings header type size), and Fix 12 (Settings header vertical position).
- Adding new animations or transitions beyond the menu sheet direction change.
- Changing the menu sheet's contents, size, or other styling.

---

## Files most likely affected

- `globals.css` — menu sheet animation, `.topbar` wordmark size, `.hm-mob-person-chip` border, `.topbar-right` gap, `.menu-trigger` margin.
- Settings page component / styles — page header type fix, vertical position fix, REGENERATE button class.
- Planner component / styles — toolbar and day strip padding.
- Recipes page component / styles — toolbar padding.
- Pantry page component / styles — toolbar padding.
- Recipe detail component / styles — hero image edge-to-edge and flush to nav on mobile.
- Auth topbar component / styles — wordmark size.
- Onboarding topbar component / styles — wordmark size.

---

## Verification checklist (full pass)

Run through these in order on a 375px mobile viewport after all fixes land:

- [ ] Menu sheet slides down from top, rounded corners on bottom edge
- [ ] REGENERATE is outlined, SAVE GOALS is the only filled black button on Settings
- [ ] Settings header type size matches Edit Pantry (desktop + mobile)
- [ ] Settings header top edge aligns with jump nav 01 PEOPLE (desktop only)
- [ ] Wordmark is 15px across app, auth, and onboarding top bars
- [ ] Dashboard person chip has grey border, accent dot unchanged
- [ ] Dashboard: chip and hamburger sit 8px apart
- [ ] Hamburger glyph right edge optically symmetric with wordmark left edge
- [ ] Planner toolbar: left/right edges align with top bar
- [ ] Planner day strip: SU left edge aligns with toolbar content left, SA right edge aligns with toolbar content right
- [ ] Recipes toolbar: top padding visible, left/right edges align with top bar
- [ ] Pantry toolbar: top padding visible, left/right edges align with top bar
- [ ] Recipe detail: hero photo edge to edge, flush to top bar hairline, no gap above
- [ ] Desktop unchanged on all pages except Settings header and REGENERATE button

# BRIEF 2D — Mobile form back-buttons and select dropdowns

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. Mobile only. New Recipe form, Edit Recipe form, New Pantry Item form. Plus any other form using native `<select>`.
**Depends on:** Nothing.
**Blocks:** Nothing.

---

## Why this brief

Two distinct issues on mobile forms, related because they both contradict the locked editorial system:

1. **Native `<select>` dropdowns** render with bordered rounded rectangles (default iOS appearance) on the recipe and pantry forms. They should match the bottom-border-only form input pattern locked in design-system.md §5d.

2. **Form pages have no back affordance.** Opening "New Recipe" from the recipes index leaves the user stranded on a form screen with no obvious way back. The bottom rail still says `RECIPES` (correct, since the form is contextually a child of Recipes) but there's no `← BACK TO RECIPES` row at the top. The existing pattern from shopping list and add-meal flows uses exactly this row.

This brief adds the back row and styles the dropdowns.

## What's wrong now

Looking at `mobile_recipe_new.png`, `mobile_recipe_edit.png`, `mobile_pantry_new.png`:

1. **No back row at top of form screens.** The user has to use the menu sheet to navigate away.
2. **`SERVING UNIT` dropdown** on recipe form — bordered rounded rectangle with caret right.
3. **`CATEGORY` dropdown** on pantry form — same.
4. **`DEFAULT UNIT` dropdown** on pantry form — same.
5. **`PREP TIME (MIN)` field** — actually fine (number input, bottom-border) ✓ but verify.
6. There may be similar `<select>` rendering on onboarding step 4 (Goals) — verify and fix if found.

## Spec

### G-1 / H-1 · Style native `<select>` to match form input pattern

The goal is bottom-border-only with a custom caret, matching the locked form input style:

```css
.form-select {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--rule);
  border-radius: 0;
  padding: 6px 24px 6px 0;  /* right padding for caret */
  font: 400 13px var(--font-sans);
  color: var(--fg);
  outline: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Cpath fill='%236B6860' d='M0 0l4 5 4-5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 8px 5px;
}
.form-select:focus { border-bottom-color: var(--fg); }
.form-select:focus { outline: none; }
```

Apply to:
- Recipe form: `SERVING UNIT` select
- Pantry form: `CATEGORY` select, `DEFAULT UNIT` select
- Any other native `<select>` in the app (search the codebase)

**Important:**
- Use `appearance: none` (with vendor prefixes) to strip iOS's default bordered rounded rendering.
- Provide a custom caret via inline SVG `background-image`. The caret color is `var(--muted)`. Position right with 4px padding from the right edge.
- Keep the native `<select>` element — don't replace with a custom JS dropdown. Native preserves accessibility (keyboard nav, screen reader announcement, OS-native picker on mobile).
- The `option` elements inside the select inherit OS rendering — that's fine. We're only restyling the closed/collapsed appearance.

### G-2 · Add `← BACK TO RECIPES` row to New Recipe + Edit Recipe screens

The row sits at the top of the form, above the eyebrow + title. It mirrors the shopping list and add-meal pattern:

```html
<div class="form-back-row">
  <a href="/recipes" class="back-link">← BACK TO RECIPES</a>
</div>
```

```css
.form-back-row {
  padding: 16px var(--pad);
  border-bottom: 1px solid var(--rule);
}
.back-link {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  text-decoration: none;
  transition: color 120ms var(--ease-out);
}
.back-link:hover { color: var(--fg); }
```

The arrow `←` is the LEFTWARDS ARROW character (U+2190). Use it inline as text — not an SVG — because it inherits color and font weight cleanly.

The eyebrow `RECIPE / NEW` and the title `New Recipe` stay below this row, unchanged.

### H-2 · Add `← BACK TO PANTRY` row to New Pantry Item + Edit Pantry Item screens

Same pattern. Use `BACK TO PANTRY` as the label.

### Behavior

- On mobile, tapping the back link navigates to the parent index page (Recipes or Pantry).
- On desktop, the back link can be hidden — desktop has its own breadcrumb pattern (the `RECIPE / NEW` eyebrow + title is enough). Use `@media (max-width: 640px)` to scope this row to mobile only.
- If the user has unsaved changes in the form, the back link should trigger the existing "Discard unsaved changes?" confirmation dialog before navigating. If no such dialog exists yet, that's a separate concern — for this brief, just navigate immediately and we'll add the unsaved-changes guard in a future brief.

### J-1 · Audit onboarding for native `<select>` stragglers

Open onboarding steps 2, 3, 4 in mobile view. If any step uses a native `<select>` with the default bordered rounded rendering, apply the same `.form-select` class.

Per `mobile_onboarding_*.png`, step 1 (Welcome) and step 2 (Profile) don't appear to use selects. Step 3 (Household) and step 4 (Goals) may have them — verify and fix if found.

## Files most likely affected

- New Recipe form component (mobile layout)
- Edit Recipe form component (mobile layout)
- New Pantry Item form component (mobile layout)
- Edit Pantry Item form component (mobile layout)
- Onboarding step components (audit)
- `globals.css` — add `.form-select`, `.form-back-row`, `.back-link` classes

## Verify before declaring done

Visual:
- Open New Recipe on mobile. Top row: `← BACK TO RECIPES` (DM Mono 9px UPPERCASE muted). Hairline below. Then the existing eyebrow + title.
- Same for Edit Recipe, New Pantry Item, Edit Pantry Item.
- Native dropdowns (SERVING UNIT, CATEGORY, DEFAULT UNIT) render with no border, no rounded corners. Bottom hairline only. Caret on the right side.
- Tapping a dropdown opens the native iOS/Android picker — the OS handles the picker, not custom UI.
- On focus, the dropdown's bottom border darkens to `var(--fg)`.
- On desktop, the back row is hidden — the existing breadcrumb pattern remains.

Functional:
- `← BACK TO RECIPES` navigates to `/recipes`.
- `← BACK TO PANTRY` navigates to `/pantry`.
- Dropdowns: selecting a value works as before.
- Form submission: works as before.
- Onboarding: any restyled selects continue to function — selected value persists, etc.

Grep checklist:
- `rounded-` (Tailwind) on form inputs — should not appear
- `border-radius:` non-zero on `<select>` elements — flag
- Default `<select>` with no `.form-select` class — flag any remaining
- `linear` or `ease-in-out` on form transitions — should not appear

Mobile-only:
- The back row is mobile-only. Verify it doesn't appear on desktop.
- The dropdown styling applies on both desktop and mobile — but desktop already uses bottom-border inputs, so it should harmonize. Verify desktop forms still look correct.

## Out of scope

- The form body content (ingredient rows, method steps, photo upload, etc.) — unchanged.
- The `+ NEW` button on the parent index pages — Brief 2A handles that.
- Changes to the bottom rail behavior on form screens — the rail stays constant per master-plan.md §5 (it always shows `Menu | NN — SECTION`). The new back row is additive, not a replacement.
- Discard-unsaved-changes confirmation dialog — separate future work.
- Desktop breadcrumb redesign — desktop is fine.

## Notes for the implementer

- The back-row pattern already exists for shopping list (`mobile_shopping.png` shows `← BACK TO PLANNER | SHOPPING LIST | SHARE`) and for add-meal (`desktop_add_meal_1.png` shows `← BACK TO PLANNER | ADD MEAL`). Use those as references — the same row pattern should be reusable across all child screens.
- The shopping list has a 3-column layout (back / title / share). The form back-row only needs the back link on the left. Don't add a centered title — the form has its own title below as part of the editorial layout.
- If a custom `<Select>` component already exists somewhere in the codebase (Radix, custom React component, etc.), check whether it's being used or whether forms are using native `<select>` directly. The fix above assumes native `<select>`. If forms use a custom component, restyle the component instead.

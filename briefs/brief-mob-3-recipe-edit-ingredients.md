# BRIEF MOB-3 — Recipe edit ingredients restructure (mobile)

**Part of:** Step 4 mobile audit.
**Scope:** Single PR. Restructures the ingredients section of the recipe edit / new recipe form on mobile only. Desktop is unchanged.
**Depends on:** Nothing.
**Blocks:** Nothing.

---

## Why this brief

The current recipe edit form lays out each ingredient as a single row with four columns: drag handle, name input, amount input, unit select, delete button. The preparation field renders as a second row underneath, indented under the name.

This works on desktop because the row has horizontal room. On mobile at 375px:
- The drag handle, name, amount, unit, and delete crammed into one row leaves each input ~50-70px wide.
- The "Preparation (optional)" placeholder truncates inside its narrow column ("Preparation (op…").
- The unit select renders as a default iOS bordered rounded rectangle (separate fix in Brief 2D).
- The delete `×` glyph is small and hard to tap accurately.

The fix is a different mobile layout: a vertical block per ingredient with three rows of inputs and proper labels.

---

## The proposed pattern

Each ingredient is a vertical block with three rows:

**Row 1 — Identity row:**
- Drag handle (left, 16px)
- Ingredient name input (full remaining width)
- Delete button (right, 32x32 with hairline border)

**Row 2 — Quantity row (indented under the name):**
- Amount field (label + input, fixed 100px width)
- Unit field (label + select, flexible remaining width)

**Row 3 — Preparation row (indented under the name):**
- Single input with label above

Each sub-field has its own 9px DM Mono uppercase label sitting above the input. This pulls the preparation field out of placeholder-only land and matches the labeling pattern used on the pantry form, settings, and other forms in the app.

### Markup

```html
<div class="ing-card">
  <div class="ing-card-row1">
    <span class="drag-handle" aria-label="Reorder">⋮⋮</span>
    <input class="ing-name" value="Almond flour" />
    <button class="ing-delete" aria-label="Remove ingredient">×</button>
  </div>

  <div class="ing-card-row2">
    <div class="field">
      <label class="field-label">Amount</label>
      <input value="1" />
    </div>
    <div class="field">
      <label class="field-label">Unit</label>
      <select class="form-select">
        <option>cup</option>
        <!-- ... -->
      </select>
    </div>
  </div>

  <div class="ing-card-row3 field">
    <label class="field-label">Preparation</label>
    <input placeholder="optional" />
  </div>
</div>
```

### Styles

```css
.ing-card {
  padding: 18px var(--pad);
  border-bottom: 1px solid var(--rule);
}

.ing-card-row1 {
  display: grid;
  grid-template-columns: 16px 1fr 32px;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.ing-card-row1 .drag-handle {
  color: var(--muted);
  font-size: 14px;
  cursor: grab;
  line-height: 1;
  user-select: none;
}

.ing-card-row1 .ing-name {
  font-family: var(--font-sans);
  font-size: 16px;
  font-weight: 600;
  color: var(--fg);
  border: none;
  border-bottom: 1px solid var(--rule);
  padding: 4px 0;
  width: 100%;
  background: transparent;
  outline: none;
}
.ing-card-row1 .ing-name:focus { border-bottom-color: var(--fg); }

.ing-card-row1 .ing-delete {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--muted);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}
.ing-card-row1 .ing-delete:hover { color: var(--fg); border-color: var(--fg); }

.ing-card-row2 {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 16px;
  margin-left: 28px; /* indents under the ingredient name */
  margin-bottom: 12px;
  align-items: end;
}

.ing-card-row3 {
  margin-left: 28px; /* matches row 2 indent */
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

/* Inputs inside ingredient cards (excluding the name input on row 1) */
.ing-card-row2 input,
.ing-card-row3 input {
  border: none;
  border-bottom: 1px solid var(--rule);
  padding: 4px 0;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--fg);
  background: transparent;
  outline: none;
  width: 100%;
}
.ing-card-row2 input:focus,
.ing-card-row3 input:focus { border-bottom-color: var(--fg); }
.ing-card-row3 input::placeholder { color: var(--muted); }

/* Unit select uses the locked .form-select style from Brief 2D */
.ing-card-row2 .form-select {
  /* inherits from globals .form-select */
}
```

### Add ingredient button

The "+ Add ingredient" button at the bottom of the ingredients section follows the editorial outlined button pattern:

```html
<button class="add-ingredient-btn ed-btn-outline">+ ADD INGREDIENT</button>
```

Reuse the existing `.ed-btn-outline` class (or whatever the locked editorial outlined-button class is). Do not introduce new button styling.

---

## Mobile-only scope

This restructure applies on mobile only. Desktop continues to use the current 4-column row layout because it works there.

Use a media query break at the same point as the rest of the system:

```css
@media (max-width: 640px) {
  /* The .ing-card layout above */
}

@media (min-width: 641px) {
  /* Existing desktop 4-column row layout — unchanged */
}
```

The simplest implementation is a media-query-driven CSS swap: same component, two layouts.

If the implementation requires component-level branching (e.g. via `useMediaQuery('(max-width: 640px)')`), confirm both layouts share the same form-state hooks so switching between desktop and mobile during development doesn't lose unsaved input.

---

## Where this applies

The new layout applies to:
- `/recipes/new` — New Recipe form, ingredients section
- `/recipes/[id]/edit` — Edit Recipe form, ingredients section

It does NOT apply to:
- `/pantry/new`, `/pantry/[id]/edit` — pantry forms have a different shape (no ingredient list)
- Recipe detail (`/recipes/[id]`) — read-only ingredient list, different component
- Add Meal flows — does not edit ingredients

---

## Verification

**Visual:**
- Open `/recipes/[id]/edit` on mobile. The ingredients section shows each ingredient as a vertical block.
- Row 1: drag handle, name input (full width), delete button (square, hairline border, 32x32).
- Row 2 (indented): "Amount" label + input, "Unit" label + select. Both visible without truncation.
- Row 3 (indented): "Preparation" label + input. The label appears above the input, no longer placeholder-only.
- Hairline divider between ingredients.
- "+ ADD INGREDIENT" button below the last ingredient, full width minus padding, outlined editorial button style.

**Functional:**
- Editing an ingredient name, amount, unit, or preparation persists exactly as before.
- The unit select uses the bottom-border-only pattern (per Brief 2D's `.form-select`). Tapping it opens the native iOS picker.
- The drag handle still allows reordering on mobile (existing drag-and-drop behavior preserved).
- The delete button removes the ingredient with the same confirmation behavior as today (if any).
- Adding a new ingredient via the button appends a new ingredient card at the bottom with empty fields.

**Layout:**
- Drag handle aligns with the ingredient name's first character (left edge of the name input is at `var(--pad) + 16px + 12px = var(--pad) + 28px`).
- Rows 2 and 3 are indented 28px from the page's `var(--pad)` left edge — matching the name input's left edge.
- Delete button right edge aligns with `var(--pad)` from the page's right edge.

**Desktop:**
- `/recipes/[id]/edit` desktop layout is unchanged. Same 4-column row pattern as before.
- No regression in desktop spacing, alignment, or behavior.

---

## Out of scope

- Pantry form changes — unchanged.
- Recipe detail (read-only) — unchanged.
- Add Meal flows — unchanged.
- The recipe form's other sections (basic info, method, notes, image, etc.) — unchanged.
- Drag-and-drop library or mechanism — unchanged. This brief restructures the visual rendering, not the reordering behavior.
- Validation, error states, autosave — unchanged.
- Adding new fields to ingredients (e.g. brand, source) — out of scope.
- Replacing the native `<select>` with a custom dropdown — Brief 2D handles select styling; this brief reuses that.

---

## Files most likely affected

- `app/recipes/new/page.tsx` and `app/recipes/[id]/edit/page.tsx` — or wherever the recipe form ingredient row component lives.
- `components/recipe-form/IngredientRow.tsx` (or equivalent) — likely needs a mobile branch or a media-query CSS swap.
- `globals.css` — add `.ing-card`, `.ing-card-row1/2/3`, `.field`, `.field-label`, `.ing-name`, `.ing-delete` rules. Some of these may already exist (e.g. `.field-label` is used on other forms) — reuse rather than duplicate.

---

## Notes for the implementer

- The 28px indent on rows 2 and 3 visually anchors all of an ingredient's sub-fields under the name input. This is the cue that says "these belong to that ingredient." Without the indent, the rows read as flat and disconnected.
- The "Amount" field is fixed at 100px because amounts are typically 1-4 characters (`1`, `2.33`, `0.25`, `12`). A flexible amount field would either feel oversized or fight the unit select for width. Lock it.
- The `.form-select` style for the unit picker comes from Brief 2D. If 2D hasn't shipped yet, ship that brief first or copy the rule inline temporarily.
- The drag handle uses `⋮⋮` (two vertical ellipses, a common drag-handle glyph) — matching the current implementation. If the current implementation uses a different glyph or an SVG, keep whatever's there. Glyph choice is not the point of this brief.
- The delete button at 32x32 with a hairline border matches the pattern from the pantry list rows (see Brief MOB-Q1, Fix 5). Visual consistency between the pantry edit/delete and the recipe edit ingredient delete.
- Do not introduce new typography, new colors, or new tokens. Every value used in this brief comes from the locked design system.

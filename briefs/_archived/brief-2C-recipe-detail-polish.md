# BRIEF 2C — Mobile recipe detail polish

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. Mobile only. Recipe detail page.
**Depends on:** Nothing.
**Blocks:** Nothing.

---

## Why this brief

Recipe detail on mobile is mostly editorial-correct (sharp action buttons, numbered section heads, photo-first layout). Two stragglers remain:

1. The **scale buttons** (`1× 2× 4× 6×`) are pill-shaped chips, contradicting the locked sharp-default rule.
2. The **FAVORITE control** uses a circle (`○`) prefix that reads as a UI affordance (radio?) and is now in conflict with the locked dot doctrine — a circle that isn't a person, present moment, unit, or decision dilutes the dot's four meanings.

This brief converts the scale buttons to baseline-underline chips and re-treats the favorite control with a star sigil to match the existing `★ FAVORITES` filter on the recipes index.

## What's wrong now

Looking at `mobile_recipe_detail.png`:

1. **Scale buttons** — `1× 2× 4× 6×` rendered as pill-shaped chips, active state filled black. Should be baseline-underline chips matching the locked `.filter-chip` pattern.
2. **FAVORITE control** — text reads `○ FAVORITE` with a circle prefix glyph. The circle reads as a UI control (incomplete radio button) and steals from the dot system. Should use the star sigil that already exists on the recipes filter chip.

## Spec

### F-1 · Scale buttons → baseline-underline chips

Replace the pill-shaped chip style with the locked `.filter-chip` pattern:

```css
.scale-chip {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: none;
  border: none;
  color: var(--muted);
  padding: 8px 4px;
  position: relative;
  cursor: pointer;
  transition: color 120ms var(--ease-out);
}
.scale-chip:hover { color: var(--fg); }
.scale-chip.active { color: var(--fg); }
.scale-chip.active::after {
  content: '';
  position: absolute;
  left: 4px; right: 4px; bottom: -2px;
  height: 1.5px;
  background: var(--fg);
}
/* Hit area expansion */
.scale-chip::before {
  content: '';
  position: absolute;
  inset: -10px -4px;
}
```

- Numerals `1× 2× 4× 6×` stay as labels (don't convert to text). The `×` is the multiplication sign (U+00D7), not a lowercase x.
- Layout: horizontal row, gap ~14px between chips
- Container has no border, no fill, no rounded box
- Active state: text in `var(--fg)` + 1.5px baseline underline. No fill, no pill, no border.

**Important — baseline anchoring:** the inactive state must reserve the underline's vertical space. Without this, activating the state shifts the chip up by 1.5px on toggle. Match the `.filter-chip` implementation in design-system.md §5b.

The `SCALE` label that precedes the chips (DM Mono 9px UPPERCASE muted) stays as is — it's already an editorial mono label.

### F-2 · FAVORITE control → star sigil

Replace the `○` circle prefix with a star.

**Inactive state (not favorited):**
```html
<button class="favorite-btn">FAVORITE</button>
```
- DM Mono 9px UPPERCASE
- Color `var(--muted)`
- No prefix glyph
- No border, no fill

**Active state (favorited):**
```html
<button class="favorite-btn is-on">★ FAVORITED</button>
```
- DM Mono 9px UPPERCASE
- Color `var(--fg)`
- Star prefix `★` (U+2605, BLACK STAR)
- Tiny gap between star and word (~4px)

```css
.favorite-btn {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  background: none;
  border: 0;
  padding: 8px 4px;
  cursor: pointer;
  transition: color 120ms var(--ease-out);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.favorite-btn:hover { color: var(--fg); }
.favorite-btn.is-on { color: var(--fg); }
```

**Why star (and not heart, dot, check, or other glyph):**

- The system already uses `★` on the recipes filter chip (`★ FAVORITES`). Reusing it here keeps the sigil charged and consistent.
- A heart was previously removed from the system per design-system.md §12 — don't re-introduce it.
- A dot (`●`) would dilute the locked dot doctrine — the dot has four reserved meanings (person, present moment, unit, decision). Favorite is a fifth meaning and not one we want to add.
- The star carries familiar connotations (rating, bookmarking) but is generic enough to not clash with the editorial register.

**Verb form:** the label changes from imperative to past-participle on activation — `FAVORITE` (do this) → `FAVORITED` (it's done). Reads naturally as a state change.

## Files most likely affected

- Recipe detail mobile component (the action buttons row + scale row)
- `globals.css` — add `.scale-chip` class (or reuse `.filter-chip` if applicable)
- `globals.css` — add `.favorite-btn` class

If `.filter-chip` is already exported as a reusable utility, scale chips can apply it directly without a new class. Use the existing one if so.

## Verify before declaring done

Visual:
- Open a recipe detail page on mobile.
- Scale row: `SCALE  1× 2× 4× 6×`. Active scale (e.g. `1×`) shows a 1.5px baseline underline below the text. Inactive scales are muted, no underline. No pill, no fill, no border on any of them.
- FAVORITE button: when not favorited, reads `FAVORITE` (muted, no prefix). When favorited, reads `★ FAVORITED` (ink, with star prefix).
- Action buttons (EDIT / DUPLICATE / DELETE) — unchanged, still sharp outlined ✓.
- Tapping a scale chip switches the active scale and updates the ingredient quantities (functional behavior unchanged).
- Tapping FAVORITE toggles between the two states.

Grep checklist:
- `rounded-` (Tailwind) on scale or favorite elements — should not appear
- `border-radius:` non-zero on these elements — flag
- Circle/dot SVG glyphs on the FAVORITE button — should not appear
- `var(--accent)` on either control — should not appear; both use `var(--fg)` for active state
- The literal character `○` (U+25CB, WHITE CIRCLE) anywhere in the recipe detail markup — should not appear

Functional:
- Scale change: tapping `2×` updates ingredient quantities to 2× the recipe's base servings, just as before.
- Favorite toggle: tapping FAVORITE adds the recipe to favorites and updates the label to `★ FAVORITED`. Tapping again removes from favorites and reverts to `FAVORITE`.
- The `★ FAVORITES` filter chip on the recipes index continues to work — it should reflect the favorited state after toggling here.

Mobile-only:
- These changes apply at mobile breakpoint only. Desktop recipe detail unchanged.

## Out of scope

- Adding `← BACK TO RECIPES` row at the top of recipe detail — Brief 2D handles back-row patterns.
- The recipe action buttons (EDIT / DUPLICATE / DELETE) — already correct.
- Section heads (`01 Ingredients`, `02 Nutrition`, etc.) — already correct.
- The recipe photo, hero, or any layout change — unchanged.
- Recipe grid view favorite indicator — there isn't one currently and that's fine for now. Don't add one in this brief.

## Notes for the implementer

- The previous design system removed heart icons specifically; star is allowed and already in use elsewhere. Don't reintroduce hearts.
- If the FAVORITE button used to have an `aria-pressed` or similar state attribute, keep that — the visual change shouldn't affect accessibility semantics.
- Verify the star character (`★` U+2605) renders consistently across iOS Safari, Chrome, and Firefox. It's a Unicode character, not an SVG, so it inherits the font's rendering. DM Mono should render it cleanly; if it looks too thin, fall back to an inline SVG of a star at 9px filled `currentColor`.

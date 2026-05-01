# Follow-up — Typographic cell ghost photo is wrong

The previous fix introduced a "ghost photo div" with caption absolutely positioned at `top: 100%`. This is not what the mock specifies and it pushes the name and eyebrow outside the visible cell area, especially on mobile where they're rendered below the bottom of the cell entirely.

## Diagnosis

The typographic cell is not a photo cell minus the photo. It's a different cell type with its own layout: bottom-anchored eyebrow + large display name within standard cell padding. The previous attempt tried to make the typographic cell structurally equivalent to the photo cell (caption positioned relative to a phantom photo area). It only needs to be visually equivalent (same overall cell height, same bottom-anchored content).

## Fix

**Remove the ghost photo entirely.**

### Correct structure

```jsx
<div className="rg-cell rg-cell-typographic">
  <span className="rg-cell-category">Dessert</span>
  <span className="rg-cell-name-large">Almond Flour Lemon Bars</span>
</div>
```

```css
.rg-cell-typographic {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;  /* bottom-align content */
  padding: 24px;
  /* aspect-ratio inherited from .rg-cell, do not override */
}

.rg-cell-typographic .rg-cell-category {
  margin-bottom: 12px;
  /* existing eyebrow styles */
}

.rg-cell-name-large {
  font-weight: 700;
  font-size: clamp(20px, 2.4vw, 32px);
  letter-spacing: -0.025em;
  line-height: 1.1;
  color: var(--fg);
  text-wrap: balance;
}
```

### Remove from the previous fix

- Any "ghost photo" div, placeholder div, or wrapper that sizes to the photo aspect ratio
- Any `position: absolute` on `.rg-cell-category` or `.rg-cell-name-large`
- Any `top: 100%`, `bottom: 0`, or other absolute-positioning rules introduced for the typographic cell
- Any min-height calculations that were added to "match" photo cell height

The cell's overall height is already controlled by `aspect-ratio` at the `.rg-cell` level. The typographic cell inherits that. Content inside flexes to the bottom. That's the entire mechanism.

## Verification

- [ ] Open recipes index, GRID view, on desktop. Find a typographic cell. The eyebrow and name are visible, bottom-anchored within the cell, large display scale.
- [ ] Same on mobile. Same layout. Name fully visible inside the cell, not cut off at the bottom.
- [ ] Scroll past several typographic cells in a row. Each one shows its name visibly within its cell bounds.
- [ ] Cell heights match: typographic cell and photo cell are the same height (`aspect-ratio: 1/1`).
- [ ] No empty white space inside the typographic cell where a photo would be.

## Do not

- Reintroduce the ghost photo pattern. The typographic cell is its own thing.
- Use `position: absolute` to position the eyebrow or name.
- Try to "match" the photo cell's caption strip position. The mock specifies bottom-aligned content within standard padding, not caption-strip alignment.

# Brief 16d — Confirmation dialog sweep

The Remove member dialog in Settings → People is using legacy rounded modal styling with pill-shaped buttons and a coral destructive button. This violates several locked design decisions. Same legacy styling likely exists on other confirmation dialogs across the app — this brief sweeps them all into spec.

## What's wrong

Looking at the Remove member dialog as the canonical example:

1. **Rounded corners on the dialog container.** Should be sharp (`border-radius: 0`).
2. **Pill-shaped buttons inside the dialog.** Should be sharp rectangles, sized to content, `padding: 8px 14px`. Pills are legacy.
3. **Coral REMOVE button.** Should be outlined treatment with border in `var(--rule)`, NOT a coral or `--err` fill. Per the locked color rule, red is reserved for over-limit warnings (margin-note styling). Destructive button actions get the same outlined treatment as any other secondary button — the destructive nature is communicated through the dialog text, not the button color.
4. **CANCEL button visual weight competes with REMOVE.** Both buttons read as equally weighted, which makes the destructive action feel undifferentiated. The fix is in #3 above — once REMOVE is outlined and CANCEL is ghost (or outlined-quiet), the hierarchy becomes clear.

## Reference

`design-system.md §5h Modal / dialog`:

```css
.modal {
  background: var(--bg);
  border: 1px solid var(--rule);
  border-radius: 0;
  width: 90%;
  max-width: 480px;
  overflow: hidden;
}
```

Plus `§5a Buttons` for the new button rule (filled = single primary per page; outlined = everything else, including destructive).

## Scope

Sweep every confirmation dialog in the app and bring it into spec. Likely surfaces:

- Settings → People — Remove member confirmation (the one in the screenshots)
- Settings → People — Revoke invite confirmation (if it exists separately)
- Recipe detail — Delete recipe confirmation
- Recipe form — Discard unsaved changes confirmation (if applicable)
- Planner — Delete meal plan confirmation
- Planner — Remove meal entry confirmation
- Settings → Data — Reset / wipe confirmation (if applicable)
- Anywhere else a confirmation dialog appears

If any of these don't exist, skip them. If new ones surface during the audit, fix them too.

## Spec for every confirmation dialog

### Container

- `background: var(--bg)`
- `border: 1px solid var(--rule)`
- `border-radius: 0` (sharp)
- `max-width: 480px` (or smaller if content is brief)
- `padding: 32px 28px` interior (or whatever the existing spec uses, just consistent across dialogs)

### Body text

- DM Sans 13px
- Color `var(--fg)`
- Line-height 1.6
- Margin-bottom 24px before the action row

### Action row

Right-aligned, two buttons:

- **Cancel button** (left): `.btn-ghost` style — no border, no fill, just text. Color `var(--muted)`, hover `var(--fg)`.
- **Confirm/Destructive button** (right): `.btn-outline` style — `border: 1px solid var(--rule)`, `background: none`, color `var(--fg)`. Sharp rectangle. `padding: 8px 14px`. DM Mono 9px, letter-spacing 0.14em, uppercase.

Both buttons sized to content.

### Hover

- Cancel: color shifts from `var(--muted)` to `var(--fg)`
- Confirm: border shifts from `var(--rule)` to `var(--fg)`

### NO red, coral, or `--err` color anywhere on the destructive button. This is non-negotiable.

The dialog's body text already communicates destructiveness ("Their meal plans and goals will be deleted."). The button color does not need to also shout it.

## Backdrop

Verify the backdrop matches `design-system.md §5h`:

```css
.modal-overlay {
  position: fixed; inset: 0; z-index: 600;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.3);
}
```

Click on the backdrop dismisses the dialog (same as Cancel). Escape key also dismisses.

## Animation

Existing animation spec from design-system §5h is correct — modal scales from 0.97 to 1, never from 0. Backdrop fades in. Don't change this.

## Files

- `app/components/ConfirmDialog.tsx` (or whatever the shared dialog component is — find it and update once)
- `globals.css` — verify modal styles match spec; if there's a `.modal-rounded` or legacy class still in use, sweep it
- `app/settings/page.tsx` — Remove member usage
- `app/recipes/[id]/page.tsx` — Delete recipe
- `app/planner/page.tsx` — Delete meal plan, remove entry
- Any other surface with a confirmation dialog

If the codebase has multiple confirmation dialog implementations (some inline, some via shared component), consolidate to one shared component as part of this sweep. One source of truth.

## Acceptance

After merge, walk through each confirmation surface:

1. Settings → People → click REMOVE on a non-owner member. Dialog appears with sharp corners, body text, ghost CANCEL on left, outlined REMOVE on right. No coral, no pill shapes.
2. REMOVE button border is `var(--rule)` (warm grey), darkens to `var(--fg)` on hover.
3. CANCEL button is `var(--muted)` text, darkens to `var(--fg)` on hover. No border, no fill.
4. Click backdrop or press Escape — dialog dismisses.
5. Repeat for: delete recipe, delete meal plan, revoke invite (if exists), and any other confirmation surfaces found during the sweep.
6. All confirmation dialogs across the app match. None have rounded corners, pill buttons, or coral/red destructive treatment.

## Effort

Small to medium. The styling change itself is a few CSS values. The bulk of the work is finding every dialog instance in the codebase and confirming each is using the shared component (or migrating any inline ones to it). Probably 2–3 hours.

## Note

After this lands, `design-system.md §5h` is correct as-is — no doc update needed because this brief is bringing the implementation into compliance with the existing spec, not changing the spec. If any nuances surface during the sweep that aren't already documented, add them to §5h.

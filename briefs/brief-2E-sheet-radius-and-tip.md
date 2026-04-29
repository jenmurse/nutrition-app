# BRIEF 2E — Bottom sheet radius + contextual tip card

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. Mobile only. All bottom sheets + the dashboard contextual tip card.
**Depends on:** Nothing.
**Blocks:** Nothing.

---

## Why this brief

Two small but visible inconsistencies between the editorial system and what's shipping:

1. **Bottom sheets** use `--radius-xl: 20px` on the top corners. That's the iOS-default amount of round and reads as "this is an iOS sheet" rather than "this is an editorial sheet that happens to slide up." Reducing to 8px keeps the affordance (round top corners signal the sheet is a separate transient surface) without the iOS-default feel.

2. **Contextual tip card** on the dashboard ("Switching between people" tip) has rounded corners (~10px) on the entire card. Per the locked sharp-default rule, all cards should be sharp. The tinted fill + colored left rule pattern is correct (matches over-limit warning style); just the radius is wrong.

3. **Bottom sheet animation easing** — `mobile_ux.md` describes `cubic-bezier(0.32, 0.72, 0, 1)` while the enforcement file requires `var(--ease-out) = cubic-bezier(0.23, 1, 0.32, 1)`. One is stale. Align to the enforcement rule.

## What's wrong now

Per `mobile_nutrition.png` and `mobile_onboarding_checklist.png`:

1. Bottom sheet (nutrition summary) has a 20px radius on top corners.
2. Contextual tip card has fully rounded ~10px corners.
3. The sheet animation curve may not match `var(--ease-out)`.

## Spec

### L-1 · Update `--radius-xl` token

Change in `:root`:

```css
:root {
  --radius-xl: 8px;  /* was 20px — mobile bottom sheet top corners only */
}
```

This is the only locked exception to the sharp-default rule. The token is reserved exclusively for sheet top corners.

After updating:
- Verify only mobile bottom sheets reference `--radius-xl`. If anything else uses it (shouldn't), audit and convert to 0 unless intentional.
- Common references: `.mob-sheet`, `.bottom-sheet`, `.sheet-container`. Look for `border-top-left-radius` and `border-top-right-radius`.

The bottom-left and bottom-right corners of the sheet stay 0 (sharp). Only the top corners get the radius.

### L-2 · Bottom sheet styling check

Verify the sheet itself has these properties:
- Background: `var(--bg)`
- Top corners: `--radius-xl` (now 8px)
- Bottom corners: 0
- Border-top: `1px solid var(--rule)` (hairline at the top edge of the sheet, sits at the rounded corner — this is intentional, the hairline curves with the corner)
- Drag handle at top, centered, `var(--rule)` color, sharp pill-ish or short hairline shape

If the existing sheet has a box-shadow, keep it minimal (`0 -2px 12px rgba(0,0,0,0.06)` or similar) — sheets need slight elevation so they read as overlaying content. But don't introduce a new heavy shadow.

### L-3 · Bottom sheet animation easing

Audit the sheet animation:
- Find `@keyframes sheetUp` or whatever the slide-in animation is named
- Find references to `cubic-bezier(0.32, 0.72, 0, 1)` — this is the iOS spring curve used per `mobile_ux.md`
- Replace with `var(--ease-out)` which equals `cubic-bezier(0.23, 1, 0.32, 1)`

Duration: 360ms per the enforcement rule (sheet/modal duration). Verify the current implementation matches.

```css
.mob-sheet {
  animation: sheetUp 360ms var(--ease-out) both;
}
@keyframes sheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

### K-1 · Contextual tip card sharp corners

The contextual tip card (used for `household-switch`, `usda-search`, `nutrition-guidance`, `ai-optimize`, `ai-meal-prep` tips per onboarding.md §3):

```css
.contextual-tip {
  background: var(--accent-l);          /* tinted fill — keep */
  border-left: 2px solid var(--accent); /* colored left rule — keep */
  border-radius: 0;                     /* was ~10px — fix */
  padding: 16px 20px;
  /* other styles unchanged */
}
```

Just the radius changes. The tinted fill and colored left rule are intentional per `feedback_design_system_enforcement.md` §2 (tip cards are "themed by design, match person's theme") — leave those alone.

The dismiss `✕` button inside the tip card should also be sharp (`border-radius: 0`, no fill, no background — ghost icon button per design-system.md §5g pattern). Verify.

## Files most likely affected

- `globals.css` — `:root { --radius-xl }`, `.mob-sheet`, `.contextual-tip`, related sheet animation rules
- `mobile_ux.md` — update doc to reflect new easing and sheet radius (or flag for me to update separately)

No JSX changes expected. This is mostly token + CSS adjustment.

## Verify before declaring done

Visual:
- Open the nutrition summary bottom sheet from the planner. Top corners are subtly rounded (8px), not 20px. Reads as a sheet but tighter.
- Open the filter sheet from the recipes index. Same — 8px top corners, sharp bottom.
- Open the dashboard with a contextual tip showing (or trigger one if none are active). The tip card has sharp corners (no rounding), with the colored left rule and tinted fill intact.
- The tip card dismiss `✕` is a ghost button — no fill, no border, no rounded background.

Animation:
- Sheets slide up smoothly in 360ms with the editorial ease-out curve. No iOS spring bounce.
- Sheets dismiss (slide down) with the same curve and duration.

Grep checklist:
- `--radius-xl: 20px` — should be `8px`
- `--radius-xl` references outside the sheet — flag any
- `cubic-bezier(0.32, 0.72, 0, 1)` — should not appear; replace with `var(--ease-out)`
- `linear` / `ease-in-out` on sheet or tip animations — should not appear
- `border-radius:` non-zero on the contextual tip card — flag
- Animation durations on sheets not equal to 360ms — flag

Functional:
- Sheets open and close as before (tap backdrop, tap close X, drag down).
- Contextual tips dismiss as before (tap dismiss button, tip is removed for that person server-side per onboarding.md §3).

Mobile-only:
- These changes apply to mobile sheets specifically. Desktop modals (centered dialogs, brief 16d/18 sweeps) are sharp already and shouldn't be affected.

## Out of scope

- The over-limit warning rows inside the nutrition sheet (`+123KCAL OVER LIMIT` style rows with `var(--err-l)` fills) — these stay as is. Per the audit (Q-2.6), the fill pattern is correct for actual over-limit semantic warnings; only the doc was stale and that's a separate housekeeping task.
- The sheet's internal layout, content, drag handle position — unchanged.
- Modals and confirmation dialogs (already sharp from briefs 16d/18) — not touched.
- Desktop sheet patterns — there are no desktop bottom sheets in this app.

## Notes for the implementer

- The 8px value is deliberate. 0 (sharp) was considered but dropped — without any radius, the sheet's top edge reads as a panel that appeared, not a sheet that slid up. 8px keeps the "this surface arrived from below" affordance without iOS-default round.
- After this brief lands, `feedback_design_system_enforcement.md` is fully consistent with `mobile_ux.md` and `design-system.md`. There may be other minor doc inconsistencies; flag them but don't fix in this PR.
- If the contextual tip card has a max-width or specific container behavior on mobile, leave that alone — only the radius changes.

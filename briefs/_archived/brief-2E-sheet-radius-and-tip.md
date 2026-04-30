# BRIEF 2E — Bottom sheet radius, chips inside sheets, contextual tip card

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. Mobile only. All bottom sheets, chips inside sheets, and the dashboard contextual tip card.
**Depends on:** Nothing.
**Blocks:** Nothing.

---

## Why this brief

Three visible inconsistencies between the editorial system and what's shipping:

1. **Bottom sheets** use `--radius-xl: 20px` on the top corners. That's the iOS-default amount of round and reads as "this is an iOS sheet" rather than "this is an editorial sheet that happens to slide up." Reducing to 8px keeps the affordance (round top corners signal the sheet is a separate transient surface) without the iOS-default feel.

2. **Chips inside sheets** are still rounded — TYPE filter, SORT BY, CATEGORY chips inside the recipes/pantry filter sheets retain pill shapes. Per the sharp-default rule, chips in sheets should be sharp like everything else.

3. **Contextual tip card** on the dashboard ("Switching between people" tip) has rounded corners (~10px) on the entire card. Per the locked sharp-default rule, all cards should be sharp. The tinted fill + colored left rule pattern is correct (matches over-limit warning style); just the radius is wrong.

4. **Bottom sheet animation easing** — `mobile_ux.md` describes `cubic-bezier(0.32, 0.72, 0, 1)` while the enforcement file requires `var(--ease-out) = cubic-bezier(0.23, 1, 0.32, 1)`. One is stale. Align to the enforcement rule.

## What's wrong now

Per `mobile_nutrition.png`, `mobile_onboarding_checklist.png`, and the recipes/pantry filter sheets:

1. Bottom sheet (nutrition summary, filter sheets) has a 20px radius on top corners.
2. Chips inside sheets retain pill/rounded shapes.
3. Contextual tip card has fully rounded ~10px corners.
4. The sheet animation curve may not match `var(--ease-out)`.

## Spec

### L-1 · Update `--radius-xl` token (or remove it)

Two acceptable approaches — implementer's call based on what's cleaner in the codebase:

**Approach A: Keep the token, change the value.**
```css
:root {
  --radius-xl: 8px;  /* was 20px — mobile bottom sheet top corners only */
}
```

**Approach B: Remove the token, hardcode on the sheet.**
```css
.mob-sheet {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}
```
Then delete `--radius-xl` from `:root` entirely.

Approach B is slightly preferred because it makes the sheet's special-case status explicit in code and prevents future misuse (someone in the future thinking "oh `--radius-xl` is a thing, I'll use it on a card"). Tokens are for reusable values; a single-use value used in one place doesn't earn a token.

If Approach A is chosen, audit all `--radius-xl` references and confirm none exist outside the sheet. The bottom-left and bottom-right corners of the sheet stay 0 (sharp). Only the top corners get the radius.

### L-2 · Bottom sheet styling check

Verify the sheet itself has these properties:
- Background: `var(--bg)`
- Top corners: 8px (via either approach above)
- Bottom corners: 0
- Border-top: `1px solid var(--rule)` (hairline at the top edge of the sheet, sits at the rounded corner — this is intentional, the hairline curves with the corner)
- Drag handle at top, centered, `var(--rule)` color, sharp pill-ish or short hairline shape

If the existing sheet has a box-shadow, keep it minimal (`0 -2px 12px rgba(0,0,0,0.06)` or similar) — sheets need slight elevation so they read as overlaying content. But don't introduce a new heavy shadow.

### L-3 · Bottom sheet animation easing

Audit the sheet animation:
- Find `@keyframes sheetUp` or whatever the slide-in animation is named
- Find references to `cubic-bezier(0.32, 0.72, 0, 1)` — this is the iOS spring curve used per `mobile_ux.md`
- Replace with `var(--ease-out)` which equals `cubic-bezier(0.23, 1, 0.32, 1)`

Duration: 360ms per the enforcement rule (sheet/modal duration). Verify the current implementation matches. If `mobile_ux.md` and `feedback_design_system_enforcement.md` disagree on duration, the enforcement file wins.

```css
.mob-sheet {
  animation: sheetUp 360ms var(--ease-out) both;
}
@keyframes sheetUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

**Note for implementer:** sheets are one of the few places where the iOS spring curve genuinely feels right — that's why iOS uses it. The editorial ease-out is being applied here for system consistency, but pay attention during verify. If sheets feel sluggish or "off" after the change, flag it and we'll revisit. Don't tweak the curve silently.

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

### K-2 · Chips inside bottom sheets

Sheets currently contain chips that are still rounded:
- TYPE filter chips (recipes filter sheet)
- SORT BY chips
- CATEGORY chips (pantry filter sheet)
- Any other chip-style toggles inside any sheet

Per the sharp-default rule, chips inside sheets should be sharp (`border-radius: 0`). Audit any chip class used within `.mob-sheet`, `.bottom-sheet`, or sheet container scope and remove pill rounding.

```css
.mob-sheet-chip,
.mob-sheet-sort-btn,
.mob-sheet-cat-btn,
.mob-sheet-dir-btn {
  border-radius: 0;
}
```

The chips' filled active state (filled-black on `.on` modifiers) is OUT OF SCOPE for this brief — that's part of 2G's button audit (filled-black being misused for active toggle state). Just sharpen the corners in 2E. The chips will continue to look "wrong" in the active state until 2G lands, but the corner fix is independent.

## Files most likely affected

- `globals.css` — `:root { --radius-xl }` (or its removal), `.mob-sheet`, `.contextual-tip`, sheet animation rules, sheet-scoped chip classes
- `mobile_ux.md` — flag for me to update separately after this lands (do not edit in this PR)

No JSX changes expected. This is mostly token + CSS adjustment.

## Verify before declaring done

Visual:
- Open the nutrition summary bottom sheet from the planner. Top corners are subtly rounded (8px), not 20px. Reads as a sheet but tighter.
- Open the filter sheet from the recipes index. Same — 8px top corners, sharp bottom.
- Open the filter sheet from the pantry index. Same.
- Inside any sheet that contains chips: chips are sharp-cornered (regardless of active state — active state styling is a separate brief).
- Open the dashboard with a contextual tip showing (or trigger one if none are active). The tip card has sharp corners (no rounding), with the colored left rule and tinted fill intact.
- The tip card dismiss `✕` is a ghost button — no fill, no border, no rounded background.

Animation:
- Sheets slide up smoothly in 360ms with the editorial ease-out curve. No iOS spring bounce.
- Sheets dismiss (slide down) with the same curve and duration.
- Animation does not feel sluggish or "off." If it does, flag rather than silently tweak.

Grep checklist:
- `--radius-xl: 20px` — should be `8px` (Approach A) or removed (Approach B)
- `--radius-xl` references outside the sheet — flag any
- `cubic-bezier(0.32, 0.72, 0, 1)` — should not appear; replace with `var(--ease-out)`
- `linear` / `ease-in-out` on sheet or tip animations — should not appear
- `border-radius:` non-zero on the contextual tip card — flag
- `border-radius:` non-zero on any class scoped to sheet contexts (chips, sort buttons, category buttons, etc.) — flag and fix
- Animation durations on sheets not equal to 360ms — flag

Functional:
- Sheets open and close as before (tap backdrop, tap close X, drag down).
- Chips inside sheets remain tappable, selectable, and behave identically — only corner shape changes.
- Contextual tips dismiss as before (tap dismiss button, tip is removed for that person server-side per onboarding.md §3).

Mobile-only:
- These changes apply to mobile sheets specifically. Desktop modals (centered dialogs, brief 16d/18 sweeps) are sharp already and shouldn't be affected.

## Out of scope

- The over-limit warning rows inside the nutrition sheet (`+123KCAL OVER LIMIT` style rows with `var(--err-l)` fills) — these stay as is. Per the audit (Q-2.6), the fill pattern is correct for actual over-limit semantic warnings; only the doc was stale and that's a separate housekeeping task.
- Active toggle state styling on sheet chips/buttons — filled-black on `.mob-sheet-chip.on`, `.mob-sheet-sort-btn.on`, `.mob-sheet-dir-btn.on`, etc. is part of 2G's button audit, not 2E. Chips will look correctly sharp but still have wrong active-state styling until 2G lands.
- The sheet's internal layout, content, drag handle position — unchanged.
- Modals and confirmation dialogs (already sharp from briefs 16d/18) — not touched.
- Desktop sheet patterns — there are no desktop bottom sheets in this app.
- Documentation updates to mobile_ux.md, design-system.md, feedback_design_system_enforcement.md — flag for follow-up after this brief lands.

## Notes for the implementer

- The 8px value is deliberate. 0 (sharp) was considered but dropped — without any radius, the sheet's top edge reads as a panel that appeared, not a sheet that slid up. 8px keeps the "this surface arrived from below" affordance without iOS-default round.
- After this brief lands, `feedback_design_system_enforcement.md` is fully consistent with `mobile_ux.md` and `design-system.md` (modulo the doc updates that follow).
- If the contextual tip card has a max-width or specific container behavior on mobile, leave that alone — only the radius changes.
- Approach B (deleting `--radius-xl` entirely and hardcoding on the sheet) is preferred but not required. If the existing codebase makes Approach A cleaner, that's fine.

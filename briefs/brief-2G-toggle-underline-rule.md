# Brief 2G — Toggle Underline Rule

**Status:** Ready for Claude Code
**Depends on:** Brief 2F.1 (closed)
**Blocks:** Step 2 closure (along with 2H and 2I)
**Sibling brief:** 2H (compare-strip count baseline + card outline) runs independently

---

## Why

Filled black is currently doing two different jobs across the app:

1. **Primary commit signal** — SAVE, CONTINUE, SIGN IN, APPLY, COMPARE-when-armed
2. **Active toggle/selection state** — which filter chip is selected, which sort field is active, which scale is on, which person's goals you're editing

When both jobs use the same treatment, the visual hierarchy collapses. A user opens the mobile filter sheet and sees three filled-black rectangles (an active filter chip, an active sort direction, and the APPLY button) and can't tell at a glance what's the action versus what's just showing state.

A grep of every `.on` / `.active` / `.is-active` toggle state in the codebase shows that **most toggles already use the underline pattern** (planner person chips, planner nutrient chips, planner day strip, auth tabs, recipe scale chips on mobile, shop toggle, mobile filter text, edit button text, home person chip). Design system §5b and §5c already document underline as the active state for chip-style toggles.

A small number of toggles diverged. 2G ratifies the existing rule and brings the outliers in line.

---

## The rule (to be locked in design-system.md)

> **Active state for any toggle, chip, or selector — across desktop and mobile — is a 1.5px ink underline below the label, with text color shifted from muted (`var(--fg-muted)`) to ink (`var(--fg)`). No background fill, no border change, no accent color.**
>
> **Filled black (`background: var(--fg); color: var(--bg)`) is reserved for the single primary commit per task context.** A page can host multiple task contexts (the recipes page hosts the recipe library AND, conditionally, the compare flow). Each task context gets its own primary commit. Examples: SAVE GOALS, CONTINUE, SIGN IN, APPLY, COMPARE-when-armed.
>
> **Accent colors (`var(--cta)`, person colors) are never used to indicate toggle state.** Accent is identity-only (whose theme this is, whose data this is).

---

## Fixes

Five locations to bring under the rule. Each one swaps a filled-black or accent-color active state for the underline treatment.

### 1. Mobile filter sheet — three selectors

**Files:** wherever `.mob-sheet-chip`, `.mob-sheet-sort-btn`, `.mob-sheet-dir-btn` are defined (likely `globals.css`).

**Current:**
```css
.mob-sheet-chip.on,
.mob-sheet-sort-btn.on,
.mob-sheet-dir-btn.on {
  color: var(--bg);
  background: var(--fg);
}
```

**New:**
```css
.mob-sheet-chip,
.mob-sheet-sort-btn,
.mob-sheet-dir-btn {
  /* inactive base: muted text, no border, no fill */
  color: var(--fg-muted);
  background: none;
  border: none;
  border-bottom: 1.5px solid transparent;
  padding: 8px 0 6px;
}

.mob-sheet-chip.on,
.mob-sheet-sort-btn.on,
.mob-sheet-dir-btn.on {
  color: var(--fg);
  border-bottom-color: var(--fg);
}
```

**Notes:**
- Existing chip padding/border/box treatment goes away. The chips become bare text with an underline-on-active. This matches `.pl-person-chip`, `.pl-nut-chip`, `.scale-chip` (mobile), and `.auth-tab`.
- The implementer flagged in their grep that `.on` may not be rendering correctly at runtime. While you're here: confirm the class is being applied. If it's not, that's a separate bug — log it but don't fix in this brief. Just note in the PR.
- The Sort By chips' inactive cream/tan bg tint mentioned in the parking lot — under this rule, inactive chips have no fill. The tint goes away naturally. No separate action needed.
- Reduce the gap between chips since they no longer have borders to separate them. `gap: 16px` reads better than the current `gap: 8px` once boxes are removed.

### 2. Recipe scale chips on desktop

**Current desktop:** `.scale-chip` on desktop is filled-black pill (visible in screenshot 3, the "1×" chip).
**Current mobile:** `.scale-chip.active` already uses underline (`color: var(--fg); border-bottom-color: var(--fg)`).

**Fix:** Apply the existing mobile treatment to desktop too. This likely means removing a desktop-scoped media query override that sets the filled-black state, or unifying the selector. Confirm the implementation path against the actual CSS.

**Result:** scale chips on desktop look the same as on mobile — bare text, underline on active. Visible at the bottom of screenshot 5 (mobile) for reference.

### 3. Settings person chip under Daily Goals

**Selector:** likely `.set-person-chip` or similar (grep for the JEN/GARTH chips on the settings page; not in the toggle inventory the implementer ran, so name needs confirming).

**Current:** Filled-black pill on both desktop and mobile (visible in screenshot 4 — JEN is filled black, GARTH is muted pill).

**Fix:** Same underline treatment.

```css
.set-person-chip {
  color: var(--fg-muted);
  background: none;
  border: none;
  border-bottom: 1.5px solid transparent;
  padding: 8px 0 6px;
}

.set-person-chip.on {
  color: var(--fg);
  border-bottom-color: var(--fg);
}
```

**Note:** This is purely a chrome change. The chip is still showing whose goals you're editing, which is identity context — but the ACTIVE STATE itself uses the system's chrome treatment, not the person's accent color. The person's accent color shows up elsewhere in the app (planner column, dashboard avatar, etc.) where identity is the primary signal.

### 4. Settings mobile jump button

**Selector:** `.set-mob-jump-btn.on`

**Current:**
```css
.set-mob-jump-btn.on {
  color: var(--cta-ink);
  background: var(--cta);
}
```

**New:**
```css
.set-mob-jump-btn {
  color: var(--fg-muted);
  background: none;
  border-bottom: 1.5px solid transparent;
}

.set-mob-jump-btn.on {
  color: var(--fg);
  border-bottom-color: var(--fg);
}
```

This was doubly wrong: filled state for a non-commit, AND using accent color for chrome.

### 5. `.compare-strip-cta` — no change, verification only

Per the prior investigation, `.compare-strip-cta` is the primary commit of the compare task context. Filled black is correct.

**Action:** Visit the selector. Verify disabled-state opacity and hover behavior are intact and follow the same conventions as other primary commits (e.g. `.btn-primary`, SAVE, CONTINUE). If they diverge, log it but DO NOT restyle the active filled-black treatment.

---

## Verification checklist (run after fixes)

For each of the five locations:

- [ ] Inactive state: muted text (`var(--fg-muted)`), no fill, no visible border, no accent color
- [ ] Active state: ink text (`var(--fg)`), 1.5px ink underline below the label, no fill, no border
- [ ] Hover state on inactive: subtle (text darkens to fg, no underline yet) — consistent with existing chip hover
- [ ] Active state preserved on hover (don't lose the underline on mouseover)
- [ ] No remaining filled-black backgrounds anywhere except: SAVE buttons, CONTINUE, SIGN IN, APPLY, COMPARE-when-armed, `.compare-strip-cta`, and the mobile + recipe FAB

Cross-screen check:
- [ ] Mobile filter sheet (recipes page → Filter button → opens sheet)
- [ ] Mobile filter sheet (pantry page → Filter button → opens sheet)
- [ ] Desktop recipe detail → scale chips
- [ ] Mobile recipe detail → scale chips (should be unchanged, baseline)
- [ ] Desktop settings → Daily Goals → JEN/GARTH chip
- [ ] Mobile settings → Daily Goals → JEN/GARTH chip
- [ ] Mobile settings → jump nav

---

## Doc updates after code lands

### `design-system.md`

Add a new locked rule under the Color/Hierarchy section (or wherever filled-black usage is currently described). Title it **Active state convention**. Use the rule statement above verbatim.

Add a row to the locked rules table:
| Rule | Description | Locked in |
|------|-------------|-----------|
| Active toggle state | 1.5px ink underline + ink text on `var(--fg-muted)` baseline. Never filled black. Never accent color. | Brief 2G |
| Primary commit | Filled black, one per task context. A page may host multiple task contexts. | Brief 2G |

Update §5b (filter chips) and §5c (tabs) to cross-reference the new rule rather than duplicating it.

### `mobile_ux.md`

Add to the patterns section:
- **Filter sheet active state** — chips inside `.mob-sheet` follow the system underline rule. They are NOT filled black. The APPLY button is the only filled-black element in the sheet.

### `step2-audit.md`

Mark 2G complete. Note the five fix locations and the rule lock. Step 2 is complete only after 2G, 2H, AND 2I ship.

### `master-plan.md`

Mark 2G shipped. Step 2 is complete only after 2G, 2H, AND 2I ship.

---

## Out of scope

- The recipes-count baseline issue and the compare-mode card outline issue (covered in 2H)
- Any compare-strip-cta restyling (treatment is correct, do not change)
- Marketing page `.on` usage (not part of the app surface)
- Any deeper restructure of how `.mob-sheet` chips are rendered (DOM structure stays the same; only CSS changes)

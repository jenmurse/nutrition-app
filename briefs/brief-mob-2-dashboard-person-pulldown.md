# BRIEF MOB-2 — Dashboard person pulldown + 1-person household logic

**Part of:** Step 4 mobile audit.
**Scope:** Single PR. Replaces the dashboard's mobile person chips with the planner-style pulldown. Adds 1-person household logic to render a static identity chip (no caret, no interaction) on both dashboard and planner.
**Depends on:** MOB-1 (top bar). The dashboard's right slot is defined as `[person pulldown] [hamburger]` in MOB-1; this brief implements the pulldown half.
**Blocks:** Nothing.

---

## Why this brief

Two related issues:

1. **Dashboard person chips don't scale.** The current pattern shows a pill chip per household member on the dashboard's mobile top bar. At 2 people they fit, at 3 they're tight, at 4+ they overflow even with the locked initial-only-when-4+ rule. With the wordmark on the left and the hamburger on the right (per MOB-1), there isn't enough horizontal space at 375px for more than 2-3 chips.

2. **1-person households don't need a picker.** Both dashboard and planner currently render person UI that implies a choice between people. For a household with one member, there's nothing to pick — the picker is interactive UI that does nothing useful.

The fix: replace dashboard chips with the planner-style pulldown, and add logic on both pages so a 1-person household renders a static identity chip (the same dot + name pill, but with no caret and no tap behavior).

---

## Spec

### A · Dashboard mobile right slot

Per MOB-1, the dashboard's top bar right slot is `[person pulldown] [hamburger]`.

The pulldown is the same component used on the planner — a single pill chip showing:
- Active person's accent dot (left)
- Active person's name (full name when household has ≤3 people, initial when 4+)
- `▾` caret (right)

Tapping the pill opens the existing person picker (sheet on mobile, popover on desktop — same component used on planner).

The picker lists every household member. Tapping a member sets them as the active person on the dashboard, which updates:
- Whose nutrition stats display (calories, sat fat, carbs, etc.)
- The accent color used for `--accent` site-wide for the rest of the session, until changed
- The accent name in the headline ("Good morning, **Jen**")

Existing dashboard behavior on person change is preserved. Only the trigger UI changes — from a row of chips to a single pulldown.

**Important:** the dashboard does not have an "Everyone" or aggregate option. The picker shows household members only. No combined view, no household-level option.

### B · 1-person household logic

When `household.members.length === 1`:

**Dashboard:**
- Render a static chip in the same slot where the pulldown would go.
- Static chip = identical visual to the pulldown pill (accent dot + name) but with no `▾` caret.
- Not tappable. No hover state. No focus ring beyond default keyboard focus (the chip is not interactive).

**Planner:**
- The planner-toolbar person pulldown becomes a static chip with the same rules.
- The toolbar still shows the date range and the `+ NEW PLAN` button. Only the person control changes from pulldown to static.

When `household.members.length >= 2`:

**Dashboard:** Pulldown (per spec A above).
**Planner:** Pulldown (existing behavior, unchanged).

The render condition is checked at component mount and on any household membership change. Adding a second member should automatically swap the static chip for the pulldown without requiring a page reload.

### C · Static chip styles

Same dimensions and typography as the pulldown pill, minus the caret:

```css
.person-chip-static {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border: 1px solid var(--accent);
  color: var(--fg);
  background: transparent;
  cursor: default;
  user-select: none;
}

.person-chip-static .dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--accent);
}
```

The active accent border (vs the muted `var(--rule)` border that pulldown uses for inactive members in the planner's old chip system) is the right treatment because the static chip represents the only person — there's no inactive state to differentiate.

The static chip does not have a `▾` glyph, hover state, click handler, or `aria-haspopup` attribute.

---

## Verification

**1-person household:**
- Dashboard mobile: top bar right slot shows the static chip + hamburger. The chip has no caret and is not tappable.
- Dashboard desktop: same — static chip, no caret, no tap. Replaces whatever the desktop person UI is today.
- Planner mobile: planner toolbar shows the static chip (no caret) instead of the pulldown.
- Planner desktop: planner toolbar shows the static chip (no caret) instead of the pulldown.
- The active person's accent color drives `--accent` everywhere as before.

**2+ person household:**
- Dashboard mobile: top bar right slot shows the pulldown chip + hamburger.
- Tapping the pulldown opens the person picker sheet.
- Selecting a person updates the dashboard stats, headline accent color, and `--accent`.
- Dashboard desktop: shows the pulldown.
- Planner mobile and desktop: pulldown unchanged from current behavior.

**Adding a member:**
- Start with a 1-person household, view dashboard. Static chip renders.
- Add a member via Settings.
- Return to dashboard. The chip is now the pulldown (caret visible, tappable). No reload required.

**Removing a member down to 1:**
- Start with a 2-person household.
- Remove the non-owner member via Settings.
- Return to dashboard. The pulldown is now a static chip.

**Layout:**
- The dashboard top bar right slot has gap `12px` between the chip and the hamburger.
- The chip does not overflow the safe horizontal area at 375px.

**Behavior:**
- The static chip has no `aria-haspopup`, no `role="button"`, no click handler.
- The pulldown chip has `aria-haspopup="true"` and opens the picker on click/tap/Enter/Space.
- The dashboard's existing accent-color logic, stats query, and headline render are unchanged in their inputs — only the UI to change the active person changed.

---

## Out of scope

- Top bar architecture itself — covered in MOB-1.
- Hamburger glyph spec — covered in MOB-1.
- Mobile menu sheet contents — unchanged.
- Person picker sheet contents and styling — unchanged. This brief reuses the existing component.
- Adding any "Everyone" or household-level aggregate option to the dashboard.
- Onboarding's person setup — unchanged.
- Settings' household member management — unchanged.

---

## Files most likely affected

- Dashboard component (mobile and desktop) — replace person-chip row with the pulldown component, add 1-person conditional.
- Planner toolbar component — add 1-person conditional around the existing pulldown.
- Person pulldown component (or planner-specific person picker) — confirm it's reusable; if it's currently planner-specific, lift it into a shared component.
- Static chip component — new (or extract from existing chip styles), shared between dashboard and planner.
- `globals.css` — add `.person-chip-static` if not already covered by the existing chip system.

---

## Notes for the implementer

- The pulldown component already exists on the planner. The implementation here should reuse it directly, not duplicate it. If it's currently scoped under `Planner/`, lift it to a shared `components/PersonPulldown.tsx` or equivalent.
- The 1-person condition is a simple check on household membership count. It should NOT depend on whether the active user is the owner, has admin permissions, or any other field — just member count.
- Do not add any "Add member" prompt or CTA inside the static chip. If a 1-person household wants to add someone, they go through Settings. The chip is just an identity marker.
- The accent border on the static chip uses `var(--accent)`, which is theme-reactive. For a 1-person household, that's that person's chosen color. No special handling needed.
- The pulldown's "active state" border is also `var(--accent)`. Visually the static chip and the active pulldown are identical except for the caret. This is intentional — the visual continuity makes the static→pulldown swap feel natural when a household grows.

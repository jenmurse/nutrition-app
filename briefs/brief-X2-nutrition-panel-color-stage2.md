# BRIEF X2 — Nutrition panel semantic color — Stage 2 (implementation)

**Status:** Shipped April 30, 2026.
**Supersedes:** brief-X1-2-nutrition-panel-color.md (Stage 1 audit).
**Scope:** Four files changed. Bar fill colors, callout row styling, callout copy, ingredient panel alignment.

---

## Locked policy (from Stage 1 audit)

| State | Bar fill | Callout row |
|---|---|---|
| Within target | `var(--muted)` neutral | None |
| Below minimum | `var(--muted)` neutral | `.warn-chip` — plain ruled row, no background, muted dot, copy: `+Xg to target` |
| Over limit | `var(--err)` red | `.err-chip` — tinted red background kept, copy: `+Xg over limit` |

**Rationale:**
- Below-min and over-limit are different kinds of problems. Below-min (e.g. protein, fiber) is informational — a target not yet met. Over-limit (e.g. fat, sodium) is a constraint violated. They should not render at the same visual weight.
- `--ok` green was coating every non-error bar with a positive signal it wasn't earning. Neutral muted grey communicates "normal" without spending semantic color.
- The 80%-warn threshold that existed on recipe detail and ingredient panel had no design basis; it was a copy of the 80% convention from elsewhere. Removed.
- All bar fills now use the same token set across surfaces: `var(--muted)` or `var(--err)`. No surface uses `--ok`, `--warn`, or `--warn-l` for nutrition bars any more.

---

## Files changed

### `app/globals.css`

**Bar fill classes:**
```css
/* Before */
.fill-ok  { background: var(--ok); }
.fill-warn { background: var(--warn); }
.fill-err { background: var(--err); }

/* After */
.fill-ok   { background: var(--muted); }   /* within target — neutral */
.fill-warn { background: var(--muted); }   /* below min — same neutral */
.fill-err  { background: var(--err); }     /* over limit — red only */
```

**Callout row classes:**
```css
/* warn-chip: no background, plain ruled row */
.warn-chip {
  display: flex; align-items: center; gap: 8px; width: 100%;
  background: none; color: var(--muted);
  border-top: 0.5px solid var(--rule); padding: 6px 0;
  font-family: var(--font-mono); font-size: 9px; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase;
}

/* err-chip: tinted background retained — over-limit gets highlighted */
.err-chip {
  display: flex; align-items: center; gap: 8px; width: 100%;
  background: var(--status-error-tint); color: var(--status-error-ink);
  /* ... same as before ... */
}
```

### `app/meal-plans/page.tsx` (desktop planner)

**Bar fill logic:**
```tsx
// Before
const fillClass = isOver ? 'fill-err' : nutrient.status === 'warning' ? 'fill-warn' : 'fill-ok';
// After
const fillClass = isOver ? 'fill-err' : 'fill-ok';
```

**Callout copy:**
```tsx
// Before
? `${n.displayName} −${Math.round(n.lowGoal! - n.value)}${n.unit} below min`
// After
? `${n.displayName} +${Math.round(n.lowGoal! - n.value)}${n.unit} to target`
```

### `app/meal-plans/page.tsx` (mobile nutrition sheet)

**Bar color logic:**
```tsx
// Before
const statusColor = n.status === 'error' ? 'var(--err)' : n.status === 'warning' ? 'var(--warn)' : 'var(--ok)';
// After
const statusColor = n.status === 'error' ? 'var(--err)' : 'var(--muted)';
```

**Callout copy:** same change as desktop.

### `app/recipes/[id]/page.tsx`

```tsx
// Before — 80% warn threshold
const fillClass = isOver ? "bg-[var(--err)]" : pct > 80 ? "bg-[var(--warn)]" : "bg-[var(--ok)]";
// After — no warn threshold, neutral fill
const fillClass = isOver ? "bg-[var(--err)]" : "bg-[var(--muted)]";
```

### `app/components/IngredientContextPanel.tsx`

```tsx
// Before — used --error / --warning alias tokens, 80% warn threshold
isOver ? "bg-[var(--error)]" : isWarn ? "bg-[var(--warning)]" : "bg-[var(--accent)]"
// After — aligned to system tokens, binary logic
isOver ? "bg-[var(--err)]" : "bg-[var(--muted)]"
// Also: value text uses var(--err) when over (was var(--error))
```

---

## What was not changed

- `applyNutrientGoals()` threshold logic — untouched. The function correctly identifies below-min vs over-limit; only the visual treatment was changed.
- Dashboard stats strip — already neutral (`--fg`), no semantic colors. No change needed.
- Day kcal bars (week grid) — always `--ok` green. The brief assumed they used `--err`; they don't. No change.
- Recipe builder bars — binary ok/err logic at 105%. Low priority; not in scope.
- Calorie hero bar — always `--accent-btn`. Intentional; calories are primary metric, not a status indicator.

---

## Verify

- [ ] Planner nutrition slide-out: all nutrient bars render in muted grey. Only over-limit bars go red.
- [ ] Planner callouts: over-limit nutrients show tinted red chip. Below-min nutrients show plain muted text row with `+Xg to target` copy.
- [ ] Recipe detail bars: no amber (warn) state. Only red (over) or grey (normal).
- [ ] Ingredient context panel: same. Text color for over-limit uses `--err` (consistent with rest of system).
- [ ] Panel reads quieter overall — no simultaneous green/amber/red in one screenful.

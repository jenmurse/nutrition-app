---
name: Pantry seeding
description: Pre-fill new household pantries with a USDA starter set. Covers DB approach, onboarding hook, checklist copy, tip placement, and bulk delete.
type: brief
status: planned — not yet built
---

# Pantry seeding

## Why

People may not realize they need to fill out their pantry before the app is useful. Recipes you create or import rely on the pantry to power ingredient matching and nutrition lookups. A pre-filled pantry makes the value tangible immediately, and nudges users to engage with the pantry page early.

---

## How it works

### The starter set

A curated list of ~20–40 common pantry staples sourced from the `GlobalIngredient` table (the shared USDA cache that already exists in the DB). Think: chicken breast, eggs, oats, olive oil, brown rice, whole wheat flour, black beans, milk, butter, garlic, onion, etc.

These live as a constant in the codebase (a plain array of `globalIngredientId` values), not a DB table. Simple to update.

### Seeding on signup

When a new user completes the wizard and `completeOnboarding()` is called (in `app/onboarding/page.tsx`), the server copies each starter `GlobalIngredient` into a new `Ingredient` row scoped to that household. This is a one-time write — no sync, no reference back to the global table.

The copy should set `isMealItem: true` so items show up in the Add Meal flow, and carry over the `defaultUnit`, nutrition link, and name. Custom unit fields can be left null at seed time.

**Where to hook in:** `app/api/onboarding/complete/route.ts` (or wherever `completeOnboarding` posts to). Seed after the `Person.onboardingComplete = true` write, inside the same transaction or as a follow-up call. Fail gracefully — a seeding error should not block wizard completion.

### Items are fully editable/deletable

Seeded items are regular `Ingredient` rows. Users can edit, delete, or add custom units to any of them. They are not locked or flagged as "system" items.

---

## Onboarding checklist change (Layer 2)

**Current task:** "Add your first ingredient" — checks `hasIngredient` via `/api/onboarding`, navigates to `/ingredients`

**New task:** "Review your starter pantry" — same `hasIngredient` check (always true after seeding, so this task auto-completes immediately), same destination `/ingredients`

The auto-complete is intentional: the task exists to get the user to *see* the pantry exists, not to force them to manually add something. Once they visit and the card sees `hasIngredient: true`, it ticks off.

**Copy update:** In `GettingStartedCard.tsx`, change the label and possibly the description text for this task. The description could say something like "We've added a starter set — remove anything that doesn't fit your kitchen."

---

## Contextual tip (Layer 3)

A new `ContextualTip` on the pantry index page (`/ingredients`). Shown once to new users, server-dismissed like all other tips.

**Suggested copy:**

> **Your starter pantry**  
> We've added common ingredients to get you started. Remove anything that doesn't fit, add what's missing, and your recipes will match against what you actually have.

**tipId:** `starter-pantry`  
**Placement:** Top of the pantry page, above the toolbar/search — same pattern as the `usda-search` tip on the new-ingredient form.

---

## Bulk delete

No bulk delete exists today. Needed so users can quickly clear the starter set if they want a clean slate.

### Proposed UX

- Add a "Select" toggle button to the pantry toolbar (desktop + mobile). Activating it puts the list into selection mode.
- In selection mode: each row gets a checkbox on the left. A "Delete X items" button appears in the toolbar (replaces the normal toolbar actions).
- Confirm via `dialog.confirm` before executing. Bulk delete hits a new `DELETE /api/ingredients/bulk` endpoint (or loops the existing single-delete endpoint — bulk is cleaner).
- Selecting all: a "Select all" option in the toolbar when in selection mode.
- Cancelling: tap "Select" again or tap outside.
- Mobile: same pattern — the FAB hides during selection mode, checkboxes appear on each row.

### API

```
DELETE /api/ingredients/bulk
Body: { ids: number[] }
```

Deletes all `Ingredient` rows matching the given IDs for the current household. Returns 200 with a count, or 207 with per-item errors if any fail.

---

## What the wizard does NOT need

A new wizard step for pantry is **not** planned. The wizard already covers profile, household, and goals — adding pantry would lengthen an already-long flow. The checklist task + contextual tip handles the discovery moment with less friction.

The Complete screen copy does not need to change either — it already pushes users to the dashboard where the checklist takes over.

---

## Files to touch

| File | Change |
|---|---|
| `app/onboarding/page.tsx` or `app/api/onboarding/complete/route.ts` | Call seed function after `onboardingComplete = true` |
| `lib/pantry-seed.ts` (new) | Starter set constant + seed function |
| `prisma/schema.prisma` | No changes needed — `Ingredient` table already exists |
| `app/components/GettingStartedCard.tsx` | Update task label + description for pantry task |
| `app/api/onboarding/route.ts` | No changes — `hasIngredient` check already works |
| `app/ingredients/page.tsx` | Add `ContextualTip` (tipId `starter-pantry`) + bulk delete UI |
| `app/api/ingredients/bulk/route.ts` (new) | Bulk delete endpoint |
| `docs/onboarding.md` | Update checklist task table |

---

## Open questions

- **How many items in the starter set?** More items = more immediately useful, but also more to clean up for someone who cooks differently. 25–35 feels right.
- **Which 25–35?** Needs a curated pass — probably the most common ingredients across recipe types (protein, carbs, dairy, oils, aromatics, a few condiments).
- **Should seeding be skippable in the wizard?** Not planned currently — every new user gets the set. Could add a "skip" if feedback suggests it.
- **What if a GlobalIngredient in the starter set doesn't exist in the DB?** Seed function should skip missing IDs gracefully (not throw). Safe to log a warning.

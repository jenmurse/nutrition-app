# Day templates

**Status:** Idea — not started
**Author:** Jen (with Claude)
**Date:** May 2026

---

## What this is

A way to save a single day from the matrix planner — its full set of slot + recipe + servings/quantity choices — as a named, reusable template. Apply it to any future day to populate that day's cells in one action.

The seed of the idea: when a day hits your nutrition goals, it's a "good day" — the formula works. Today there's no way to capture that and reuse it. You can copy a whole week (now wired in the matrix's NEW PLAN dialog), but the day is the more natural unit for a meal pattern.

## Why this is interesting

- **The matrix already organizes by day-column.** A template is just "this column, distilled." The data model fits naturally.
- **Reinforces goal-hitting behavior.** When the totals row goes green/met, the user can lock that pattern in.
- **Personalization angle.** Templates feel like the user's own ("Jen's workout day", "Travel day", "Sunday batch-cook"). Names are part of the value.
- **MCP integration is obvious.** Claude can suggest saving when a day pulls clean, or recommend templates when the user's struggling: "Try Mediterranean — it hit your fiber target last week."

## Data model

New `DayTemplate` model:

```
DayTemplate
  id          Int
  householdId Int
  personId    Int?       // whose goals it was tuned to, if any
  name        String     // "Workout day", "Mediterranean", "Travel"
  createdAt   DateTime
  items       DayTemplateItem[]

DayTemplateItem
  id              Int
  dayTemplateId   Int
  mealType        String     // breakfast/lunch/dinner/snack/side/dessert/beverage
  position        Int        // ordering within slot
  recipeId        Int?
  servings        Float?
  ingredientId    Int?
  quantity        Float?
  unit            String?
```

This mirrors `MealLog` minus the date and meal-plan binding.

## Endpoints

- `GET /api/day-templates` — list household templates
- `POST /api/day-templates` — create from current day: `{ planId, date, name, personId? }` → server reads the meal logs for that day and builds the template
- `DELETE /api/day-templates/[id]`
- `POST /api/day-templates/[id]/apply` — apply to a target day: `{ planId, date }` → server creates a MealLog per item

## UI surfaces

### Save a day

- Day column header on the matrix gets a small overflow menu (`⋯`) on hover.
- "Save as template…" → opens a small naming dialog
- Submit → POST → toast "Saved 'Workout day'"

### Apply a template

- Same `⋯` menu on the day header: "Apply template…" → small menu listing templates by name
- Click → applies; cells fill; totals update
- If target day has existing meals, confirm dialog: "Replace 4 existing meals or append?"

### Manage templates

- Small "Templates" overlay sheet, accessed from the planner toolbar or settings
- List of templates: name, count of items, "Rename" / "Delete" actions
- Could later add "Used in N days" count

## Edge cases

- **Recipe deleted after template was saved** — keep the template with that item missing, or omit silently? Probably omit silently and show a small "1 item couldn't be applied (recipe deleted)" toast.
- **Servings change after save** — template stores its own copy of servings, so no impact.
- **Cross-person templates** — store the `personId` they were tuned to so the user knows. Don't restrict who can apply.

## Scope decisions

- **Single-day only.** Not multi-day patterns (those are copy-week's job).
- **Per-household, not per-person.** Everyone in the household sees the same template library.
- **No nutrition snapshot stored.** The template is the inputs (recipes + portions); the totals re-derive when applied. If recipes change later, the template adapts.

## Sequencing

1. Schema migration
2. Save endpoint + UI
3. Apply endpoint + UI
4. Manage list

Each is shippable on its own. Step 1+2 alone gives a meaningful win — user can stash good days. Apply unlocks the productivity loop.

## MCP follow-up

After this feature ships, add MCP write tools in a separate commit:

**Planner:**
- `add_meal(plan_id, date, meal_type, recipe_id?, ingredient_id?, servings?, quantity?, unit?)`
- `remove_meal(meal_log_id)`
- `update_meal(meal_log_id, servings?, quantity?, mealType?)`
- `swap_meal(meal_log_id, recipe_id?, ingredient_id?)`

**Day templates:**
- `list_day_templates(person_id?)`
- `save_day_template(plan_id, date, name)`
- `apply_day_template(template_id, plan_id, date, mode: 'replace' | 'append')`

These wrap the same endpoints the UI uses, so the work is just MCP tool registration + schemas. Once landed, Claude can analyze a plan against goals, suggest swaps or templates, and optionally write them back (with confirmation on destructive ops).

For now: Claude can already analyze + suggest via the existing read tools. The user applies suggestions manually. That's a useful loop even without writes.

## Out of scope

- Week templates (copy-week handles it)
- Sharing templates across households
- Algorithmic suggestions ("here's a balanced day for you") — that's MCP territory
- Multi-day templates (3-day workout block, etc.) — defer; if it comes up, becomes its own data type

## Open questions

1. **Where does the `⋯` menu live on mobile?** Mobile shows one day at a time. Maybe a button next to "Day totals" that opens the menu.
2. **Should templates show in the picker?** Probably not — the picker is per-cell. Templates are per-day. Mixing surfaces gets confusing.
3. **Do templates need icons/colors?** Maybe later. Names alone are fine for v1.

---
name: Onboarding wizard + tutorial system
description: 3-layer onboarding/tutorial system — wizard, dashboard checklist, contextual tips
type: project
originSessionId: b2b14d40-fa64-4681-b5de-e1b1f5236cad
---
# Onboarding system

Three layers, each with its own purpose. New users see the wizard. Returning users see the dashboard checklist (until dismissed). Both groups see contextual tips on the relevant pages (until each is dismissed).

Trust the code over this doc when they conflict — the system has shipped through multiple iterations and small details drift faster than this gets updated. Key files are listed at the bottom of each section.

---

## Layer 1: Onboarding wizard (`/onboarding`)

Full-screen flow. No top nav. Triggered when `Person.onboardingComplete === false`.

### Structure

5 screens — 2 bookends + 3 content steps:

| Step | Screen | Step label (right side of topbar) |
|---|---|---|
| 0 | Welcome (bookend) | `WELCOME` |
| 1 | Profile (name + theme) | `STEP · 01 / 03` |
| 2 | Household (members) | `STEP · 02 / 03` |
| 3 | Goals (preset picker) | `STEP · 03 / 03` |
| 4 | Complete (bookend) | `READY` |

### Chrome

- **Full-width topbar** above the body, separated by a hairline rule.
- Left: `Good Measure` wordmark (DM Sans 700, 18px). No `§ ONBOARDING` label — removed as redundant with step counter and body eyebrow.
- Right: contextual step label (above table).
- No wordmark or icon in the body of any step. The topbar wordmark is the only brand moment. (Center wordmark and check icon removed April 30, 2026.)
- No hairline rule above the action buttons (Get Started, Back, Continue, Go to Dashboard) — explicitly removed for a quieter editorial feel.

### Behavior

- Theme picker is 8 curated themes (coral, terra, sage, forest, steel, cerulean, plum, slate). The user's choice applies live to the page so they see the result before saving.
- Recipe import is **not** a wizard step. It happens after the user reaches the dashboard, prompted by the Getting Started checklist. Putting it in the wizard introduced a failure surface (URL parsing, ingredient matching) at the worst moment.
- The Complete screen's lede adapts to household state: pure "add a recipe" copy if the user is solo, or invite-prompting copy if they added members.
- On completion, `localStorage.removeItem('dashboard-stats')` clears any stale dashboard-stats config from a prior browser session. Without this, the Getting Started checklist would mark "Customize dashboard stats" as already done for fresh users whose browser still had `_configured: true` from earlier testing.

### Schema + auth

- `Person.onboardingComplete` is `Boolean @default(false)` in `prisma/schema.prisma`. New persons need to be sent through the wizard explicitly.
- `app/auth/callback/route.ts` redirects new users to `/onboarding`.
- `TopNav` is hidden on the `/onboarding` route.

### Key files

- `app/onboarding/page.tsx`
- `prisma/schema.prisma` (`Person.onboardingComplete`, `Person.dismissedTips`)
- `app/auth/callback/route.ts`
- `app/components/PersonContext.tsx` (exposes `onboardingComplete`)
- `app/components/TopNav.tsx`

---

## Layer 2: Getting Started checklist (`GettingStartedCard.tsx`)

A bordered card on the dashboard with a progress bar and a list of auto-completing tasks. Renders above the dashboard greeting/hero so it's the focal point until dismissed.

### Tasks

5 main tasks plus 1 optional. Order matters — it's the implicit recommended path through the app:

| Task | Check key | Source | Navigates to |
|---|---|---|---|
| Set nutrition goals | `hasGoals` | API | Settings → Daily Goals |
| Import your first recipe | `hasRecipe` | API | Recipes |
| Add your first ingredient | `hasIngredient` | API | Pantry |
| Plan your first week | `hasMealPlan` | API | Planner |
| Customize your dashboard stats | `hasDashboardStats` | Client (localStorage) | Settings → Dashboard |
| **Optional:** Set up AI optimization | `hasMcp` | API | Settings → MCP |

If the user added pending household invites, those appear as additional tasks at the top ("Send X an invite") with inline copy-link UX.

### Sources

- 5 of the 6 checks hit `/api/onboarding`, which returns booleans for goals, recipes, ingredients, meal plans, and MCP configuration.
- The dashboard-stats check reads `localStorage('dashboard-stats')` and requires both `_configured: true` and exactly 3 enabled stats. The flag is only set when the user explicitly saves stat preferences in settings — auto-written defaults don't count.

### Dismissal

**Server-side, per person.** The card is dismissed by writing the tip ID `getting-started` into `Person.dismissedTips` (a JSON array string in Postgres) via `dismissTip()` in `PersonContext`. This is **not** localStorage. Once dismissed, it stays dismissed across devices for that person.

Auto-dismisses 1.8 seconds after all main tasks are complete and there are no pending invites.

### Key files

- `app/components/GettingStartedCard.tsx`
- `app/api/onboarding/route.ts`
- `app/components/PersonContext.tsx` (`dismissTip`, `dismissedTips`)
- `app/home/page.tsx` (renders the card)

---

## Layer 3: Contextual tips (`ContextualTip.tsx`)

One-time dismissible tip cards placed on specific pages. Each is tracked individually in `Person.dismissedTips` (same server-side mechanism as Layer 2). Once dismissed, the tip never returns for that person.

### Placements

| tipId | Page | Location |
|---|---|---|
| `household-switch` | Dashboard | Above the Getting Started card |
| `usda-search` | Pantry form (`+ New`) | Below the title, above the Lookup section |
| `nutrition-guidance` | Recipe form | Above the guidance toggle |
| `ai-optimize` | Recipe Detail | Top of the Optimization section |
| `ai-meal-prep` | Recipe Detail | Top of the Meal Prep section |

The two AI tips include a conditional "Set up MCP in Settings →" deep link, shown only when MCP isn't yet configured (checked via `/api/onboarding`).

### Styling

The tip card uses the person's theme accent color: `var(--accent-l)` background, `var(--accent)` left border and label/icon. This is **intentional** — tips are identity-adjacent (they appear because *this person* hasn't seen them yet) and use the same theme color as the person's avatar and selected day in the planner. See `feedback_design_system_enforcement.md` for the rule.

### Key files

- `app/components/ContextualTip.tsx` — reusable component, props: `tipId`, `label`, `children`
- `app/components/PersonContext.tsx` — `dismissTip`, `dismissedTips`
- `prisma/schema.prisma` — `Person.dismissedTips String @default("[]")`

---

## Persistence summary

| State | Where stored |
|---|---|
| Wizard completion | `Person.onboardingComplete` (Postgres) |
| Getting Started dismissal | `Person.dismissedTips` (Postgres, JSON array) — tipId `getting-started` |
| Contextual tip dismissals | `Person.dismissedTips` (Postgres, JSON array) — per `tipId` |
| Dashboard stat configuration | `localStorage('dashboard-stats')` — `_configured` flag + `enabledStats` |

Server-side dismissals carry across devices for that person. The dashboard-stats config is per-browser; a different device shows the user the unconfigured state until they pick stats again. Onboarding completion explicitly clears `localStorage('dashboard-stats')` so the Getting Started checklist doesn't pre-check from leftover prior-session data.

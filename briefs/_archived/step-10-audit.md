# Step 10 — Type leading and tracking audit

**Status:** Audit only. No code changes in this pass.
**Step:** 10 (Type leading and tracking pass)
**Date:** May 2, 2026

---

## Goal

Produce an inventory document showing which surfaces and classes match the locked type scale and which have drifted. The fix brief comes after the inventory is reviewed.

**This is an audit, not a fix.** Do not modify any CSS, JSX, or design system documentation in this pass. The output is a single markdown report at `briefs/step-10-audit.md`.

---

## Reference: locked type scale

Pulled from `master-plan.md` §1 and `design-system.md` §1a–§1b. Two parallel systems — the seven-stop scale handles body and chrome; the named tokens handle headlines and editorial moments. They are not one continuous scale.

### Named tokens (headlines and editorial moments)

| Token | Font-size | Letter-spacing | Line-height | Use |
|---|---|---|---|---|
| Hero (dashboard) | `11.5vw` | `-0.04em` | `0.91` | Dashboard greeting only |
| Hero (landing) | `96px` | `-0.035em` | `1.00` | Landing §00 hero |
| Display | `clamp(36px, 4.4vw, 64px)` | `-0.03em` | `1.05` | Editorial bookends, full-page empty states, 404 |
| Title | `40px` | `-0.025em` | `1.10` | Recipe titles, card titles |
| Page title (recipe detail) | `clamp(30px, 3.4vw, 48px)` | `-0.03em` | `1.05` | Locked exception per design-system §1b |
| Section | `clamp(18px, 1.8vw, 26px)` | `-0.02em` | `1.20` | Chapter heads, toolbars |
| Form title | `clamp(22px, 2.4vw, 32px)` | `-0.02em` | — | New/Edit Recipe, New/Edit Pantry, Add Meal, Shopping (Step 5D locked) |
| Body | `14px` | `0` | `1.55` | Paragraph default |
| Body lede | `18px` | `0` | `1.55` | Paragraph below display headlines |
| Eyebrow | `9px` UPPERCASE | `+0.14em` | — | All DM Mono labels |

### Seven-stop scale (body and chrome)

`9 / 11 / 13 / 16 / 20 / 28 / 36px`. Used for body text, chrome, numbers, and small labels. **Never use 7, 8, 10, 12, 14, 15, 17, 18, 26, 30.**

The 14px body and 18px body lede tokens above are intentional exceptions — they're set in `var(--font-sans)` for paragraph text and have specific roles documented in design-system.md.

---

## Surfaces to audit

### Editorial bookends (should use Display scale or one of the Hero tokens)
- Landing §00 hero (Hero landing token)
- Landing §01 (positioning thesis — confirm scale)
- Landing §02 headline
- Landing §03 headline
- Landing §04 headline ("Cook by the gram. / Plan by the week.")
- Auth Sign in headline
- Auth Create account headline
- Onboarding Welcome headline
- Onboarding Complete (Ready) headline
- Dashboard greeting (Hero dashboard token)
- 404 page
- Empty states (Recipes no-matches, Pantry no-matches, Planner SELECT A PLAN, Shopping no-ingredients, Dashboard NOTHING TODAY, Dashboard stats unconfigured)

### Working surfaces (should use Form title scale)
- New/Edit Recipe form headlines (`A new recipe.`, `Edit this recipe.`)
- New/Edit Pantry form headlines (`A new pantry item.`, `Edit this pantry item.`)
- Add Meal headline (`.pl-add-title`)
- Shopping headline (`.pl-shop-title`)

### Detail pages (should use Page title scale)
- Recipe detail page title

### Section heads (should use Section scale)
- Recipe detail numbered section heads (01 INGREDIENTS, 02 NUTRITION, 03 INSTRUCTIONS, 04 OPTIMIZATION, 05 MEAL PREP)
- Settings section heads (01 PEOPLE, 02 DAILY GOALS, 03 DASHBOARD, 04 MCP INTEGRATION, 05 DATA)
- Recipe form section heads
- Pantry form section heads

### Eyebrows (should be 9px / `+0.14em` / `var(--muted)` / DM Mono / UPPERCASE)
- All `§ X` eyebrows on landing (§ PREMISE, § THE LIBRARY, § THE WEEK, § INVITATION)
- Form page eyebrows (`§ NEW`, `§ EDIT`)
- Auth eyebrows (`§ SIGN IN`, `§ CREATE ACCOUNT`)
- Onboarding eyebrows (`§ WELCOME`, `§ YOUR PROFILE`, `§ YOUR HOUSEHOLD`, `§ DAILY GOALS`, `§ READY`)
- Recipe detail tag (DESSERT, BREAKFAST, etc.)
- Mobile rail labels (HOME, PLANNER, RECIPES, PANTRY, SETTINGS, MENU)
- Filter chip labels (All / Breakfast / Lunch / etc.)
- Toolbar labels (GRID, LIST, COMPARE, FILTER, NEW, etc.)
- Dashboard stats labels (KCAL, FAT, CARBS, PROTEIN, etc.)
- Pantry/recipe card eyebrows (NUTS & SEEDS, BAKING, DESSERT, etc.)

---

## What to deliver

A markdown document at `briefs/step-10-audit.md` containing the following sections in this order:

### 1. Header

Title, date, scope summary, and a note that this is audit-only (no fixes applied).

### 2. Token-by-token inventory tables

One table per token from the locked scale. Each table has columns:

| Class name | File:line | Current `font-size` | Current `letter-spacing` | Current `line-height` | Status |
|---|---|---|---|---|---|

**Status values:**
- **Match** — class values match the token exactly
- **Drift** — class values differ from the token; specify what differs in a notes column
- **Edge case** — class might intentionally diverge for documented reasons; list separately at the end of the table with a brief explanation

Order the tables by token, starting with Hero tokens, then Display, Title, Page title, Section, Form title, Body, Body lede, Eyebrow.

### 3. Surface-by-surface check

For each surface in "Surfaces to audit" above, list:
- The surface name
- The class(es) currently applied to its headline (or note if inline styles are used)
- Which token the surface should be using per the locked scale
- Whether the applied class matches the expected token

Format as a markdown table:

| Surface | Applied class | Expected token | Match? |
|---|---|---|---|

### 4. Drift summary

A bulleted list of the most consequential drifts, grouped by severity:

- **High** — wrong token used entirely (e.g. Display where Form title was expected)
- **Medium** — right token but tracking or line-height drifted
- **Low** — minor deviations within tolerance

### 5. Edge cases flagged for discussion

Classes or surfaces where the audit found values that look like drift but might be intentional. Do not classify these as drift; list separately with one or two sentences explaining why they might be deliberate. Examples of likely edge cases (do not assume — verify before listing):

- `.am-rail-label` (Add Meal rail nav) — rail nav, not a headline. Different sizing convention.
- `.rd-section-num` (recipe detail numbered sections) — uses `--rule` color, may use 12px which is off-scale.
- Scale chips (1×, 2×, 4×, 6×) — segmented control numerical labels.
- Numerical displays in stats (kcal, day numbers) — tabular-nums numerical convention, separate from type scale.
- Page title (recipe detail) — locked exception per design-system §1b, uses `clamp(30px, 3.4vw, 48px)`.

### 6. Surfaces with no clear class assignment

If any surface has its headline styled inline or via a one-off rule that doesn't fit any token, list it here so we can decide whether to:
- Add it to an existing token
- Create a new token
- Leave it as a documented exception

### 7. Out of scope (note explicitly)

Document what this audit did NOT examine:

- UI chrome sizing (buttons, chips, inputs, tabs) — separate convention
- Numerical displays (kcal values, day numbers, stat values) — tabular-nums convention
- Color, spacing, layout — only `font-size`, `letter-spacing`, `line-height` are in scope
- Mobile-specific overrides where they're documented as intentional
- Component-level inline styles passed via React props (these are noted in section 6 but not flagged as drift)

---

## Method

1. **Read the locked token table above** before grepping anything. Internalize what each token's expected values are.
2. **Grep `app/globals.css` for every `font-size` rule.** Capture each class's `font-size`, `letter-spacing`, and `line-height` values.
3. **Cross-reference each class against the token table.** A class matches a token only if all three properties (size, tracking, line-height) match the token's spec.
4. **Spot-check JSX in the `app/` directory** to confirm which classes are actually applied to which headlines on each surface listed above. Some classes may be defined but unused, or applied in unexpected places.
5. **For any `font-size` value not in the locked tokens or the seven-stop scale,** flag as either drift or edge case (use judgment based on context — rail nav and numerical displays are likely edge cases; a headline at 30px is likely drift).
6. **Do not modify any files** other than creating `briefs/step-10-audit.md`.

---

## Out of scope for this audit

- **Fixing drift.** This is the inventory pass. The fix brief comes after.
- **Adding new tokens.** No new tokens are being introduced. If the audit surfaces a need for one, flag it in section 6.
- **UI chrome.** Buttons, chips, inputs, tabs, toolbar text labels — these have their own conventions documented separately and are not part of the type scale being audited here. Their eyebrow-class labels (9px DM Mono uppercase) are in scope; their button text styling is not.
- **Numerical displays.** Stats values, day numbers, kcal totals — separate convention.
- **Color, spacing, layout.** Only `font-size`, `letter-spacing`, `line-height`.

---

## After this audit lands

The inventory will be reviewed for accuracy and completeness. Then a fix brief will be written that:

1. Lists every drift item to correct
2. Provides the exact CSS change for each
3. Documents any new tokens that need to be added (if section 6 surfaces any)
4. Updates design-system.md §1a–§1b to reflect any newly documented edge cases

The fix brief is Step 10's actual implementation work; this audit is the spec.

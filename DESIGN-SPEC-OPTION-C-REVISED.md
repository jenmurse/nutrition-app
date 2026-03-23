# Option C — Revised: Design Specification

Reference mockup: `public/layout-mockups.html` → tab "C — Revised ★"

---

## Global Design Tokens

```css
--fg: #111111;              /* primary text */
--bg: #FAFAFA;              /* page background */
--bg-nav: #F5F5F5;          /* nav background (currently unused, same as --bg) */
--bg-raised: #FFFFFF;       /* raised surfaces (cards, chips) */
--bg-subtle: #F0F0F0;       /* hover backgrounds */
--bg-selected: #E4E4E4;     /* selected/active list item */
--mid: #555555;             /* medium emphasis text (unused in mockup) */
--muted: #888888;           /* secondary text, labels, meta */
--placeholder: #BBBBBB;     /* input placeholder text */
--rule: #E5E5E5;            /* borders, dividers, hairlines */
--rule-strong: #D0D0D0;     /* hover border emphasis */

--accent: #6B9E7B;          /* sage green — primary action color */
--accent-hover: #5A8A6A;    /* accent on hover */
--accent-light: #F0F7F2;    /* very light accent background */
--accent-text: #FFFFFF;     /* text on accent background */

--warning: #D97706;         /* amber — near-limit indicators */
--warning-light: #FEF3C7;   /* warning chip background */
--warning-border: #F59E0B;  /* warning chip border */
--error: #DC2626;           /* red — over-limit, destructive */
--error-light: #FEE2E2;     /* error chip background */
--error-border: #EF4444;    /* error chip border */

--serif: 'DM Serif Display', serif;
--sans: 'DM Sans', sans-serif;
--mono: 'DM Mono', monospace;
```

---

## Shared Shell (All Pages)

### Top Navigation Bar
- **Height**: 48px
- **Background**: `--bg` (#FAFAFA)
- **Border**: 1px solid `--rule` on bottom
- **Padding**: 0 24px
- **Layout**: flex row, align-items center

#### Brand
- Font: `--serif`, 16px, `--fg`
- Letter-spacing: -0.01em
- Margin-right: 28px

#### Nav Links
- Font: `--mono`, 9px, uppercase, tracking 0.08em
- Color: `--muted` (inactive), `--fg` with `--bg-selected` background (active)
- Padding: 6px 12px

#### Person Switcher (right-aligned)
- Font: `--mono`, 9px, uppercase, tracking 0.08em, `--fg`
- Color dot: 7×7px circle, person color, border-radius 50%
- Margin-left: auto
- Shows: dot + name + "▾"

### Page Structure
- Shell: flex column, height `calc(100vh - nav height)`, overflow hidden
- Below nav: flex row body fills remaining height
- Each page section (list, detail, context) manages its own overflow-y

---

## INGREDIENTS VIEW — Three-Pane

```
┌─────────────────────────────────────────────────────────────┐
│ Nav (48px)                                                  │
├──────────┬───────────────────────────┬──────────────────────┤
│ List     │ Detail                    │ Context (Goals)      │
│ 220px    │ flex-1                    │ 280px                │
│          │                           │                      │
│          │                           │                      │
│          │                           │                      │
│ [+New]   │                           │                      │
└──────────┴───────────────────────────┴──────────────────────┘
```

### Left Pane — List (220px fixed)
- **Width**: 220px, min-width 220px
- **Border**: 1px solid `--rule` on right
- **Background**: `--bg`
- **Layout**: flex column, overflow hidden

#### List Header
- **Padding**: 16px 16px 10px
- **Border**: 1px solid `--rule` on bottom
- **flex-shrink**: 0

##### Title
- Font: `--serif`, 18px, `--fg`, line-height 1
- Margin-bottom: 8px

##### Search Input
- **Width**: 100%
- **Border**: 1px solid `--rule`
- **Background**: transparent
- **Padding**: 4px 8px
- **Font**: `--mono`, 10px, `--fg`
- **Placeholder**: `--placeholder` color

##### Tag Filter Pills (Recipes only)
- Font: `--mono`, 8px (in list pane) or 9px, uppercase, tracking 0.06em
- Inactive: transparent bg, `--muted` text, 1px `--rule` border
- Active: `--accent` bg, white text, `--accent` border
- Padding: 2px 6px
- Gap: 3px between pills
- Margin-top: 8px below search

#### Scrollable List
- **flex**: 1, overflow-y auto

##### List Item
- **Padding**: 9px 16px
- **Border**: 1px solid `--rule` on bottom
- **Font**: `--sans`, 12px, `--fg`
- **Cursor**: pointer
- **Hover**: `--bg-subtle` background
- **Selected**: `--bg-selected` background
- Text truncates with ellipsis if too long

#### Bottom Button ("+ New Ingredient" / "+ New Recipe")
- **flex-shrink**: 0
- **Padding**: 10px 16px
- **Font**: `--mono`, 9px, uppercase, tracking 0.08em
- **Background**: `--accent`
- **Color**: white
- **Border-top**: 1px solid `--rule`
- **Text-align**: left

### Center Pane — Detail (flex-1)
- **Layout**: flex column, border-right 1px `--rule`, overflow hidden

#### Detail Header (sticky)
- **Padding**: 18px 24px 14px
- **Border**: 1px solid `--rule` on bottom
- **Layout**: flex row, align-items flex-start, justify-content space-between
- **flex-shrink**: 0

##### Title
- Font: `--serif`, 20px, `--fg`, line-height 1.1
- Margin-bottom: 3px

##### Subtitle
- Font: `--mono`, 10px, `--muted`
- Format: "2 Tbsp = 32g · per 100g" (ingredients) or "2 servings · Prep 5 min · Cook 0 min" (recipes)

##### Tags (Recipes only)
- Below subtitle, margin-top 7px
- Font: `--mono`, 8px, uppercase, tracking 0.06em
- Border: 1px solid `--rule`
- Padding: 2px 6px
- Color: `--muted`
- Gap: 4px between tags

##### Action Buttons (top-right)
- Layout: flex row, gap 6px
- Margin-left: 12px, margin-top: 2px
- Each button:
  - Border: 1px solid `--rule`
  - Background: transparent
  - Padding: 5px 12px
  - Font: `--mono`, 9px, uppercase, tracking 0.08em
  - Color: `--muted`
  - Hover: `--fg` color, `--rule-strong` border
- **Delete button**: Same as other buttons at rest. On hover: color becomes `--error`, border becomes `--error-border`. NOT red by default.

#### Detail Body (scrollable)
- **flex**: 1, overflow-y auto
- **Padding**: 20px 24px

##### Section Labels
- Font: `--mono`, 9px, uppercase, tracking 0.1em, `--muted`
- Margin-bottom: 8px
- Padding-bottom: 5px
- Border-bottom: 1px solid `--rule`
- Margin-top: 18px (0 for first section)
- **First section label**: NO border-bottom, no padding-bottom (just the text)

##### Nutrient/Ingredient Rows
- Layout: flex row, justify-content space-between
- Padding: 7px 0
- Border-bottom: 1px solid `--rule`
- Left text: `--sans`, 11px, `--fg` (ingredient name) or `--muted` (nutrient name)
- Right text: `--mono`, 11px, `--muted` (quantity + unit)

##### Nutrition Grid (Recipes — per-serving)
- Same row format as ingredients: name left, value right
- Font: 11px, name in `--muted`, value in `--fg` with `--mono`

### Right Pane — Context (280px fixed)
- **Width**: 280px, min-width 280px
- **Background**: `--bg`
- **Layout**: flex column, overflow hidden
- **No border-left in mockup CSS** (border comes from center pane's border-right)

#### Tab Bar (Ingredients: just "Goals" header, no tabs. Recipes: 3 tabs)
##### For Ingredients
- No tabs — show goals header directly in the body
- Header text: `--mono`, 9px, uppercase, tracking 0.06em, `--muted`
- Format: "Jen's goals · per 2 Tbsp (32g)"
- Margin-bottom: 12px (mockup uses 4px margin-bottom on label)
- Padding-bottom: 10px (3px in mockup)
- Border-bottom: 1px solid `--rule`

##### For Recipes — Tab Bar
- Layout: flex row
- Border-bottom: 1px solid `--rule`
- flex-shrink: 0
- Each tab:
  - flex: 1
  - Padding: 10px 0 8px
  - Font: `--mono`, 9px, uppercase, tracking 0.08em
  - Text-align: center
  - Color: `--muted` (inactive), `--fg` (active)
  - Border-bottom: 2px solid transparent (inactive), `--fg` (active)

#### Context Body (scrollable)
- **flex**: 1, overflow-y auto
- **Padding**: 16px (mockup)

##### Goal Rows
- Margin-bottom: 14px between rows

###### Goal Label Row
- Layout: flex, justify-content space-between
- Font: `--mono`, 9px, uppercase, tracking 0.06em, `--muted`
- Margin-bottom: 4px
- **Value** (right side): `--fg` color, font-weight 500
  - Warning (>80%): `--warning` color
  - Over (>100%): `--error` color

###### Goal Bar
- Height: 3px
- Background: `--rule`
- Fill: `--accent` (normal), `--warning` (#D97706, >80%), `--error` (#e57373, >100%)
- Position: relative, fill is absolute positioned

###### Percentage Text
- Font: `--mono`, 9px, `--muted`
- Margin-top: 3px
- Format: "19% of 2000 kcal goal"
- Over-limit: `--error` color

##### AI Analysis Sections (Optimize / Meal Prep tabs)

###### Analyzed State Header
- Layout: flex, justify-content space-between, align-items center
- Left: `--mono`, 9px, `--muted`, tracking 0.06em — "Analyzed on import"
- Right: Re-analyze button — `--mono`, 9px, border 1px `--rule`, padding 2px 8px, `--muted`

###### AI Section
- Margin-bottom: 14px
- Padding-bottom: 14px
- Border-bottom: 1px solid `--rule` (except last)

###### AI Section Label
- Font: `--mono`, 9px, uppercase, tracking 0.08em, `--muted`
- Margin-bottom: 6px

###### AI Bullet Point
- Font: `--sans`, 11px, line-height 1.6, `--fg`
- Padding-left: 12px (for bullet indent)
- Bullet character: "·" in `--accent` color, positioned absolute left 0
- Margin-bottom: 6px

###### Meal Prep Score
- Layout: flex, align-items baseline, gap 6px
- Stars: 14px, `--accent` color (filled), `--rule-strong` (empty), tracking 2px
- Label: `--mono`, 9px, `--muted`, uppercase, tracking 0.06em
- Format: "★★★★☆  4 / 5 — great candidate"

---

## RECIPES VIEW — Three-Pane

Same structure as Ingredients, with these differences:

### List Pane
- Title: "Recipes" (serif 18px)
- Has tag filter pills below search (breakfast, lunch, dinner, snack, side, dessert, beverage)
- Bottom button: "+ New Recipe"
- Count badge: `--mono`, 9px, `--muted`, uppercase — shows filtered count

### Detail Pane
- Subtitle format: "2 servings · Prep 5 min · Cook 0 min"
- Tags shown as bordered pills below subtitle
- Sections: Instructions → Ingredients → Nutrition per Serving
- Action buttons: Edit, Duplicate, Delete

### Context Pane
- **Has 3 tabs**: Goals | Optimize | Meal Prep
- Goals tab: same as ingredients (per-serving vs daily goals)
- Optimize tab: AI analysis output with section labels + bullet points
- Meal Prep tab: score (stars) + sections with notes

---

## MEAL PLANS VIEW — Two-Pane (Different Layout)

```
┌─────────────────────────────────────────────────────────────┐
│ Nav (48px)                                                  │
├─────────────────────────────────────────────────────────────┤
│ Shared Header (46px): Week title + nav buttons | Person tabs│
├─────────────────────────────────┬───────────────────────────┤
│ Week Grid                       │ Daily Summary             │
│ flex-1                          │ 380px                     │
│                                 │                           │
│ Grid: 76px day | 1fr | 1fr     │ Calorie hero              │
│ Mon  [Overnight oats] [—]       │ Nutrient bars             │
│ Tue  [Chia pudding]   [—]       │ Warnings                  │
│ Wed  [—]              [—]       │ Meal breakdown            │
│                                 │ Swap suggestions          │
└─────────────────────────────────┴───────────────────────────┘
```

### Shared Header Bar (above both panes)
- **Height**: 46px
- **Layout**: flex row, align-items center, padding 0 24px
- **Border-bottom**: 1px solid `--rule`
- **Gap**: 8px

#### Left Side
- **Week title**: `--serif`, 16px, `--fg`, margin-right 12px
- **Nav buttons** (‹ Prev, This week, Next ›, + New Plan):
  - Font: `--mono`, 8px, uppercase
  - Padding: 3px 9px
  - Border: 1px solid `--rule`
  - "+ New Plan": `--accent` bg, white text, `--accent` border

#### Right Side (flex: 1, then right-aligned)
- **Person tabs**: same as d-meal-tab style
  - Font: `--mono`, 9px, uppercase, tracking 0.08em
  - Padding: 6px 12px 4px
  - Color: `--muted` (inactive), `--fg` with border-bottom 2px `--fg` (active)
  - Person color dot: 7px circle

### Left Pane — Week Grid (flex-1)
- **Layout**: flex column, overflow hidden
- **Border-right**: 1px solid `--rule`

#### Week Grid
- **Display**: CSS grid
- **Columns**: `76px 1fr 1fr` (day label | person 1 | person 2)
- **Align-content**: start (rows don't stretch to fill height)
- **Overflow-y**: auto

##### Day Label Cell
- Padding: 14px 0 14px 14px
- Font: `--mono`, 9px, uppercase, tracking 0.08em, `--muted`
- Border-bottom: 1px solid `--rule`
- Cursor: pointer
- **Selected state**: `--fg` color, `--bg-selected` background, left border 2px `--accent`, padding-left 12px

##### Day Content Cell
- Padding: 10px 16px
- Border-bottom: 1px solid `--rule`
- Border-left: 1px solid `--rule`
- Font: 11px
- Cursor: pointer
- **Selected state**: `--bg-selected` background
- Empty days: "—" in `--muted`

##### Meal Chip (inside day cell)
- Background: white (#fff)
- Border: 1px solid `--rule`
- Padding: 4px 8px
- Margin-bottom: 4px
- Font: 11px, `--fg`
- Layout: flex, align-items center, gap 5px
- Person color dot: 5px circle

### Right Pane — Daily Summary (380px fixed)
- **Width**: 380px, min-width 380px
- **Background**: `--bg`
- **Layout**: flex column, overflow hidden

#### Summary Header
- **Height**: 46px (matches shared header)
- **Layout**: flex, align-items center, justify-content space-between, padding 0 20px
- **Border-bottom**: 1px solid `--rule`
- **Day title**: `--serif`, 17px, `--fg`
- **Person indicator**: `--mono`, 9px, uppercase, tracking 0.06em, `--muted`, with color dot

#### Summary Body (scrollable)
- **Padding**: 16px 20px
- **Overflow-y**: auto

##### Calorie Hero
- Number: `--serif`, 32px, `--fg`, line-height 1
- Unit ("kcal"): `--mono`, 10px, `--muted`
- Layout: flex, align-items baseline, gap 6px
- Goal text: `--mono`, 10px, `--muted` — "of 2,000 kcal daily goal · 35%"
- Bar: height 5px, `--rule` bg, `--accent` fill, margin-bottom 16px

##### Nutrient Bars
- Layout: flex row, align-items center, gap 8px, margin-bottom 8px
- Name: `--mono`, 9px, uppercase, tracking 0.06em, `--muted`, width 44px fixed
- Bar: flex 1, height 3px, `--rule` bg
- Fill: `--accent` (normal), `--warning` (#D97706, warning)
- Value: `--mono`, 9px, `--muted`, width 72px, text-align right, white-space nowrap
- Format: "30g / 80g"

##### Warning Chip
- Background: #FEF3C7
- Border: 1px solid #F59E0B
- Padding: 8px 10px
- Font: 11px, color #92400E, line-height 1.4
- Layout: flex, align-items flex-start, gap 8px

##### Meal Breakdown Rows
- Layout: flex, justify-content space-between, align-items baseline
- Padding: 8px 0
- Border-bottom: 1px solid `--rule`
- Name: 11px, `--fg`
- Meal type label: `--mono`, 9px, `--muted` (inline after name)
- Kcal: `--mono`, 10px, `--muted`
- Empty dinner: italic, `--muted`

##### Swap Suggestion Cards
- Background: `--bg-subtle`
- Border: 1px solid `--rule`
- Padding: 10px 12px
- Margin-bottom: 8px
- Font: 11px, line-height 1.5

###### Swap Label
- Font: `--mono`, 9px, uppercase, tracking 0.08em
- Color: `--accent`
- Margin-bottom: 4px

###### Swap Text
- Color: `--fg`
- Margin-bottom: 6px
- Bold names use `<strong>` (font-weight medium)

###### Swap Button
- Font: `--mono`, 9px, uppercase, tracking 0.08em
- Border: 1px solid `--accent`
- Color: `--accent`
- Padding: 3px 10px
- Background: transparent

###### Confirmed Swap State
- Border-color: `--accent`
- Background: `--accent-light` (#F0F7F2)
- Label: "✓ Swapped — sugar saved" in `--accent` color
- Text: `--muted`
- Button: "Undo" — border `--muted`, color `--muted`

##### Dinner Suggestion Cards (expanded swap)
- Inside swap card, below text
- Each recipe option row:
  - Layout: flex, justify-content space-between, align-items center
  - Padding: 5px 0
  - Border-top: 1px solid `--rule`
  - Name: 11px, `--fg`
  - Note: `--mono`, 9px, `--muted` (e.g., "18g carbs · 35g protein · 420 kcal")
  - Add button: `--mono`, 8px, uppercase, padding 3px 8px, `--accent` border, `--accent` text

---

## DASHBOARD VIEW — Single Scroll (No Panes)

```
┌─────────────────────────────────────────────────────────────┐
│ Nav (48px)                                                  │
├────────────────────────────┬────────────────────────────────┤
│          139               │           24                   │
│       INGREDIENTS          │         RECIPES                │
├────────────────────────────┴────────────────────────────────┤
│ THIS WEEK · MAR 16–22                                       │
│ [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]                  │
│ 3 of 7 days logged · View meal plan →                      │
├─────────────────────────────────────────────────────────────┤
│ HOUSEHOLD                                                   │
│ ● Jen    ● Garth    [+ Add person]                         │
└─────────────────────────────────────────────────────────────┘
```

- **No three-pane layout** — single full-width scrollable column
- **No page-container** — content goes full viewport width

### Stats Row
- Display: grid, 2 columns (1fr 1fr)
- Border-bottom: 1px solid `--rule`
- Each stat: padding 28px 32px, clickable link
- Number: `--serif`, 52px, `--fg`, line-height 1, margin-bottom 6px
- Label: `--mono`, 9px, uppercase, tracking 0.1em, `--muted`
- First cell: border-right 1px `--rule`

### Week Strip
- Padding: 24px 32px
- 7 columns grid (repeat(7, 1fr)), gap 6px
- Day label: `--mono`, 8px, uppercase, tracking 0.06em
- Day cell: height 32px, border 1px `--rule`
- Logged day: `--bg-selected` bg with person color dot centered
- Empty day: `--bg-subtle` bg
- Footer: `--mono`, 10px, `--muted` — "3 of 7 days logged · View meal plan →"

### Household
- Padding: 24px 32px
- Header: `--mono`, 9px, uppercase, tracking 0.1em, `--muted`
- Person chips: flex row, gap 12px
  - Each: padding 10px 16px, border 1px `--rule`, 12px text, color dot 8px
- Add button: dashed border, `--mono`, 9px, uppercase, `--muted`

---

## Key Behavioral Notes

1. **No page-container class** on list views (recipes, ingredients, meal plans). They fill the full viewport width.
2. **main element** in layout.tsx uses `overflow-hidden` — each page manages its own scroll panes.
3. **List pane is always visible** at 220px — doesn't collapse when nothing is selected. Center + right panes show "Select an item" empty state.
4. **Right context panel only shows when an item is selected** (ingredients/recipes). Meal plans always show the daily summary.
5. **Meal plans use a different layout** than ingredients/recipes — no left list pane, just week grid + summary.
6. **Delete buttons are muted by default** — same style as Edit/Duplicate. Only turn red on hover.
7. **AI analysis is triggered once** on recipe save/import, results stored in DB. "Re-analyze" button for manual re-run.

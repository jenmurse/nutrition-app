# Set Course — Design Specification

Visual design language and layout reference for the app.

---

## Global Design Tokens

```css
--fg: #111111;              /* primary text */
--bg: #FAFAFA;              /* page background */
--bg-nav: #F5F5F5;          /* nav background */
--bg-raised: #FFFFFF;       /* raised surfaces (cards, chips) */
--bg-subtle: #F0F0F0;       /* hover backgrounds, skeleton loading */
--bg-selected: #E4E4E4;     /* selected/active list item */
--muted: #888888;            /* secondary text, labels, meta */
--placeholder: #BBBBBB;     /* input placeholder text */
--rule: #E5E5E5;             /* borders, dividers */
--rule-faint: #F0F0F0;      /* subtle separators (grid rows, hairlines) */
--rule-strong: #D0D0D0;     /* hover border emphasis */

--accent: #6B9E7B;          /* sage green — primary action */
--accent-hover: #5A8A6A;    /* accent on hover */
--accent-light: #F0F7F2;    /* light accent background */
--accent-text: #FFFFFF;     /* text on accent background */

--warning: #D97706;         /* amber — near-limit indicators */
--warning-light: #FEF3C7;   /* warning chip background */
--error: #C0392B;           /* red — over-limit, destructive */
--error-light: #FDECEA;     /* error chip/button background */

--serif: 'DM Serif Display', serif;
--sans: 'DM Sans', sans-serif;
--mono: 'DM Mono', monospace;

--shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03);
--shadow-lg: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
--radius-sm: 4px;
--radius-lg: 12px;
```

---

## Shared Shell

### Top Navigation Bar
- Height: 52px
- Background: `--bg-nav`, shadow `0 1px 2px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)`
- No bottom border — shadow provides separation

#### Brand
- Font: `--serif`, 16px, `--fg`, tracking 0.02em
- Text: "Set Course"

#### Nav Links
- Font: `--mono`, 9px, uppercase, tracking 0.08em
- Inactive: `--muted` text, transparent background
- Active: `--fg` text, `--bg-selected` background, rounded-full pill

#### Person Switcher (right-aligned)
- Color dot: 8px circle with person color
- Font: `--mono`, 9px, uppercase, `--fg`

---

## Page Layouts

### Three-Pane (Ingredients, Recipes)

```
┌────────────────────────────────────────────────────────────┐
│ TopNav (52px)                                              │
├──────────┬───────────────────────────┬─────────────────────┤
│ List     │ Detail                    │ Context (Goals)     │
│ 220px    │ flex-1                    │ 280px               │
│          │                           │                     │
│ [+New]   │                           │                     │
└──────────┴───────────────────────────┴─────────────────────┘
```

- Left pane: 220px fixed, search + list, bottom action button
- Center pane: detail view with header + scrollable body
- Right pane: 280px context panel (Goals / Optimize / Meal Prep tabs for recipes)
- Right pane only visible when item is selected
- Pane separators: `--rule` borders

### Two-Pane (Meal Plans)

```
┌────────────────────────────────────────────────────────────┐
│ TopNav (52px)                                              │
├────────────────────────────────────────────────────────────┤
│ Header: Week nav + person tabs + NUTRITION toggle          │
├──────────────────────────────────┬─────────────────────────┤
│ Week Grid                        │ Daily Summary           │
│ flex-1                           │ 380px                   │
│                                  │                         │
│ CSS Grid: 80px + repeat(7, 1fr) │ Calorie hero            │
│ Meal type rows × day columns     │ Nutrient bars           │
│ Meal cards with shadow + rounded │ Warnings                │
│                                  │ Smart swap suggestions  │
│ + ADD row at bottom              │                         │
└──────────────────────────────────┴─────────────────────────┘
```

- Header: 46px, week navigation, person tabs, NUTRITION toggle, EVERYONE view
- Grid: CSS grid with horizontal-only row separators (`--rule-faint`), no vertical column dividers
- Today column: subtle highlight via `color-mix(in srgb, var(--bg-selected) 30%, var(--bg))`
- Meal cards: `bg-raised`, `rounded-[6px]`, `shadow-sm`
- Summary panel: calorie hero (serif 32px), nutrient progress bars, warning alerts, smart swap suggestions

### Single Column (Dashboard)

```
┌────────────────────────────────────────────────────────────┐
│ TopNav (52px)                                              │
├────────────────────────────────────────────────────────────┤
│ Greeting + date                                            │
├────────────────────┬──────────────────────────────────────-┤
│ Ring hero          │ (spacer)                               │
│ Goals on track     │                                       │
│ Warning items      │                                       │
├────────────────────┼───────────────────────────────────────┤
│ Today's nutrition  │ Today's meals                         │
│ Progress bars      │ Meal type rows                        │
│                    │ View full plan →                      │
└────────────────────┴───────────────────────────────────────┘
```

- No three-pane layout — full-width scroll
- Greeting: 26px semibold, time-of-day greeting
- Two-column grid: nutrition bars (left) + meal list (right)
- SVG ring hero showing "X of Y goals on track" with adaptive warnings
- Vertical hairline divider between columns (absolute positioned, `--rule-faint`)
- Empty states: prominent accent-colored CTA buttons

---

## Component Patterns

### Buttons
- **Primary action**: `--accent` bg, white text, `rounded-[6px]`, `hover:accent-hover`
- **Secondary**: `--bg-raised` bg, `--muted` text, `border --rule`, `rounded-[6px]`, hover → `--fg` text + `--rule-strong` border
- **Danger**: `--error-light` bg, `--error` text, `border-0`, hover → solid `--error` bg + white text
- **Scale on press**: `active:scale-[0.96]` on interactive buttons (via `.no-press` class to opt out)

### Cards
- Background: `--bg-raised`
- Border-radius: 6px
- Shadow: `--shadow-sm`
- No border by default — shadow provides depth

### Modals
- Overlay: `bg-black/40`, centered
- Card: `--bg-raised`, `rounded-[var(--radius-lg)]`, `shadow-lg`, max-w-sm, p-6
- Cancel: secondary button style
- Confirm: primary or danger depending on action

### Toast System
- 2px sweep line below nav (accent = success, error = failure)
- Error: additional bottom status bar with message text
- Fixed position, no layout shift

### Confirm Dialog
- Async `dialog.confirm()` — replaces all native `confirm()` calls
- Danger variant: red confirm button

### Loading States
- Skeleton blocks: `--bg-subtle` with `animate-loading` pulse (opacity 0.6 → 1)
- Stagger: ~100ms delay between skeleton elements

### Tag Pills
- Font: `--mono`, 8-9px, uppercase, tracking 0.06-0.1em
- Inactive: `--bg-pill` bg, `--muted` text
- Active: `--accent-light` bg, `--accent` text
- Shape: `rounded-full`

### Progress Bars
- Height: 3-4px
- Track: `--bg-subtle`, rounded
- Fill: `--accent` (normal), `--error` (over limit)

---

## Typography

| Usage | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Page headings | DM Serif Display | 18-26px | normal | -0.01em |
| Body text | DM Sans | 11-13px | normal | — |
| Labels, meta | DM Mono | 8-10px | normal | 0.06-0.12em |
| Numbers (dynamic) | DM Mono | varies | — | tabular-nums |

- `-webkit-font-smoothing: antialiased` on root
- `text-wrap: balance` on headings
- `font-variant-numeric: tabular-nums` on all dynamic numbers

---

## Color Themes

Four alternate palettes available in Settings:
- **Default** — warm neutrals, sage green accent
- **Ocean** — cool blues
- **Dusk** — muted purples
- **Sand** — warm earth tones

Each theme overrides all CSS variables. All themes include `--error-light` for danger button backgrounds.

---

## Key Design Principles

1. **Shadows over borders** — cards use `shadow-sm` instead of borders for depth
2. **Horizontal-only grid separators** — no vertical column dividers in data grids
3. **Concentric border radius** — outer radius = inner radius + padding
4. **Optical alignment** — icons and asymmetric elements adjusted visually, not geometrically
5. **Muted by default, emphasized on interaction** — delete buttons are neutral until hovered
6. **Minimal dividers** — `--rule-faint` for subtle separation, `--rule` only where needed
7. **Consistent label system** — `--mono` uppercase with tracking for all section headers and metadata

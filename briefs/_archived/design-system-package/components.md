# Good Measure — Component Specs

One section per component. Values match `tokens.json`. When values diverge between this doc and `tokens.json`, **tokens.json wins**.

---

## Button

The primary, secondary, and ghost variants.

### Primary

- **Background:** `--fg` (#1A1916)
- **Color:** `--bg` (#F5F4EF)
- **Border:** none
- **Padding:** `9px 22px` (default), `14px 28px` (large)
- **Font:** DM Sans, 600
- **Size:** 9px (default), 10px (large)
- **Letter-spacing:** 0.14em
- **Text-transform:** uppercase
- **Border-radius:** 0
- **Hover:** background slightly lifted; no color change
- **Transition:** 200ms `--ease`

### Secondary (default)

- **Background:** transparent
- **Color:** `--fg`
- **Border:** 1px solid `--rule` (#D0CCC2)
- All other values same as primary
- **Hover:** `border-color: --fg`

### Ghost

- **Background:** transparent
- **Color:** `--muted`
- **Border:** none
- **Padding:** `9px 0` (no horizontal padding)
- **Decoration:** underline, transparent until hover
- **Underline-offset:** 6px
- **Hover:** `color: --fg`, underline goes solid `--fg`

### Destructive

**Critical:** destructive buttons stay ink-on-paper. Do NOT use a red fill. The word "Delete" + the modal context carries the warning.

- Same as primary (ink fill)
- Label is the destructive verb ("Delete", "Remove household", etc.)
- Place inside a centered confirm dialog

---

## Chip

Toggle-style filter labels.

- **Font:** DM Sans, 500
- **Size:** 9px
- **Text-transform:** uppercase
- **Letter-spacing:** 0.14em
- **Color (off):** `--muted`
- **Color (on):** `--fg`
- **Background:** none
- **Border:** none
- **Border-bottom:** 1.5px solid transparent (off) / `--fg` (on)
- **Padding:** `3px 0 4px`
- **Hover:** `color: --fg`

---

## Input

Bare, hairline-bottom-only.

- **Background:** transparent
- **Border:** none
- **Border-bottom:** 1px solid `--rule`
- **Padding:** `10px 0`
- **Font:** DM Sans, 400
- **Size:** 13px
- **Color:** `--fg`
- **Placeholder color:** `--muted`
- **Focus:** `border-bottom-color: --fg` (no glow, no outline ring)

### Label

- **Font:** DM Mono, 500
- **Size:** 9px
- **Text-transform:** uppercase
- **Letter-spacing:** 0.14em
- **Color:** `--muted` (resting) / `--fg` (focused or filled)
- **Margin-bottom:** 8px

---

## Stat Cell

Dashboard / planner numeric blocks.

- **Border:** 1px solid `--rule` on relevant edges (typically right + bottom in a grid)
- **Padding:** `28px 24px`
- **Eyebrow:** mono 9px uppercase, `--muted`
- **Number:** DM Sans 500, 36px or 48px, tracking −0.018em, `--fg`, `font-variant-numeric: tabular-nums`
- **Unit:** mono 11px, `--muted`, after number with a non-breaking space
- **Sub-label:** body 13px, `--fg-2`, line 1.55

---

## Status Pill

Replaces stacked icon+text alert banners. **The only place status colors appear in the UI.**

- **Display:** inline-flex, items center, gap 8px
- **Background:** `--status-{kind}-tint`
- **Color:** `--status-{kind}-ink`
- **Padding:** `5px 12px`
- **Font:** DM Mono, 500
- **Size:** 9.5px
- **Letter-spacing:** 0.14em
- **Text-transform:** uppercase
- **Border-radius:** 0 (square pills)
- **Dot:** 6×6px, `border-radius: 9999px`, `background: --status-{kind}-ink`, placed before label

### Concrete values

| Kind    | Tint (bg) | Ink (color + dot) | Use |
|---------|-----------|-------------------|-----|
| success | #E8EDDF   | #4A6B3A           | Confirmation, completed |
| warning | #F5E5D2   | #9C5E1F           | Approaching limit |
| error   | #F0DCD6   | #A33A28           | Sync error, over limit |

---

## Toast

Replaces the inline confirm/dismiss bar at the top of pages.

- **Position:** fixed, bottom-center, `bottom: 24px`
- **Background:** `--fg` (#1A1916)
- **Color:** `--bg` (#F5F4EF)
- **Padding:** `14px 20px`
- **Font:** DM Sans, 500
- **Size:** 13px
- **Border-radius:** 0
- **Max-width:** 480px
- **Dismiss timing:** 4000ms (auto) — no close button by default
- **Always include Undo** for destructive operations as a secondary text button on the right (color `--bg`, opacity 0.7, underline on hover)
- **Animation:** slide up 12px + fade in over 200ms `--ease`; reverse on dismiss

---

## Modal (centered confirm)

For destructive or attention-required actions. Not for forms.

- **Backdrop:** `rgba(0,0,0,0.4)`
- **Container:** `--bg`, max-width 440px, padding 32px, centered
- **Border:** 1px solid `--fg` (deliberate ink hairline)
- **Border-radius:** 0
- **Eyebrow:** mono 9px uppercase, color `--status-error-ink` for destructive contexts; `--muted` for neutral
- **Headline:** DM Sans 500, 22px, tracking −0.02em, line 1.15. May contain one italic-serif word at this size only as a deliberate moment.
- **Body:** body 13px, `--fg-2`, line 1.6
- **Actions:** flex, gap 10px, justify-end. Destructive verb on primary (still ink fill); "Cancel" on secondary.

---

## Eyebrow / Section label

The `§` mark.

- **Font:** DM Mono, 500
- **Size:** 9px (default) or 10px (TOC, masthead)
- **Letter-spacing:** 0.14em (9px) / 0.16em (10px)
- **Text-transform:** uppercase
- **Color:** `--muted` (default) or `--fg` (when emphasized via `.kicker.ink` or `[data-emphasis=ink]`)
- **Format:** `§ This Week`, `§ Pantry`, `Step 02 / 03`

---

## Mono Data

For numbers in body context.

- **Font:** DM Mono, 400
- **Size:** 11px
- **Letter-spacing:** 0.04em
- **Color:** `--fg`
- **Font-variant-numeric:** `tabular-nums`
- **Unit suffix:** smaller (9px), `--muted`, `margin-left: 2px`. Example: `1,847 kcal · 124 g protein`.

---

## Hairline Rule

The only divider style.

- **Color:** `--rule` (#D0CCC2)
- **Width:** 1px
- **Use:** card edges, table dividers, section breaks, nav underlines
- Do NOT use heavier weights for emphasis. If something needs more weight, use ink (`--fg`) — but sparingly (modal borders, deliberate emphasis only).

---

## Card

There is no `.card` class. Cards are just rectangles bound by hairlines.

- **Background:** `--bg-2` (raised) or `--bg` (in-context)
- **Border:** 1px solid `--rule`
- **Border-radius:** 0
- **Padding:** `24px` (compact) / `32px` (default) / `48px` (display)
- No shadows. Ever.

---

## Mobile rail (Pattern B only)

The bottom navigation pattern. Build this; do not build a tab bar.

- **Position:** fixed, bottom 0, full-width
- **Background:** `--bg`
- **Border-top:** 1px solid `--rule`
- **Height:** 60px
- **Layout:** flex, justify-between, padding `0 20px`, items-center
- **Left:** "Menu" — DM Sans 500, 13px, tracking −0.005em, `--fg`
- **Right:** section index — DM Mono 500, 10px, tracking 0.16em, uppercase, `--muted`. Format: `02/04 — Today`
- **Tap Menu:** fullscreen overlay slides up from bottom. Background `--bg`. Lists the four sections as 36px DM Sans 500 left-aligned tap targets, separated by hairline rules. Close: tap outside, swipe down, or "Close" in the top-right.

---

## The Dot

> "The dot is the only round shape. Save it."

`border-radius: 9999px` is reserved exclusively for:

- Person avatar dot (in their theme color)
- Today-cell on the week strip
- Current step indicator in onboarding
- App icon / favicon

**Where it doesn't go:**
- Not as a nav glyph
- Not as a status indicator (status uses pills, not dots)
- Not as a decorative bullet in body copy
- Not stacked or repeated as ornament
- Never on buttons, cards, inputs, modals, or containers

Everything else is `border-radius: 0`. Sharp corners are a brand commitment. Used scarcely, the dot stays charged. Used everywhere, it becomes wallpaper.

---

## Eyebrow / Section label

The `§` mark.

- **Font:** DM Mono, 500
- **Size:** 9px (default) or 10px (TOC, masthead)
- **Letter-spacing:** 0.14em (9px) / 0.16em (10px)
- **Text-transform:** uppercase
- **Color:** `--muted` (default) or `--fg` (when emphasized via `.kicker.ink`)
- **Format:** `§ This Week`, `§ Pantry`, `Step 02 / 03`

---

## Hairline Rule

The only divider style.

- **Color:** `--rule` (#D0CCC2)
- **Width:** 1px
- **Use:** card edges, table dividers, section breaks, nav underlines
- Do NOT use heavier weights for emphasis. If something needs more weight, use `--fg` ink — but sparingly (modal borders, deliberate emphasis only).

---

## Card

There is no `.card` class. Cards are rectangles bound by hairlines.

- **Background:** `--bg-2` (raised) or `--bg` (in-context)
- **Border:** 1px solid `--rule`
- **Border-radius:** 0
- **Padding:** `24px` (compact) / `32px` (default) / `48px` (display)
- **No shadows. Ever.**

---

## Onboarding chrome

> "Set the tone in the first three seconds."

### Layout — five steps

| Step | Wordmark | Counter |
|---|---|---|
| Welcome (bookend) | Centered, no counter | Hidden |
| Profile | Left-aligned | Top-right, aligned to content column |
| Household | Left-aligned | Top-right, aligned to content column |
| Goals | Left-aligned | Top-right, aligned to content column |
| Complete (bookend) | Centered, no counter | Hidden |

### Linework
- One full-width hairline rule (`--rule`) between chrome and content
- One full-width hairline rule above the action buttons
- Nothing else — no heavy ink rules

### Sage `<em>` accent
- Welcome headline: one verb/phrase in `var(--sage)`. Example: *"Measure* what matters."
- Complete headline: one verb/phrase in `var(--sage)`
- Interior steps (Profile, Household, Goals): **no sage accent** — dropped to prevent repetition becoming a tic

### Color picker (Profile step)
- Dot swatches only — no text labels beneath the colors
- Selected state: `outline: 2px solid var(--fg); outline-offset: 2px`

### CTA buttons
- Back: ghost (`.ed-btn.ghost`, `← Back`)
- Continue / Get started: outlined secondary (`.ed-btn`) — NOT filled primary
- Final "Go to Dashboard": filled primary (`.ed-btn.primary`) — only primary on the whole wizard

---

## Auth screens

> "Two panes, one side speaks, the other listens."

### Desktop layout

```
┌─────────────────────────┬─────────────────────────┐
│  LEFT PANE (--bg)        │  RIGHT PANE (white)      │
│  eyebrow                 │  tab toggle              │
│  Hero headline           │  underlined inputs       │
│    verb in --sage        │  solid ink CTA           │
│  one line plain copy     │  ── or ──                │
│                          │  Continue with Google    │
└─────────────────────────┴─────────────────────────┘
```

- Top chrome: wordmark left, `← BACK` right, `border-bottom: 1px solid var(--rule)`
- Left pane: `background: var(--bg)` (cream)
- Right pane: `background: #fff`
- Column split: ~45 / 55

### Left pane copy library

| Screen | Eyebrow | Headline | Sage word | Copy |
|---|---|---|---|---|
| Sign in | § Sign in | "Pick up where you left off." | "left off" | "Your pantry, your recipes, the week you were planning." |
| Create account | § Create account | "Cook the way you actually cook." | "actually cook" | "Build your pantry once. Plan a week against it." |
| Forgot password | § Forgot password | "We'll send you a way back in." | "way back in" | "Type the email on your account. Reset link comes by email." |
| Join household | § Joining household | "Pull up a chair at the [Family]'s." | family name | "You've been invited. Make an account to join their pantry." |

Pattern: two-line ink headline with the sage-accented word/phrase. One line of plain copy below.

### Right pane rules
- Tab toggle: Sign in / Create account — underline-on-active, no fill
- Inputs: `.ed-input` — bottom rule only, no boxes
- CTA: `.ed-btn.primary` full-width, sentence-case ("Sign in", "Create account")
- No sage on auth buttons — sage is only for left-pane headlines
- Google is the **only** OAuth option — one provider, below an "or" hairline rule
- Error states → iron-oxide toasts (see Toast component), **not** inline red text under fields

### Mobile layout
Left pane stacks **above** right pane. Hairline rule between them stands in for the desktop column divider. Same chrome (wordmark + back), same eyebrow, same hero copy with sage accent, then form, then OAuth fallback.

---

## Empty states

> "No illustrations. No mascots. The void carries the voice."

### Pattern

```
[Mono eyebrow — DM Mono 500, 9px, --muted]    § Empty · Recipes
[Headline — DM Sans 500, 36px, --fg]           No recipes yet.
[Lede — DM Sans 400, 13px, --fg-2, line 1.55] Drop a URL, paste a list of ingredients,
                                               or start from scratch — Good Measure
                                               handles the math.
[Actions — .ed-btn outline]                    Add recipe    Import URL
```

Rules:
- No glyph, no icon, no illustration
- Helpful lede + at least one clear next action
- CTA uses outlined secondary button — never filled primary

### Per-surface copy (locked)

| Surface | Headline | Lede |
|---|---|---|
| Recipes | No recipes yet. | Drop a URL, paste a list of ingredients, or start from scratch — Good Measure handles the math. |
| Pantry | An empty pantry. | Add ingredients one by one, import from a recipe, or paste a list — Good Measure fills in the nutrition. |
| Planner | A blank week. | Add meals from your recipe library, or let Good Measure suggest a week based on your goals. |

---

## Loading state

- Hairline shimmer only — matches the type sizes and positions of the content it will replace
- No spinner, no loading icon, no skeleton blobs
- Shimmer: `background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%)`, `background-size: 200% 100%`, animate `background-position` left→right, 1.4s ease-in-out infinite

---

## Error state

```
[Status pill — iron-oxide]   SYNC ERROR
[Headline — DM Sans 500, 36px]  Couldn't reach the kitchen.
[Lede — DM Sans 400, 13px]   Your changes are saved locally. We'll sync when
                              you're back online — nothing's lost.
[Ghost CTA]                  Try again
```

Rules:
- Status pill (not icon) leads the pattern
- Plain language always — "couldn't reach the kitchen", not "503 Service Unavailable"
- Ghost CTA for retry — not filled primary

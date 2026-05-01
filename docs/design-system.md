# Good Measure — Design System

Source of truth for current visual reality. The design system is **editorial, sharp, and quiet** — two typefaces, paper background, minimal chrome, hairline rules, opinion through typography rather than ornament. Voice rhymes with the landing page at withgoodmeasure.com.

> **Maintenance:** This doc is the living source. When implementation diverges, update the doc — don't add a "this section is stale" banner. For strict enforcement rules and patterns to watch for in code review, see [feedback_design_system_enforcement.md](feedback_design_system_enforcement.md).
>
> Some older sections may still describe earlier behavior; trust the actual code over a section if they conflict, and fix the doc as you find drift.

---

## 1. Typography

**Three typefaces. No others.**

| Role | Family | When to use |
|---|---|---|
| Body / display / headings | DM Sans | Everything except UI labels and italic editorial moments |
| Labels / mono | DM Mono | UI chrome — nav links, eyebrows, filter chips, metadata, dates, nutrition values, button text |
| Italic editorial accent | Instrument Serif | Auth headlines only (`<em>left off.</em>`, `<em>actually cook.</em>`). Display-size only (≥ 24px). Never for body text. |

**Defined as CSS variables on `:root`:**
```css
--font-sans:      'DM Sans', sans-serif;
--font-mono:      'DM Mono', monospace;
--serif-display:  'Instrument Serif', Georgia, serif; /* italic-only, display-only */
```

`html, body { font-family: var(--font-sans); font-size: 13px; -webkit-font-smoothing: antialiased; }`

Tailwind's `font-serif` is mapped to DM Sans for legacy compatibility.

### 1a. Type scale — 7 stops only

`9 / 11 / 13 / 16 / 20 / 28 / 36px`

Never use 7, 8, 10, 12, 14, 15, 17, 18, 26, 30. The 20px stop is mid-display only (empty states, ingredient calorie stats, meal card titles), not for body or labels.

**Minimum size: 9px.** 7px and 8px are below the iOS legibility floor.

### 1b. Element sizes

| Element | Size | Weight | Letter Spacing | Notes |
|---|---|---|---|---|
| Wordmark (nav) | 13px | 700 | -0.02em | DM Sans |
| Wordmark (auth, onboarding) | 18px | 700 | -0.02em | DM Sans |
| Page title (recipe detail) | clamp(30px, 3.4vw, 48px) | 700 | -0.03em | line-height 1.05, text-wrap balance |
| Page title (form) | clamp(22px, 2.4vw, 32px) | 700 | -0.02em | |
| Section header | clamp(18px, 1.8vw, 26px) | 600 | -0.02em | |
| Recipe card name | clamp(13px, 1.4vw, 16px) | 600 | -0.01em | text-wrap balance |
| Hero number (stats) | 28px | 700 | -0.025em | tabular-nums |
| Planner day number | 28px | 700 | -0.02em | tabular-nums |
| Step / section numbers | 28px | 700 | — | color: var(--rule) |
| Nav links / mono labels | 9px DM Mono | 400 | 0.12–0.18em | uppercase |
| Section eyebrow | 9px DM Mono | 400 | 0.14–0.18em | uppercase, var(--muted) |
| Body / step text | 13px DM Sans | 400 | — | line-height 1.7, var(--fg-2) |
| Form inputs | 13px DM Sans | 400 | — | |

### 1c. Rules

- All DM Mono labels that are UI chrome → `text-transform: uppercase`
- Numbers that update dynamically → `font-variant-numeric: tabular-nums`
- Headings → `text-wrap: balance`
- Body paragraphs → `text-wrap: pretty`

### 1d. Button register rule (locked)

**Border = Sans. No border = Mono.**

| Class | Border | Register |
|---|---|---|
| `.ed-btn` | yes — 1px `var(--rule)` | DM Sans |
| `.ed-btn-outline` | yes — 1px `var(--rule)` | DM Sans |
| `.ed-btn-text` | no | DM Mono |
| `.ed-chip` | no (only active underline) | DM Mono |
| `.ed-toggle button` | no (only active underline) | DM Mono |
| `.sort-field` | no | DM Mono |

**Implementation note:** All DM Mono button/label classes must use `var(--font-mono)` directly — not `var(--mono)` — because the nested variable chain can fail to resolve due to CSS layer ordering. The `var(--mono)` token is still valid for non-button use but prefer `var(--font-mono), 'DM Mono', ui-monospace, monospace` in component-level rules.

---

## 2. Color

### 2a. Tokens

All colors are CSS variables. Never hardcode hex values.

```css
:root {
  /* Surfaces */
  --bg:    #F5F4EF;   /* paper — primary background */
  --bg-2:  #EEEAE3;   /* secondary surface — code blocks, file uploads */
  --bg-3:  #E6E2D8;   /* tertiary — toolbar icon button fill, hover, ghost tile placeholder */

  /* Foreground */
  --fg:    #1A1916;   /* primary text */
  --fg-2:  #36342F;   /* body, descriptions */
  --muted: #6B6860;   /* labels, hints, disabled */
  --rule:  #D0CCC2;   /* hairlines, borders, dividers, outlined buttons */

  /* Accent — driven by active person's theme */
  --accent:    #5A9B6A;             /* default sage; theme-reactive */
  --accent-l:  rgba(90,155,106,0.10);

  /* Status */
  --ok:       #5A9B6A;
  --ok-l:     rgba(90,155,106,0.12);
  --err:      #B02020;              /* over-limit warnings */
  --err-l:    rgba(176,32,32,0.10);
  --warn:     #C07018;
  --warn-l:   rgba(192,112,24,0.10);
}
```

### 2b. Color rule (the locked decision)

Three buckets, no exceptions:

1. **Theme-reactive = identity.** The accent color marks "I am Jen" / "I am Garth." Used for: avatar dots, active person pill, active planner day column, person dots before names, sage `<em>` accent words on landing and auth.

2. **Neutral black = everything else.** Primary CTAs, active tab states, focus rings, active nav underlines, destructive buttons, hover states, every generic UI affordance.

3. **Red and green stay semantic.** `--err` for over-limit warnings, `--ok` for success. These are signal colors, not brand colors.

Coral / theme accent should never appear on a primary CTA. Black should never appear on an identity marker.

### 2e. Nutrition panel semantic color policy

Locked April 30, 2026. Applies to: planner sidebar, recipe detail bars, ingredient context panel.

| State | Bar fill | Callout row |
|---|---|---|
| Within target | `var(--muted)` neutral | None |
| Below minimum | `var(--muted)` neutral | `.warn-chip` — plain ruled row, no background, muted dot, copy: `+Xg to target` |
| Over limit | `var(--err)` red | `.err-chip` — tinted red background, copy: `+Xg over limit` |

**Rationale:**
- `--ok` green is not used as a bar fill. Its absence is sufficient to communicate "within target" — spending green on every normal bar dilutes its signal.
- `--warn` amber is not used on bars. "Below minimum" (target not yet met, informational) and "over limit" (constraint violated, actionable) are different problems and should not render at equal visual weight.
- Only `--err` red appears on bars — reserved for the over-limit case only.
- Below-min callout rows have no tinted background. Over-limit callout rows (`err-chip`) retain the tinted background because that state warrants higher visual weight.
- Copy: below-min uses `+Xg to target` (positive framing, not alarming). Over-limit uses `+Xg over limit`.
- Dashboard stats strip uses `--fg` (no semantic colors). Day kcal bars use `--ok` green always. Neither is affected by this policy.

### 2c. Per-person themes (8)

Switching the active person updates `--accent` and `--accent-l` globally via `document.documentElement.style.setProperty()`. All theme-reactive elements respond automatically.

| ID | Name | --accent |
|---|---|---|
| coral | Coral | `#E84828` |
| terra | Terra | `#C45C3A` |
| sage | Sage | `#5A9B6A` |
| forest | Forest | `#2D7D52` |
| steel | Steel | `#4A7AB5` |
| cerulean | Cerulean | `#2B90C8` |
| plum | Plum | `#8B5A9E` |
| slate | Slate | `#5C7080` |

Each has a matching `--accent-l` at ~0.10 alpha for tinted surfaces.

### 2d. Dark mode

Toggle: `data-theme="dark"` on `<html>`. Surfaces invert (paper → near-black), foreground inverts, all tokens have dark-mode equivalents in `:root`. Semantic tokens (--err, --ok, --warn) shift to higher-luminance variants for legibility on dark surfaces.

---

## 3. Layout

### 3a. CSS variables

```css
--nav-h:    50px;
--pad:      40px;
--filter-h: 38px;
```

### 3b. Container widths

**Two width regimes:**

- **Index pages (Recipes, Pantry, Planner) and the dashboard** break out edge-to-edge. Full viewport width. No max-width container.
- **Forms, detail pages, settings, auth, onboarding** stay in `1100px max-width` centered with `64px` horizontal padding.

```css
.ed-container { max-width: 1100px; margin: 0 auto; padding: 0 64px; }
```

### 3c. Jump nav layout

Long-scroll pages (recipe detail, recipe form, pantry form, settings) use a fixed left jump nav.

```css
.rd-jump-nav {
  position: fixed;
  left: var(--pad);
  top: calc(var(--nav-h) + 48px);
  width: 140px;
  z-index: 50;
}
```

Content offsets right to clear the jump nav: `padding-left: 196px`.

**Rule:** any `position: fixed` rail must be a sibling of the scroll/content container, never a child. A parent `transform` (including CSS keyframe animations like `contentEnter`) creates a new containing block, breaking `position: fixed` — the element repositions relative to the transformed ancestor rather than the viewport. This applies to all fixed rails: recipe detail jump nav, Add Meal `.am-rail`, settings jump nav.

**Label format:** `01 PEOPLE`, `02 DAILY GOALS`, `03 INGREDIENTS`, etc. Bare numbered labels — no two-column descriptor pattern. (The landing's `01 · The Library / Pantry + Recipes` is a landing-page artifact and not imported into app pages.)

### 3d. Add Meal left rail (`.am-rail`)

Mirrors the jump nav pattern. Fixed left, aligns to the content eyebrow:

```css
.am-rail {
  position: fixed;
  left: var(--pad);
  top: calc(var(--nav-h) + 48px);  /* matches content padding-top */
  width: 140px;
  display: flex; flex-direction: column; align-items: flex-start;
}
```

**Underline hugs text width:** The active underline is on a nested `<span class="am-rail-label">` inside each button — not on the button itself. The button uses `align-items: flex-start` so it doesn't stretch to the full 140px rail width.

```css
.am-rail-label { border-bottom: 1.5px solid transparent; padding-bottom: 2px; }
.am-rail-item.is-active .am-rail-label { border-bottom-color: var(--fg); }
```

**Mobile:** `.am-rail { display: none }`. Replaced by a two-step picker (meal type list → recipe browser).

### 3d. App shell

```css
html, body { height: 100%; overflow: hidden; }
#nav  { position: fixed; top: 0; left: 0; right: 0; height: var(--nav-h); z-index: 200; }
#app  { position: fixed; inset: 0; top: var(--nav-h); }
```

---

## 4. Shape

The shape system has three tiers and they map to meaning, not aesthetics.

### 4a. Three tiers

| Shape | Token | Meaning | Examples |
|---|---|---|---|
| **Sharp** | `0px` (or no radius set) | Default. Everything that's interactive or structural that isn't an identity marker. | All buttons (primary, outlined, ghost), filter chips, tabs, tags, toolbar icon buttons, code blocks, file upload zones, info notes, prompt blocks, textareas, modals, cards, inputs (no radius needed — bottom-border only) |
| **Round** | `50%` | Identity markers only. | Avatar dots, person-switcher pills (JEN/GARTH/EVERYONE), theme color swatches, checkboxes, radios, fav/close circle icon-buttons, decorative dots in legends |
| **Pill** | `--radius-pill` (legacy) | **Reserved for very specific cases** — segmented controls in tab wrappers when a single rounded clip is needed. | Currently only persists on a few legacy surfaces; not the system default. New work uses sharp. |

The previous design system documented pill as the default for buttons and chips. **That is no longer true.** All buttons in the new system are sharp. Pills are a legacy holdover being mopped up; do not introduce new pill buttons.

**One locked exception: `.mob-sheet` top corners are 8px, hardcoded directly in CSS (no token).** Round signals the surface slid up from below rather than appeared. This is the only exception to the sharp-default rule. The token `--radius-xl` was removed in brief 2E — the value lives in the class, not in `:root`.

### 4b. Quick reference

```css
--radius-md:   0;    /* was 12px — sharp (Brief 2I) */
--radius-lg:   0;    /* was 16px — sharp (Brief 2I) */
--radius-pill: 0;    /* was 9999px — pill exceptions hardcode direct values (Brief 2I) */
```

`--radius-xl` was removed in brief 2E. Bottom sheet top corners are now hardcoded at 8px directly on `.mob-sheet` — see exception note below.

**Pill exceptions** — two locked classes hardcode `border-radius: 9999px` directly (not via token):
- `.hm-mob-person-chip` — identity pill, locked
- `.mob-filter-badge` — small count badge, locked

The app is now fully sharp. Setting `--radius-pill / --radius-md / --radius-lg` to `0` was done in Brief 2I.

---

## 5. Components

### 5a. Buttons

**One primitive: sharp black rectangle.** Sized to content. `padding: 8px 14px`. `border-radius: 0`. DM Mono 9px uppercase.

```css
.btn-primary {
  background: var(--fg);
  color: var(--bg);
  border: 1px solid var(--fg);
  border-radius: 0;
  padding: 8px 14px;
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 150ms var(--ease-out), transform 100ms var(--ease-out);
}
.btn-primary:hover  { opacity: 0.9; }
.btn-primary:active { transform: scale(0.98); }
```

**Outlined variant** (secondary, equal-weight, icon toolbar buttons):
```css
.btn-outline {
  background: none;
  color: var(--fg);
  border: 1px solid var(--rule);   /* warm grey, NOT black */
  border-radius: 0;
  /* same padding and font as primary */
}
.btn-outline:hover { border-color: var(--fg); }
```

The outlined border is `var(--rule)`. Not black. Black outline creates a visual tie with the filled button and makes them harder to rank.

**Ghost variant** (cancel, back, tertiary):
```css
.btn-ghost {
  background: none;
  border: none;
  color: var(--muted);
  /* same font, same padding */
}
.btn-ghost:hover { color: var(--fg); }
```

**Destructive variant** (Delete, Revoke):
- Outlined treatment in `var(--rule)` (NOT in `--err`)
- Text color `var(--fg)` or `var(--fg-2)`
- Red is reserved for semantic over-limit warnings, never destructive UI

**Active state for any interactive element:** `transform: scale(0.97)` to `0.98`. Never below `0.95`.

### 5b. Filter chips and toggles

```css
.filter-chip {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: none;
  border: none;
  color: var(--muted);
  padding: 8px 4px;
  position: relative;
  cursor: pointer;
}
.filter-chip:hover { color: var(--fg); }
.filter-chip.active {
  color: var(--fg);
}
.filter-chip.active::after {
  content: '';
  position: absolute;
  left: 4px; right: 4px; bottom: -2px;
  height: 1.5px;
  background: var(--fg);
}
/* Hit area expansion */
.filter-chip::before {
  content: '';
  position: absolute; inset: -10px -4px;
}
```

**Active state is a 1.5px underline directly below the text** — same treatment as top nav tabs. Not a fill, not a border, not a pill. The chip itself has no border, no radius, no background.

### 5c. Tabs (top nav, auth tabs, recipe detail)

```css
.tab {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 0 12px;
  background: none;
  border: none;
  position: relative;
  cursor: pointer;
}
.tab.active { color: var(--fg); }
.tab.active::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 1.5px;
  background: var(--fg);
}
```

The container row has `border-bottom: 1px solid var(--rule)`. Active tab's underline (1.5px black) sits exactly on top of the row's hairline.

**Baseline-anchored underlines (no jump rule).** Any toolbar text button that gains an active underline (GRID/LIST in `.ed-toggle`, COMPARE in `.cmp-mode-btn`) must reserve the underline's vertical space on the *base* state — `padding-bottom` plus a `border-bottom: 1.5px solid transparent`. The active state only changes `border-bottom-color`. Without this, activating the state pushes the text upward by the border's height. Buttons sharing a row must also share `line-height` so their underlines land on the same baseline (use the inherited ~1.2, not `line-height: 1`).

### 5d. Form inputs

Bottom-border only. No box, no fill, no radius.

```css
.input {
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--rule);
  padding: 6px 0;
  font: 400 13px var(--font-sans);
  color: var(--fg);
  outline: none;
  border-radius: 0;
}
.input:focus { border-bottom-color: var(--fg); }
.input::placeholder { color: var(--muted); opacity: 0.6; }

.label {
  display: block;
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}
```

**Focus suppression:** the global focus-visible ring is suppressed on inputs since they signal focus via the bottom border darkening to `var(--fg)`.

```css
input:focus-visible, textarea:focus-visible, select:focus-visible { outline: none; }
```

### 5e. Textarea (paste-notes pattern)

For long-form text input that displays alongside a read-only prompt block (e.g. "PASTE NOTES INSTEAD" on recipe detail), use the same container language as the prompt: left rule only, paper bg, sharp.

```css
.notes-textarea {
  width: 100%;
  background: none;
  border: none;
  border-left: 2px solid var(--rule);
  border-radius: 0;
  padding: 16px 0 16px 20px;
  font: 400 13px var(--font-sans);
  color: var(--fg);
  line-height: 1.7;
  resize: vertical;
  min-height: 400px;
  outline: none;
}
.notes-textarea:focus { border-left-color: var(--fg); }
.notes-textarea::placeholder { color: var(--muted); }
```

### 5f. Checkbox

```css
input[type="checkbox"] {
  appearance: none;
  width: 14px; height: 14px;
  border: 1.5px solid var(--rule);
  background: var(--bg);
  cursor: pointer;
  position: relative;
}
input[type="checkbox"]:checked {
  background: var(--fg);
  border-color: var(--fg);
}
input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 3.5px; top: 0.5px;
  width: 4px; height: 8px;
  border: 1.5px solid var(--bg);
  border-top: none; border-left: none;
  transform: rotate(45deg);
}
```

Checked state is **black, not accent.** Checkboxes are not identity markers.

### 5g. Toolbar icon buttons (cart, nutrition, filter, view toggles)

Text-label pattern (established by Briefs 2A and 2B). Sharp, `var(--fg-muted)` ink, no fill tile. Active state follows the underline rule (1.5px ink underline + ink text) — never filled black, never accent.

```css
.toolbar-text-btn {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-muted);
  background: none;
  border: none;
  border-bottom: 1.5px solid transparent;
  cursor: pointer;
  padding: 0;
}
.toolbar-text-btn.active {
  color: var(--fg);
  border-bottom-color: var(--fg);
}
```

**Locked pill exceptions:** `.hm-mob-person-chip` and `.mob-filter-badge` are the only two pill-shaped chrome elements. Both hardcode `border-radius: 9999px` directly — not via token. Everything else is sharp.

**Rule:** never use a stroke border on a toolbar icon button. Stroke = filter chip semantics.

### 5h. Modal / dialog

```css
.modal-overlay {
  position: fixed; inset: 0; z-index: 600;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.3);
  opacity: 0; pointer-events: none;
  transition: opacity 200ms var(--ease-out);
}
.modal-overlay.open { opacity: 1; pointer-events: auto; }

.modal {
  background: var(--bg);
  border: 1px solid var(--rule);
  border-radius: 0;
  width: 90%;
  max-width: 480px;
  overflow: hidden;
  transform: scale(0.97);
  opacity: 0;
  transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out);
}
.modal-overlay.open .modal { transform: scale(1); opacity: 1; }
```

- Never animate from `scale(0)` — start from `scale(0.97)`
- Always `overflow: hidden` on the modal container
- Close on overlay click + Escape key
- Sharp corners (legacy `--radius-lg` modals are being swept)

### 5i. Notification bar

Replaces toasts. Slim row below the nav. DM Mono 8px uppercase muted. Slides down from `height: 0` to `24px`. No floating notifications, no toast stacks.

---

## 6. Editorial patterns

These are the patterns that distinguish Good Measure from a generic app and rhyme with the landing.

### 6a. Bare eyebrow labels

Category labels like DESSERT, BREAKFAST, MAIN — and the landing's `§ PREMISE`, `§ METHOD`, `§ INVITATION` — are bare DM Mono labels. **No container, no border, no background, no padding.** Just the text.

```css
.eyebrow {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
```

The `§` prefix is a landing convention available to internal pages too (auth uses `§ Sign in`, `§ Create account`).

### 6g. Typographic glyphs (≡, §, →, ↗)

These glyphs are treated as typographic marks, not icons. They represent ideas, not objects. Allowed uses:

| Glyph | Use | Notes |
|---|---|---|
| `§` | Editorial section marker | Landing `§ PREMISE`, auth `§ SIGN IN` |
| `→` | Direction / forward action | CTAs, step transitions |
| `↗` | External / outbound link indicator | Links that open new contexts |
| `≡` | Bottom rail MENU control | 10×8px inline SVG, 1px strokes, `currentColor`. **Only here** — not as a general menu affordance elsewhere |

The `≡` hamburger is rendered as inline SVG (three horizontal strokes, `viewBox="0 0 10 8"`), never as a font icon or imported icon component. Color is `currentColor` so it inherits the button's `var(--fg)`. Gap between glyph and MENU label: 6px.

### 6b. Numbered section headers

Long-scroll pages use numbered section heads with hairline rules.

```css
.section-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 32px; }
.section-num  { font: 700 12px var(--font-sans); color: var(--rule); }
.section-title { font: 600 clamp(18px,1.8vw,26px) var(--font-sans); letter-spacing: -0.02em; color: var(--fg); }
.section-rule { flex: 1; height: 1px; background: var(--rule); }
```

`01`, `02`, `03`… in DM Sans 700, color `--rule` (so the number reads as muted typography, not as a heading number).

### 6c. Ruled rows

Recipe ingredients, instructions, settings rows, planner meal entries on mobile, pantry list rows — all use the same pattern.

```css
.ruled-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule);
}
```

No card, no background, no rounded corners. Just a hairline below.

### 6d. Ruled blocks (left rule)

For "this is a quoted block" content — MCP prompts, paste-notes textareas, info notes, anything that should read as set-apart but not as a card.

```css
.ruled-block {
  border-left: 2px solid var(--rule);
  background: none;
  border-radius: 0;
  padding: 16px 0 16px 20px;
}
```

Left rule only. No fill (paper bg shows through). No other borders. Sharp.

### 6e. Margin-note warnings

For status warnings that should flag but not shout — over-limit nutrition warnings on the planner, etc.

```css
.margin-note-err {
  border-left: 2px solid var(--err);
  background: none;
  border-radius: 0;
  padding: 4px 0 4px 12px;
  color: var(--err);
  font: 400 11px var(--font-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

Red color and red rule, no tinted fill. Reads as a flag, not an alert dialog.

**`--err-l` (tinted error fill)** is for inline semantic over-limit callouts where a light background fill is needed (e.g., a highlighted row). It is **not** for selection states — selection uses `var(--bg-2)`. Do not use `--err-l` to indicate that something is selected or active.

### 6f. Em accent — two distinct treatments

There are two separate `<em>` conventions. Do not confuse them.

**Sage accent `<em>` (landing, dashboard):**
```css
em { font-style: normal; color: var(--accent); }
```
Used on the landing (`actually`) and dashboard greeting (person name). Accent color, not italic. The color resolves to sage on auth/onboarding screens (no person selected yet) and adopts the active person's theme on in-app surfaces.

**Serif italic `<em>` (auth headlines only):**
```css
.auth-headline em {
  font-family: var(--serif-display); /* Instrument Serif */
  font-style: italic;
  color: inherit; /* inherits --fg, not --accent */
}
```
Used in the auth headlines only: *left off.* (Sign in) and *actually cook.* (Create account). These are Instrument Serif italic, black — not sage. The `<em>` markup is preserved ready for any future typeface swap; do not remove it even if the visual treatment changes.

---

## 7. Animation

### 7a. Easing

```css
--ease-out:        cubic-bezier(0.23, 1, 0.32, 1);   /* standard UI */
--ease-out-strong: cubic-bezier(0.22, 1, 0.36, 1);   /* emphasis */
```

- Never use `transition: all` — always specify properties
- Never use `ease-in` for UI — feels unresponsive
- Never animate from `scale(0)` — start from `0.97`

### 7b. Named keyframes

| Name | Use | Behavior |
|---|---|---|
| `contentEnter` | Page entry | opacity 0→1, translateY 14→0, 280ms |
| `cardIn` | Card grids | opacity 0→1, translateY 12→0, 350ms |
| `fadeIn` | Jump nav, dividers | opacity only |
| `sideIn` | Planner sidebar items | opacity 0→1, translateY 6→0, 280ms |
| `plannerColIn` | Day column headers | opacity only (no transform avoids stacking-context jog) |
| `evRowIn` | Everyone grid rows | opacity only |
| `scaleIn` | Onboarding checkmark | scale 0.7→1, opacity 0→1, 350ms |
| `arrowBob` | Scroll hint | translateY 0↔3px loop |
| `countTick` | Live values (kcal, nutrients) | opacity + translateY -4→0, 240ms; remount via `key={value}` on element |

### 7c. Stagger

Cards: CSS variable `--card-i` set inline, capped at index 8 (`min(var(--card-i,0), 8) * 30ms`).
Planner columns: `--col-i * 35ms + 30ms`.
Everyone rows: `--row-i * 70ms + 150ms`.
Sidebar items: `:nth-child` delays, 40ms steps.

### 7d. Durations (locked spec — Apr 28)

| Pattern | Duration | Easing | Notes |
|---|---|---|---|
| **Page enter** | 420ms | `var(--ease-out)` | opacity 0→1 + translateY 20→0. Class: `.animate-page-enter` |
| **Stagger reveal** | 360ms each row | `var(--ease-out)` | 80ms delay per item, max stagger window 320ms (cap at 4 items) |
| **Hairline reveal** | 320ms | `var(--ease-out)` | scaleX 0→1, transform-origin: left |
| **Sheet / modal** | 360ms | `var(--ease-out)` | translateY 100→0; backdrop opacity synced |
| **Press / tactile** | 280ms total | `var(--ease-out)` | scale 1→0.97→1 on click; transform transition is 100ms |
| **Counter tick** | 240ms | `var(--ease-out)` | opacity + translateY -4→0; fires on data change via `key={value}` to remount; class: `.animate-count-tick` |
| **Hover / focus / color shift** | 120ms | `var(--ease-out)` | Use `--motion-state` |
| **Buttons / toggles** | 280ms | `var(--ease-out)` | State transitions |

**Don't animate:** Color of body text, border-color of containers, anything > 600ms, anything that distracts from data.

**Always respect** `prefers-reduced-motion: reduce` — replace transitions with instant state changes; opacity fades only.

The single canonical easing: `cubic-bezier(0.23, 1, 0.32, 1)` (aliased as `--ease-out`). Never use `linear`, `ease-in-out`, or `ease-in` for UI transitions.

### 7e. Reduced motion

All animated elements must be covered:
```css
@media (prefers-reduced-motion: reduce) {
  /* All keyframe animations + transitions */
  animation: none !important;
  transition: none !important;
  opacity: 1 !important;
  transform: none !important;
}
```

### 7f. Motion language (full-screen editorial transitions)

Locks timing and easing for transitions between full-screen surfaces (Compare, Shopping list, Add Meal). Tokens live in `:root`:

```css
--motion-page-enter: 400ms cubic-bezier(0.0, 0.0, 0.2, 1);  /* ease-out */
--motion-page-exit:  280ms cubic-bezier(0.4, 0.0, 1, 1);    /* ease-in */
--motion-step:       320ms cubic-bezier(0.4, 0.0, 0.2, 1);  /* ease-in-out */
--motion-modal:      200ms cubic-bezier(0.0, 0.0, 0.2, 1);
--motion-state:      100ms linear;
```

**Page enters from right** (`--motion-page-enter`). Used for: Add Meal Step 1, Shopping list, Compare, any future full-screen editorial page. Transform `translateX(24px) → 0`, opacity `0 → 1`. Underlying page stays still.

**Step-to-step within a flow** (`--motion-step`). Used for: Add Meal Step 1 ↔ Step 2. Outgoing `translateX(0 → -16px)` + opacity `1 → 0`; incoming `translateX(16px → 0)` + opacity `0 → 1`; concurrent crossfade.

**Page exits** (`--motion-page-exit`). Any ← BACK from a full-screen page. Transform `translateX(0 → 24px)`, opacity `1 → 0`.

Implementation pattern for conditionally-mounted overlays (Shopping list, Add Meal): hold an `isClosing` boolean. The Back handler sets `isClosing = true`, which adds an `is-closing` class triggering the `pageExitRight` keyframe; a `setTimeout` matching `--motion-page-exit` (280ms) then unmounts. For always-mounted overlays toggled via an `.open` class (Compare), CSS transitions on `transform`/`opacity` handle exit naturally — no JS timer needed.

**Compare-strip slide-down** (260ms, `cubic-bezier(0.0, 0.0, 0.2, 1)`). When Compare mode is entered, the toolbar strip animates `height: 0 → 36px` + opacity to avoid the row "jumping" into existence. This is in-page chrome appearing — uses its own `stripIn` keyframe rather than `--motion-page-enter`.

**Confirmation modals** (`--motion-modal`). Transform `translateY(8px → 0)`, opacity `0 → 1`. Background dim runs in parallel.

**In-page state changes** (`--motion-state`). Grid↔List, sort direction, filter chips, tab switches. Opacity only — no transform.

**Static elements that never animate**: wordmark, anchor row chrome, navigation.

Use Framer Motion (package `motion`) for entrance/exit on full-screen pages; CSS transitions for in-page state changes and modals. Reduced-motion: collapse all transforms to opacity-only fades — do not skip the transition entirely.

---

## 8. Specific page patterns

### 8a. Auth (split layout)

**Grid:** `grid-template-columns: 1fr 1px 1fr`. The centre column is an explicit `<div class="auth-divider" />` element — full-height `background: var(--rule)`. This is a structural element in the grid, not a `border-right` on the editorial panel. The two content columns are equal (`1fr` each).

**Editorial left** (`justify-content: center`): `§ SIGN IN` / `§ CREATE ACCOUNT` eyebrow → DM Sans 700 headline (clamp 40–60px, -0.035em) with Instrument Serif italic `<em>` → DM Sans 14px lede. Both columns `padding: 48px 56px`.

**Form right** (`justify-content: center`): SIGN IN / CREATE ACCOUNT tab toggle (active 1.5px underline) → bottom-border-only fields → sharp black CTA → OR divider → outlined Google SSO button.

**Top nav** (`.auth-nav`): wordmark `Good Measure` (DM Sans 700 14px) left, `← Back` mono link right.

**Headline `<em>` treatment**: Instrument Serif italic, `color: inherit` (black). *Not* the sage accent — see §6f.

Sign in: Email + Password (with right-aligned `Forgot` link).
Create account: Name + Email + Password + Confirm password.

**Mobile (≤760px):** Stacks vertically. `auth-left` gets `border-bottom: 1px solid var(--rule)`. `.auth-divider { display: none }`.

Routes: `/login` → Sign in. `/login?signup=1` → Create account. `/login?invite=<token>` → Create account preserving invite flow.

### 8b. Onboarding wizard

Full-screen, editorial register (`data-register="editorial"`, cream bg). No main app nav.

**Topbar (`.ob-topbar`):** `Good Measure` wordmark (`.ob-topbar-wm` — DM Sans 700, 18px, -0.02em) left; step counter (`.ob-topbar-right` — DM Mono 9px, 0.14em, muted) right. Hairline below. No `§ ONBOARDING` label — it is redundant with both the step counter and the body eyebrow.

**Step counter values:**

| Step | Topbar right |
|---|---|
| Welcome (step 0) | `WELCOME` |
| Profile (step 1) | `STEP · 01 / 03` |
| Household (step 2) | `STEP · 02 / 03` |
| Goals (step 3) | `STEP · 03 / 03` |
| Complete (step 4) | `READY` |

**Steps:**

| Step | Eyebrow | Title | Content |
|---|---|---|---|
| Welcome | `§ WELCOME` | Measure what matters. | Subtitle + Get Started → |
| Profile | `§ YOUR PROFILE` | Your profile. | Name input + 8 theme swatches (round) |
| Household | `§ YOUR HOUSEHOLD` | Your household. | Name input + member list + invite links |
| Goals | `§ DAILY GOALS` | Your goals. | 4 goal preset cards |
| Complete | `§ READY` | You're all set. | Go to Dashboard → |

**Bookend pages (Welcome, Complete)** are content-only — no wordmark or icon in the body. The topbar wordmark is the only brand moment. The center wordmark and check icon were removed (April 30, 2026) as visual clutter.

The voice and typography of onboarding are still being aligned with the landing. **A copy + typography pass is pending.**

### 8c. Dashboard (home)

Edge-to-edge full viewport, no max-width container.

- Hero: time-aware greeting "Good morning," + person name (in `--accent`). DM Sans 500, `font-size: 11.5vw`, `line-height: 0.91`.
- Stats strip: 3 user-configurable nutrition stats. Each = label (DM Mono 8px) + value (DM Sans 28px tabular-nums) + subtitle + 2px progress bar.
- Today's Meals: 4-column grid (Breakfast, Lunch, Dinner, Snacks).
- This Week: 7-column strip; today's column tinted `--accent-l` full-height.

Stats configurable in Settings → Dashboard. Stored in `localStorage('dashboard-stats')`. Canonical display order: calories → fat → sat-fat → sodium → carbs → sugar → protein → fiber.

### 8d. Planner

Edge-to-edge full viewport.

- Toolbar: date range, prev/next, `THIS WEEK`, cart icon, `+ NEW PLAN` (sharp black), edit, nutrition, person chips
- Week grid: 7 columns, today's column tinted `--accent-l`
- Meal entries: ruled rows. Eyebrow (DINNER, LUNCH, etc.) → meal name (DM Sans) → kcal (mono). No card backgrounds, no rounded tiles.
- Day kcal progress bar under each day number. Bar is always `--ok` green (or `--accent-btn` for today/selected); no semantic color state.
- Sidebar (open via NUTRITION ›): hero kcal number + ruled nutrient rows (neutral `--muted` fill, `--err` red only for over-limit bars) + callout rows: `.err-chip` tinted for over-limit, `.warn-chip` plain ruled row for below-min. See §2e for the full nutrition panel color policy.

### 8e. Recipes (list and grid)

Edge-to-edge. Toolbar: count + COMPARE + sort (NAME ▾ + ↑/↓ separate elements, 10px gap) + GRID/LIST + search (no magnifier icon, hairline underline only) + `+ NEW` (sharp black).

- List view: ruled rows. Thumbnail + recipe name + category eyebrow + 4-value nutrition scan (kcal · fat · carbs · prot).
- Grid view: 4-column ruled cells. Image + name + category eyebrow. Ghost-tile placeholder (no image) bottom-left aligned, never centered. No nutrition values — photo-first visual library.

Filter chips at top: All / Breakfast / Lunch / Dinner / Side / Snack / Dessert / Beverage / Favorites. Active state = 1.5px underline below text.

### 8f. Recipe detail

1100px container, left jump nav (`01 INGREDIENTS / 02 NUTRITION / 03 INSTRUCTIONS / 04 OPTIMIZATION / 05 MEAL PREP`).

- DESSERT label = bare eyebrow (no box)
- Title in DM Sans 700 large display
- Action buttons (Edit / Duplicate / Delete) all sharp outlined
- Two-column Ingredients / Nutrition layout
- Numbered instructions with muted row numbers
- Optimization & Meal Prep sections use ruled blocks (left rule, no fill) for the prompt + sharp black `COPY PROMPT` button + ghost `PASTE NOTES INSTEAD` link
- Paste-notes textarea matches prompt block container (left rule, no fill, sharp)

### 8g. Pantry (list and grid)

Edge-to-edge. Toolbar matches recipes pattern.

- List view: ruled rows. Ingredient name + category eyebrow + 4-value nutrition.
- Grid view: 4-column ruled cells with hairlines (`nth-child(4n+1)` gets left border). Each cell shows full 8-value nutrition table.

### 8h. Mobile bottom rail

Mobile-only persistent chrome at the bottom of every page (hidden on `/onboarding` and auth routes).

**Locked spec:**

| Property | Value |
|---|---|
| Height | 44px |
| Background | `var(--bg)` |
| Border-top | `1px solid var(--fg)` — **locked exception** (see note below) |
| Left slot | `≡ MENU` control: inline SVG glyph (10×8px, 1px strokes, `currentColor`) + 6px gap + "MENU" label |
| MENU label | DM Mono 9px, 0.14em letter-spacing, uppercase, `var(--fg)` |
| Right slot | Adapts per page — see three variants below |
| Right slot text | DM Mono 9px, 0.14em letter-spacing, uppercase, `var(--muted)` |

**Right slot variants (per 2D.2):**

| Context | Display |
|---|---|
| Parent screens (Home, Planner, Recipes, Pantry, Settings) | Section name: `HOME`, `PLANNER`, `RECIPES`, `PANTRY`, `SETTINGS` |
| Shopping (`/shopping`) | `SHARE` — tapping dispatches the share event |
| Add Meal (`/meal-plans/add-meal`) | `TUE, APR 28 · JEN` — date and person from URL params |

**Locked exception — heavier border:** The rail's `border-top` is `1px solid var(--fg)` while all content hairlines are `1px solid var(--rule)` (or `0.5px`). This deliberate inconsistency signals "below this is chrome, above is content." Do not normalize it back to `var(--rule)`. This is documented alongside the `.mob-sheet` 8px radius as the two locked chrome exceptions in this design system.

**Menu sheet** (opened by tapping MENU): Full-screen overlay. Nav items at 36px DM Sans sentence case — this is content register because the sheet is an overlay surface, not chrome. Items: Home, Planner, Recipes, Pantry, Shopping, Settings + hairline divider + Sign out (same 36px weight, sentence case). Tapping any item navigates and dismisses. Sign out triggers `dialog.confirm` before signing out.

### 8i. Settings

1100px container, left jump nav (`01 PEOPLE / 02 DAILY GOALS / 03 DASHBOARD / 04 MCP INTEGRATION / 05 DATA`).

Section headings DM Sans 700 large. Each section has hairline rule below. People section uses round avatar dots + theme swatch row. Daily Goals has JEN/GARTH person scope selector (active = black fill). MCP section has the example prompt blocks using ruled-block treatment. Tan containers (`--bg-2`) used for code blocks and file upload zones with sharp corners.

---

## 9. Accessibility

### 9a. Focus

```css
:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
input:focus-visible, textarea:focus-visible, select:focus-visible { outline: none; }
```

Focus rings are **black**, not accent. Per the color rule (§2b).

### 9b. Semantic HTML

- Active nav links: `aria-current="page"`
- Icon-only buttons: `aria-label`
- Decorative SVGs: `aria-hidden="true"`
- Non-button clickable elements: `role="button"` + `tabindex="0"` + keyboard handler
- Jump nav links: `<a href="#section">` with `event.preventDefault()` for keyboard activation without native scroll

### 9c. Hit areas

Minimum 44×44px on mobile. Achieved via `::before` pseudo-element with `position: absolute; inset: -Npx;` for buttons that visually appear smaller.

### 9d. Type minimums

9px is the floor. 7px and 8px are below iOS legibility minimums and are not used anywhere in the app.

---

## 10. CSS conventions

### 10a. No inline styles for visual properties

Visual CSS — color, background, padding, border-radius, font, typography — must live in CSS classes in `globals.css`. Never `style={{ }}` for visuals.

**Allowed inline:** positional or dynamic layout (e.g. `style={{ marginTop: dynamicOffset }}`, `style={{ width: computedWidth }}`).

**Test:** if the property would look wrong copy-pasted to a different element, it belongs in a class.

### 10b. No hardcoded hex values

Never hardcode hex in JSX. This breaks theme-switching since hex won't update when the person theme changes.

Common violations to avoid:
- `hover:bg-[#2d6040]` → use `hover:opacity-80` or `hover:opacity-90` (theme-safe)
- `text-[#ef4444]` → use `text-[var(--err)]`
- `background: '#3A7A4E'` → use `background: 'var(--accent)'`

Use `opacity` or `brightness` for hover states that need to respond to theme. The only exception is structural rgba values like `rgba(0,0,0,0.05)` for outlines.

### 10c. No fixed pixel radius values

Every `border-radius` in `globals.css` must use `0`, a CSS variable token, or `50%` (circles). No hardcoded `4–20px` radius values.

**Exception:** `.mob-sheet { border-radius: 8px 8px 0 0 }` is the documented locked exception. It is hardcoded by design (brief 2E, Approach B — token `--radius-xl` was removed because a single-use value doesn't earn a token).

### 10d. Class prefixes

| Prefix | Scope |
|---|---|
| `ed-` | Global editorial system |
| `pl-` | Planner |
| `wk-` | Planner week grid |
| `ev-` | Everyone view |
| `rcp-` / `rd-` | Recipe cards / detail |
| `rg-` | Recipe grid |
| `pt-` / `pf-` | Pantry card / form |
| `hm-` | Home / dashboard |
| `mob-` | Mobile sheets / toolbar |
| `shop-` | Shopping list |
| `set-` | Settings |
| `ob-` | Onboarding |
| `auth-` | Auth screens |

---

## 11. Active state convention (locked by Brief 2G)

Active state for any toggle, chip, or selector — across desktop and mobile — is a 1.5px ink underline below the label, with text color shifted from muted (`var(--fg-muted)`) to ink (`var(--fg)`). No background fill, no border change, no accent color.

**Filled black** (`background: var(--fg); color: var(--bg)`) is reserved for the single primary commit per task context. A page can host multiple task contexts (the recipes page hosts the recipe library AND, conditionally, the compare flow). Each task context gets its own primary commit. Examples: SAVE GOALS, CONTINUE, SIGN IN, APPLY, COMPARE-when-armed.

**Accent colors** (`var(--cta)`, person colors) are never used to indicate toggle state. Accent is identity-only (whose theme this is, whose data this is).

**Layout shift prevention.** Active toggle chips must reserve `border-bottom: 1.5px solid transparent` in their inactive state. Only the border color changes when the chip becomes active. Classes that follow this rule: `.mob-sheet-chip`, `.mob-sheet-sort-btn`, `.set-person-chip`, `.scale-chip`, `.set-mob-jump-btn`, `.pl-person-chip`, `.pl-nut-chip`, `.pl-add-filter-chip`, `.auth-tab`, `.add-meal-chip`.

**Inter-chip gap:** `24px` desktop, `16px` mobile, applied at the chip-group container level. Use `display: flex; flex-wrap: wrap` — not grid with equal-width cells (grid forces underlines wider than their labels).

---

## 11a. Sort field convention (locked by Brief 2G.2)

Sort field controls use a single tap target per field. The active field shows a continuous underline running under both the label and an appended direction arrow (`↑` or `↓`). Tapping the active field flips the arrow. There is no separate Ascending/Descending control.

```jsx
<button
  className={`mob-sheet-sort-btn${sortBy === field ? " active" : ""}`}
  onClick={() => handleMobSortField(field)}
>
  {label}
  {sortBy === field && <span className="mob-sheet-sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span>}
</button>
```

The `mob-sheet-sort-arrow` has `margin-left: 0.4em` and sits inline so the underline covers both label and arrow as a single continuous stroke.

---

## 11b. Locked rules table

| Rule | Description | Locked in |
|------|-------------|-----------|
| Active toggle state | 1.5px ink underline + ink text on `var(--fg-muted)` baseline. Never filled black. Never accent color. Reserved transparent border in inactive state. | Brief 2G, 2G.2 |
| Primary commit | Filled black, one per task context. A page may host multiple task contexts. | Brief 2G |
| Sort field interaction | Active field shows direction arrow inline with continuous underline. No separate direction row. | Brief 2G.2 |
| Chip group spacing | `24px` desktop, `16px` mobile, flex-wrap not grid. | Brief 2G.1 |
| Selected card ring | `box-shadow: inset 0 0 0 2px var(--fg)` — inset so ring stays inside each card's box, no gutter interaction between adjacent selected cards. | Brief 2H.3 |
| Sharp default | Everything 0 radius except `.mob-sheet` top corners (8px hardcoded) and two identity pills (`.hm-mob-person-chip`, `.mob-filter-badge`). | Brief 2I |

---

## 12. "One change" rules

Decisions implemented as single-source variables so the whole app updates from one edit.

| Change | Where to edit |
|---|---|
| Background color | `:root { --bg: ... }` |
| Accent (sage default) | `:root { --accent: ... }` (theme-reactive at runtime via JS) |
| Body / mono font | `:root { --font-sans / --font-mono }` |
| Nav height | `:root { --nav-h: 50px }` |
| Page max-width | `.ed-container { max-width: ... }` |
| Page horizontal padding | `.ed-container { padding: 0 64px }` |
| Easing curve | `:root { --ease-out: ... }` |
| Make all corners sharp | Done in Brief 2I. `--radius-pill / --radius-md / --radius-lg` are all `0`. `.mob-sheet` retains `8px 8px 0 0` (locked exception). Two identity pills hardcode `9999px` directly. |
| Minimum type size | 9px (floor; never use 7 or 8) |
| Wordmark text | One `<BrandName />` component |

---

## 12. What this system does NOT include

By deliberate decision, the design system has no:

- **Page header component** (Dashboard's "Good morning, Jen" is the only h1 moment in the app; index pages open directly into content)
- **Toasts** (replaced by the notification bar below the nav)
- **Grain overlay** (was 3% opacity SVG, removed for being imperceptible)
- **Card shadows on most surfaces** (legacy holdover; new work uses hairlines + paper bg)
- **Heart favorite icons** (removed)
- **DESSERT-style category boxes** (removed; bare eyebrows replace them)
- **Coral primary CTAs** (replaced with black per the color rule)
- **Pill segmented controls** (replaced with baseline-underline tabs)
- **Bricolage Grotesque** (was never rendering; swept; DM Sans is the only sans-serif)
- **DM Serif Display** (legacy; not in use anywhere)

If you find any of these in the code, they're stragglers to be swept.

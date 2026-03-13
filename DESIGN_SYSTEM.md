# Jen's Design System

A minimalist, monochrome design system built for clarity, focus, and timeless aesthetics. Sharp edges, generous whitespace, and restrained typography create interfaces that feel precise and intentional.

---

## Philosophy

- **Reduction over addition** — Remove until it breaks, then add back one element
- **Typography is the interface** — Let text hierarchy do the heavy lifting
- **Monochrome confidence** — Color is a tool, not a decoration
- **Sharp precision** — No rounded corners; edges communicate intention
- **Whitespace as structure** — Breathing room guides the eye

---

## Color Tokens

### Core Palette (Light Mode - Default)

| Token         | Value     | Usage                                      |
|---------------|-----------|-------------------------------------------|
| `--bg`        | `#ffffff` | Page/card backgrounds                      |
| `--fg`        | `#000000` | Primary text, icons, borders               |
| `--rule`      | `#e8e8e8` | Dividers, subtle borders                   |
| `--muted`     | `#767676` | Secondary text, labels                     |
| `--faint`     | `#999999` | Tertiary text, disabled states             |
| `--acc`       | `#000000` | Accent/action color (matches fg in mono)   |
| `--mid`       | `#666666` | Body text, descriptions                    |
| `--placeholder` | `#aaaaaa` | Input placeholders                       |

### Semantic Colors

| Token       | Value     | Usage                    |
|-------------|-----------|--------------------------|
| `--warning` | `#c08000` | Warning states           |
| `--error`   | `#c03030` | Error states, destructive|
| `--success` | `#2a7a2a` | Success states           |

### Dark Mode (Slate Palette)

Apply with `data-palette="slate"` on `<html>` or `<body>`:

| Token    | Value     |
|----------|-----------|
| `--bg`   | `#18191c` |
| `--fg`   | `#eceae6` |
| `--rule` | `#333538` |
| `--muted`| `#888480` |
| `--faint`| `#555555` |
| `--mid`  | `#b0ada9` |

### Accent Palettes (Optional)

For occasional color variants, apply `data-palette="pink"` or `data-palette="blue"`:

**Fl. Pink:** `--fg: #e8187c` — energetic, bold accents  
**Lake Blue:** `--fg: #0f4c96` — calm, professional accents

---

## Typography

### Font Stack

| Role      | Family    | Weights       | CSS Variable   |
|-----------|-----------|---------------|----------------|
| Display   | DM Sans   | 300, 400, 500, 600 | `--sans` |
| Body/Mono | DM Mono   | 300, 400, 500      | `--mono` |

### Type Scale

| Token        | Compact | Relaxed | Usage                        |
|--------------|---------|---------|------------------------------|
| `--fs-title` | 16px    | 18px    | Page titles                  |
| `--fs-field` | 14px    | 16px    | Form inputs, large text      |
| `--fs-label` | 12px    | 14px    | Section headers, labels      |
| `--fs-body`  | 11px    | 13px    | Body text, descriptions      |
| `--fs-action`| 9px     | 10px    | Buttons, navigation          |
| `--fs-ui`    | 10px    | 11px    | Small UI elements            |

Use `data-density="relaxed"` for the larger scale.

### Typography Patterns

```css
/* Page Title */
.page-title {
  font-family: var(--sans);
  font-size: var(--fs-title);
  letter-spacing: 0.02em;
  font-weight: normal;
  color: var(--fg);
}

/* Section Label */
.section-label {
  font-family: var(--sans);
  font-size: var(--fs-label);
  letter-spacing: 0.04em;
  color: var(--fg);
}

/* Action Text (Buttons, Links) */
.action-text {
  font-family: var(--sans);
  font-size: var(--fs-action);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Body Text */
.body-text {
  font-family: var(--mono);
  font-weight: 300;
  font-size: var(--fs-body);
  line-height: 1.6;
  color: var(--mid);
}

/* Uppercase Labels */
.label-text {
  font-size: var(--fs-action);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
```

---

## Spacing

Use a consistent 4px base unit:

| Name   | Value | Usage                        |
|--------|-------|------------------------------|
| `xs`   | 4px   | Tight gaps, icon padding     |
| `sm`   | 8px   | Inline spacing               |
| `md`   | 12px  | Component padding            |
| `lg`   | 16px  | Section gaps                 |
| `xl`   | 24px  | Large section spacing        |
| `2xl`  | 32px  | Page-level spacing           |
| `3xl`  | 48px  | Major section breaks         |

---

## Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--fg);
  border: 1px solid var(--fg);
  font-family: var(--sans);
  font-size: var(--fs-action);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--bg);
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary:hover {
  background: var(--bg);
  color: var(--fg);
}
```

#### Ghost Button
```css
.btn-ghost {
  background: none;
  border: none;
  font-family: var(--mono);
  font-size: var(--fs-action);
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.1s;
}

.btn-ghost:hover {
  color: var(--fg);
}
```

#### Pill Toggle
```css
.btn-pill {
  padding: 5px 12px;
  background: var(--bg);
  border: 1px solid var(--rule);
  font-family: var(--sans);
  font-size: var(--fs-action);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}

.btn-pill.active {
  background: var(--fg);
  border-color: var(--fg);
  color: var(--bg);
}
```

### Form Elements

#### Text Input
```css
.input-field {
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--rule);
  font-family: var(--sans);
  font-size: var(--fs-field);
  color: var(--fg);
  padding: 6px 0 10px;
  outline: none;
}

.input-field:focus {
  border-bottom-color: var(--fg);
}

.input-field::placeholder {
  color: var(--placeholder);
}
```

#### Textarea
```css
.textarea-field {
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--rule);
  font-family: var(--mono);
  font-weight: 300;
  font-size: var(--fs-body);
  color: var(--fg);
  padding: 8px 0 10px;
  resize: none;
  line-height: 1.6;
}
```

### Cards

```css
.card {
  border: 1.5px solid #ddd;
  padding: 16px;
  background: var(--bg);
  cursor: pointer;
  transition: border-color 0.15s;
}

.card:hover {
  border-color: #999;
}

.card.selected {
  border-color: var(--fg);
}
```

### Navigation

```css
.nav-tab {
  background: none;
  border: none;
  font-family: var(--mono);
  font-size: var(--fs-action);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.1s;
}

.nav-tab:hover {
  color: var(--mid);
}

.nav-tab.active {
  color: var(--fg);
}
```

### Sections

```css
.section {
  margin-bottom: 44px;
}

.section-rule {
  height: 1px;
  background: #bbb;
  margin-bottom: 14px;
}
```

### Progress Bars

```css
.progress-track {
  height: 1px;
  background: var(--rule);
  position: relative;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--fg);
}
```

---

## Layout Principles

### Grid System
- Use CSS Grid for complex 2D layouts
- Use Flexbox for single-axis alignment
- Default gap: `16px` (lg)
- Maximum content width: `1200px`

### Sidebar Pattern
```
┌─────────────────────────────────────────┐
│ ┌────────┐ ┌─────────────────────────┐  │
│ │        │ │                         │  │
│ │  NAV   │ │        CONTENT          │  │
│ │ 200px  │ │       flex: 1           │  │
│ │        │ │                         │  │
│ └────────┘ └─────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Spacing Rhythm
- Page padding: `32px`
- Section spacing: `44px`
- Component gaps: `16px`
- Inline spacing: `8px`

---

## Animations

### Transitions
- **Default duration:** `0.15s`
- **Easing:** `ease` or `cubic-bezier(0.4, 0, 0.2, 1)`
- **Properties:** `color`, `border-color`, `background`, `opacity`

### Keyframes
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Accessibility

### Focus States
```css
*:focus-visible {
  outline: 1px solid #999;
  outline-offset: 2px;
}
```

### Skip Link
```css
.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  position: fixed;
  top: 8px;
  left: 8px;
  background: var(--bg);
  padding: 8px 16px;
  border: 1px solid var(--rule);
}
```

### Color Contrast
- All text meets WCAG 2.1 AA standards
- `--fg` on `--bg`: 21:1 contrast ratio
- `--muted` on `--bg`: 4.54:1 (meets AA for large text)

---

## Implementation Checklist

When building new pages/components:

- [ ] Use CSS variables for all colors (`var(--fg)`, not `#000`)
- [ ] Apply typography classes (`.page-title`, `.body-text`, etc.)
- [ ] Use component classes (`.btn-primary`, `.card`, etc.)
- [ ] Maintain 0px border-radius on all elements
- [ ] Use 1px borders, not shadows
- [ ] Apply proper spacing rhythm (4px base)
- [ ] Include focus-visible states
- [ ] Test in both light and slate palettes

---

## File Structure

```
/app
  globals.css        # Design tokens + component classes
  layout.tsx         # Font setup, theme provider
  
/components
  *.module.css       # Component-specific styles using tokens

tailwind.config.ts   # Tailwind integration with design system

DESIGN_SYSTEM.md     # This file
```

---

*Last updated: March 2026*

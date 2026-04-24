# BRIEF-02 · Bricolage Grotesque removal

## Why

Per `design-system.md`, Bricolage Grotesque was "removed (April 2026) — it was never rendering due to a broken CSS variable chain; everything was already DM Sans." However, the design system doc still references Bricolage in several places:
- Recipe detail section numbers
- Onboarding complete screen title
- Several other utility classes

Since Bricolage is not actually rendering (the broken chain falls through to DM Sans), leaving it in the code is dead weight that creates confusion and risk. Future edits might accidentally fix the chain and suddenly the font appears everywhere. Clean it out fully.

## Intent

Remove all traces of Bricolage Grotesque from the codebase. All type that was nominally set in Bricolage is already effectively DM Sans, so rendered output should be identical before and after this change. Just clean code.

## Scope

**In scope:**
- `font-family` declarations referencing `Bricolage`, `bricolage`, `'Bricolage Grotesque'`
- CSS variables like `--font-display`, `--display` if they point to Bricolage
- Google Fonts `<link>` tags loading Bricolage
- `tailwind.config.js` font family entries
- Any `font-serif` class mapping if `font-serif` was being used to reach Bricolage
- Any `.display` or `.heading-display` utility classes that set font-family to Bricolage

**Out of scope:**
- Anything using DM Sans directly (that's the right font, leave it)
- The letter-spacing, font-size, line-height, letter-spacing on elements that were using Bricolage — those typographic settings stay; only the font-family changes (from Bricolage to DM Sans)

## Specific changes

### 1. Find all references

```bash
grep -ri "bricolage" --include="*.css" --include="*.tsx" --include="*.ts" --include="*.js" --include="*.html" .
```

Expected hits:
- `globals.css` or equivalent: font-family declarations
- `tailwind.config.js`: `fontFamily` entry
- `layout.tsx` / root: Google Fonts `<link>` tag
- Possibly `design-system.md` (docs only — leave these; they'll be updated separately)

### 2. Update the font variable system

If there's a `--font-display` or `--display` CSS variable currently pointing to Bricolage:

```css
/* Before */
:root {
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
  --font-display: 'Bricolage Grotesque', 'DM Sans', sans-serif;  /* fallback was firing */
}

/* After */
:root {
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
  /* Display removed — DM Sans covers display weights too */
}
```

Every rule that referenced `var(--font-display)` should now reference `var(--font-sans)` instead. Or — preferred — remove the `font-family` declaration entirely and let it inherit from the root, which is already DM Sans.

### 3. Update Tailwind config

```js
// Before
fontFamily: {
  sans: ['DM Sans', 'sans-serif'],
  mono: ['DM Mono', 'monospace'],
  serif: ['Bricolage Grotesque', 'DM Sans', 'sans-serif'],   // maps to Bricolage
}

// After
fontFamily: {
  sans: ['DM Sans', 'sans-serif'],
  mono: ['DM Mono', 'monospace'],
  serif: ['DM Sans', 'sans-serif'],   // explicit; keeps the class working for backwards-compat
}
```

**Important:** keep the `serif` key in the Tailwind config even after removing Bricolage, because there are `font-serif` class usages in the codebase (per design-system.md) that are "intentionally kept as-is." Just point `font-serif` to DM Sans. Don't delete the key.

### 4. Remove the Google Fonts link

In the root layout (likely `app/layout.tsx`):

```tsx
// Before
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

// After
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

Just remove the `Bricolage+Grotesque:wght@...&` segment from the URL.

### 5. Clean up any remaining references

Some places in the code may have inline `font-family: 'Bricolage Grotesque'` declarations (not using variables). Search for and replace these with DM Sans or remove the declaration entirely (letting it inherit).

Examples from `design-system.md` that may need updating in actual CSS files:
- `.rd-sec-n` (recipe detail section numbers)
- `.ob-complete-title` (onboarding complete title)
- `.auth-logo` (auth screen logo)
- Any class using `font: 700 12px 'Bricolage Grotesque'` or similar shorthand

## Verification

1. **Grep check:** `grep -ri "bricolage" --include="*.css" --include="*.tsx" --include="*.ts" --include="*.js" --include="*.html" .` should return zero results (excluding `.md` docs).

2. **Visual check:** Load every page that was referenced in design-system.md as using Bricolage:
   - Recipe detail → section numbers should look unchanged
   - Onboarding → complete screen title should look unchanged
   - Auth → logo should look unchanged
   
   All of these should render identically to before because they were already falling through to DM Sans. If anything looks *different*, that's a sign the previous broken chain was actually doing something unexpected — flag it and investigate before committing.

3. **Performance check:** The Google Fonts network request should now only load DM Sans and DM Mono families. The Bricolage font file should not be in network tab.

## Commit message

```
design: remove Bricolage Grotesque font references

Bricolage was never rendering — the CSS variable chain was
broken and every instance was falling through to DM Sans.
Cleaned up all references across CSS, Tailwind config, Google
Fonts link, and component styles. Visual output unchanged.

Kept `font-serif` as a Tailwind alias for DM Sans to preserve
backwards compatibility with existing classes in the codebase.

Part of the app/landing alignment work. See APP-INVENTORY.md.
```

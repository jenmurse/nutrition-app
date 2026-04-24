# BRIEF-01 · Background color — white to paper

## Why

The app currently uses a white `#FFFFFF` background. The landing page uses a warm paper `#F5F4EF` background. This single change is the largest-impact, lowest-risk move we can make to align the app visually with the landing. On paper, the existing typography reads as editorial. On white, the same typography reads as SaaS.

## Intent

Globally replace the app's background color with the landing's paper color. Every page should inherit automatically.

## Scope

**In scope:**
- Every page's base background
- All secondary surfaces that currently use white or near-white (card backgrounds, modal backgrounds, input backgrounds if they're white)
- Any CSS variable that defines the app background

**Out of scope:**
- Person theme colors (don't touch)
- Accent colors (handled separately in BRIEF-03)
- Text colors (don't touch — they should work on paper just as well as on white)
- Fonts (handled in BRIEF-02)
- Any dark-mode styles (if they exist — leave them alone)

## Specific changes

### 1. Locate the background CSS variable

Look in `globals.css` (or wherever the design tokens live — likely `styles/`, `app/globals.css`, or imported from `design-system.md` notes) for the variable that controls the app background.

Per project knowledge (`design-system.md`), the relevant variables are:
- `--bg` — primary background
- `--bg-2` — secondary background (for subtle surfaces)

### 2. Update the values

```css
/* Before (current) */
:root {
  --bg: #FFFFFF;      /* or similar white value */
  --bg-2: #FAFAFA;    /* or similar near-white */
}

/* After (target) */
:root {
  --bg: #F5F4EF;      /* paper — matches landing */
  --bg-2: #EFEDE6;    /* subtly darker paper for layered surfaces */
}
```

**Notes on the values:**
- `#F5F4EF` is the exact value used in `landing-direction-v5.html` and should be used here verbatim.
- `#EFEDE6` is a suggested `--bg-2` — slightly darker than `--bg` so layered surfaces (cards, form backgrounds) still have visual separation against the page. If the current `--bg-2` is already darker than `--bg` by about that ratio, preserve the relationship but on the paper base.

### 3. Check for hardcoded whites

Grep the codebase for:
- `background: white` / `background-color: white`
- `background: #fff` / `background: #ffffff` (case-insensitive)
- `bg-white` (Tailwind class)

For each occurrence, decide:
- If it's a base surface (page bg, card bg, modal bg): change to `var(--bg)`
- If it's explicitly a white overlay on top of a photo or something contextual: leave it alone
- If it's an input's fill color: change to `var(--bg)`

### 4. Check the grain overlay

Per `design-system.md`, there's an SVG `fractalNoise` grain overlay. Verify it's still present and renders correctly on the new paper background. The grain should be visible but subtle — if it was calibrated against white, it may need to be slightly darker on paper. If you're unsure, leave the grain values alone; visual check can fix later.

## Verification

1. **Visual check:** Load the app. Every page should now be on warm paper `#F5F4EF`, not white. No page should be jarringly white anywhere except in the rare case of a photograph/image or an explicit white-on-purpose element (unlikely).

2. **Grep check:** `grep -ri "background.*#fff" app/` and `grep -ri "bg-white" app/` should return minimal results, and each remaining result should have an intentional reason.

3. **Side-by-side with landing:** The app's bg should now match `landing-direction-v5.html` exactly. If you have both open, there should be no perceptible difference in the base page color.

## Commit message

```
design: switch app background from white to paper (#F5F4EF)

Matches the landing page's editorial register. Every surface that
was white now uses the paper color or var(--bg). The change is a
pure CSS variable update; no component logic changes.

Part of the app/landing alignment work. See APP-INVENTORY.md.
```

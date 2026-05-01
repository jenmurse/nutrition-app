# BRIEF 3D-3 — Add Meal alignment + transition follow-ups

**Part of:** Step 3 of the design pass. Follow-up to brief-3D-2.
**Scope:** Single PR. Three small precision fixes on the Add Meal page (desktop and mobile).
**Depends on:** brief-3D-2 merged.

---

## Three issues to fix

### 1 · Content X position must match recipe detail exactly

Looking at the running build, the Add Meal content (eyebrow, headline, search row, recipe grid, footer) starts at a different X position than the recipe detail content. Add Meal is shifted further to the right than recipe detail.

Per design-system.md §3c, the recipe detail jump nav uses:
- `.rd-jump-nav { position: fixed; left: var(--pad); width: 140px }` (40px from page edge)
- Content has `padding-left: 196px`
- Inside `.ed-container { max-width: 1100px; margin: 0 auto; padding: 0 64px }`

Per design-system.md §3d, the Add Meal rail mirrors this pattern. Same fixed left, same width, same intended content offset.

**The two pages must land at identical X positions for the same content elements.** Recipe detail's `DESSERT` eyebrow and Add Meal's `§ TUESDAY, APRIL 28` eyebrow should sit at the SAME viewport X coordinate.

**The fix:**

Audit Add Meal's container and content padding. Make sure:
- Add Meal uses `.ed-container` (or whatever class wraps recipe detail's content) — NOT a wider or differently-padded container
- The content column has `padding-left: 196px` exactly — not 196px plus any additional margin or padding
- No nested wrappers add extra horizontal padding to the content

**Verification:**

- [ ] Open recipe detail `/recipes/[id]` and Add Meal `/meal-plans/add-meal` in adjacent browser tabs at the same viewport width.
- [ ] In DevTools, inspect recipe detail's `DESSERT` eyebrow. Note its `getBoundingClientRect().left` value.
- [ ] Inspect Add Meal's `§ TUESDAY, APRIL 28` eyebrow. Note its `getBoundingClientRect().left` value.
- [ ] The two values must be identical (within 1px tolerance).
- [ ] If they differ, the implementation is wrong. Fix the container or padding until they match.

Same check applies to:
- Headline X position (recipe detail's "Almond Croissant Bars" vs Add Meal's "Add a breakfast.")
- The search row's left edge
- The footer's left edge

All content on the right side of the page should land at the same X as the equivalent content on recipe detail.

### 2 · Search placeholder typography

The Add Meal search input's placeholder currently renders as DM Sans sentence case (`Find recipe…`). It should render as DM Mono uppercase 9px to match the recipes index toolbar's `SEARCH` placeholder.

**Reference (recipes index):** the search input on `/recipes` shows `SEARCH` as its placeholder, rendered in DM Mono 9px uppercase 0.14em letter-spacing, color `var(--muted)`. Per design-system.md §8e ("search [...] no magnifier icon, hairline underline only"). The placeholder uppercase pattern is part of the system — see `mobile_ux.md` and step2-audit.md note 2c which both call it out: "DM Mono UPPERCASE placeholder."

**The fix:**

Update Add Meal's search input placeholder text and styling on both desktop and mobile.

```jsx
{/* Before */}
<input
  type="text"
  className="am-search-input"
  placeholder="Find recipe…"
/>

{/* After */}
<input
  type="text"
  className="am-search-input"
  placeholder="FIND RECIPE…"
/>
```

```css
.am-search-input::placeholder {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
```

The placeholder text itself should be uppercased in the JSX (`FIND RECIPE…`), AND the `text-transform: uppercase` on the placeholder pseudo-element is a belt-and-suspenders measure. Either alone would work; use both for safety against placeholder text being changed without the CSS following.

When Pantry Items mode is active (rail item Pantry Items selected), the placeholder swaps to `FIND ITEM…`:

```jsx
<input
  placeholder={mode === 'items' ? 'FIND ITEM…' : 'FIND RECIPE…'}
/>
```

**Verification:**

- [ ] Open Add Meal on desktop. Search placeholder reads `FIND RECIPE…` in uppercase mono.
- [ ] Click Pantry Items in the rail. Placeholder swaps to `FIND ITEM…`.
- [ ] Click any other meal type. Placeholder swaps back to `FIND RECIPE…`.
- [ ] Open Add Meal Screen 2 on mobile. Same placeholder treatment — `FIND RECIPE…` (or `FIND ITEM…`) in uppercase mono.
- [ ] Compare to `/recipes` toolbar's search placeholder. Both use the same DM Mono 9px uppercase 0.14em treatment. Visually identical placeholder rendering across the two surfaces.

### 3 · Mobile Screen 1 ↔ Screen 2 transition

The current mobile implementation jumps abruptly between Add Meal Screen 1 (meal type list) and Screen 2 (recipe browser) with no transition. The design system already has the right motion locked for exactly this case — it just isn't being used.

Per design-system.md §7f, `--motion-step` is defined for "step-to-step within a flow" and the example given is Add Meal Step 1 ↔ Step 2:

```css
--motion-step: 320ms cubic-bezier(0.4, 0.0, 0.2, 1);
```

**The locked motion language:**
- **Going forward** (Screen 1 → Screen 2, when user taps a meal type): outgoing screen translates left and fades out (`translateX(0 → -16px)` + opacity `1 → 0`); incoming screen translates in from the right (`translateX(16px → 0)` + opacity `0 → 1`). Concurrent crossfade — the two motions overlap rather than playing sequentially.
- **Going back** (Screen 2 → Screen 1, when user taps `← BACK`): directions reverse. Outgoing translates right and fades out (`translateX(0 → 16px)` + opacity `1 → 0`); incoming translates in from the left (`translateX(-16px → 0)` + opacity `0 → 1`). Same 320ms duration, same easing.

This direction reversal matters: forward steps come in from the right (the spatial direction of "next"); backward steps come in from the left (the spatial direction of "previous"). Without the reversal, going back feels structurally identical to going forward, which loses the navigational signal.

**The fix:**

Use Framer Motion (`motion` package) for the transition, since `--motion-step` is intended for full-screen page transitions per §7f's note "Use Framer Motion for entrance/exit on full-screen pages; CSS transitions for in-page state changes and modals."

Implementation pattern:

```jsx
import { AnimatePresence, motion } from 'motion/react';

// Track navigation direction to control transition direction
const [direction, setDirection] = useState<'forward' | 'back'>('forward');

const handleMealTypeTap = (mealType) => {
  setDirection('forward');
  setMode('screen-2');
  setSelectedMealType(mealType);
};

const handleBackTap = () => {
  setDirection('back');
  setMode('screen-1');
};

const variants = {
  enter: (direction) => ({
    x: direction === 'forward' ? 16 : -16,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction === 'forward' ? -16 : 16,
    opacity: 0,
  }),
};

return (
  <AnimatePresence mode="popLayout" custom={direction}>
    {mode === 'screen-1' ? (
      <motion.div
        key="screen-1"
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration: 0.32,
          ease: [0.4, 0.0, 0.2, 0.2], // cubic-bezier matching --motion-step
        }}
      >
        <Screen1 />
      </motion.div>
    ) : (
      <motion.div
        key="screen-2"
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration: 0.32,
          ease: [0.4, 0.0, 0.2, 0.2],
        }}
      >
        <Screen2 />
      </motion.div>
    )}
  </AnimatePresence>
);
```

The exact code structure depends on the existing Add Meal mobile component architecture (whether Screen 1 and Screen 2 are separate components, whether routing is involved, etc.). The implementer should adapt the pattern to fit. The non-negotiable parts:

- Forward and backward transitions use opposite X directions
- 320ms duration
- `cubic-bezier(0.4, 0.0, 0.2, 0.2)` easing (matches `--motion-step`)
- Opacity crossfades concurrently with the X translation
- Both screens animate simultaneously (the `popLayout` mode in AnimatePresence supports this)

**Important interaction with the eyebrow anchoring rule (from 3D-2):**

The "eyebrow position is anchored" rule from brief-3D-2 still applies. Both screens have the eyebrow at the same Y coordinate. The transition does NOT move the eyebrow vertically — only horizontally as part of the X translation. After the transition completes, the eyebrow lands at the same Y on both screens.

If during implementation the eyebrow appears to jog vertically during the transition (as opposed to just translating with the rest of the screen content), the screen container is being animated incorrectly. The whole screen translates as a unit; nothing inside it shifts independently.

**Reduced motion:**

Per design-system.md §7e, `prefers-reduced-motion: reduce` collapses all transforms to opacity-only fades. For this transition that means:

- Forward and backward both become a simple cross-fade
- No X translation
- Duration can stay at 320ms or drop to a faster fade (180ms is fine)
- Implementer's call; the existing reduced-motion handling in the app should cover this if it's correctly scoped

**Verification:**

- [ ] Open Add Meal on mobile (Screen 1, meal type list visible).
- [ ] Tap a meal type. The current screen should slide left and fade as the new screen slides in from the right. Total duration ~320ms. Concurrent (overlapping) motion.
- [ ] On Screen 2, tap `← BACK`. The current screen should slide right and fade as the previous screen slides in from the left. Same 320ms duration.
- [ ] Tap forward and back several times rapidly. The transition should not break or stack — each navigation cancels the previous transition cleanly.
- [ ] Test with `prefers-reduced-motion: reduce` enabled (in browser DevTools or system settings). Transition collapses to a cross-fade with no X translation.
- [ ] Eyebrow stays at the same vertical position throughout — it translates horizontally with the rest of the screen, but does not jog vertically.

## Files most likely affected

- The Add Meal page component(s) — search input placeholder text, container/padding values
- `globals.css` — verify `.am-content` `padding-left: 196px` matches `.rd-content` (or whatever recipe detail uses); add `.am-search-input::placeholder` styling
- The mobile Add Meal Screen 2 component — same search input fix
- The mobile Add Meal layout/router component — wrap Screen 1 and Screen 2 in `AnimatePresence` with the `--motion-step` transition. May need to track navigation direction state if it isn't already tracked.

## Out of scope

- Anything not directly addressing the X-alignment issue or the search placeholder typography
- The rail itself (already aligned per 3D-2)
- Any other Add Meal copy changes

## Notes for the implementer

- Issue 1 is a precision fix. The brief specced the right values; the implementation drifted somewhere. Audit the actual computed CSS in the running build, find what's different from recipe detail, and reconcile.
- Issue 2 is a copy + CSS change. Should take 5 minutes. Verify both desktop and mobile.
- Issue 3 is a Framer Motion implementation against a locked motion token (`--motion-step` from §7f). The motion language is already defined; the implementation just needs to use it. If the existing app already uses Framer Motion for any other transition (page enters, etc.), follow the same pattern. If it doesn't yet, this is the first introduction and worth a brief check that the package is installed and configured correctly.
- After this brief lands, Add Meal and recipe detail should be visually pixel-identical for any element that's structurally equivalent (eyebrow X, headline X, content right edge, etc.), the search placeholder typography matches the rest of the app's search inputs, and the mobile two-screen flow has motion that matches the rest of the app's editorial transitions.

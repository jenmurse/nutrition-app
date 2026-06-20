# React Native Feasibility — Design Portability Assessment

**Date written:** June 20, 2026
**Status:** Reference for an UNDECIDED choice. The user is weighing a full React Native (Expo) rewrite against the Capacitor wrapper ([`capacitor-build-handoff.md`](capacitor-build-handoff.md)). See memory `native-direction-deliberation.md` for the live decision state. **Confirm the direction with the user before building.**
**Purpose:** Grounded, code-audited answer to "how hard is it to move our design to React Native?" — what ports cheaply, what's a real rebuild, and where the months actually go.

---

## TL;DR

Your instinct that "it's mostly recreating the design system in another language" is **half right**. The *visual system* (tokens, type, color, the minimalist aesthetic) ports unusually well because it's exceptionally well-codified. But a design system is **tokens + layout + interaction**, and the layout engine (CSS Grid, `position:fixed/sticky`, `clamp`, media queries) and interactions (drag, animations, portals) **do not translate** — they're a different paradigm in RN and get rebuilt. Your flagship screen, the matrix planner, is built entirely on the non-portable parts. Net: **~2–4 months** of frontend rewrite, with the cost concentrated in the planner and the motion layer.

---

## What carries over regardless (RN or wrapper — untouched)

- **Backend** — Supabase (Postgres + auth + storage). No change.
- **Pure logic** — `lib/mealOptimizer.ts`, ingredient matching, unit conversion, nutrition math. Plain TypeScript; reused as-is.
- **MCP** — talks to Supabase, not the device. Completely unaffected by the frontend choice.
- **App Store infrastructure** — Apple Developer account, bundle ID, certs, App Store Connect record, TestFlight pipeline, screenshots, privacy questionnaire. Identical whatever's inside the binary.
- **Design *decisions*** — `docs/design-system.md` (the 1,220-line spec) stays the source of truth; only the *expression* changes.

---

## Measured CSS audit (`app/globals.css` = 9,436 lines)

| Signal | Count | Ports to React Native? |
|---|---|---|
| CSS design tokens (`--vars`) | 106 | ✅ Near-1:1 → a theme object |
| `display:grid` / `grid-template` | 27 / 56 | ❌ **RN has no grid** — rebuild with flexbox/manual layout |
| `position: fixed` / `sticky` | 31 / 7 | ❌ Don't exist — restructure with absolute + layout |
| `::before` / `::after` | 49 | ❌ No pseudo-elements — each becomes a real `<View>` |
| `:hover` | 145 | ➖ Irrelevant on touch — **skip for mobile** |
| `@keyframes` / `transition:` | 42 / 150 | ❌ Rebuild in Reanimated (many are trivial color/opacity, though) |
| `clamp()` / `@media` | 36 / 38 | ❌ Become JS calculations (`useWindowDimensions`) |
| `createPortal` overlays | 3 files | ⚠️ Rebuild as RN `Modal` (manageable count) |
| `dnd-kit` drag | 1 file (the 4,430-line planner) | ❌ Full rebuild in Gesture Handler + Reanimated |
| inline `<svg>` | 18 files | ⚠️ Swap to `react-native-svg` (mechanical) |

---

## What ports CHEAPLY (your optimism is warranted here)

Specific to *this* app — most codebases are worse:

- **Tokens → RN theme:** 106 CSS variables (color, type scale, spacing) collapse into one theme file. Direct.
- **Typography → text-style presets:** the 7-stop scale (`9/11/13/16/20/28/36`), 4 named weights, 2 fonts, defined tracking tiers (`docs/design-system.md §1`) map straight to RN `Text` styles. Unusually clean — most apps have ad-hoc type.
- **Color → theme:** clean token set (`§2a`), no register complexity (one palette as of June 2026). Direct.
- **Flexbox layouts:** RN's layout engine *is* flexbox (Yoga). Every flex row/stack/sheet ports conceptually 1:1 — and most of the app outside the matrix is flex.
- **The aesthetic:** sharp corners, hairline rules, no shadows/gradients/blurs, quiet editorial. Minimalist designs port *far* better than ornate ones — there's nothing expensive to fake.
- **Mobile IA is already designed:** bottom rail, sheets, FAB, day-focused planner, filter sheets (`docs/mobile_ux.md`). You're re-implementing *decided* patterns, not redesigning.

This layer is closer to **days** than months.

---

## What's a REAL rebuild (where the months go)

- **CSS Grid → the matrix planner.** The #1 cost. The desktop/tablet centerpiece is a 7-column × N-row grid *with drag-and-drop*; both grid and `dnd-kit` are exactly the non-portable pieces. The single 4,430-line `app/planner/page.tsx` concentrates the hardest work in the app.
  - *Relief:* the **mobile** planner is already a day-focused ruled-row list (not a grid) — so the **phone** planner ports much more easily. The **tablet** matrix grid is the hard target. → argues for **phone-first, tablet-later**.
- **Animations** — 42 keyframes + the sheet slide-up + page transitions, rebuilt in Reanimated.
- **49 pseudo-elements** — decorative rules/underlines each become real elements. Mechanical but pervasive.
- **Overlays/portals** — 3 files → RN `Modal`/portal equivalents. Small.
- **Forms** — `RecipeBuilder.tsx` (1,151 lines), ingredient modals, settings (1,491 lines) → RN `TextInput`/pickers. Mechanical but real.
- **Scroll, SVG, navigation** — `ScrollView`/`FlatList`, `react-native-svg`, React Navigation/Expo Router. Mechanical but everywhere.

---

## Screen inventory & code volume

- **26 route files**, ~24,000 lines of app `.tsx`. But several routes are **web-only and NOT ported** to RN: marketing, privacy, login/auth, waitlist, waitlist-success, admin/*, offline, preview.
- **Real app screens to rebuild (~12–14):** home, planner, recipes (list/detail/create), pantry (list/detail/create), shopping, settings, onboarding.
- **Heaviest:** planner 4,430 · settings 1,491 · RecipeBuilder 1,151 · recipes 993 · pantry detail 882 · pantry 836 · recipe detail 826 · home 710.

---

## The reframe — fast 70% / slow 30%

- **Fast ~70%** — settings, lists, detail pages, onboarding, dashboard, builder forms. Mostly *mechanical translation*: same flex layout, same tokens, different component names. With the design spec as the map (and AI help), this is fast, almost pleasant.
- **Slow ~30%** — the planner matrix (grid + drag + optimizer UI) and the animation/interaction layer. Eats a disproportionate share of calendar because it's complex *and* built on the parts that don't port.

---

## Bottom line

Good Measure is a **better-than-average RN candidate** because the design system is so disciplined — that genuinely lowers the visual-translation cost. But "well-codified tokens" doesn't rescue you from rebuilding CSS Grid, drag, and animations, and your flagship screen is made of exactly those. Estimate stands at **~2–4 months** solo + AI, and now you know *where* it goes: the look comes over fast; the matrix and motion layer are the real cost.

**If RN is chosen:** go **phone-first** (mobile designs are simpler and already separate), treat the **tablet matrix as a later phase** (sequences the cheap 70% ahead of the expensive 30%), keep the **web app live until RN hits full parity and testing**, then shrink web to **landing + privacy only**. React Native for Web (via Expo) is a later option to reclaim desktop from the same codebase if wanted.

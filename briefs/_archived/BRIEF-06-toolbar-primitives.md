# BRIEF-06 · Toolbar primitives — sharp buttons, hairline selectors

## Why

The landing page's mock figures (Fig. 01 Pantry, Fig. 02 Recipe, Fig. 03 Week, Fig. 04 Optimize) show zero rounded corners, zero card backgrounds, and no pill-shaped chrome anywhere. The current app toolbars on Recipes, Pantry, and Planner are dense with rounded borders — filter chips with pill outlines, pill-shaped segmented controls, pill-bordered dropdowns, pill search fields, pill primary buttons. Eight rounded shapes in a row, none of them hierarchically ranked.

This is the foundation brief for bringing the app's index pages into the landing's register. It doesn't touch layout or content — only the shared toolbar primitives. Subsequent briefs (07, 08, 09) apply those primitives to individual pages.

## Intent

Replace the current toolbar primitives with a unified set that follows three rules:

1. **Containers sharp.** Buttons, inputs, dropdowns, modals get `border-radius: 0`.
2. **Selectors hairline.** Filter chips and view toggles are plain text with a 1.5px underline when active — no surrounding border.
3. **Identity markers stay round.** Avatar dots, person-switcher pills (JEN/GARTH/EVERYONE), theme dots, checkboxes, radios, and icon-only buttons remain round. Roundness signals identity or touch, not container.

The underline on active chips and toggles sits 2px under the text baseline — same treatment as the top nav tabs, which this pattern mirrors intentionally.

## Visual reference

Approved mockup lives at `design-mocks/app-index-pages-v1.html`. Fig. 05 in that file is the canonical button system inventory and should be used as the reference any time a button question comes up in future briefs.

## Scope

**In scope:**
- Filter chip styles (used on Recipes and Pantry toolbars)
- View toggle (GRID/LIST) styles
- Toolbar text buttons (COMPARE, sort dropdowns like NAME ↓)
- Toolbar search field styles
- Primary CTA button styles (+ NEW, + ADD, SAVE, CREATE, etc. — the black-filled buttons)
- Secondary outlined button styles (USDA LOOKUP, REGENERATE — keep as buttons but sharpen and restyle)
- Cancel/Reset style (downgrade to text links)
- Count label style in toolbars

**Out of scope:**
- Page-level layout changes on Recipes, Pantry, Planner (that's briefs 07–09)
- Pantry grid card removal (brief 07)
- Recipes list nutrition values (brief 08)
- Recipes grid ghost-tile alignment (brief 09)
- Auth page (its own P0, separate brief later)
- Modals beyond their outer container radius (modal content is scoped separately)
- Form inputs on pantry/recipe forms (stay as-is for now — those pages already read as editorial)
- Person switcher pills (JEN/GARTH/EVERYONE) — these keep their pill shape by design
- Icon-only buttons (edit pencil, delete X, cart) — these stay round
- Checkboxes, radios, avatar dots — these stay round
- Planner toolbar (JEN/GARTH/EVERYONE, date range, EDIT, NUTRITION) — deserves its own brief because the person switcher is the exception to the "sharp" rule and the planner toolbar is the densest application of it

## Specific changes

### 1. Primary button (`.ed-btn` / primary CTA)

Currently pill-shaped. Change to:

```css
.ed-btn-primary {
  background: var(--fg);
  color: var(--bg);
  border: 0;
  border-radius: 0;            /* was pill */
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.ed-btn-primary:hover { opacity: 0.85; }
```

Used by: `+ NEW`, `+ ADD`, `SAVE`, `CREATE`, `SAVE GOALS`, `EXPORT DATA`. Find every primary button in the app and confirm it uses this class or equivalent. If some primary buttons are still using the old pill class, swap them.

### 2. Outlined secondary button (rare — only when a real action needs a button, not a text link)

```css
.ed-btn-outline {
  background: transparent;
  color: var(--fg);
  border: 1px solid var(--rule);
  border-radius: 0;
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.ed-btn-outline:hover { border-color: var(--fg); }
```

Used by: `USDA LOOKUP`, `REGENERATE`, `REVOKE`, `IMPORT`, `UPLOAD FILE`. Keep these as buttons because they trigger real actions, not navigation.

### 3. Text-link button (replaces most secondary buttons)

```css
.ed-btn-text {
  background: none;
  border: 0;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.15s ease;
}
.ed-btn-text:hover { color: var(--fg); }
```

Apply this to `CANCEL`, `RESET`, `COMPARE` (toolbar), sort triggers like `NAME ↓`, `HIDE COMPLETED` in shopping list, `BACK TO RECIPES`, `PASTE NOTES INSTEAD`, `RESET TO DEFAULTS`, and any similar secondary toolbar action that is currently a pill button. Downgrading these to text links removes visual weight from secondary actions and lets the primary filled CTA anchor the toolbar.

### 4. Filter chip (`.ed-chip` or equivalent)

This is the most visible change. Replace any existing pill border with a hairline underline treatment. The underline sits directly under the text baseline, not at the bottom of the toolbar rule.

```css
.ed-chip {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  background: none;
  border: 0;
  border-radius: 0;
  padding: 3px 0 2px;
  align-self: center;
  border-bottom: 1.5px solid transparent;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.ed-chip:hover { color: var(--fg); }
.ed-chip.is-active { color: var(--fg); border-bottom-color: var(--fg); }
```

Important: the previous implementation attempted to anchor the chip to the bottom of the toolbar rule using `margin-bottom: -1px` and `height: 100%`. Do not do that — the underline should sit right under the letters, the same way nav tab underlines do. If the chip is inside a flex container, use `align-self: center` so it takes its intrinsic height.

Used on: Pantry's `ALL / ITEMS / INGREDIENTS`, Recipes's `ALL / BREAKFAST / LUNCH / DINNER / SIDE / SNACK / DESSERT / BEVERAGE / ★ FAVORITES`.

### 5. View toggle (`.ed-toggle` — GRID/LIST)

Matches the chip treatment exactly so the two controls sit on the same baseline in a toolbar:

```css
.ed-toggle {
  display: flex;
  gap: 14px;
  align-items: center;
}
.ed-toggle a {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  text-decoration: none;
  padding: 3px 0 2px;
  border-bottom: 1.5px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.ed-toggle a:hover { color: var(--fg); }
.ed-toggle a.is-active { color: var(--fg); border-bottom-color: var(--fg); }
```

Used on: Recipes and Pantry toolbars (GRID/LIST). Replaces the pill-shaped segmented control.

### 6. Toolbar search field

Replace the pill-bordered search field with a bottom-ruled input. No magnifier icon.

```css
.ed-search input {
  border: 0;
  border-bottom: 1px solid var(--rule);
  border-radius: 0;
  background: transparent;
  padding: 4px 2px;
  font-family: var(--font-sans);
  font-size: 12px;
  width: 140px;
  color: var(--fg);
  outline: none;
}
.ed-search input::placeholder {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.ed-search input:focus { border-bottom-color: var(--fg); }
```

The placeholder is uppercase mono (e.g., "SEARCH") to match the rest of the toolbar's typographic register. Do not add a magnifier icon — we tried it and it reads as decorative clutter.

### 7. Toolbar count label

```css
.ed-count {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 400;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.ed-count strong { color: var(--fg); font-weight: 500; }
```

9px (not 10px) to match every other mono label in the toolbar. Used for "224 ITEMS", "64 RECIPES", etc. The number itself is wrapped in `<strong>` to bring it to `fg` from `muted`.

### 8. Toolbar container + hairline separator

The toolbar itself is 44px tall, sits under the nav with a bottom hairline, and uses 40px horizontal padding (matching the nav). When the filter chip row runs out of room, it scrolls horizontally with a right-side fade mask — not a stack, not a wrap.

```css
.ed-toolbar {
  border-bottom: 1px solid var(--rule);
  padding: 0 40px;
  display: flex;
  align-items: stretch;
  height: 44px;
  gap: 20px;
}
.ed-toolbar-group {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
  min-width: 0;
}
.ed-toolbar-group.chips {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  white-space: nowrap;
  -webkit-mask-image: linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%);
          mask-image: linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%);
}
.ed-toolbar-group.chips::-webkit-scrollbar { display: none; }
.ed-toolbar-group.end {
  flex-shrink: 0;
  gap: 18px;
}
.ed-toolbar-sep {
  width: 1px;
  background: var(--rule);
  height: 16px;
  align-self: center;
  margin: 0 2px;
}
```

## Do not change

- **Font sizes:** 9px mono for toolbar chrome stays 9px. Do not bump to 10px for any reason — the mock is tuned at 9px and "make it more legible" is the road back to SaaS register.
- **Person-switcher pills (JEN/GARTH/EVERYONE)** on the planner toolbar. These stay pill-shaped because the ring around the active one is the person's theme accent — it's identity, not UI chrome. Brief for the planner toolbar will address them separately.
- **Avatar dots** in the top nav. Stay round, stay theme-reactive.
- **Icon-only buttons** (edit pencil, delete X, cart icon, sign-out icon). Stay round.
- **Checkboxes and radio buttons.** Stay round.
- **Responsive collapse to dropdown** at 768–1199px per design-system.md §20. That behavior still exists; the new chip styles just inherit into the dropdown trigger.

## Files likely affected

- `app/globals.css` (or wherever button/chip/toolbar classes live)
- `tailwind.config.js` (if any of these are Tailwind utilities)
- `components/ui/*` (if shared button components exist)
- Page-level files for Recipes, Pantry — apply the new primitive classes where old ones were used

## Verification

1. **Visual, desktop:** Open Recipes. Toolbar should read as a single hairline row with filter chips on the left, a vertical separator, and right-side controls ending in a single black `+ NEW` button. No other rounded shapes visible. Open Pantry — same structure, three chips on the left (ALL/ITEMS/INGREDIENTS).
2. **Underline alignment:** Active filter chip and active toggle word should both have their 1.5px underline sitting ~2px under the letters. Compare visually against the top nav tabs — they should all look like the same typographic family.
3. **Chip overflow:** On narrower viewports (1200–1300px), the Recipes filter chips (9 of them) should scroll horizontally within their row, with a fade on the right edge indicating more content. They should NOT wrap to a second line and they should NOT cause the right-side controls to drop.
4. **Hover states:** Every chip, toggle, and text-link darkens from muted to fg on hover. Primary button drops to 85% opacity on hover.
5. **Reduced motion:** Transitions are 150ms — fast enough that reduced-motion users won't notice the difference; no need for special handling.
6. **Code grep:**
   - `border-radius: 9999px` or `rounded-full` outside of avatar/checkbox/person-pill contexts → should find none after this brief
   - `var(--radius-pill)` usages → should only remain on identity markers (avatars, person pills) and icon buttons
7. **Test suite:** Full jest pass. No visual regression tests exist but typescript and linting should pass.

## Commit message

```
design: sharpen toolbar primitives (BRIEF-06)

Filter chips, view toggles, text buttons, search inputs, and primary
CTAs all lose pill borders. Active chip/toggle state is a 1.5px underline
sitting under the text baseline, matching the top nav tab treatment.
Primary buttons become sharp black rectangles. Identity markers (avatar
dots, person pills, icon buttons, checkboxes) keep their rounded shape
by design.

Does not touch page layouts or the planner toolbar — those are follow-ups.
```

## Flag before proceeding

Pause and check in if:
- The current CSS uses a token system that doesn't match the assumptions (e.g., no `var(--rule)` exists, or Tailwind classes don't have a clean translation for the underline treatment)
- Any existing primary button is using a hardcoded hex for background instead of the accent token — may indicate BRIEF-03 didn't fully sweep it
- You find a toolbar surface not mentioned in this brief (shopping list modal, compare banner, etc.) — flag and leave it for its own brief rather than sweeping it in
- A page's existing layout depends structurally on the old pill heights (e.g., if removing the pill causes a jarring height change) — describe the case before making the change

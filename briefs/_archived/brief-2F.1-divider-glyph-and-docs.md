# BRIEF 2F.1 — Sign Out divider, MENU glyph, doc updates

**Part of:** Step 2 of the design pass.
**Scope:** Single PR. Mobile only for the visual changes. Plus the deferred doc updates from 2F.
**Depends on:** 2F (landed).
**Blocks:** Closing out 2F entirely.

---

## Why this brief

Three follow-ups from 2F that were either deferred or surfaced during visual review:

1. **Sign Out has a duplicate hairline divider.** The standard menu-item divider after Settings stacks with the deliberate separator we added above Sign Out. Two rules read as a visual stutter.

2. **Bottom rail MENU doesn't read as a control.** Even with the heavier rule and uppercase mono label, two text labels in a 44px-tall rail read as metadata, not navigation. Adding a small hamburger glyph (`≡`) to the left of MENU makes it read as the universal "tap to open menu" affordance.

3. **Doc updates deferred from 2F.** `design-system.md` and `mobile_ux.md` need to reflect what landed in 2F: the heavier rail rule, the new menu rail spec, the auto-focus fix pattern. We held those for follow-up to keep 2F's PR focused on code.

## What's wrong now

1. Open the menu sheet on mobile. After Settings there's a hairline divider. Above Sign out there's another hairline divider. Two stacked rules with a small gap of background between them.

2. On every mobile page, the bottom rail shows `MENU | RECIPES` (or whatever section). The "MENU" label is uppercase mono 9px, color `var(--fg)`. There's nothing telling the eye it's a control vs a label. Compared to other apps where the bottom nav has clear destinations or icons, this reads as quiet metadata.

3. `design-system.md` doesn't yet document: the heavier rail rule as a locked exception, the menu rail label spec, or the new MENU glyph treatment. `mobile_ux.md` doesn't yet document: the auto-focus fix pattern, the menu sheet's role vs the bottom rail's role.

## Spec

### 1. Sign Out divider fix

The menu sheet currently has hairline dividers between every nav item. After Settings (the last nav item), the divider should be suppressed because Sign Out has its own deliberate separator above it.

Two ways to fix:

**Option A: Use `:not(:last-child)` on the standard menu-item divider.**

```css
.mob-menu-item:not(:last-child) {
  border-bottom: 1px solid var(--rule);
}
```

This suppresses the bottom border on the last nav item (Settings). The Sign Out separator above remains.

**Option B: Restructure the markup.**

Wrap the nav items in their own container and put Sign Out outside it. The standard divider only applies within the nav container.

Option A is the smaller change. Use Option A unless there's a structural reason to prefer B.

After the fix: visually verify that there's exactly one hairline between Settings and Sign Out, not two.

### 2. Add hamburger glyph to MENU

The bottom rail's MENU label gets a small hamburger glyph to its left. The glyph reads as "menu" universally and qualifies as a typographic glyph in the same family as `§`, `→`, `↗` — not an icon (icons represent objects; this glyph represents the idea of a list).

```html
<button class="menu-rail-btn">
  <svg class="menu-rail-glyph" viewBox="0 0 10 8" aria-hidden="true">
    <line x1="0" y1="1" x2="10" y2="1" stroke="currentColor" stroke-width="1"/>
    <line x1="0" y1="4" x2="10" y2="4" stroke="currentColor" stroke-width="1"/>
    <line x1="0" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1"/>
  </svg>
  MENU
</button>
```

```css
.menu-rail-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  /* existing styles preserved: mono, 9px, 0.14em letter-spacing, uppercase, color var(--fg), no bg, no border */
}
.menu-rail-glyph {
  width: 10px;
  height: 8px;
  flex-shrink: 0;
}
```

Specifications:
- Glyph dimensions: 10×8px
- Three horizontal strokes, 1px weight, equally spaced
- Color: `currentColor` so it inherits from the button's text color (`var(--fg)`)
- Gap between glyph and "MENU" text: 6px
- The glyph and label together form a single tap target — clicking either or the space between opens the sheet

This is mobile only. The desktop nav has a different MENU control; don't touch desktop in this patch.

### 3. Update design-system.md

Add three things:

**3a. Locked rule for the bottom rail border:**

In §11 ("Locked rules") or wherever locked rules live, add:

> **Bottom rail border-top is `1px solid var(--fg)`** — heavier than the `0.5px var(--rule)` used for content hairlines. This is a deliberate inconsistency. Chrome should look visually different from content. The rail's heavier rule signals "below this is chrome, above is content."

**3b. The hamburger glyph as an allowed typographic mark:**

In whatever section covers iconography or typographic glyphs, add:

> **The hamburger glyph (`≡`) is allowed in the bottom rail's MENU control** as a typographic glyph in the same family as `§`, `→`, `↗`. It is distinct from icons (which represent objects). The hamburger represents the idea of a list. Three short horizontal strokes, 10×8px, 1px weight. Use only for the bottom rail MENU control — not as a general "menu" affordance elsewhere.

**3c. Menu rail label spec:**

Add a section documenting the bottom rail's full spec:

```
Bottom menu rail (mobile)

Component: `.menu-rail`
Height: 44px
Background: var(--bg)
Border-top: 1px solid var(--fg) (locked exception)

Left slot — MENU control:
  Glyph: ≡ (10×8px, 1px stroke, currentColor)
  Gap: 6px between glyph and label
  Label: "MENU" in DM Mono 9px, 0.14em letter-spacing, uppercase, var(--fg)
  
Right slot — adapts per page (three variants):
  Section locator (parent screens): "RECIPES", "PLANNER", "PANTRY", "HOME", "SETTINGS"
  Primary action (Shopping): "SHARE"
  Status locator (Add Meal): "TUE, APR 28 · JEN"
  
  All right-slot content uses DM Mono 9px, 0.14em letter-spacing, uppercase, var(--muted).

Hidden on: /onboarding routes, auth pages.
```

### 4. Update mobile_ux.md

Add or update:

**4a. Auto-focus fix pattern:**

Document the pattern from 2D.2 / 2F:

```
List pages should not auto-focus the first interactive element on mount.
Browser default focus management can cause the first row to render with 
a :focus-visible state, which produces a visible underline that conflicts 
with the editorial design.

Fix pattern:

useEffect(() => {
  requestAnimationFrame(() => {
    (document.activeElement as HTMLElement)?.blur();
  });
}, []);

Plus a CSS guard on the row class:

.list-item:focus-visible { outline: none; }

Apply to: recipes, ingredients, home, meal-plans, shopping, add-meal pages,
and any future list-style page.
```

**4b. Menu sheet vs bottom rail roles:**

Document the distinction:

```
The mobile global navigation has two surfaces:

Bottom rail (persistent chrome on every page):
- Always visible at the bottom of the viewport
- 44px tall, heavier border above (1px var(--fg))
- Left: ≡ MENU control (opens the menu sheet)
- Right: adapts per page (section locator, primary action, or status)

Menu sheet (overlay opened by tapping MENU):
- Slides up from bottom
- Contains nav items: Home, Planner, Recipes, Pantry, Shopping, Settings
- Plus a hairline-separated Sign out at the bottom
- Each item is 36px DM Sans sentence case (this is content register because 
  the overlay is a different mode — the chrome opened a content surface)
- Tapping any item navigates and dismisses the sheet
- Tap outside or Close to dismiss without navigating

The two surfaces use different typography registers because they do different
work. The rail is chrome; the sheet is the content of an overlay.
```

**4c. Bottom rail spec:**

Confirm the rail spec from §3c above is reflected in mobile_ux.md as well, with cross-reference to design-system.md as the source of truth.

## Files most likely affected

- `globals.css` — `.mob-menu-item` divider rule, `.menu-rail-btn` flex layout, `.menu-rail-glyph` sizing
- BottomNav component — add the SVG glyph inside the MENU button
- `design-system.md` — three sections updated
- `mobile_ux.md` — three sections updated

## Verify before declaring done

Visual:
- Open the menu sheet on mobile. Between Settings and Sign Out: exactly one hairline divider (above Sign Out). No double rule.
- On every mobile page, the bottom rail shows `≡ MENU` on the left. Glyph is small (10×8px), three horizontal strokes, color matches the MENU label.
- Tap the glyph or the label or the space between — all open the sheet (single tap target).
- The glyph and label visually feel like a unit. 6px gap is enough to read as separate but unified.
- The right slot is unchanged from 2F (section locator, SHARE, or date·person status depending on page).

Functional:
- Sign Out functions as before (dialog.confirm, sign out flow on confirm).
- MENU tap opens the sheet as before. No change to behavior, just visual addition.
- Glyph color matches MENU label color in all states (hover, focus if applicable).

Doc verification:
- `design-system.md` has the three new sections (locked rule for rail border, hamburger glyph, menu rail spec).
- `mobile_ux.md` has the three new sections (auto-focus fix pattern, menu sheet vs rail roles, rail spec cross-reference).
- The locked rule for the rail border is listed alongside other locked rules (sheets at 8px, sharp-default, etc.).

Grep checklist:
- `.mob-menu-item:last-child` should not have a `border-bottom` rule producing a divider.
- `.menu-rail-glyph` exists in the CSS.
- The SVG markup with three lines exists in the BottomNav component.
- No occurrences of `<MenuIcon>` or `<HamburgerIcon>` from an icon library — we're using inline SVG, not an imported icon component.

## Out of scope

- Active toggle filled-black state on sheet chips — that's still 2G's button audit.
- Top-of-page chrome (the empty area above eyebrows) — that's a Step 3 item.
- Typography + voice consistency on eyebrows and headlines — that's a Step 3 item.
- Desktop menu/nav — unchanged.
- Any further changes to the menu sheet itself (typography, layout, animation) — unchanged from 2F.

## Notes for the implementer

- The hamburger glyph is deliberately styled as inline SVG, not a font icon or an imported component. Inline SVG matches the existing approach for the dot doctrine and other typographic marks. Don't import from a library.
- The 6px gap between glyph and MENU label is deliberate. It's tight enough that they read as a unit, loose enough that the glyph is visually distinct. Don't tune it down to 4px or up to 8px without reason.
- The doc updates are not optional or "if time permits." They're part of the brief. After 2F.1 lands, design-system.md and mobile_ux.md reflect reality through end of Step 2 (modulo 2G work still pending).
- Once this brief lands, 2F is fully closed. Master-plan.md and step2-audit.md should also be updated to reflect 2F closed and 2F.1 closed — flag for the next housekeeping pass (probably bundled with 2G).

# BRIEF-11 · Post-10 polish

## Why

Three small issues surfaced after BRIEF-10 landed. Two are clear bugs (the sort control has doubled glyphs; the wordmark still hovers coral). The third is a design-token alignment — the app's hairline rules appear lighter than the landing's, which throws off the visual balance between light rules and the sharp black primary button. All three are token-level or near-token-level changes that make sense to sweep together.

## Intent

Bring the Recipes and Pantry index pages — and the rest of the app — into finer visual alignment with the landing by:

1. Fixing the doubled sort-control glyphs so the control shows one meaningful arrow, not two
2. Sweeping a missed coral hover on the "Good Measure" wordmark
3. Auditing the hairline rule weight against the landing and aligning if they differ

## Depends on

BRIEF-06 through BRIEF-10, all merged.

## Visual reference

- For the hairline audit: the live landing at https://www.withgoodmeasure.com/ is the source of truth. Compare side-by-side with the app's Recipes/Pantry pages.
- For the sort control: `design-mocks/app-index-pages-v1.html` — the mock shows `NAME ↓` with a single directional arrow and no caret.

## Scope

**In scope:**
- Sort dropdown control on Recipes (and anywhere else it appears — check Pantry if it has one)
- "Good Measure" wordmark in the top nav, hover state
- Global `var(--rule)` token and any places rules are drawn with a different value
- Visual alignment check of the app's hairlines against the landing's

**Out of scope:**
- Primary button sizing — hold judgment until after this brief's hairline change lands. The button's perceived harshness is likely a product of the rule/button contrast ratio. If it still reads wrong after hairlines align, we do a targeted button tweak in a separate brief
- Other hover states on other components — only the wordmark is in this sweep
- Nav tab underline weight (already correct)
- Chip/toggle underline weight (already correct per BRIEF-06)
- Any landing page work

## Specific changes

### 1. Sort control — remove the caret, keep the directional arrow

Current rendered state: `NAME ▾↑` — a dropdown caret (▾) followed by an ascending arrow (↑). Two glyphs, two meanings, visually competing.

**Target rendered state:** `NAME ↑` when sorting ascending, `NAME ↓` when sorting descending. The whole label is clickable to open the sort menu. The arrow reflects the current sort direction and toggles when the user selects the same field again.

Rationale: the caret is redundant — any dropdown already cues itself as a dropdown via hover / click behavior, so the caret is restating what the component is rather than adding information. The directional arrow carries real information (which way you're sorted). One glyph, maximum signal.

**Implementation:**
- Remove the caret glyph from the sort control's JSX (likely a `▾`, `⌄`, `ChevronDown` from lucide-react, or similar)
- Keep the directional arrow (likely `↑` / `↓` or `ArrowUp` / `ArrowDown`)
- Ensure the directional arrow swaps based on sort state — if this already works, leave it; if it was hardcoded to `↑`, wire it to the sort-direction state
- The label (`NAME`, `CALORIES`, whatever the current sort field is) updates when a different field is selected — this behavior should already exist; just verify it survives the edit

If the sort control is implemented as a `<select>` element with native OS chrome, the caret is drawn by the browser and can't be removed without replacing the `<select>` with a custom component. If that's the case, flag it — we may need a separate small brief to replace the native `<select>` with a styled button-trigger menu. For now, if removing the caret requires a larger refactor, leave the native `<select>` alone and flag for follow-up.

### 2. "Good Measure" wordmark — fix coral hover

The wordmark in the top-left of the nav currently hovers coral. This should have been swept in BRIEF-03 but wasn't, probably because the wordmark isn't a button-class element.

**Change:** Wordmark's hover color goes from coral to the same treatment the nav tabs use. Nav tabs go from `var(--muted)` → `var(--fg)` on hover. The wordmark is already at `var(--fg)` at rest (it's bold and prominent), so its hover should either:

- Stay at `var(--fg)` and not change color (hover feedback could come from subtle opacity — e.g., `opacity: 0.7` on hover), or
- Shift to `var(--fg-2)` on hover (slightly lighter)

My pick: stay at `var(--fg)` and use `opacity: 0.7` on hover. Matches the pattern used on the landing's wordmark and keeps the wordmark's visual weight consistent.

```css
.app-wordmark {
  color: var(--fg);
  text-decoration: none;
  transition: opacity 0.15s ease;
}
.app-wordmark:hover { opacity: 0.7; }
```

**Find every place the wordmark's hover is defined.** It may be in a `Nav.tsx`, a `Header.tsx`, or a global stylesheet. Grep for the wordmark's class name and any coral hex codes near it. Confirm zero coral remains on the wordmark in any state (rest, hover, active, focus).

### 3. Hairline weight audit

This is the larger of the three changes and the only one that propagates globally.

**Hypothesis:** The app's `var(--rule)` is set to a lighter value than the landing uses. This makes the app's grids and toolbars feel airier, which in isolation is fine — but it also means the sharp black primary button has a higher contrast against its surroundings than the same button does on the landing, which is why the button reads as "harsh" on Recipes/Pantry. Aligning the rule weight should fix that perception without touching the button itself.

**Method:**

1. **Find the landing's rule value.** Look in the landing's CSS (likely `app/(marketing)/landing.css` or wherever the marketing styles live, scoped under `.mkt`). Find the variable or hex used for rules — it'll be a light warm gray, something like `#D0CCC2`, `#C8C3B8`, or similar. Note the exact value.

2. **Find the app's rule value.** In `app/globals.css` or equivalent, find `var(--rule)` (or whatever the rule token is named). Note the exact value.

3. **Compare visually.** Open both in the same browser at the same zoom level. Landing's Fig. 01 Pantry has visible row-separator rules. The live app's Pantry list has the same. Do they look the same weight? Screenshot both at identical viewport and zoom, compare side-by-side.

4. **Decide on the target.** If the landing's rules are visibly darker, move the app's `--rule` to match the landing's value. If the opposite, move the landing to match the app. If they're already the same, the hypothesis was wrong — flag that and leave both alone (and the button conversation becomes about the button, not the rules).

My best guess as the designer: the landing's rules are slightly darker than the app's. Target value after alignment is probably in the range of `#C8C3B8` to `#D0CCC2` on a paper (`#F5F4EF`) background. If the current app rule is `#E0DCD2` or similar, the bump to `#C8C3B8` will be subtle but noticeable in aggregate — every toolbar rule, every grid cell rule, every row divider gets ~15–20% more weight, which makes the sharp button feel like it sits inside a firmer system.

**Apply the change globally.** Update the token in `globals.css` (or equivalent). Do not hunt for per-component overrides — if a component is hardcoding a rule color instead of using the token, flag it for cleanup rather than fixing it in this pass.

**Check focus rings.** If focus rings use `var(--rule)` or a similar near-neutral token, confirm they still read as focus rings after the change. They might need to shift independently to maintain visibility — if so, flag and we'll handle in a targeted fix.

### 4. After-change verification of the button tension

Once the hairline change lands, look at the primary button on Recipes/Pantry toolbar with fresh eyes. If it still reads harsh, we do a targeted button tweak in a separate brief (options on the table: slight opacity drop, switch fill to `var(--fg-2)`, reduce padding). If it reads correct now, we leave it alone and close the thread.

This is a judgment call Jen should make, not Claude Code. Don't tune the button in this brief.

## Do not change

- Primary button fill, padding, typography, hover state — evaluated separately after this brief
- Nav tab styles
- Chip or toggle styles from BRIEF-06
- Any ruled-row hover treatment from BRIEF-10
- Landing page CSS unless the hairline audit determines the landing should move instead of the app (unlikely but possible)
- Any other coral-adjacent hover state on other components — this brief is only the wordmark. If other coral hovers surface, flag them for a separate sweep rather than expanding scope

## Files likely affected

- Sort control component — likely in `components/recipes/` or `components/ui/` — grep for "NAME" or the sort component's name
- Navigation / header component where the wordmark lives
- `app/globals.css` or the equivalent token file for `var(--rule)`
- Potentially the landing's `app/(marketing)/landing.css` — only if the audit concludes the landing should move

## Verification

1. **Sort control on Recipes:** Rendered label shows `NAME ↑` or `NAME ↓`, never both a caret and an arrow. Clicking the label opens a menu to change the sort field. Clicking the same field again (or some equivalent affordance) toggles direction and flips the arrow glyph. If the menu is still a native `<select>`, the caret may be browser-drawn and acceptable — note the state in the PR.
2. **Wordmark hover:** Hover the "Good Measure" wordmark. Color does not shift to coral. Hover feedback is either opacity-reduction or color stays put. Grep for coral hex codes in the wordmark's component — zero results.
3. **Hairline audit, side-by-side:** Take screenshots of the landing's Fig. 01 Pantry and the live app's Pantry list at identical viewport width and browser zoom. Compare the weight of the horizontal rules between rows. After the change, the two should look indistinguishable in rule weight. Include the before/after in the PR.
4. **Regression check on focus rings:** Tab through the Recipes toolbar. Each focused element (chip, toggle, search input, primary button) shows a visible focus ring. If any focus ring became hard to see after the rule color shifted, flag it.
5. **Regression check on form borders:** Open the Pantry edit form. The form fields use bottom-rule inputs. They should still read as input fields (hairline visible, no degraded contrast). Same for the Recipe new/edit form.
6. **Regression check on tables/dividers in settings:** Settings page has the MCP config table with a thin-ruled layout. Confirm it still reads well after the rule color change.
7. **Test suite:** jest passes, TypeScript clean.

## Commit message

```
design: post-10 polish — sort control, wordmark hover, hairline weight (BRIEF-11)

Sort dropdown shows a single directional arrow instead of caret +
arrow. Wordmark hover no longer flashes coral; uses opacity
reduction to match landing. Global rule token weight aligned with
landing so toolbars and grids sit in the same visual register.

Depends on BRIEF-06 through BRIEF-10.
```

## Flag before proceeding

Pause and check in if:
- The sort control is a native `<select>` and removing the caret would require a full component replacement — leave as-is for this brief, flag for follow-up
- The wordmark's hover styling lives in a shared Nav/Header component that also hovers on other links, and separating the wordmark's treatment from the rest would be invasive — describe and we'll decide scope
- The hairline audit reveals the app and landing already use the same rule value — flag it, don't change anything, and we'll treat the button tension as its own problem in a later brief
- Aligning the rule weight to the landing breaks visibility of focus rings or form borders — describe the regression and either hold the rule change or propose a coordinated adjustment
- Rules are hardcoded in multiple components instead of using the token — note the list, but don't fix those in this brief; we'll sweep them in a dedicated cleanup pass

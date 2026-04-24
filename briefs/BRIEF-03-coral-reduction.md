# BRIEF-03 · Coral accent reduction (SYS-01)

## Why

The app currently uses coral `#E15B3F` (or similar) as a default accent across primary CTAs, destructive actions, active states, heart favorites, day-column highlights in planner, mobile bottom nav active state, filter sheet chips, and compare-mode selection rings. It's used in ~8–10 distinct UI surfaces.

The problem: coral is **also** the person theme color for Jen (the primary user). Having the same color mean two different things — "primary CTA" globally and "this is Jen" specifically — creates visual noise. Every button looks like it belongs to Jen. And when Garth is the active person, nothing visibly changes because coral is also the generic accent.

## Intent

Reduce coral to **person theming only**. Scoped to the `[data-theme="coral"]` (or equivalent) rule that drives Jen's identity. Remove coral from all other UI — primary CTAs go black, destructive actions go neutral grey, active states use `var(--fg)` or the current person's theme color as appropriate.

This is the single most impactful global sweep in the whole cleanup plan.

## Scope

**In scope:**
- Every CSS rule, inline style, and Tailwind class that sets a color to coral outside the person-theme system
- Primary CTA buttons across all pages (`SAVE`, `ADD`, `CREATE`, `REGENERATE`, `+ NEW`, `+ NEW PLAN`, `COMPARE →`, `DONE`, `SWAP`, etc.)
- Destructive buttons (`DELETE`, `REVOKE`, `REMOVE`, red `×` dismiss marks in forms)
- The heart favorite icon on recipe list + recipe detail
- The filled-coral-ring state on compare-mode selected cards
- The coral tinted-background + border on over-limit warning blocks
- Mobile bottom nav active state (icon + label color)
- Filter sheet selected chips (both SORT BY and CATEGORY + Ascending/Descending)
- Any outlined-pill button currently using coral border (REVOKE is a known one)

**Out of scope — PRESERVE COMPLETELY:**
- `lib/themes.ts` coral theme definition — this IS the intended use of coral
- The person avatar dots (driven by theme)
- The person pill active state (driven by active person's theme)
- The active day column in planner — this is theme-driven (it follows whichever person is selected). It looks coral now because Jen is active. If Garth becomes active, it becomes green. Leave this logic alone; just ensure it's driven by the theme, not by a hardcoded coral.
- The coral color used *within a person's avatar dot* when their theme is coral

## Specific changes

### 1. Define the new primary/destructive semantic variables

In `globals.css` or equivalent tokens file:

```css
:root {
  /* Existing foundational colors — confirm these exist */
  --bg: #F5F4EF;          /* paper, per BRIEF-01 */
  --fg: #1A1916;          /* near-black ink */
  --fg-2: #36342F;        /* secondary ink */
  --muted: #6B6860;       /* muted text */
  --rule: #D0CCC2;        /* hairline */
  --rule-faint: #E5E2D8;  /* subtler hairline */
  
  /* NEW semantic tokens */
  --primary: var(--fg);              /* primary CTA fill — black */
  --primary-ink: var(--bg);          /* primary CTA text — paper */
  --destructive-border: var(--rule); /* destructive button outline */
  --destructive-ink: var(--fg-2);    /* destructive button text — muted black, not red */
  
  /* The accent variable remains, but its SOURCE changes:
     --accent is now driven ENTIRELY by the active person theme.
     There should be no fallback to coral; if no theme is active,
     --accent defaults to --fg (black) so CTAs never "lose" visibility. */
  --accent: var(--fg);               /* default; person themes override this */
}

/* Person themes — preserve exactly as-is */
[data-theme="coral"]    { --accent: #E15B3F; }
[data-theme="terra"]    { --accent: #C66B4A; }
[data-theme="sage"]     { --accent: #5A9B6A; }
/* ...etc per lib/themes.ts... */
```

### 2. Sweep primary buttons

Grep for primary button patterns. Common indicators:
- Solid background with coral fill
- `bg-accent` (Tailwind, if used)
- `background: var(--accent)` (when on a button)

Change all of these to `var(--primary)`. Text color to `var(--primary-ink)`.

**Known instances to verify:**
- Dashboard: no primary CTA
- Recipes: `+ NEW` (top right toolbar)
- Planner: `+ NEW PLAN` (top right toolbar)
- Pantry: `+ ADD` (top right toolbar)
- Settings: `SAVE` (multiple), `REGENERATE` (MCP), `+ ADD MEMBER`, `+ INVITE LINK` (plain outline not primary — leave), `ADD` (inline invite form)
- Recipe New/Edit: `CREATE`, `SAVE`
- Pantry New/Edit: `SAVE`, `USDA LOOKUP`
- Planner nutrition drawer: `SWAP`
- Compare mode footer: `COMPARE →`
- Mobile filter sheet: `DONE`
- Auth: `CREATE ACCOUNT` / `SIGN IN` (currently black actually — these were ALREADY correct, verify)
- Mobile: Floating action button (`+` on recipes/pantry)

### 3. Sweep destructive buttons

Change coral-outlined destructive buttons to:
- `border: 1px solid var(--destructive-border)` (instead of coral)
- `color: var(--destructive-ink)` (instead of coral)
- Background: transparent (unchanged)

**Known instances:**
- Recipe detail: `DELETE` button
- Settings People: `REMOVE` (next to Garth)
- Settings People: `REVOKE` (on active invite links)
- Settings MCP: `REVOKE` (on tokens)
- Recipe edit row dismissal: `×` marks in ingredient/method rows
- Invite links table expired row: `×` dismiss button (already neutral actually — leave)

### 4. Heart icon → star

**The heart is replaced entirely.** This is not a color change; it's a mark swap.

Replace the heart icon (filled = red, unfilled = outline) with a typographic star or a simple geometric mark:

**Option A — Unicode star (simplest):**
```tsx
// Favorite toggle
<button aria-label={isFavorite ? "Unfavorite" : "Favorite"}>
  <span className="fav-mark">{isFavorite ? '★' : '☆'}</span>
</button>

// CSS
.fav-mark {
  font-family: var(--font-sans);
  font-size: 16px;
  color: var(--fg);    /* always black — filled vs outlined is the state */
  line-height: 1;
}
```

**Option B — SVG star (more control):** Create a single SVG component with two paths (filled + outlined stroke) toggled by state. Use `currentColor` so it inherits `var(--fg)`.

Use Option A unless the project already has a pattern of SVG icons everywhere, in which case match existing style with Option B.

**No coral anywhere in the favorite state.** Filled vs outlined is enough signal.

### 5. Mobile bottom tab nav active state

Find the bottom tab nav (likely `components/BottomNav.tsx` or similar). The active tab currently shows coral icon + coral label.

Change to:
- Active icon: `color: var(--fg)` (black)
- Active label: `color: var(--fg)` (black)  
- Inactive icon: `color: var(--muted)` (grey, as before)
- Inactive label: `color: var(--muted)` (grey, as before)

No underline, no fill — just the weight of full-ink color says "this is active."

### 6. Filter sheet chips

Find the mobile filter sheet (likely `components/FilterSheet.tsx` or similar).

**Selected chips currently:** coral fill + white text
**Selected chips target:** `var(--fg)` fill + `var(--bg)` text

**Unselected chips:** leave alone (grey fill, grey text)

The `DONE` button at the bottom: per primary button sweep above, becomes black.

### 7. Over-limit warning blocks (planner nutrition drawer)

Current: each alert is a coral-tinted background block with a coral `⚠` icon.

New pattern:
- Remove the tinted background entirely
- Add a left-border: `border-left: 2px solid var(--fg)` (not coral — just a neutral emphasis)
- Replace `⚠` with a mono eyebrow: `<span className="alert-label">§ OVER LIMIT</span>`
- Text color: `var(--fg)` (not coral)
- Padding: keep, but the block now has no fill — it's just a margin-noted line

```css
.nutr-alert {
  border-left: 2px solid var(--fg);
  padding: 12px 16px;
  margin-bottom: 8px;
  background: transparent;    /* was tinted coral */
}
.nutr-alert-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
  margin-bottom: 4px;
}
.nutr-alert-text {
  font-size: 13px;
  color: var(--fg);
}
```

### 8. Compare mode selection rings

Find the compare-mode selection UI (likely in `RecipeCard.tsx` or similar, conditional on selection mode).

Current: selected cards get a coral ring + coral circle checkmark.
New: selected cards get a `var(--fg)` ring (black). Checkmark circle can either stay coral (if it reads as "you" — the active person's theme) or go black (if it should be neutral). Default to `var(--fg)` for consistency with this brief; we can revisit.

### 9. Planner active day column

**IMPORTANT — read carefully:** The active day column in the planner grid currently has a coral background tint because Jen is the active person and her theme is coral. This is *theme-driven behavior*, not a hardcoded coral.

**Verify this is actually theme-driven.** If it is (i.e., the tint CSS uses `var(--accent)` which is set by the active person theme), **leave it alone.** When Garth is active the column will tint green automatically.

**If you find a hardcoded coral here**, change it to `var(--accent)` so it becomes theme-driven.

**Additional consideration:** The tint is saturated. After this cleanup, if the tint still feels too strong, that's a separate design question — flag it but don't solve it in this brief.

## Things NOT to touch in this brief

- Any SVG illustration or icon that happens to include coral as part of its design (e.g., food photography, stock imagery) — leave untouched
- Person theme values in `lib/themes.ts`
- Anything that currently uses `var(--accent)` that is meant to be theme-reactive (like the avatar dots, the active person pill fill, the planner active day column) — these should remain theme-reactive

## Verification

1. **Visual walkthrough:** Open every screen in the app. Look for coral. It should appear only in:
   - Jen's avatar dot
   - The Jen pill when Jen is active
   - The planner active day column (only when Jen is active)
   - The active person pill in any other person selection UI
   
   Anywhere else coral appears is a miss and needs to be fixed.

2. **Garth test:** Switch to Garth. Everywhere that was coral for Jen should now be sage green (his theme). The active planner column turns green. His pill is green. Primary CTAs are still black — they don't change.

3. **Grep check:** 
   ```bash
   grep -ri "#E15B3F\|#e15b3f" --include="*.css" --include="*.tsx" --include="*.ts" --include="*.js" .
   ```
   Should return hits ONLY in `lib/themes.ts` (or wherever theme values live).

4. **Automated check for accidental coral in UI:** If a visual regression testing tool is available, run it before/after. Otherwise, manual walkthrough per step 1.

## Commit message

```
design: reduce coral accent to person-theming only

Primary CTAs → black (var(--fg)). Destructive actions → neutral
grey outline (var(--rule) border, var(--fg-2) text). Favorite 
heart → typographic star. Mobile nav active state → black. 
Filter chips selected state → black fill. Over-limit warnings →
margin-noted rules instead of tinted blocks. Compare selection 
rings → black.

Person theme system (lib/themes.ts) preserved exactly — coral
remains Jen's identity color, and theme-driven UI elements
(avatar dots, active person pill, active planner day column)
remain reactive.

Part of SYS-01 in APP-INVENTORY.md.
```

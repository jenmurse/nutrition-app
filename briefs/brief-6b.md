# Brief 6 — Step 6: Landing copy pass + italic system removal

**Status:** Ready to ship. Single comprehensive pass.
**Step:** 6 (closes Steps 6a–6e in one brief)
**Date:** May 2, 2026

---

## Reconciliation with master plan

The master plan originally split Step 6 into five sub-steps:

- 6a — Italic typeface audition (Instrument Serif vs. GT Sectra, Editorial New, Domaine Display, Tiempos Headline, Migra)
- 6b — Italic application audit (which words stay italic)
- 6c — Em-dash strip on landing
- 6d — Specific line edits
- 6e — Landing copy adjustments

What actually happened during the design conversation:

The italic application audit (6b) resolved to **drop italic everywhere**, not just trim. Once italic was being removed from the system entirely, the typeface audition (6a) became unnecessary — there's nothing to typeset in serif italic if no surface uses it. Steps 6c, 6d, and 6e merged into a single comprehensive copy pass during the conversation, including a new hero headline for the landing ("Measure what matters." replacing "A nutrition app for people who actually cook.").

The work collapsed from five sub-steps to one editorial pass. This brief covers all of it.

---

## What's changing

1. **Landing copy** — full rewrite across §00–§04 (locked text below). Zero em-dashes. New hero headline with intentional line break.
2. **Hero wrap** — `Measure<br />what matters.` lands on two lines. The `<br />` is the design.
3. **§04 attribution removed** — the mid-page `— JEN MURSE, GOOD MEASURE` line between the §04 body and GET STARTED button is removed. Page byline at the bottom carries the credit.
4. **Running bar** — five labels reduced to four with new wording.
5. **Onboarding Welcome** — new headline + body.
6. **Auth Sign in** — new headline + body.
7. **Auth Create account** — new headline + body.
8. **Italic system removed** — every `<em>` on landing, §01, §02 headline, §03 headline, and auth headlines. The `.auth-headline em` rule and Instrument Serif typeface come out of the system.
9. **Design system documentation** — typography section, em accent section, color rule section, and auth pattern section all updated to reflect the two-typeface system and the sage-as-theme-color clarification.
10. **Master plan + APP-INVENTORY** — log Step 6 close with decision log entries.

---

## Locked copy

### Landing

#### Running bar (top of page)

```
CALCULATED, NOT ESTIMATED · MEASURED TO THE GRAM · PLANNED BY THE WEEK · OPTIMIZED BY GOAL
```

Four labels separated by middle dots. (Was five labels with two off-grammar phrases.)

#### §00 — Hero

**Headline (with manual line break):**

```html
Measure<br />what matters.
```

The `<br />` is deliberate. Three short words at hero scale will run as a single line across most viewports, which makes the hero feel like a banner rather than an editorial moment. Breaking after "Measure" lands the verb on its own line and lets "what matters." complete the thought on the second line. Two lines, designed wrap.

In JSX:

```jsx
<h1>Measure<br />what matters.</h1>
```

Do not use a CSS `max-width` to force the wrap — that would make the break dependent on viewport width and font rendering. The `<br />` is the design.

**Body:**

```
For years I ran my household with two tools. A spreadsheet for nutrition, a recipe app for dinner. Neither one knew about the other. Good Measure is the version of that setup where the two halves finally talk. Your pantry, your recipes, your week. Calculated to the gram, planned as a system, optimized with AI.
```

#### §01

```
Most nutrition apps log what you eat. Most recipe apps store what you cook. Good Measure plans one against the other.
```

#### §02

**Headline:** `Every ingredient, to the gram. Every recipe, calculated.`

**Body:**

```
Every ingredient you cook with lives in a pantry you build once, with full nutrition from the USDA when it exists and from the package in front of you when it doesn't. Import a recipe or create one from scratch. Recipes draw from the pantry, so the numbers follow the ingredients. Change two tablespoons of olive oil to one and the recipe details update. Nutrition is calculated, not estimated.
```

#### §03

**Headline:** `One week. Every person. The whole matrix.`

**Body (paragraph 1):**

```
Good Measure was built for how people actually cook, whether it's for one person or a household. My husband and I cook out of the same kitchen but we have different bodies and different goals. Every person in the household has their own plan and their own targets, running against the shared recipe library. You can add a meal for one person or the entire household. As you go, the shopping list builds itself.
```

**Body (paragraph 2 — AI):**

```
Good Measure connects to Claude or any MCP-compatible agent. Hand it a goal like make this recipe have more protein or keep Thursday under 1800 calories, and it works from your actual pantry and plans, suggests swaps, and writes the changes back. It can optimize a single recipe or the whole week, whatever you need.
```

#### §04

**Headline:** `If this sounds like how you want to cook, I'd like you to try it.`

**Body:**

```
I built Good Measure for myself first, and I cook from it every day. Now it's here for you to try.
```

**Drop the mid-page attribution.** The current page renders a `— JEN MURSE, GOOD MEASURE` line between the body and the GET STARTED button. Remove this line entirely. The page byline at the bottom (`© 2026 · MADE BY JEN MURSE`) carries the credit; a mid-page signature in addition reads as PR attribution and undercuts the personal voice that the body just established. The §04 close should read as the product's voice (paper and ink, first-person), not as a magazine byline.

### Onboarding Welcome (step 0 of wizard)

**Headline:** `Measure what matters.`

**Body:**

```
Your pantry, your recipes, your week. All calculated, planned, and optimized.
```

(This headline now matches the landing hero on purpose. The user crosses from one surface to the other and the language is consistent — landing thesis, onboarding fulfillment of the same thesis.)

### Auth — Sign in

**Headline:** `Pick up where you left off.`

**Body:**

```
Your pantry, your recipes, the week you were planning. All calculated to the gram.
```

(Verb is *calculated*, not *measured* — matches the landing's verb choice.)

### Auth — Create account

**Headline:** `Set up your kitchen.`

**Body:**

```
Build your pantry once. Plan a week against it. Let the math take care of itself.
```

---

## STOP-CHECK GATE 1 — Italic removal

Before declaring this brief done, run these greps and verify zero results in the relevant locations.

### 1a. No `<em>` tags in target surfaces

```bash
grep -rn "<em>" app/page.tsx app/login/page.tsx app/onboarding/page.tsx app/components/landing/ 2>/dev/null
```

Expected result: **zero matches.**

If `<em>` markup remains in any of these files, the italic system isn't fully removed. Specifically check:

- **Landing hero** (`app/page.tsx`): no `<em>actually</em>` in "A nutrition app for people who actually cook" — the headline is replaced entirely with "Measure what matters." so this should be moot, but verify.
- **Landing §01**: no `<em>other</em>`.
- **Landing §02 headline**: no `<em>gram</em>`.
- **Landing §03 headline**: no `<em>matrix</em>`.
- **Auth Sign in headline**: no `<em>left off</em>`.
- **Auth Create account headline**: no `<em>actually cook</em>` (and the headline text changes to "Set up your kitchen." so this should also be moot, but verify).

### 1b. No theme-accent `<em>` in the surfaces being touched

The dashboard greeting uses a different `<em>` convention from the auth serif italic — theme-accent color (`var(--accent)`), not italic. That convention is NOT being removed. The dashboard greeting `<em>{personName}</em>` stays. Do not strip it.

The two `<em>` conventions to distinguish:

- **Theme-accent `<em>`** (kept): `app/home/page.tsx` for the person name. Renders in the active person's theme color via `var(--accent)`. This is a *theme* convention, not a brand convention — sage is the default theme, but the color shifts to whatever the active person's theme is (coral, plum, slate, etc.). Per the updated §6f, this is the only `<em>` convention left in the system.
- **Serif italic `<em>`** (removed): the auth headlines (`.auth-headline em`) using Instrument Serif italic.

After this brief, **the theme-accent `<em>` convention still exists** for the dashboard greeting only. The auth serif italic `<em>` is gone entirely. If you find an `<em>` in landing or §01–§04 still styled with `color: var(--accent)`, that was the theme-accent convention — those should be removed because the new landing copy doesn't use them either (no italic candidates survived the audit, and the landing is no longer carrying any theme-color editorial accents).

**Net effect:** all `<em>` tags on the landing page should be removed. Only the dashboard greeting `<em>{personName}</em>` survives in the codebase.

**Important framing:** sage is no longer a brand color. It is the default theme color, used on surfaces where no person is selected (landing, auth, onboarding bookends). On in-app surfaces, the accent shifts with the active person's theme. The brand is paper and ink (`--bg` and `--fg`); color belongs to the person.

### 1c. No `font-style: italic` on copy elements

```bash
grep -n "font-style: italic" app/globals.css
```

Expected matches: **zero in copy-related rules.** The only italic CSS allowed in `globals.css` after this brief is whatever the dashboard greeting needs (theme-accent — and that uses `font-style: normal` because the convention is color, not italic).

If the auth headline italic rule remains, remove it:

```css
/* DELETE this rule */
.auth-headline em {
  font-family: var(--serif-display);
  font-style: italic;
  color: inherit;
}
```

### 1d. No leftover Instrument Serif references in JSX

```bash
grep -rn "Instrument Serif" app/ 2>/dev/null
grep -rn "serif-display" app/ 2>/dev/null
```

Expected: zero matches. (See STOP-CHECK Gate 2 for the typeface itself.)

---

## STOP-CHECK GATE 2 — Instrument Serif removal

Removing the typeface has three places to check. All three must be done together — leaving the font loaded but unused, or unloading the font but leaving CSS variables that reference it, both create silent fallback bugs.

### 2a. Font loading

Find where Instrument Serif is loaded. Likely candidates:

```bash
grep -rn "Instrument" app/layout.tsx app/fonts.ts app/_fonts/ 2>/dev/null
grep -rn "next/font" app/ | grep -i serif 2>/dev/null
```

If it's loaded via `next/font/google` or a similar mechanism, **remove the import and the variable export**. If it's loaded via a `<link>` tag in `<head>`, remove that line.

### 2b. CSS variable

In `app/globals.css`, find and remove:

```css
:root {
  --serif-display: 'Instrument Serif', Georgia, serif;
}
```

If `--serif-display` is referenced in any other rule outside `:root`, those rules also need updating. Check:

```bash
grep -n "serif-display" app/globals.css
```

Expected after removal: zero matches.

### 2c. Tailwind / font-family reference

If Tailwind config maps a `font-serif` utility to `--serif-display`, that mapping should also be removed or remapped to `--font-sans` (which is the legacy DM Sans alias for `font-serif` per design system §1).

```bash
grep -n "serif-display\|Instrument" tailwind.config.* 2>/dev/null
```

### 2d. Verification

After removal, the system should have **two typefaces only**:

- DM Sans (`--font-sans`)
- DM Mono (`--font-mono`)

No third typeface variable should exist in `:root`. Run this final check:

```bash
grep -E "^\s*--font|^\s*--serif|^\s*--mono" app/globals.css | grep -v "var(--font-"
```

Expected result: only `--font-sans`, `--font-mono`, and the legacy `--mono` token (which is documented in §1 as still valid for non-button use, though the enforcement doc warns against its use in `font-family` declarations).

---

## Implementation steps

### Step 1 — Landing copy

File: `app/page.tsx` (or wherever the landing component lives — check `app/components/landing/` if the page imports from there).

Replace each section's copy with the locked text above. Keep the existing JSX structure (eyebrows, headline tags, body paragraphs); only the inner text changes. Remove any `<em>` tags within these sections.

The hero specifically: the existing headline `<h1>` likely contains something like `for people who <em>actually</em> cook`. Replace the entire `<h1>` content with `Measure<br />what matters.` — note the manual `<br />` is intentional and required (see §00 locked copy above for rationale). No inner spans or italic tags.

The §04 specifically: there is currently a `— JEN MURSE, GOOD MEASURE` attribution line rendered between the body paragraph and the GET STARTED button. This element must be removed entirely along with whatever container or class wraps it. After removal, the §04 layout flows: headline → body paragraph → GET STARTED button. No mid-page signature.

### Step 2 — Running bar

Find the running bar component (likely a strip at the top of the landing). Reduce from five labels to four, replacing the labels with the locked four-label text. Verify the middle-dot separator (`·`) is preserved.

### Step 3 — Onboarding Welcome

File: `app/onboarding/page.tsx`.

The Welcome step (step 0) currently has:

```
Measure what matters.
A nutrition tracker built around real recipes, real households, and the way you actually cook.
```

Replace the body line with:

```
Your pantry, your recipes, your week. All calculated, planned, and optimized.
```

Headline stays the same.

### Step 4 — Auth Sign in

File: `app/login/page.tsx`.

Sign in tab currently has the headline `Pick up where you <em>left off</em>.` and a body line. Replace the headline with `Pick up where you left off.` (no `<em>`) and the body with:

```
Your pantry, your recipes, the week you were planning. All calculated to the gram.
```

### Step 5 — Auth Create account

File: same as Step 4.

Create account tab currently has the headline `Sign up to <em>actually cook</em>.` and a body line. Replace the headline with `Set up your kitchen.` (no `<em>`) and the body with:

```
Build your pantry once. Plan a week against it. Let the math take care of itself.
```

### Step 6 — Italic CSS removal

File: `app/globals.css`.

Remove the `.auth-headline em` rule (or whatever class scope is being used for the serif italic convention). Search for `font-style: italic` in copy contexts and remove.

### Step 7 — Instrument Serif removal

Per STOP-CHECK Gate 2 above: remove the font loader, remove the `--serif-display` CSS variable, remove any Tailwind mapping.

### Step 8 — Design system documentation

Update the following sections of `design-system.md`:

#### §1 — Typography

Currently lists three typefaces. Update to two:

```markdown
**Two typefaces. No others.**

| Role | Family | When to use |
|---|---|---|
| Body / display / headings | DM Sans | Everything except UI labels |
| Labels / mono | DM Mono | UI chrome — nav links, eyebrows, filter chips, metadata, dates, nutrition values, button text |
```

Remove the Instrument Serif row.

In the CSS variables block, remove `--serif-display`:

```css
--font-sans: 'DM Sans', sans-serif;
--font-mono: 'DM Mono', monospace;
```

#### §2b — Color rule

The current §2b describes three buckets (theme-reactive identity, neutral black, semantic red/green). The framing is correct but a small clarification is worth adding to make the sage-is-not-brand decision explicit. Add to the §2b section:

```markdown
**Sage is a theme color, not a brand color.** The system has eight named themes; sage is one of them, used as the default when no person is selected (auth, onboarding bookends, landing — surfaces where the accent has no person to belong to). On in-app surfaces, the accent shifts with the active person's theme. The brand itself is paper and ink (`--bg` and `--fg`); sage and every other accent belong to the person, not the product.
```

This is a sharpening of the existing rule, not a behavior change — the CSS already does the right thing. The clarification just prevents future drift toward treating sage as a Good Measure brand color.

#### §6f — Em accent

Currently describes two `<em>` conventions (theme-accent and serif italic, with the theme-accent referred to as "sage accent" in the existing doc). Update to describe only the theme-accent convention, with corrected framing (sage is the default theme color, not a brand color):

```markdown
### 6f. Em accent — theme-accent convention

The `<em>` markup is used as a typographic accent in one place: the dashboard greeting (person name in `var(--accent)`). It is not italic — it is `font-style: normal` with theme-reactive color.

```css
em { font-style: normal; color: var(--accent); }
```

This is a theme convention, not a brand convention. The accent color is sage by default (when no person is selected, e.g. on auth or onboarding bookends), but on in-app surfaces it shifts to the active person's theme color (coral, plum, slate, etc.). The brand itself is paper and ink (`--bg` and `--fg`); color belongs to the person.

The previous serif italic `<em>` convention used on auth headlines (`<em>left off</em>`, `<em>actually cook</em>`) was removed in May 2026 along with the Instrument Serif typeface. No surface in the system uses serif italic anymore.
```

#### §8a — Auth screen

Remove the paragraph about "Headline `<em>` treatment" mentioning Instrument Serif italic. The new auth headlines are `Pick up where you left off.` and `Set up your kitchen.` — no `<em>` tags. Update the section text accordingly.

### Step 9 — Master plan decision log

Add an entry under May 2 in `master-plan.md` decision log:

```markdown
| May 2 | **Brief 6 landed — Step 6 complete.** Landing copy rewritten across §00–§04 with new hero ("Measure what matters."). Running bar reduced from five to four labels. Onboarding Welcome, auth Sign in, and auth Create account headlines and bodies all rewritten to match the new editorial register. Italic system dropped entirely — no `<em>` italics on any surface. Instrument Serif typeface removed from the system; design system goes from three typefaces to two (DM Sans + DM Mono). Sage clarified as a theme color, not a brand color — the brand is paper and ink only, color belongs to the person. Em-dashes stripped from all rewritten copy. The original Step 6 sub-steps (6a typeface audition, 6b italic audit, 6c em-dash strip, 6d line edits, 6e landing copy adjustments) collapsed into one comprehensive pass. | 6 / Brief 6 |
```

Also update the Step 6 entry in the §3 sequenced work list to mark it ✓ complete, and update the APP-INVENTORY's "What's left" section to remove Step 6 from the queued list.

### Step 10 — APP-INVENTORY update

In `APP-INVENTORY.md`:

- Remove Step 6 row from the "Queued — remaining design pass steps" table (it's now done).
- Add a "Locked this session (May 2 — Step 6)" subsection under "Design decisions locked" with these entries:
  - **Italic system removed.** No `<em>` italics on any surface. Theme-accent `<em>` convention retained for dashboard greeting only.
  - **Two-typeface system.** DM Sans + DM Mono. Instrument Serif removed.
  - **Sage is no longer a brand color.** Sage is the default theme color (used when no person is selected — auth, onboarding bookends, landing). On in-app surfaces the accent shifts with the active person's theme. The brand is paper and ink only; color belongs to the person.
  - **Landing hero is "Measure what matters."** — replaces "A nutrition app for people who actually cook." Echoes onboarding Welcome headline on purpose.
  - **Auth Create account headline is "Set up your kitchen."** — replaces the previous *actually cook* headline.
  - **Running bar is four labels** — *CALCULATED, NOT ESTIMATED · MEASURED TO THE GRAM · PLANNED BY THE WEEK · OPTIMIZED BY GOAL*.

---

## Verification checklist

Before declaring done, walk these in order:

1. **Read the landing page top to bottom.** No em-dashes anywhere. No italic anywhere. Copy matches the locked text exactly.
2. **Verify the hero wraps.** "Measure" should appear on the first line; "what matters." should appear on the second line. The `<br />` should be present in the JSX. If the headline renders as a single line across the viewport, the break is missing.
3. **Verify §04 has no mid-page attribution.** Between the body paragraph "Now it's here for you to try." and the GET STARTED button, there should be no signature, byline, or attribution line. The page byline at the bottom (`© 2026 · MADE BY JEN MURSE`) is the only credit on the page.
4. **Run STOP-CHECK Gate 1** (italic removal greps). Zero matches in target surfaces.
5. **Run STOP-CHECK Gate 2** (Instrument Serif removal greps). Zero matches anywhere.
6. **Read the onboarding Welcome screen.** Headline matches landing exactly. Body line is the new locked text.
7. **Read both auth tabs (Sign in and Create account).** Headlines and bodies match locked text. No `<em>` in either.
8. **Render check.** The landing should look visually identical except for the copy itself. Layout, type sizing, eyebrows, sections — all unchanged. If anything visual shifted (other than the intentional hero wrap and the §04 attribution removal), something else broke.
9. **Dashboard greeting still shows the person's name in theme-accent color.** This is the one `<em>` that survives — confirm it didn't get accidentally swept.

---

## What this brief does NOT do

To keep scope clean:

- Does not change the landing's section eyebrows (`§ PREMISE`, `§ THE LIBRARY`, etc.) or the visual structure of any section.
- Does not change the landing's running-bar position, animation, or styling — only the label content.
- Does not touch the dashboard greeting `<em>{personName}</em>` (theme-accent convention; survives).
- Does not touch other surfaces with `<em>` (if they exist in body copy elsewhere, those are out of scope and noted in a follow-up if found).
- Does not introduce a new typeface to replace Instrument Serif. The italic moments are gone, not replaced.

---

## After this brief lands

Step 6 closes. The next steps in the master plan are:

- Step 9 — Wordmark integration pass (apply locked `good · measure` wordmark to all surfaces)
- Step 10 — Type leading and tracking pass
- Step 11 — Surface coherence check
- Step 12 — Email templates

Step 9 may interact with the auth and onboarding topbars touched in this brief, so any wordmark placeholders in those topbars should be left as-is for now and addressed in Step 9.

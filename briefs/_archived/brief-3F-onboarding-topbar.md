# BRIEF 3F — Onboarding topbar simplification

**Part of:** Step 3 of the design pass.
**Scope:** Single PR. Desktop and mobile onboarding routes — every step from Welcome through Complete.
**Depends on:** 3A (tokens) merged. Independent of 3B, 3D, 3E, 3G — can run in parallel.
**Blocks:** Nothing.

---

## Why this brief

The onboarding topbar currently shows three editorial signals stacked or repeated:
- `§ ONBOARDING` (left, mono)
- `STEP · 02 / 03` or `WELCOME` / `READY` (right, mono)
- And on bookend pages (Welcome, Complete), the body content also shows the wordmark + a `§ WELCOME` or `§ READY` body eyebrow

Three editorial markers competing in close vertical proximity is too much. The `§ ONBOARDING` topbar label is the weakest of the three because it tells the user something they already know — there's no other flow this could be.

This brief drops `§ ONBOARDING` from the topbar and keeps just the wordmark on the left and the step counter on the right. The body content's editorial structure is preserved.

## What's wrong now

Looking at `desktop_onboarding1.png` through `desktop_onboarding_5.png`:

1. **Step 1 (Welcome).** Topbar shows `§ ONBOARDING` left, `WELCOME` right. Body shows wordmark "Good Measure" + `§ WELCOME` eyebrow + `Measure what matters.` headline + lede + GET STARTED CTA. The `§ ONBOARDING` and `§ WELCOME` are both rendered as `§`-prefixed mono labels, just at different sizes — visual noise.

2. **Steps 2–4 (interior steps).** Topbar shows `§ ONBOARDING` left, `STEP · 01 / 03`, `STEP · 02 / 03`, `STEP · 03 / 03` right. Body has `§ YOUR PROFILE`, `§ YOUR HOUSEHOLD`, `§ DAILY GOALS` eyebrows. The `§ ONBOARDING` is redundant with the step counter — the user knows they're in onboarding because they see step counters.

3. **Step 5 (Complete).** Topbar shows `§ ONBOARDING` left, `READY` right. Body shows checkmark + `§ READY` + `You're all set.` headline. Same redundancy as Step 1.

4. **Topbar wordmark is missing.** The current topbar shows `§ ONBOARDING` and the step counter — there's no wordmark in the topbar at all. The wordmark only appears in the body of bookend pages. Inconsistent with auth (which has wordmark in topbar) and with the post-onboarding app (which has wordmark in nav).

## Spec

### A · Topbar restructure

The new topbar shows wordmark left, step counter right. No `§ ONBOARDING` label.

```jsx
<div className="ob-topbar">
  <span className="wm">Good Measure</span>
  <span className="ob-step-counter">{stepCounterText}</span>
</div>
```

```css
.ob-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 32px;
  border-bottom: 1px solid var(--rule);
  background: var(--bg);
}

.wm {
  font: 700 18px var(--font-sans);
  letter-spacing: -0.02em;
  color: var(--fg);
}

.ob-step-counter {
  font: 400 11px var(--font-mono);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
```

**The wordmark stays "Good Measure" Title Case for now.** When wordmark integration ships, this swaps to the locked `<BrandName />` component at 18px. Don't preempt it.

### B · Step counter content per page

The right-side step counter content varies by page:

| Page | Right content |
|---|---|
| Welcome (Step 1) | `WELCOME` |
| Profile (Step 2) | `STEP · 01 / 03` |
| Household (Step 3) | `STEP · 02 / 03` |
| Goals (Step 4) | `STEP · 03 / 03` |
| Complete (Step 5) | `READY` |

The counter format `STEP · 01 / 03` uses the middle-dot character (U+00B7) as a separator and zero-padded numerals. The bookend pages (Welcome, Complete) use word labels (`WELCOME`, `READY`) instead of step numbers — these aren't counted as steps because they don't ask the user to do anything; they're transitions in and out of the flow.

### C · Body content unchanged

The body content of each onboarding page is left as-is. Specifically:

**Welcome and Complete bookends:**
- Body wordmark stays (32px centered above the eyebrow)
- `§ WELCOME` / `§ READY` eyebrow stays
- Display headline stays (`Measure what matters.` / `You're all set.`)
- Lede paragraph stays
- CTA stays (GET STARTED → / GO TO DASHBOARD →)

**Interior steps (Profile, Household, Goals):**
- `§ YOUR PROFILE` / `§ YOUR HOUSEHOLD` / `§ DAILY GOALS` eyebrow stays
- Display headline stays (`Pick your color.` / `Who else is eating?` / `A starting point.`)
- Lede stays
- Form fields stay
- BACK / CONTINUE row stays (correct treatment, no change needed)

The only structural change in this brief is the topbar.

### D · The "what's left" question

After dropping `§ ONBOARDING`, the topbar reads:

```
Good Measure                                          STEP · 01 / 03
```

This works because:

1. **The wordmark anchors brand identity.** The user knows what app they're in.
2. **The step counter anchors location in the flow.** The user knows which step they're on.
3. **The body content provides the section context.** `§ YOUR PROFILE` tells the user what they're configuring.

Three pieces of orientation across two surfaces (topbar and body) instead of three pieces stacked in two surfaces (topbar with two markers + body with eyebrow). Cleaner three-tier hierarchy: brand (topbar left) → step (topbar right) → editorial (body).

### E · Mobile

On mobile, the topbar pattern is identical. Wordmark left, step counter right. Reduce horizontal padding to fit the smaller viewport:

```css
@media (max-width: 768px) {
  .ob-topbar {
    padding: 0 20px;
  }
  
  .wm {
    font-size: 16px;
  }
  
  .ob-step-counter {
    font-size: 10px;
    letter-spacing: 0.14em;
  }
}
```

The body content's responsive behavior is unchanged. If onboarding currently has mobile-specific layouts (e.g. simpler horizontal padding, stacked form fields), those stay as-is.

### F · Hairline below topbar

The hairline below the topbar is preserved. It separates the topbar from the body content and matches the editorial register convention.

```css
.ob-topbar {
  border-bottom: 1px solid var(--rule);
}
```

### G · Onboarding routes are editorial register

The onboarding layout already has `data-register="editorial"` from 3A. Verify this is still in place. The cream `--bg`, warm muted, warm rule tokens apply across all five steps. No changes needed beyond what 3A installed.

## Files most likely affected

- Onboarding layout — typically `app/onboarding/layout.tsx` or equivalent
- Onboarding topbar component — possibly a shared component, possibly inline in the layout
- Each step page component if the topbar is per-step rather than shared
- `globals.css` — verify `.ob-topbar`, `.ob-step-counter`, `.wm` classes exist; remove any `.ob-section-label` or similar class that styled the dropped `§ ONBOARDING` text

## Verify before declaring done

### Visual

**Step 1 (Welcome).**
- Topbar: "Good Measure" wordmark left, `WELCOME` mono label right.
- No `§ ONBOARDING` text anywhere in the topbar.
- Hairline below topbar.
- Body unchanged: centered body wordmark + `§ WELCOME` eyebrow + `Measure what matters.` headline + lede + GET STARTED → CTA.

**Step 2 (Profile / Pick your color).**
- Topbar: "Good Measure" left, `STEP · 01 / 03` right.
- Body unchanged: `§ YOUR PROFILE` eyebrow + `Pick your color.` headline + lede + form fields (NAME, THEME) + BACK / CONTINUE row.

**Step 3 (Household).**
- Topbar: "Good Measure" left, `STEP · 02 / 03` right.
- Body unchanged.

**Step 4 (Goals).**
- Topbar: "Good Measure" left, `STEP · 03 / 03` right.
- Body unchanged: preset cards (MAINTAIN, LEAN OUT, BUILD, CUSTOM) + BACK / FINISH row.

**Step 5 (Complete).**
- Topbar: "Good Measure" left, `READY` right.
- Body unchanged: checkmark icon + `§ READY` + `You're all set.` headline + lede + GO TO DASHBOARD → CTA.

### Mobile

- Open each step at 375px width.
- Topbar: wordmark left, step counter right. Both visible without truncation.
- Body content responsive behavior unchanged.

### DevTools

- Inspect the topbar. Computed styles show `display: flex` with `justify-content: space-between`. Height 50px desktop, 50px mobile.
- Inspect the topbar's left and right children. Wordmark on the left is 18px DM Sans 700. Step counter on the right is 11px DM Mono 400.
- No element in the topbar has the text `§ ONBOARDING` or any `§`-prefixed string.

### Functional

- Navigate from Welcome → Profile → Household → Goals → Complete. Step counter updates correctly at each step.
- Click GET STARTED on Welcome → advances to Profile (Step 2).
- Click BACK on any interior step → returns to previous step.
- Click CONTINUE → advances to next step (validates fields if required).
- Click FINISH on Goals → advances to Complete.
- Click GO TO DASHBOARD on Complete → user lands on `/dashboard`.

### Grep checklist

- `§ ONBOARDING` literal string in any onboarding component file — should not appear after this brief lands
- Any class scoped specifically to render the dropped `§ ONBOARDING` label (`.ob-flow-label`, `.ob-section-label`, etc.) — should be removed
- Hardcoded "Onboarding" text in topbar components — should be replaced by the wordmark + step counter pattern

## Out of scope

- **Wordmark integration.** "Good Measure" Title Case in the topbar stays for now. Locked wordmark swap is deferred.
- **Step counter format change.** `STEP · 01 / 03` is the current format and stays.
- **Body content of any step.** All five steps' body layouts are unchanged. Eyebrows, headlines, ledes, forms, CTAs, BACK / CONTINUE rows — all stay.
- **Onboarding flow logic.** Form validation, state persistence, household member adding, theme picker, preset card selection, finish handler — all unchanged.
- **Step 4 preset card active state.** That's 3G's straggler. Don't fix in this brief.
- **The dashboard onboarding checklist** that appears on the user's first dashboard view after completing onboarding — that's a dashboard concern, not an onboarding concern. Out of scope.
- **Tip cards** that appear contextually during onboarding (per onboarding.md). Unchanged.
- **Italic moments on bookend headlines** (`Measure what matters` could potentially have an italic word). Step 6's italic typeface decision applies.

## Notes for the implementer

- This is a small brief. The change is one editorial element removal plus a wordmark addition to the topbar. Should be a short PR.
- The reason `§ ONBOARDING` was redundant: the user is going through a one-time flow with their own URL prefix and a step counter. They don't need a label confirming they're in onboarding. Same logic that drops "Currently logged in as: Jen" labels elsewhere — if the user can see they're signed in, no label needed.
- The topbar pattern (wordmark left + small mono right) is reusable. Auth uses it (wordmark + BACK), now onboarding uses it (wordmark + step counter). Consider promoting this to a shared `<EditorialTopbar>` component if the auth and onboarding layouts share enough structure to justify it. Not required for this brief.
- The body wordmark on Welcome and Complete bookends stays at 32px. This is correct and intentional — the bookend pages are ceremonial moments where the brand is meant to register at full size. The topbar wordmark at 18px is the chrome-level identifier; the body wordmark at 32px is the ceremonial moment. Don't merge the two.
- The Welcome page currently has the body wordmark *and* a `§ WELCOME` body eyebrow *and* the topbar `WELCOME` label. After this brief: topbar `WELCOME` + body wordmark + body `§ WELCOME` eyebrow. The two `WELCOME`s in different registers (topbar mono small, body eyebrow mono small with `§`) are intentional — they reinforce each other rather than compete. Verify during review that this doesn't feel redundant; if it does, the topbar `WELCOME` could be replaced with empty space or with a `STEP · 00 / 03` style, but the current spec keeps `WELCOME` for symmetry with `READY` on Complete.


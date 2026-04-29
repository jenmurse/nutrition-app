# Brief 16 — Onboarding voice + typography pass

## Goal

Bring the onboarding wizard at `/onboarding` into the same editorial register as the landing and auth. The wizard is functional but currently doesn't match the voice or typography of either. After this brief, onboarding reads as a continuous editorial entrance from auth → wizard → dashboard.

This is a voice + typography pass on existing structure. The wizard's step model (Welcome → Profile → Household → Goals → Complete) is unchanged.

## Scope

Five steps, all centered single-column layout:

1. Welcome
2. Profile (step 01 / 03)
3. Household (step 02 / 03)
4. Goals (step 03 / 03)
5. Complete

No split layout on any step. The auth → onboarding visual continuity comes from typography, the `§ EYEBROW` pattern, the sage `<em>` accent, and the sharp black CTAs. Layout pivots from split (auth) to centered (onboarding) intentionally — onboarding is a sequential flow, and centered communicates "guided wizard" more clearly than split.

## Locked decisions before writing code

These were resolved during the design pass for this brief. Don't re-litigate:

- **Centered single-column for all five steps.** No split layout.
- **Sage `<em>` accent on Welcome and Complete only.** Dropped on Profile, Household, Goals to keep the accent from becoming a tic.
- **Step counter format:** `01 / 03`, `02 / 03`, `03 / 03`. Welcome and Complete have no counter (those screens hide the counter, not display "00 / 03"). The three numbered steps are the setup steps after Welcome.
- **Filled black CONTINUE button on every step.** CONTINUE is the page primary on each step, so per Brief 15's button rule it stays filled.
- **Household step is skippable past the first person.** Solo households are valid. The user can add more people later in Settings.
- **Complete checkmark = black hairline.** Stroke circle with stroke check inside, in `var(--fg)`. Not sage, not solid fill.

## Visual structure (applies to every step)

```
┌─────────────────────────────────────────────────┐
│  Good Measure                          02 / 03  │  ← top chrome row
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│                  § EYEBROW                      │
│                                                 │
│             Headline goes here.                 │  ← centered max-width column
│                                                 │
│             Lede sits below in DM Sans          │
│             with a forced line break.           │
│                                                 │
│             [form / interactive content]        │
│                                                 │
│        ← BACK                  CONTINUE         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Top chrome (all steps)

- Wordmark top-left: `Good Measure` in DM Sans 700, 18px, letter-spacing -0.02em, color `var(--fg)`.
- Step counter top-right: DM Mono 9px, letter-spacing 0.14em, color `var(--muted)`. Format: `01 / 03`. Hidden on Welcome and Complete.
- Top chrome row uses `padding: 14px 32px` (desktop) and `padding: 14px 24px` (mobile).
- No border below the top chrome row. Open paper-bg page.

### Content column

- Centered, `max-width: 480px` for Welcome / Profile / Complete, `max-width: 520px` for Household, `max-width: 560px` for Goals (the goals card grid wants more room).
- Vertical padding: `padding: 56px 40px` desktop, `padding: 40px 24px` mobile.
- Headline is centered text-align on Welcome and Complete (the bookend moments). Profile, Household, Goals can leave the headline + lede centered too — keeps all five steps consistent.

### Eyebrow

- DM Mono 9px, letter-spacing 0.14em, uppercase, color `var(--muted)`.
- Format: `§ WELCOME` / `§ YOUR PROFILE` / `§ YOUR HOUSEHOLD` / `§ DAILY GOALS` / `§ READY`.
- Margin below: 24px.

### Headline

- DM Sans 500, letter-spacing -0.025em to -0.03em, line-height 1.0–1.05.
- Sizes vary by step (see per-step section).
- Sage `<em>` accent on Welcome and Complete only — `em { font-style: normal; color: var(--accent); }` already exists globally.
- Margin below: 16–20px.

### Lede

- DM Sans 13–14px, line-height 1.7, color `var(--fg-2)`.
- Forced line break (`<br/>`) where natural — see per-step copy.
- Margin below: varies (32–56px) depending on whether form content follows immediately or there's a single CTA.

### Action row (bottom)

- Back link bottom-left: `← BACK` in DM Mono 9px, letter-spacing 0.14em, color `var(--muted)`. Hover: `var(--fg)`. Hidden on Welcome (no back from first step) and on Complete.
- Continue button bottom-right: `.btn-primary` (filled black, sized to content, 8px 14px or whatever the post-Brief-15a padding is). Label: `CONTINUE` for Profile/Household/Goals, `GET STARTED →` on Welcome, `GO TO DASHBOARD →` on Complete.
- Action row sits with `margin-top: 40px` from the form/content above.

## Per-step specification

### Step: Welcome

- No step counter (top-right is empty / hidden).
- Eyebrow: `§ WELCOME`
- Headline: `Measure what matters.` (size: 48px DM Sans 500, sage `<em>` on `matters`)
- Lede: `A nutrition tracker built around real recipes,<br/>real households, and the way you actually cook.`
- Single CTA only: filled black `GET STARTED →`, centered. No back link, no form below the lede.
- Vertical centering: this step uses more vertical padding than the others (`padding: 80px 40px` desktop) so the headline floats more in the upper half of the screen.

### Step: Profile (01 / 03)

- Step counter: `01 / 03`
- Eyebrow: `§ YOUR PROFILE`
- Headline: `Pick your color.` (size: 36px, no sage accent)
- Lede: `Your color marks what's yours across the app.<br/>Avatar, planner column, the accent on this page.`
- Form:
  - `NAME` label (DM Mono 9px) + bottom-border-only input (existing `.input` style)
  - `THEME` label + 8 round theme swatches in a row (22px circles, 12px gap), max-width 320px, centered. Selected state: 1.5px black ring around the swatch (`box-shadow: 0 0 0 1.5px var(--fg)`).
  - When user picks a theme, `--accent` updates live across the page via `document.documentElement.style.setProperty()` — same mechanism as the rest of the app.
- Action row: `← BACK` left, filled black `CONTINUE` right.

### Step: Household (02 / 03)

- Step counter: `02 / 03`
- Eyebrow: `§ YOUR HOUSEHOLD`
- Headline: `Who else is eating?` (size: 36px, no sage accent)
- Lede: `Add the people you're planning meals for.<br/>Each gets their own goals, plan, and color.`
- Form:
  - `HOUSEHOLD NAME` label + bottom-border-only input. Pre-filled with `{FirstName}'s household` and editable. The lede does NOT explain the field — the form label is doing the work.
  - `MEMBERS` label + ruled rows list:
    - Row 1 (the user themselves): theme dot + name + `YOU` mono tag right side. Not removable.
    - Each subsequent row: theme dot + name + `COPY INVITE LINK` action right side.
    - Final row: dashed-circle placeholder + "Add another person..." muted text + `+ ADD` action right side.
  - Each row separated by `border-bottom: 1px solid var(--rule)` (ruled-row pattern).
- **Skippable past the first person.** A solo household (just the user) is a valid state. The CONTINUE button is enabled with just the user listed — no validation requiring at least 2 people. The user can add more people later in Settings.
- **Invite link interaction:**
  - When `COPY INVITE LINK` is clicked, the link is copied to clipboard.
  - The action label changes briefly to `✓ COPIED — SEND TO {NAME}` for 2.5 seconds, then reverts to `COPY INVITE LINK`. This serves as both feedback and explanation in one moment.
  - DM Mono 9px, color `var(--ok)` during the confirmation state, then back to `var(--fg)`.
- Action row: `← BACK` left, filled black `CONTINUE` right.

### Step: Goals (03 / 03)

- Step counter: `03 / 03`
- Eyebrow: `§ DAILY GOALS`
- Headline: `A starting point.` (size: 36px, no sage accent)
- Lede: `Pick a preset close to what you're after.<br/>Tune the exact numbers later in Settings.`
- Form: 2x2 grid of preset cards (12px gap). Each card has:
  - DM Mono 9px label at top: `MAINTAIN` / `LEAN OUT` / `BUILD` / `CUSTOM`
  - DM Sans 13px short description: `Stay where you are.` / `Modest deficit.` / `Lean gain.` / `Set my own.`
  - DM Mono 9px detail line in `var(--muted)`: `2,000 KCAL · BALANCED` / `1,700 KCAL · HIGH PROTEIN` / `2,400 KCAL · HIGH PROTEIN` / `CONFIGURE LATER`
  - Card border: `1px solid var(--rule)` default. Selected state: `1px solid var(--fg)`. No fill change.
  - Card padding: `20px 18px`.
- Action row: `← BACK` left, filled black `FINISH →` right (note: not "CONTINUE" — this is the last setup step, so the label communicates that).

### Step: Complete

- No step counter.
- **Black hairline checkmark icon at top, centered.** 56px circle, 1.5px stroke in `var(--fg)`, with a 1.5px stroke check inside. Existing `scaleIn` keyframe (0.7 → 1, 350ms) on mount. Margin below: 32px.
- Eyebrow: `§ READY`
- Headline: `You're all set.` (size: 44px DM Sans 500, sage `<em>` on `set`)
- Lede: `Now let's add a recipe or two.<br/>The dashboard has a checklist to walk you through it.`
- Single CTA: filled black `GO TO DASHBOARD →`, centered. No back link.
- Vertical centering: like Welcome, this step uses more vertical padding (`padding: 88px 40px` desktop) for the bookend moment.

## Mobile

All five steps stack naturally at mobile widths since they're already centered single-column. Adjustments:

- Top chrome: `padding: 14px 24px` instead of `14px 32px`.
- Content column: `padding: 40px 24px` instead of `56px 40px` on Profile/Household/Goals; `padding: 56px 24px` on Welcome/Complete.
- Headline sizes scale down via `clamp()`: Welcome `clamp(36px, 8vw, 48px)`, Profile/Household/Goals `clamp(28px, 7vw, 36px)`, Complete `clamp(34px, 8vw, 44px)`.
- Theme swatches on Profile: 8 across still works at mobile widths since they're 22px each + 8px gap = 232px total. If it feels tight, drop the gap to 8px.
- Goals 2x2 grid stays 2x2 on mobile — the cards are short enough to fit two per row.
- The action row (back left / CONTINUE right) stays as a flex row on mobile. CONTINUE is wider than back, so the row still reads cleanly.

## Files

Primary:
- `app/onboarding/page.tsx` — the wizard component. This is the main file to rewrite.
- `app/onboarding/onboarding.css` (or wherever onboarding-specific CSS lives) — typography, spacing, and the new checkmark icon.

Reference:
- `design-system.md` — typography rules, the eyebrow pattern, the `§` convention, the action row pattern.
- `app/login/page.tsx` (auth) — the closest existing reference for typography register. Match this voice.
- `app/components/ContextualTip.tsx` — existing pattern for the kind of editorial language we're moving toward.

## Update design system

In `design-system.md` §8b "Onboarding wizard," replace the existing description with the new spec:

> **Onboarding wizard.** Centered single-column flow. Five steps: Welcome → Profile → Household → Goals → Complete.
>
> Top chrome: wordmark top-left in DM Sans 700/18px, step counter top-right in DM Mono 9px (format `01 / 03`, hidden on Welcome and Complete).
>
> Each step uses the editorial pattern: `§ EYEBROW` (DM Mono 9px) → headline (DM Sans 500, 36–48px) → lede (DM Sans 13–14px with forced line break) → form/interactive content → action row (`← BACK` left ghost, filled black CONTINUE right).
>
> Sage `<em>` accent on Welcome and Complete only. The interior steps (Profile, Household, Goals) are functional setup and don't need the accent.
>
> Welcome and Complete have no step counter and no back link — they're bookend moments. Welcome uses extra vertical padding to float the headline higher; Complete includes a black hairline checkmark icon above the eyebrow.
>
> Household step accepts solo households (just the user). No validation requires multiple people.
>
> Theme picker on Profile updates `--accent` live as the user clicks a swatch — same mechanism as the in-app person switcher.

Remove the "voice and typography is being aligned" note that's currently in §8b — it's now aligned.

## Update inventory tracker

In `APP-INVENTORY.md`:

- Move "Onboarding voice + typography pass" out of P0 into the shipped list under whatever shipped-items section exists.
- Update the "Open questions" section: remove Q3 about onboarding mockup direction (resolved: centered).

## Update onboarding doc

In `onboarding.md`, update the §"Layer 1: Onboarding wizard" section:

- Remove the line about voice and typography being pending.
- Update the description to reflect the new structure (centered, five steps with the editorial pattern, sage accent on bookends only, etc.).
- Keep the existing implementation notes about `Person.onboardingComplete` and the auth callback — those are unchanged.

## Acceptance

After merge:

1. Sign up as a new user. Auth → onboarding transition feels continuous (typography, sage accent on Welcome headline, paper bg, sharp CTAs).
2. Welcome screen: large centered headline with sage `<em>` on "matters". One CTA. No step counter.
3. Profile screen: `01 / 03` top right. Headline "Pick your color." (no sage). Theme swatches update `--accent` live.
4. Household screen: `02 / 03`. Pre-filled household name. CONTINUE works with just the user listed (no validation block). COPY INVITE LINK changes to confirmation state on click for 2.5s.
5. Goals screen: `03 / 03`. 2x2 preset grid. Selected card has 1px black border, others have 1px rule border.
6. Complete screen: black hairline checkmark with `scaleIn` animation. Headline "You're all set." with sage on "set". `GO TO DASHBOARD →` button.
7. Mobile (393px width): all five screens stack and remain readable. Theme swatches fit. Goals grid stays 2x2.
8. `design-system.md §8b` reflects the new wizard spec.
9. `onboarding.md` §"Layer 1" reflects the new structure.
10. `APP-INVENTORY.md` shows onboarding moved to shipped, Q3 removed from open questions.

## Effort

Medium. Five-step rewrite of the onboarding component, new checkmark icon, doc updates across three files. Probably 4–6 hours.

# Brief 14 — Auth Page Redesign

**Status:** ready to implement
**Mockup:** `auth-split-v2.html` (in public / project folder, approved)
**Dependencies:** none — Brief 12 toolbar primitives already in place
**Scope:** purely cosmetic except for one new wired action (forgot password)

---

## What this brief is and isn't

**Is:** a visual redesign of the existing auth page to match the app and landing's editorial register. The current auth uses pill segmented controls, pill submit buttons, pill OAuth buttons, and a narrow centered card — none of which match the app or landing anymore. This brings auth into line with the locked decisions from Briefs 06–12.

**Is not:** a change to how authentication works. Do not touch:

- The auth route structure (`/login`, `/login?signup=1`, etc.)
- How users navigate from the landing to the auth page (`Sign In` → `/login`, `Get Started ↗` → `/login?signup=1` with Create Account tab pre-selected)
- The Google OAuth flow (Supabase OAuth, callback handling, redirect)
- The Supabase auth callback at `/auth/callback`
- The `Person.onboardingComplete` redirect logic (false → `/onboarding`, true → `/`)
- The session handling, cookie storage, or middleware
- The invite link flow (`/login?invite=...`)
- Form validation rules (email format, password length, etc.) — current rules stay
- Any server-side logic on submit

If you find yourself touching anything in `/api/auth/`, `middleware.ts`, the Supabase client, or the auth callback route, you've gone outside the scope of this brief. Stop and confirm.

**The one new wiring task:** forgot password. See §6 below.

---

## Reference

The mockup is `auth-split-v2.html`. Open it in a browser. Toggle between the SIGN IN and CREATE ACCOUNT tabs to see both modes — the eyebrow, headline, lede, fields, and submit button text all change. The mockup is the visual source of truth. Where this brief and the mockup conflict, the mockup wins.

---

## 1. Layout

Two-column split, full viewport (no max-width container, no centered card).

```
┌──────────────────────────────────────────────────────────┐
│  Good Measure                                  ← Back     │  ← top nav, hairline below
├──────────────────────────────────────────────────────────┤
│                            │                              │
│                            │                              │
│   § Sign in                │   [Sign in] · Create account │
│                            │                              │
│   Pick up where you        │   Email                      │
│   left off.                │   ____________________       │
│                            │                              │
│   Your pantry, your        │   Password           Forgot  │
│   recipes, the week...     │   ____________________       │
│                            │                              │
│                            │   [    Sign in    ]          │
│                            │                              │
│                            │   ─── Or ───                 │
│                            │                              │
│                            │   [ G  Continue with Google ]│
│                            │                              │
└────────────────────────────┴──────────────────────────────┘
```

- Left column: `1.15fr`. Right column: `1fr`. Vertical hairline divider between them in `--rule`.
- Both columns share the paper bg `var(--bg)`. No accent fills, no tinted panels.
- Below 760px: stack to single column. Left becomes top, right becomes bottom. Hairline becomes horizontal.
- Top nav above both columns. Below it, both columns sit on the same row and fill the remaining viewport height (`min-height: calc(100vh - 57px)`).

### Spacing
- Left column padding: `48px 56px` desktop, `40px 28px` mobile
- Right column padding: `48px 64px` desktop, `40px 28px` mobile
- Form max-width: `380px`, centered horizontally inside the right column

---

## 2. Top nav

Same height and treatment as the landing's nav. Hairline below in `--rule`.

- Left: `Good Measure` wordmark, sentence case, DM Sans 700, 13px, `letter-spacing: -0.02em`. Links to `/`.
- Right: `← Back` text link. DM Mono 9px uppercase, `letter-spacing: 0.14em`, color `--fg`. Links to `/`.

The wordmark also goes home, but the explicit `← Back` is clearer for users who don't recognize a wordmark as a button. Keep both.

---

## 3. Left column — editorial side

Three-row vertical layout via `display: flex; flex-direction: column; justify-content: space-between`. Top and bottom are empty spacers; middle holds the content. This vertically-centers the headline group while leaving room to grow if we add anything top or bottom later.

### Eyebrow
- DM Mono 9px, `letter-spacing: 0.18em`, uppercase
- Color: `var(--muted)`
- Margin-bottom: `32px`
- Format: `§ Sign in` (sign in mode) / `§ Create account` (create mode)
- Section symbol prefix matches landing convention (`§ Premise`, `§ Method`, `§ Invitation`)

### Headline
- DM Sans **500** weight (NOT 700 — matches landing hero exactly)
- `font-size: clamp(40px, 4.5vw, 60px)`
- `line-height: 1.05`
- `letter-spacing: -0.035em`
- `text-wrap: balance`
- `max-width: 560px`
- Margin-bottom: `28px`
- One word per headline gets the sage `<em>` accent treatment (see §3a)

### Lede
- DM Sans 14px regular
- `line-height: 1.7`
- Color: `var(--fg-2)`
- `text-wrap: pretty`
- `max-width: 420px`
- Forced line break (`<br />`) at the specified point in each lede — see §3a copy block

### 3a. Copy (final)

| State | Eyebrow | Headline | Lede |
|---|---|---|---|
| **Sign in** | `§ Sign in` | Pick up where you `<em>`left&nbsp;off.`</em>` | Your pantry, your recipes, the week you were planning.`<br />`All measured to the&nbsp;gram. |
| **Create account** | `§ Create account` | Cook the way you `<em>`actually&nbsp;cook.`</em>` | Build your pantry once. Plan a week against it.`<br />`Let the math take care of&nbsp;itself. |

**Notes on the copy:**
- Em-accent word: `left off` (sign in), `actually cook` (create) — the create-account headline deliberately echoes the landing hero ("for people who actually cook")
- `&nbsp;` between the last two words on each em-accent phrase prevents widow-on-second-line breaks
- Forced `<br />` in both ledes is intentional — it sets the line break exactly where the period falls. Do not replace with regular space; the line break is the design decision.

### Sage em styling

```css
em { font-style: normal; color: var(--accent); }
```

Color `var(--accent)` defaults to sage `#5A9B6A`. **Do not let `<em>` inherit the active person theme** — auth happens before a person is selected, so the accent should stay sage at all times. If `var(--accent)` is being driven by person theme elsewhere, hardcode this `<em>` rule to `color: #5A9B6A` to be safe.

---

## 4. Right column — form

### 4a. Tabs (Sign In / Create Account)

Replaces the existing pill segmented control. Use the same baseline-underline treatment as the top app nav.

```css
.auth-tabs {
  display: flex; gap: 28px;
  margin-bottom: 36px;
  border-bottom: 1px solid var(--rule);
}
.auth-tab {
  background: none; border: none; padding: 0 0 12px;
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  position: relative;
}
.auth-tab.active { color: var(--fg); }
.auth-tab.active::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 1.5px;
  background: var(--fg);
}
```

- Two tabs: `Sign in` and `Create account` (sentence case)
- Active state: text in `--fg`, 1.5px underline directly below text in `--fg`
- Inactive state: text in `--muted`, no underline
- Switching tabs swaps the form fields, the submit button text, and the left-column eyebrow + headline + lede (all five change together)

**Routing:**
- Default route `/login` → SIGN IN tab active
- `/login?signup=1` → CREATE ACCOUNT tab active
- `/login?invite=<token>` → CREATE ACCOUNT tab active (existing invite flow)
- Tab clicks update the URL query param via `window.history.replaceState` so refreshing preserves the tab — same pattern as the recipes filter state from Brief 09

### 4b. Field stack

**Sign In mode:**
1. Email
2. Password (with right-aligned `Forgot` link in the label row)

**Create Account mode:**
1. Name
2. Email
3. Password (no `Forgot` link)
4. Confirm password

Field order matters. Name comes first in Create Account, not Email — matches what the user thinks of themselves before what they think of their address.

### 4c. Field styling

All inputs use the existing app form pattern: bottom-border-only, no box, no fill, no radius.

```css
.auth-field { display: block; margin-bottom: 24px; }
.auth-label {
  display: block;
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}
.auth-input {
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--rule);
  padding: 6px 0;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--fg);
  outline: none;
  border-radius: 0;
}
.auth-input:focus { border-bottom-color: var(--fg); }
.auth-input.password { letter-spacing: 0.15em; }
```

### 4d. Password label row (Sign In only)

The PASSWORD label and the FORGOT link share a row, baseline-aligned.

```css
.auth-label-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 8px;
}
.auth-label-link {
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted);
  text-decoration: none;
}
.auth-label-link:hover { color: var(--fg); }
```

In Create Account mode, the FORGOT link is hidden (`display: none`). It returns when the user switches back to Sign In.

### 4e. Submit button

Full-width version of the canonical sharp toolbar CTA from Brief 12.

```css
.auth-submit {
  width: 100%;
  background: var(--fg); color: var(--bg);
  border: 1px solid var(--fg); border-radius: 0;
  padding: 12px 14px;
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  cursor: pointer;
  margin: 8px 0 20px;
}
.auth-submit:hover { opacity: 0.9; }
.auth-submit:active { transform: scale(0.98); }
```

- Text: `Sign in` in sign-in mode, `Create account` in create mode
- Sharp corners (radius 0)
- Black fill, paper-color text
- Hover: 90% opacity (theme-safe per design-system.md §18d — never use a hardcoded hover hex)
- No submit button height variation between modes — same height, same padding, same font

### 4f. OR separator

```css
.auth-or {
  display: flex; align-items: center; gap: 12px;
  margin: 4px 0 16px;
}
.auth-or-rule { flex: 1; height: 1px; background: var(--rule); }
.auth-or-text {
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted);
}
```

Hairline rule both sides, "Or" in DM Mono uppercase between.

### 4g. Google OAuth button

**Apple OAuth is removed.** Google only.

```css
.auth-oauth {
  width: 100%;
  background: none; color: var(--fg);
  border: 1px solid var(--rule); border-radius: 0;
  padding: 12px 14px;
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 10px;
}
.auth-oauth:hover { border-color: var(--fg); }
.auth-oauth:active { transform: scale(0.98); }
```

- Sharp corners, hairline `--rule` border, no fill
- Google four-color SVG glyph at 13×13px on the left, label "Continue with Google" centered next to it
- Hover: border darkens to `--fg`, matches outlined toolbar buttons
- **Behavior unchanged:** clicking this triggers the existing Google OAuth flow via Supabase. Do not modify the OAuth implementation, scopes, redirect URLs, or callback handling. The button is purely a CSS replacement.

### 4h. Removed elements

Delete these from the existing auth page:

- The `Continue with Apple` button (was already a stub if unwired; remove it entirely from the JSX and any unused Supabase Apple OAuth config)
- The `By signing in you agree to our terms` line at the bottom of the form
- The footer attribution line if one currently exists on the auth page

If there's an Apple OAuth config in Supabase that's unused, leave the Supabase side alone — only remove the button from the frontend. Don't change Supabase configuration as part of this brief.

---

## 5. Mobile (≤760px)

Stack split to single column. Left becomes top, right becomes bottom.

- Top column: editorial side, padding `40px 28px`, hairline `var(--rule)` below (no longer right)
- Bottom column: form side, padding `40px 28px`
- Headline scales down naturally via `clamp(40px, 4.5vw, 60px)` — no override needed
- Form max-width `380px` still applies but will fit the column width on phones

The mockup `auth-split-v2.html` includes a working mobile breakpoint at 760px. Use it as the reference.

---

## 6. Forgot password — the one wired addition

This is the only non-cosmetic part of the brief. The current auth page has no forgot-password affordance. Supabase exposes the password reset flow; we just haven't surfaced it.

### What to wire

1. **Forgot link** in the password label row (Sign In mode only). Clicking it should open a forgot-password flow.
2. **Use Supabase's existing `resetPasswordForEmail` method.** Code reference:
   ```ts
   await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${origin}/auth/reset-password`,
   });
   ```
3. **Reset password landing page** at `/auth/reset-password` — Supabase redirects here with a recovery token in the URL hash. The page reads the token, accepts a new password, and calls `supabase.auth.updateUser({ password })`.

### UX flow

Two reasonable approaches — pick whichever is simpler:

**Option A — inline:**
- Click `Forgot` → form on the right column swaps to a single Email field + `Send reset link` submit
- On submit, show a confirmation: `Check your email for a reset link.` (DM Mono eyebrow + DM Sans 13px body)
- Add a `← Back to sign in` link below to return to the SIGN IN tab
- Left column eyebrow/headline/lede swap to: `§ Reset password` / `Forgot? It happens.` / `Enter the email tied to your account and we'll send a reset link.` (em-accent on `happens.`)

**Option B — separate route:**
- `Forgot` → navigate to `/login/forgot` which is its own page using the same split layout
- Same content as Option A, just at a different URL

**Recommendation: Option A.** Fewer routes, no new layout file, state lives in the existing `/login` page. The URL stays `/login` and a query param like `?mode=forgot` toggles the view. Same `replaceState` pattern as the tabs.

### Reset page

Build `/auth/reset-password` as a single-purpose page using the same split layout:
- Left column eyebrow: `§ Set new password` / Headline: `Pick something you'll remember.` (em on `remember.`) / Lede: `Use at least 8 characters.`
- Right column: New password field + Confirm password field + `Update password` submit button (canonical sharp black CTA)
- On success: redirect to `/` (Supabase will have signed the user in via the recovery session)
- On error (token expired, etc.): show inline error message under the form, plus a `← Back to sign in` link

### What NOT to build

- No password strength meter
- No security questions
- No second factor / 2FA — out of scope, not exposed in Supabase yet
- No magic link login — out of scope, not requested

---

## 7. Acceptance criteria

A reviewer should be able to confirm all of these by visiting `/login` in a browser:

### Visual
- [ ] Two-column split layout, paper bg both sides, vertical hairline divider in `--rule`
- [ ] Top nav matches landing: `Good Measure` wordmark left, `← Back` link right, hairline below
- [ ] Left column: eyebrow with `§` prefix, big DM Sans 500 headline with sage em on one word, lede with forced `<br />` line break
- [ ] Right column: tabs (baseline underline), bottom-border-only inputs, full-width sharp black submit, OR separator, single Google OAuth button
- [ ] No pill shapes anywhere on the page
- [ ] No card containers, no fills, no rounded corners except identity markers (none on this page)
- [ ] No "Continue with Apple" button
- [ ] No terms-of-service line at the bottom
- [ ] No footer attribution

### Behavioral
- [ ] `/login` defaults to SIGN IN tab
- [ ] `/login?signup=1` defaults to CREATE ACCOUNT tab
- [ ] `/login?invite=<token>` defaults to CREATE ACCOUNT tab and preserves the invite flow
- [ ] Switching tabs updates the URL query param without remounting the page
- [ ] Switching tabs swaps eyebrow + headline + lede + field stack + submit button text together
- [ ] Email + password Sign In flow works (Supabase email/password)
- [ ] Name + email + password + confirm Create Account flow works (Supabase signup, Person creation, redirect to onboarding)
- [ ] Google OAuth flow works unchanged (Supabase OAuth)
- [ ] Onboarding redirect for new accounts works (existing `Person.onboardingComplete` logic)
- [ ] Invite flow works unchanged
- [ ] **New:** Forgot link triggers Supabase password reset email
- [ ] **New:** `/auth/reset-password` page accepts the recovery token and updates the user password
- [ ] **New:** After successful reset, user is signed in and lands on `/`

### Mobile
- [ ] At ≤760px, layout stacks: editorial top, form bottom
- [ ] Hairline divider becomes horizontal between the two stacked sections
- [ ] Headline still readable, scales via clamp
- [ ] Form is fully usable on a phone, no horizontal scroll, no overlapping elements

### Dark mode
- [ ] All tokens resolve correctly in dark mode
- [ ] Sage em color stays sage (don't let it adopt the person theme — auth happens before person is selected)

---

## 8. Files to update

CSS classes go in `globals.css`. Use the `auth-` prefix for everything new.

- Replace existing auth styles (the legacy `.auth-wrap`, `.auth-card`, `.auth-mode-toggle`, `.auth-mode-btn`, `.auth-submit`, `.auth-oauth`, `.auth-sep` from design-system.md §12) with the new versions in this brief
- Update `design-system.md §12` to reflect the new auth pattern. The current §12 is now stale.
- Update the radius token table in design-system.md §7 — confirm `auth-submit` and `auth-oauth` are NOT in the pill row (they're sharp now)
- Update the auth route component(s) — likely `app/login/page.tsx` and a new `app/auth/reset-password/page.tsx`

If any other doc references the old pill-shaped auth (e.g., screenshots in onboarding flow docs), flag them but don't update them — those can be cleaned up later.

---

## 9. What this brief does not touch

- Onboarding wizard (separate brief, lives at `/onboarding`)
- Any logged-in app surface
- The landing page
- Settings → People (invite flow UI lives there, not changed by this brief)
- The `Person.onboardingComplete` field or related redirect logic
- Supabase configuration (auth providers, email templates, redirect URLs) — these stay as configured

---

## Cross-references

- `auth-split-v2.html` (mockup) — visual source of truth
- Brief 12 — toolbar CTA primitives (sharp black rectangles, used here for the submit button)
- Brief 09 — outlined button border = `var(--rule)` (used here for OAuth button)
- design-system.md §4e — form input pattern (border-bottom only, no box) — already canonical, used unchanged
- design-system.md §12 — the existing auth spec, which this brief supersedes
- design-system.md §18d — hardcoded hex rule (use opacity for hover, not hex)
- LANDING-BRIEF.md — voice rules and the `actually` em-accent move that the create-account headline echoes

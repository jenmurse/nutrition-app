# BRIEF 3E — Auth rebuild (revised)

**Part of:** Step 3 of the design pass.
**Scope:** Single PR. Desktop and mobile auth surfaces — sign in, create account, and any related auth routes (forgot password, password reset, email verification, magic link confirmation if they exist).
**Depends on:** 3A (tokens) merged. The 3A follow-up that swept the hardcoded white panel is also assumed merged. Independent of 3B, 3D, 3F, 3G — can run in parallel.
**Blocks:** Nothing.
**Supersedes:** brief-3E-auth-rebuild.md (original draft, written before the eyebrow / letter-spacing / headline-size locks landed in 3D-2).

---

## Why this brief

Auth was originally scheduled as Step 7 of the master plan. It's been pulled forward into Step 3 because the same chrome questions apply. The auth route is in the editorial register (cream paper) and currently has structural problems: the legacy white right-panel was a known issue, the divider between editorial half and form half was missing, and the wordmark integration is pending.

3A's follow-up swept the hardcoded white so both panels now sit on `--bg`. This brief completes the auth rebuild: hairline divider, locked editorial header treatment, italic placeholder for Step 6, mobile single-column variant, and any straggler chrome.

After this brief, auth fully matches the editorial register convention. The wordmark integration step (3C, deferred) will swap in the locked wordmark when ready.

## Reconciliation with locked decisions

This brief reconciles with several locks that landed AFTER the original 3E draft was written. If you've read the earlier draft, these are the deltas:

1. **Eyebrow size locked to 9px system-wide** (was specced at 11px in the original draft). Applies to `§ SIGN IN` and `§ CREATE ACCOUNT`.
2. **Eyebrow letter-spacing locked to 0.14em** (was 0.16em in places).
3. **Editorial page headline size locked to `clamp(36px, 4.4vw, 64px)`** to match Compare, Shopping, Add Meal (was `clamp(40px, 5vw, 64px)`).
4. **Active-state underline width must match text glyph width exactly** (locked during 3D-2 work on Add Meal rail).
5. **Mobile divider approach locked to `display: none` on the divider element + `border-bottom` on the editorial half.** Pick one. (Original brief allowed either.)
6. **Page wrapper must have `data-register="editorial"`** for tokens to resolve to cream values.

## What's wrong now

Looking at `desktop_auth_sign_in.png` and `desktop_auth_create.png`:

1. **The hardcoded white right panel was killed** in the 3A follow-up. Both panels now sit on cream `#F5F4EF`. ✓ no longer an issue.
2. **No vertical hairline divider between the editorial half and the form half.** Without the white panel as a visual divide, the two halves blend into one continuous cream surface. The hairline is the locked replacement.
3. **Topbar wordmark is "Good Measure" Title Case bold sans.** Will be replaced when wordmark integration ships (deferred). For now, leave as-is.
4. **BACK link in topbar right.** Currently `← BACK` mono. Correct treatment, no change needed structurally.
5. **Editorial half** has correct structure: `§ SIGN IN` or `§ CREATE ACCOUNT` eyebrow + display headline + lede. Italic on `left off` and `actually cook` is currently rendered as bold sans (italic typeface deferred to Step 6). Correct.
6. **Form half** structure is correct: SIGN IN / CREATE ACCOUNT tab toggle (active underline), bottom-border-only inputs, sharp filled black primary CTA, OR divider, Google SSO outlined button.
7. **No mobile spec audit yet.** Mobile auth needs verification and explicit single-column treatment with horizontal hairline.

## Spec

### A · Page-level register and container

The auth page wrapper MUST have `data-register="editorial"` so the editorial token values (cream `--bg`, etc.) resolve correctly:

```jsx
<div className="auth-page" data-register="editorial">
  <Topbar />
  <div className="auth-body">
    {/* ... */}
  </div>
</div>
```

The auth-body spans the full viewport width — no max-width container. This is a deliberate exception to the editorial register's usual 1100px content container, because the auth surface is a top-level entry point and the symmetry of two equal halves reads better at full viewport width.

### B · Vertical hairline divider (desktop)

A 1px vertical hairline runs between the editorial half (left) and the form half (right). Replaces the visual divide previously provided by the white panel.

```jsx
<div className="auth-body">
  <div className="auth-editorial">
    {/* left half: § eyebrow + headline + lede */}
  </div>
  <div className="auth-divider" />
  <div className="auth-form">
    {/* right half: tabs + form */}
  </div>
</div>
```

```css
.auth-body {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  min-height: calc(100vh - var(--nav-h));
}

.auth-divider {
  background: var(--rule);
  width: 1px;
}

.auth-editorial,
.auth-form {
  padding: 80px 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

The hairline is full-height between the two panels. The `1px` column in the grid is the divider; the editorial and form halves take equal `1fr` columns on either side.

**Why grid and not flexbox.** Grid with an explicit divider column makes the hairline a structural element, not a border on one of the panels. This matches the editorial system's preference for explicit hairlines over implied borders.

**Why `var(--rule)` and not `var(--fg)`.** The hairline is structural chrome, not a heavy boundary. The `--rule` color matches every other content hairline in the editorial register. If during review the divider feels too quiet, it stays — quiet is correct here.

### C · Mobile single-column layout

On mobile, the two halves stack vertically. The vertical divider is hidden via `display: none`, and the editorial half gets a `border-bottom: 1px solid var(--rule)` to mark the seam.

```css
@media (max-width: 768px) {
  .auth-body {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - var(--nav-h));
  }

  .auth-editorial,
  .auth-form {
    padding: 48px 24px;
  }

  .auth-editorial {
    border-bottom: 1px solid var(--rule);
  }

  .auth-divider {
    display: none;
  }
}
```

Mobile breakpoint is 768px (or whatever the existing system uses — confirm against design-system.md before committing).

**Mobile order:** editorial half first (top), form half second (bottom). Reading order matches desktop left-to-right.

**Mobile vertical centering.** Desktop uses `justify-content: center` on each panel. On mobile with stacked halves, `justify-content: center` would push content to the middle of each half, which feels off. Switch to `justify-content: flex-start` with appropriate top padding instead. The editorial half opens with its eyebrow + headline; the form half opens with its tab toggle + inputs.

### D · Editorial half (desktop and mobile)

**Sign In page:**

```jsx
<div className="auth-editorial">
  <span className="eyebrow">§ SIGN IN</span>
  <h1 className="auth-title">
    Pick up where you<br />
    <em>left off</em>.
  </h1>
  <p className="auth-lede">
    Your pantry, your recipes, the week you were planning.<br />
    All measured to the gram.
  </p>
</div>
```

**Create Account page:**

```jsx
<div className="auth-editorial">
  <span className="eyebrow">§ CREATE ACCOUNT</span>
  <h1 className="auth-title">
    Cook the way<br />
    you <em>actually cook</em>.
  </h1>
  <p className="auth-lede">
    Build your pantry once. Plan a week against it.<br />
    Let the math take care of itself.
  </p>
</div>
```

```css
.auth-editorial .eyebrow {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 24px;
  line-height: 1.2;
}

.auth-title {
  font: 700 clamp(36px, 4.4vw, 64px) var(--font-sans);
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--fg);
  margin-bottom: 32px;
  text-wrap: balance;
}

.auth-lede {
  font: 400 16px var(--font-sans);
  line-height: 1.55;
  color: var(--fg-2);
  max-width: 480px;
}
```

**Why 9px / 0.14em on the eyebrow.** This is the system-wide locked eyebrow token (resolved during 3D-2). Same value as `§ NUTRITION COMPARISON` on Compare, `§ APR 26 - MAY 2` on Shopping, and `§ TUESDAY, APRIL 28` on Add Meal. Auth's `§ SIGN IN` is the same role: page-level editorial marker above a display headline. Use the same token.

**Why headline at `clamp(36px, 4.4vw, 64px)`.** This is the locked editorial-page-headline size from 3D-2. Compare, Shopping, and Add Meal all use it. Auth gets the same treatment for consistency.

**Italic moments — render as bold sans for now.** The `<em>left off</em>` and `<em>actually cook</em>` markup stays in place but renders as the same sans 700 as the surrounding text *until the Step 6 italic typeface decision lands.* This is intentional: keep the markup ready for a future swap, but don't render italic without a chosen typeface (Instrument Serif vs alternatives is still TBD).

To render `<em>` as bold sans temporarily:

```css
.auth-title em {
  font-style: normal;
  font-weight: 700;
  font-family: inherit;
}
```

When Step 6 picks the italic typeface, this rule swaps to:

```css
.auth-title em {
  font-style: italic;
  font-weight: 400; /* or whatever the chosen typeface needs */
  font-family: var(--font-serif);
}
```

The brief explicitly preserves the `<em>` markup so the future swap is one CSS rule change, not a content rewrite.

### E · Form half (desktop and mobile)

The form half currently has the right structure. This brief verifies it and locks any drift.

**Tab toggle:** SIGN IN / CREATE ACCOUNT. Underline-active per the locked active-state convention.

```jsx
<div className="auth-tabs">
  <button className={`auth-tab ${mode === 'sign-in' ? 'active' : ''}`}>
    SIGN IN
  </button>
  <button className={`auth-tab ${mode === 'create' ? 'active' : ''}`}>
    CREATE ACCOUNT
  </button>
</div>
```

```css
.auth-tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid var(--rule);
  margin-bottom: 32px;
}

.auth-tab {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  background: none;
  border: none;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1.5px solid transparent;
  margin-bottom: -1px; /* align with the container's bottom border */
  transition: color 120ms var(--ease-out);
  display: inline-block;
  width: auto;
}

.auth-tab:hover { color: var(--fg); }

.auth-tab.active {
  color: var(--fg);
  border-bottom-color: var(--fg);
}
```

**Active underline width MUST match text glyph width exactly.** When SIGN IN is active, the underline is exactly the visual width of the S-I-G-N space I-N glyphs, not wider. When CREATE ACCOUNT is active, same — underline matches glyph bounds.

To enforce this:
- `display: inline-block; width: auto` on `.auth-tab` (NOT `width: fit-content` — that can include trailing letter-spacing space)
- The element wraps tightly to the text bounds
- The `border-bottom` spans only those bounds

If the underline visibly extends past the last character's right edge, the implementation is wrong. This was a recurring bug during 3D-2 work — call it out explicitly.

**Inputs:** Bottom-border-only, no rounded corners, no fill. Per design-system §5d.

```css
.auth-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--rule);
  border-radius: 0;
  padding: 8px 0;
  font: 400 14px var(--font-sans);
  color: var(--fg);
  outline: none;
}

.auth-input:focus {
  border-bottom-color: var(--fg);
}

.auth-input::placeholder {
  color: var(--muted);
  font: 400 11px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
```

**Field labels** are mono uppercase muted, sit above each input. These use the small-label size (9px) — distinct from the eyebrow but using similar tokens:

```jsx
<div className="auth-field">
  <label className="auth-label">EMAIL</label>
  <input type="email" className="auth-input" />
</div>
```

```css
.auth-label {
  display: block;
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

.auth-field {
  margin-bottom: 24px;
}
```

**FORGOT link** on the password field (sign-in mode):

```jsx
<div className="auth-field">
  <div className="auth-label-row">
    <label className="auth-label">PASSWORD</label>
    <button className="auth-forgot">FORGOT</button>
  </div>
  <input type="password" className="auth-input" />
</div>
```

```css
.auth-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.auth-forgot {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 120ms var(--ease-out);
}

.auth-forgot:hover { color: var(--fg); }
```

**Primary CTA:** Sharp filled black. SIGN IN or CREATE ACCOUNT depending on mode.

```css
.auth-cta {
  width: 100%;
  background: var(--fg);
  color: var(--bg);
  border: 1px solid var(--fg);
  border-radius: 0;
  padding: 16px 20px;
  font: 400 11px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 120ms var(--ease-out);
  margin-top: 16px;
}

.auth-cta:hover { opacity: 0.9; }
```

**Note on button-label size.** CTA labels use 11px mono (per existing button convention in design-system.md §5e). This is distinct from the 9px eyebrow token. Buttons are not eyebrows; they use the larger button-label size for tap-target legibility. Same applies to `.auth-sso` below.

**OR divider** between primary CTA and SSO button:

```jsx
<div className="auth-or">
  <div className="auth-or-line" />
  <span className="auth-or-text">OR</span>
  <div className="auth-or-line" />
</div>
```

```css
.auth-or {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
}

.auth-or-line {
  flex: 1;
  height: 1px;
  background: var(--rule);
}

.auth-or-text {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
```

**Google SSO** outlined button:

```jsx
<button className="auth-sso">
  <GoogleIcon />
  CONTINUE WITH GOOGLE
</button>
```

```css
.auth-sso {
  width: 100%;
  background: transparent;
  color: var(--fg);
  border: 1px solid var(--rule);
  border-radius: 0;
  padding: 14px 20px;
  font: 400 11px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: border-color 120ms var(--ease-out);
}

.auth-sso:hover {
  border-color: var(--fg);
}

.auth-sso svg {
  width: 16px;
  height: 16px;
}
```

The Google G icon is a small SVG. Color stays Google brand colors (per Google's brand guidelines for SSO buttons) — this is the one place in the system where non-token color is permitted.

### F · Topbar (desktop and mobile)

The topbar is unchanged in structure: wordmark left, BACK link right.

```jsx
<div className="auth-topbar">
  <span className="wm">Good Measure</span>
  <button className="auth-back">← BACK</button>
</div>
```

```css
.auth-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--nav-h);
  padding: 0 32px;
  border-bottom: 1px solid var(--rule);
  background: var(--bg);
}

.wm {
  font: 700 13px var(--font-sans);
  letter-spacing: -0.02em;
  color: var(--fg);
}

.auth-back {
  font: 400 9px var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg);
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 120ms var(--ease-out);
}

.auth-back:hover { opacity: 0.7; }
```

**Wordmark at 13px to match main app nav.** The original brief draft had 18px; that was a stale spec. The main app's top nav uses 13px DM Sans 700 letter-spacing -0.02em, and the auth topbar should match for cross-surface consistency. When wordmark integration (3C) lands, the locked `<BrandName />` component swaps in at whatever size it specifies.

**About the BACK link in the topbar — about the locked rule.** design-system.md has a locked rule (from 2D.2): "no top back-bar on child screens." This applies to editorial parent-to-child drill-ins within the app (e.g., Recipe Detail → Edit Recipe). Auth has its own dedicated topbar that is structurally separate from the main app nav — it's not a "child screen" of anything within the app's content hierarchy. The BACK link here returns the user to the landing page (pre-auth surface), which is a navigational action between top-level surfaces, not a content drill-in.

This is therefore not in conflict with the locked rule and doesn't require a documented exception.

**BACK link behavior.** Tapping returns to wherever the user came from — typically the landing page. Use router-back if available, fall back to explicit `/` navigation.

### G · Forgot password and email verification routes

If these routes exist (or any other auth-adjacent surfaces), they should follow the same pattern:

- Same topbar (wordmark + BACK)
- Same editorial register cream `var(--bg)` (page wrapper has `data-register="editorial"`)
- Single-column layout (no two-panel split for these). Centered editorial header at top, form below.

Specific forgot-password copy suggestions (Step 5 may revise):

```jsx
<div className="auth-single" data-register="editorial">
  <div className="auth-single-content">
    <span className="eyebrow">§ FORGOT PASSWORD</span>
    <h1 className="auth-title">
      Reset and try again.
    </h1>
    <p className="auth-lede">
      Enter your email. We'll send you a link.
    </p>
    {/* form with email input + SEND LINK CTA */}
  </div>
</div>
```

If these routes don't exist or aren't visible in the current build, skip them in this brief and file as a future finding.

### H · Existing screen behaviors to preserve

- Tab toggle (SIGN IN / CREATE ACCOUNT) state-syncs with form fields. CREATE ACCOUNT shows NAME, EMAIL, PASSWORD, CONFIRM PASSWORD. SIGN IN shows EMAIL, PASSWORD with FORGOT link.
- Form validation behavior (inline error messages, password requirements, email format check) — unchanged.
- Submit handler — unchanged.
- Google SSO flow — unchanged.
- Redirect after successful auth — unchanged (typically to `/dashboard` or last visited page).

This brief is visual/structural only. Form logic stays as-is.

## Files most likely affected

- Auth page component(s) — typically `app/auth/sign-in/page.tsx`, `app/auth/create-account/page.tsx`, or a single `[mode]` route depending on architecture
- Auth layout — `app/auth/layout.tsx` (already has `data-register="editorial"` from 3A — verify)
- Auth-specific component files — topbar, tabs, inputs, CTA, divider, SSO button
- `globals.css` — verify `.auth-*` classes exist and are scoped correctly. Add the new `.auth-divider`, `.auth-body` grid, and any missing utility classes
- Possibly a forgot-password page component if it exists

## Verify before declaring done

### Token / register check

- [ ] Page wrapper has `data-register="editorial"`. In DevTools, computed value of `--bg` resolves to `#F5F4EF` (cream), not white.
- [ ] All values in `.auth-*` rules use tokens (`var(--bg)`, `var(--fg)`, `var(--rule)`, `var(--muted)`, `var(--font-mono)`, `var(--font-sans)`). No hardcoded `#FFFFFF`, no hardcoded `white`.

### Visual — Desktop

- [ ] Open `/auth/sign-in`. Topbar at top with "Good Measure" wordmark left and `← BACK` right. Hairline below topbar.
- [ ] Body splits into two equal-width halves with a vertical hairline `var(--rule)` running full-height between them.
- [ ] Left half: `§ SIGN IN` eyebrow + display headline `Pick up where you left off.` + lede paragraph. All left-aligned. Italic words `left off` render as bold sans (italic typeface deferred).
- [ ] Right half: SIGN IN / CREATE ACCOUNT tabs (SIGN IN active with 1.5px ink underline) + EMAIL field + PASSWORD field with FORGOT link + SIGN IN filled black CTA + OR divider + Google SSO outlined button.
- [ ] Open `/auth/create-account`. Same structure but: CREATE ACCOUNT tab is active. Headline reads `Cook the way you actually cook.` Form has NAME, EMAIL, PASSWORD, CONFIRM PASSWORD fields. CTA reads CREATE ACCOUNT.

### Visual — Mobile

- [ ] Open `/auth/sign-in` at 375px width. Topbar at top with wordmark left, BACK right.
- [ ] Below topbar: editorial half (eyebrow + headline + lede), then horizontal hairline (the editorial half's `border-bottom`), then form half (tabs + inputs + CTA + OR + SSO).
- [ ] No vertical divider visible (the `.auth-divider` element is `display: none`).
- [ ] Editorial half opens at the top of the viewport (no extra centering breath, since `justify-content: flex-start` on mobile). Form half follows below the hairline.
- [ ] All tap targets (inputs, buttons, BACK link) at least 44px tall.

### Active state — tab underline width

- [ ] Click SIGN IN tab. Active underline visually matches the width of "SIGN IN" glyphs exactly.
- [ ] Click CREATE ACCOUNT tab. Active underline matches "CREATE ACCOUNT" glyph width.
- [ ] If the underline extends past the last character's right edge, the implementation is wrong. Fix.

### DevTools

- [ ] Inspect the body container. Computed styles show `display: grid` with `grid-template-columns: 1fr 1px 1fr` on desktop.
- [ ] Inspect the divider element. Computed styles show `background` resolves to the editorial register's `--rule` value on desktop, `display: none` on mobile.
- [ ] Inspect each panel. Computed styles show `padding: 80px 64px` on desktop, `padding: 48px 24px` on mobile.
- [ ] Inspect the `<em>` elements in the headline. Computed styles show `font-style: normal` and `font-weight: 700` (sans bold rendering, italic deferred).
- [ ] Inspect the `.auth-editorial .eyebrow`. Computed `font-size` is 9px, `letter-spacing` is 0.14em.
- [ ] Inspect the `.auth-title`. Computed `font-size` falls within the `clamp(36px, 4.4vw, 64px)` range for the current viewport.

### Functional

- [ ] Click SIGN IN tab → URL changes to `/auth/sign-in` (or query param updates), form swaps to sign-in fields.
- [ ] Click CREATE ACCOUNT tab → swaps to create-account fields.
- [ ] Click FORGOT → navigates to forgot-password route.
- [ ] Click BACK → returns to landing page (or router-back).
- [ ] Submit a sign-in form with valid credentials → user is signed in, redirected to dashboard.
- [ ] Submit with invalid credentials → existing error message renders (verify error styling reads correctly on cream).
- [ ] Submit a create-account form with valid data → account is created, user is signed in, redirected.
- [ ] Click CONTINUE WITH GOOGLE → Google SSO flow triggers as before.

### Grep checklist

- `bg-white` / `background: white` / `#FFFFFF` in any auth-scoped file — should not appear (3A follow-up cleared this; verify no regression)
- `border-radius:` non-zero on any auth element — flag any
- Hardcoded `font-style: italic` on `auth-title em` — should not appear (italic deferred to Step 6)
- `<em>` markup in headlines — should appear; this is correct
- Any reference to a "white panel" class or auth-specific white background — should not appear
- `font-size: 11px` on any `.eyebrow` selector — should not appear (eyebrows are 9px now)
- `letter-spacing: 0.16em` on any auth element — should not appear (locked at 0.14em)

### Cross-route check

- [ ] Sign in works.
- [ ] Create account works.
- [ ] Forgot password (if exists) renders consistently.
- [ ] Email verification (if exists) renders consistently.
- [ ] All auth routes share the same topbar, the same body register (cream), the same hairline divider treatment.

### Cross-surface consistency check

- [ ] Open `/auth/sign-in` and `/recipes/[some-recipe-id]` in adjacent tabs.
- [ ] Compare the eyebrow treatment: `§ SIGN IN` and `DESSERT` (or whatever recipe-detail eyebrow renders) should be visually identical in size, weight, color, letter-spacing.
- [ ] Compare the headline treatment: auth headline and recipe detail headline (`Almond Croissant Bars`) should both use DM Sans 700 with the same `clamp(36px, 4.4vw, 64px)` size at the current viewport.
- [ ] If they differ, one of them is wrong. Fix to match the locked tokens.

## Out of scope

- **Wordmark integration.** The locked `<BrandName />` component swap is deferred (3C). "Good Measure" Title Case 13px stays in the topbar for now.
- **Italic typeface.** Step 6 picks the italic typeface. The `<em>` markup is preserved; the rendering is bold sans until then.
- **Copy revisions.** Step 5 editorial pass may rewrite the headlines and ledes. For now, ship as specified.
- **Auth flow logic.** Form validation, submit handlers, error states, redirects — all unchanged.
- **Password requirements UI** — if there's an existing password-strength indicator or requirements list, leave it alone. If it has visual styling that drifts (rounded corners, fills), flag for a future cleanup.
- **Google SSO branding.** The Google G icon and CONTINUE WITH GOOGLE label follow Google's SSO guidelines; not subject to the editorial register's typography rules.
- **Magic link / passwordless flow** — if it exists in the build, verify it follows the same pattern but don't redesign.
- **Session management, token refresh, biometric login.** Out of scope.
- **Mobile breakpoint exact value.** Assumed 768px; if the existing system uses a different breakpoint, use that.

## Notes for the implementer

- The vertical hairline divider is the most important visible change in this brief. Without it, the two halves blur into one continuous cream surface and the page loses its bilateral structure. Make sure it's present at full height — top of body to bottom of body.
- The `<em>` markup with bold-sans rendering is a deliberate placeholder. Don't try to "improve" the headlines by removing the em tags or by rendering italic prematurely. The next person who picks up Step 6 needs the markup intact to drop in the chosen italic typeface.
- The form half is mostly unchanged — verify it works on cream (post-3A follow-up) and matches the spec, but don't rebuild what's already correct.
- If during implementation you find that the editorial half feels too tall on desktop (because `justify-content: center` pushes content to the middle of a tall panel), adjust the padding rather than removing the centering. Centered content in the editorial half is correct.
- After this brief lands, document the auth pattern in `design-system.md` as part of a "surface patterns" section. The two-panel-with-hairline-divider is reusable for any future split-content surface (e.g. plan-comparison, settings split-detail, etc.). Don't update the doc as part of this PR — flag for follow-up.
- The forgot-password and email-verification routes are explicitly underscoped in this brief. If they exist and are reachable, verify they render consistently. If they require their own dedicated layout, file as a future finding.

## Doc updates after code lands

- `design-system.md` — add a "Surface patterns" section (or extend §3) describing the two-panel-with-hairline-divider as a reusable pattern. Include the grid template + the 768px mobile collapse. This is the third place this pattern appears (after recipe detail's left rail and Add Meal's left rail), so it's earning its way to a documented pattern.
- `master-plan.md` — log Brief 3E close date.

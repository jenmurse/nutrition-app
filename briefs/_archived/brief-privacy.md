# Brief: Privacy Policy Page

**Route:** `/privacy`  
**Scope:** One new standalone page, no database changes

---

## Overview

A simple static privacy policy page. Uses the same standalone editorial shell as `/waitlist` -- paper background, topbar wordmark only, no app nav, no bottom rail. Content is read-only, no form or interactivity.

---

## Shell

Same pattern as `/waitlist` and `/waitlist-success`:

- Topbar: `Good Measure` wordmark (DM Sans 600, 13px, -0.03em) left, hairline below. Nothing right.
- Body: `data-register="editorial"` on page wrapper for cream `--bg` background
- No main app nav, no bottom rail
- Max-width: `680px`, centered, `padding: 0 24px`
- Padding-top: `64px`

---

## Content

Render the content below exactly as specified. Section headings are DM Mono eyebrows. Body copy is DM Sans. Links open in a new tab.

---

### Page eyebrow + headline

```
§ PRIVACY

Your data, simply explained.
```

- Eyebrow: DM Mono 9px, 0.14em, uppercase, `var(--muted)`
- Headline: DM Sans 500, `clamp(28px, 3vw, 40px)`, -0.03em, lowercase

---

### Intro paragraph

```
Good Measure is a personal nutrition and meal planning tool. This policy 
explains what data we collect, how it's used, and how you can control it.
```

DM Sans 400, 15px, 1.7 leading, `var(--fg-2)`, `max-width: 560px`

---

### Sections

Each section uses the following pattern:
- Section heading: DM Mono 9px, 0.14em, uppercase, `var(--muted)`, `margin-bottom: 12px`
- Section body: DM Sans 400, 14px, 1.7 leading, `var(--fg-2)`
- Hairline rule above each section: `1px solid var(--rule)`, `margin: 32px 0`
- Bullet lists: plain, no markers — use `padding-left: 0; list-style: none`; each item has `padding: 6px 0; border-bottom: 1px solid var(--rule)`

---

**WHAT WE COLLECT**

- Your name and email address when you create an account
- Nutrition goals, recipes, ingredients, and meal plans you create
- Your name and email address if you join the waitlist

---

**WHAT WE DON'T COLLECT**

- Payment information
- Location data
- Advertising or tracking data of any kind

---

**WHERE YOUR DATA LIVES**

Good Measure runs on [Railway](https://railway.app) (United States). Authentication is handled by [Supabase](https://supabase.com). Images are stored on [Cloudflare R2](https://developers.cloudflare.com/r2). All data stays within these services and is never sold or shared with third parties.

Links open in a new tab (`target="_blank" rel="noopener noreferrer"`).

---

**HOW LONG WE KEEP IT**

Your data is kept for as long as your account exists. You can delete your account at any time from Settings. This permanently deletes all your data immediately.

---

**COOKIES**

We use session cookies only to keep you signed in. We do not use advertising or tracking cookies.

---

**AI INTEGRATION (OPTIONAL)**

Good Measure includes an optional MCP integration for use with any MCP-compatible AI agent. If you use this feature, your recipe and nutrition data is accessed by your own AI agent using a token you control. Good Measure does not send your data to any AI service on your behalf. Data shared with your AI agent during a session is subject to that agent's own privacy policy.

---

**CONTACT**

Questions about your data? Email [hello@jenmurse.com](mailto:hello@jenmurse.com)

Email renders as a standard mailto link, `color: var(--fg)`, underline on hover.

---

## Routing

- `/privacy` — public, no auth required
- Add `/privacy` to the `isPublicRoute` check in `proxy.ts`

## Landing page footer

Add a Privacy link to the existing landing page footer, to the right of the existing Contact link, separated by a `·`:

```
Contact · Privacy
```

- Same style as the existing Contact link (DM Mono 9px, 0.14em, uppercase, `var(--muted)`)
- `·` separator: same weight and color as the links, `margin: 0 8px`
- Privacy links to `/privacy`

---

## Verification steps

- [ ] `/privacy` loads with correct topbar wordmark and no app nav
- [ ] Paper background (`--bg`), no white card
- [ ] Section headings render as DM Mono uppercase eyebrows
- [ ] Body copy is DM Sans 400
- [ ] All three service links (Railway, Supabase, Cloudflare R2) open in new tabs
- [ ] Email link opens mail client correctly
- [ ] Page is readable on mobile
- [ ] Route is added to `isPublicRoute` in `proxy.ts`

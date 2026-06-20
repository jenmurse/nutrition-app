# Going Native — B2 Plan (Supabase backend + Capacitor iOS/Android)

**Date:** June 16, 2026
**Status:** Backend phases COMPLETE (June 19–20). Native shell not yet started. Supersedes the Track-1/2/3 analysis in [`_archived/native-app-tracks.md`](_archived/native-app-tracks.md) (kept for background).
**Trigger met:** DUNS resolved + Apple Developer account approved.

> **Update (June 20, 2026):** Phases 1, 2, 4, 5 from §7 are done — backend migrated to Supabase Pro, app live on Vercel serverless (Variant A), Railway + R2 retired, MCP connector built, email live. **The remaining work is the Capacitor native shell (Phase 3) → TestFlight (Phase 6) → Android (Phase 7).** The execution plan for that lives in [`capacitor-build-handoff.md`](capacitor-build-handoff.md) — read it, not this brief's phase table, for what's actually left. Key finding: the app is SSR + API routes, so Capacitor wraps the live site via `server.url` (no static export / frontend rewrite).

---

## 1. The decision in one paragraph

Good Measure becomes a **native iOS + Android app** (phone *and* tablet) wrapped with Capacitor, backed by **Supabase Pro** as the single managed backend (Postgres + auth + storage + serverless functions). **Railway is retired.** Only the **landing + privacy pages** stay web-hosted (Vercel). The MCP integration keeps working — Claude talks to the *cloud* (Supabase), not to the phone — and moves from a desktop npm install to a **hosted remote connector**. iOS ships first; Android is a fast-follow once emulator/borrowed-device QA is in place.

**Why this shape:** it's the mainstream pattern for a solo-dev cross-platform app — cheap, flat, predictable cost (~$25–65/mo), full MCP support, no local-first sync complexity. Local-first (Path C) was rejected: it fights the household-sharing model, needs CRDT conflict resolution, can't use iCloud on Android, and would cost months of engineering to save tens of dollars a month.

---

## 2. Target stack

| Layer | Service | Notes | Cost |
|---|---|---|---|
| Mobile apps (iOS + iPadOS, then Android) | Capacitor wrap of the existing Next.js app | Phone + tablet, App Store + Play Store | Apple $99/yr · Google $25 once |
| Backend: database | Supabase Pro (Postgres) | Migrated from Railway | $25/mo (incl. everything below) |
| Backend: auth | Supabase Auth | Add **Sign in with Apple** + keep Google + magic link | included |
| Backend: file storage | Supabase Storage | **Recipe images move here** from Cloudflare R2 (consolidate) | included (100 GB) |
| Backend: server logic | Supabase Edge Functions | Optimizer engine, USDA matching, recipe import | included |
| Email | Resend (already have, free tier) | Custom SMTP for Supabase auth emails + invites/waitlist | $0 (→$20/mo past 3k/mo) |
| Landing + privacy site | Vercel (already have, free tier) | Static marketing pages; **landing food photos ride along as static assets** | $0 (→$20/mo if commercial) |
| MCP | Hosted remote connector | Users add by URL + sign-in; talks to Supabase | minimal |

**Everything the user can't see is in Supabase. The only thing the public web serves is marketing.**

---

## 3. Image storage — clarified (this confused us earlier)

- **Landing page images** (the 8 food photos in `public/landing/`) are **static files in the repo**. They deploy *with the landing site* and serve from **Vercel's CDN**. Not R2, not Supabase. No setup, no cost.
- **Recipe images** (user-uploaded) are on **Cloudflare R2** today. In this plan they **move to Supabase Storage** (100 GB included, RLS-protected) to consolidate onto one backend. R2 can be retired. *(Alternative: keep R2 — it's cheap and works. Consolidation is the only reason to move.)*

---

## 4. How MCP works here (and why Garth's doc isn't needed)

Data lives in **Supabase (cloud)**, not on the device. The phone app and the MCP server are **peers** — both are clients of the same database.

```
Claude (Desktop or mobile) → good-measure MCP server → Supabase  ← iPhone/iPad/Android app
                                (user's token, RLS)      (one DB)      (same data)
```

- Claude **never talks to the phone.** It reads/writes Supabase; the phone sees changes on next sync.
- Garth's `mcp_ios_sync_architecture.pdf` (Google Drive / CloudKit bridge) solves "reach data trapped *on a device*" — a **local-first-only** problem. We have a cloud source of truth, so it doesn't apply. (Also: CloudKit is iOS-only and couldn't serve Android.)
- **Change required:** the MCP server repoints from the Railway API to Supabase, and we host it as a **remote connector** (URL + OAuth/token) so mobile users don't need a desktop install. The `good-measure-mcp` npm package and its tools stay; the transport/base-URL and auth handshake change.

---

## 5. The work

### 5a. Backend migration (the core effort)
- **Move data: Railway Postgres → Supabase Postgres.** Same engine; the Prisma schema ports directly. One-time data dump/restore.
- **Implement Row-Level Security (RLS).** Currently deferred (see `rls_plan.md`). Becomes required: clients/MCP touch Supabase more directly, so per-household access must be enforced at the DB. **This is the single biggest task.**
- **Port server-only logic to Edge Functions:** the optimizer engine (`lib/mealOptimizer.ts`, pure TS — ports cleanly), USDA/ingredient matching, recipe URL import.
- **Decide the client data path** (see Implementation variants below).

### 5b. Auth
- Add **Sign in with Apple** as a Supabase provider (Apple *requires* it once Google is offered).
- Keep Google + magic link. Persist session token in the device keychain (`@capacitor/preferences`).
- Verify the **token_hash email flow** is configured (see `supabase_auth_config.md`) — PKCE default breaks mobile email confirmation.

### 5c. Native shell (Capacitor)
- Init Capacitor, iOS + Android project shells, build pipeline.
- Plugins: status-bar, haptics, share, preferences (keychain), network, keyboard.
- App icons (1024² master), splash screens, safe-area/status-bar theming.
- **Tablet "full experience":** the app is already responsive (mobile + desktop layouts). iPad serves the **desktop-class matrix layout** at tablet widths — a breakpoint pass + iPad testing, *not* a rewrite. Configure the app to support iPad as a universal app.

### 5d. MCP as remote connector
- Host the MCP server (small serverless deployment) pointed at Supabase.
- OAuth/token handshake so users add it by URL and sign in.
- Update docs/config language away from "Claude Desktop install."

### 5e. Landing/privacy split
- Extract `app/(marketing)/` + `/privacy` to deploy standalone on Vercel.
- Point app store "support URL" / "privacy URL" at these.

---

## 6. Implementation variants — pick the on-ramp

The cost goal (kill Railway, flat ~$25) is met by **both** of these. They differ in *how much client rewrite* up front:

- **Variant A — keep the API layer, host it serverless (faster on-ramp).** Keep the Next.js API routes, deploy them to **Vercel serverless** (scales to zero, ~free), point Prisma at Supabase Postgres. Minimal client change; existing `withAuth` checks keep enforcing access (RLS optional at first). MCP just repoints to the Vercel API URL. **Kills Railway immediately with low risk.** Downside: you're technically hosting an API on Vercel, not *only* landing/privacy — but at near-zero cost.
- **Variant B — pure Supabase (the clean end state).** Apps talk **directly** to Supabase; RLS enforces access; all server logic in Edge Functions. **You host only landing/privacy.** Downside: rewrites the app's data layer (from `fetch('/api/…')` to Supabase client calls) — weeks more work.

**Recommendation:** ship **Variant A first** (fast, low-risk, hits the cost target), then migrate to **Variant B** as a follow-up if/when the architectural purity is worth it. A→B is a continuation, not a redo.

---

## 7. Phased plan (rough, estimates not promises)

| Phase | Work | Est. |
|---|---|---|
| 0 | Decisions locked (bundle ID, app name reserved, variant A/B, monetization direction) | days — **monetization decided** (see `monetization-decision.md`); positioning decided (see `positioning-social-decision.md`). Remaining: bundle ID, app name reserved, variant A/B. |
| 1 | Backend migration: data → Supabase, recipe images → Storage, auth providers (Apple), token_hash verify | 1–2 wk |
| 2 | RLS (if Variant B) or serverless API deploy (if Variant A); port server logic to Edge Functions | 1–3 wk |
| 3 | Capacitor scaffolding, plugins, icons/splash, iPad layout pass | 1–2 wk |
| 4 | MCP remote connector + repoint to Supabase | 3–5 days |
| 5 | Landing/privacy split to Vercel; retire Railway + warm-up cron | 2–3 days |
| 6 | iOS submission: privacy (done), screenshots, listing, TestFlight, review | 2–3 wk (mostly waiting) |
| 7 | Android fast-follow (emulator/borrowed-device QA) | 1–2 wk |

**iOS-first.** Android ships after, once there's a way to QA it on a real device.

---

## 8. Cost analysis

### Fixed
- Apple Developer: **$99/yr**
- Google Play: **$25 once**
- Supabase Pro: **$25/mo** (spend caps ON by default — no surprise overages)
- Resend: **$0** (free tier; $20/mo past 3k emails/mo)
- Vercel: **$0** (free tier; $20/mo for commercial footing)

**Baseline: ~$25–65/mo + $99/yr.**

### Variable (scales with *active usage*, not downloads)
Downloads are free to distribute. Cost grows only with active use, and Good Measure's data is **text** (kilobytes), heavily cached by the service worker — so per-user cost is tiny.

| Active users | Likely Supabase | Driver |
|---|---|---|
| ≤500 (friends & family) | $25 flat | inside all quotas; Micro compute on the $10 credit |
| 1–5k | $25–75 | maybe a small compute bump; egress inside 250 GB |
| 10–50k | ~$100–500 | bigger compute + some egress overage ($0.09/GB); MAU still free under 100k |
| 100k+ | high hundreds–low thousands | MAU overage ($0.00325 ea), large compute, more egress |

**The MCP is the main variable-cost lever** — heavy MCP users generate egress. Pro's 250 GB (50× the free tier that pushed us off Supabase originally) covers friends-and-family with huge headroom, and MCP can be rate-limited if needed. **Spend caps mean the worst case stays $25 until *you* choose to scale up.**

---

## 9. OPEN STRATEGIC QUESTION — Monetization (do NOT implement yet)

> **Take this section to Claude chat for a focused discussion.** Captured here so the trade-offs are clear.

**Goal:** free to download (that's table stakes), but the recurring Supabase/email cost needs to be covered — and ideally the app earns.

**Key insight to anchor the discussion:** *the MCP is both the highest-value power feature and the main variable cost (egress).* Gating MCP behind a paid tier aligns who-pays with who-costs — the heaviest users fund their own load. The Mobbin example the user found ([mobbin.com/mcp#install](https://mobbin.com/mcp#install)) does exactly this: MCP access requires a subscription.

**Options:**
1. **Freemium (free app + Pro subscription).** Free: core planning, recipes, pantry. Pro: MCP access, advanced optimizer runs, day templates beyond N, etc. *Most aligned with the cost structure.* Apple/Google take 15% (under $1M/yr) of in-app subscriptions.
2. **MCP-gated subscription** (a focused version of #1). The app is fully free; only the AI/MCP layer is paid. Clean story, matches the cost driver, matches the Mobbin pattern.
3. **One-time paid app.** Simple, but doesn't cover *recurring* backend cost as usage grows.
4. **Ad-supported (free w/ ads, Pro removes ads).** ⚠️ **Conflicts with the current brand + privacy stance.** The privacy policy explicitly says *"no advertising or tracking identifiers of any kind."* Ad SDKs track users; adopting ads means reversing a stated principle and adding the tracking the app currently brags about avoiding. Non-tracking ads pay poorly. **Recommend against** unless the positioning changes.

**Questions for Claude chat:**
- Subscription price point + what's free vs. Pro?
- Is MCP-gated (#2) enough, or full freemium (#1)?
- Family/household pricing (one sub covers the household)?
- Free trial of Pro?

---

## 10. Decisions still needed before building
1. **Variant A or B** as the on-ramp (recommend A-then-B).
2. **App name** — is "Good Measure" available on the App Store? Reserve it in App Store Connect. Trademark check.
3. **Bundle ID** — e.g. `com.withgoodmeasure.app`.
4. **Recipe images:** move to Supabase Storage (recommended) or keep R2?
5. **Monetization direction** (from §9) — needed before listing copy, not before code.
6. **Deep-link scheme** — `goodmeasure://` (set up early even if lightly used).
7. **Custom email `hello@withgoodmeasure.com`** — wire this up during the DNS move. Likely why it failed before: the apex domain points to Railway via a **CNAME**, and DNS rules forbid **MX** records (needed to *receive* email) coexisting with a CNAME on the same name. Vercel uses an **A record** at the apex, leaving room for MX — so the move likely unblocks it. Plan: manage DNS at **Cloudflare**, use **Cloudflare Email Routing (free)** to forward `hello@` → personal inbox (or Google Workspace/Fastmail for a real mailbox), and verify the domain in **Resend** (SPF/DKIM TXT) for *sending*. *(Note: sending via Resend and receiving via MX are separate — TXT for sending doesn't conflict with the web CNAME; only MX does.)* Once live, swap the contact address everywhere: in code it's only `app/privacy/page.tsx` (currently `hello@mersostudio.com`); plus the Resend from-address and any external listings (App Store support email, footer, etc.).

## 11. To prepare before the build session
- ✅ Apple Developer approved — have **Team ID** handy.
- **Xcode installed** (✅ user has it).
- Reserve **"Good Measure"** in App Store Connect.
- Note current **Supabase project** details (the one used for auth today) — we'll grow it into the full backend.
- Confirm **Resend** + **Vercel** accounts (✅ user has both, free tier).
- Decide the items in §10.

---

## What this plan deliberately does NOT do
- No local-first / on-device database (rejected — see §1).
- No CloudKit/Drive MCP bridge (not needed with a cloud backend).
- No ads in v1 (privacy-stance conflict; revisit only if positioning changes).
- No push-notification server in v1 (cook reminders can be **local** notifications, no server — a later add).
- No Instagram/TikTok import in v1 (Share Extension + server-side parse — a later phase; needs Edge Function + AI/transcription).

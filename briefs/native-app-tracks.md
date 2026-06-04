---
name: Native app tracks
description: Scoping the path from web-only PWA to native apps across iOS/Android (and optionally desktop). Three architectural tracks with effort, maintenance, and trade-off detail.
type: planning
status: Track 1 selected as first step (June 2026). Tracks 2 and 3 documented for future reference.
author: Jen (with Claude)
date: June 2026
---

# Native app tracks

## Why this doc exists

Good Measure currently runs as a web app on Railway with a PWA wrapper. As of June 2026, the service worker shipped today gives offline reads, which solves the immediate "I'm at the grocery store without signal" pain. But the longer-term questions are still live:

- Should there be native apps in the App Store / Play Store?
- Should data eventually live on user devices instead of Railway?
- How does MCP keep working across all of that?
- Is the app Apple-only, Android-too, or web-everywhere?

This doc maps three architectural tracks with honest effort and trade-off detail, ranks them, and records the decision to start with Track 1 (Capacitor wrap) and evaluate whether to continue further.

It supersedes the earlier `briefs/future-data-architecture.md` for the implementation question. That doc remains correct for the strategic framing.

---

## Current state recap

- Next.js App Router on Railway
- Postgres on Railway, R2 for images, Supabase auth
- PWA + service worker offline cache (shipped June 2026)
- MCP server runs as `good-measure-mcp` npm package on user's Mac/PC, connects to the Railway API
- ~5-10 friends-and-family users; invite-gated

Cost concern: at current scale, ~$5-10/mo. At 1k users, $200-500/mo. The architectural rewrite is justified by *philosophy* (user owns their data) much more than by *math* (Railway is fine at any plausible 2026-2027 scale).

---

## Three tracks

### Track 1 — Capacitor wrap (lightest)

Wrap the existing Next.js app in Capacitor. Produces iOS + Android apps from the same codebase that runs on the web. Backend stays on Railway.

| Aspect | Detail |
|---|---|
| Effort | 4–8 weeks |
| Codebases | 1 (current web app, slightly extended) |
| App Store / Play Store | Yes |
| Offline | Inherits service worker + IndexedDB cache (already shipped) |
| Data burden | Same as today — Railway-hosted |
| Cost at scale | Linear with users (per the brief: ~$0.40/user/mo at 1k scale) |
| Migration cost | Trivial — same backend, same data |
| MCP | Unchanged (npm package on user Mac/PC) |
| Visual design | 100% carries over from web |
| Maintenance | Low — one codebase, occasional Capacitor plugin updates |
| Reversible? | Yes — can shed Capacitor at any time, web app keeps working |

**This is the chosen starting track.**

### Track 2 — Local-first with peer-to-peer sync (heaviest, future-proof)

Data lives in SQLite (mobile) and IndexedDB (web) on each device. Sync uses Yjs CRDTs through a tiny stateless relay server. Each user owns their data; relay just routes encrypted messages.

| Aspect | Detail |
|---|---|
| Effort | ~35 weeks (8–9 months full-focus, 14–18 months part-time) |
| Codebases | 1 (Capacitor + new local data layer) |
| App Store / Play Store | Yes |
| Offline | First-class — offline is the normal mode |
| Data burden | Effectively zero (relay is stateless, ~$5/mo regardless of users) |
| Cost at scale | Flat $5–10/mo for relay + images on R2 |
| Migration cost | Real work — Postgres → Yjs export/import script |
| MCP | Tauri desktop app for Mac + Windows + Linux |
| Visual design | 100% carries over |
| Maintenance | Higher code complexity (CRDT sync bugs, schema versioning on user devices) but lower ops cost |
| Reversible? | Once shipped, partially — could re-add a backend later but the local store is the canonical truth |

This is the "real product" endpoint. Justified by philosophy + scale economics, not by validating-with-friends needs.

### Track 3 — Fully native everywhere (heaviest, most maintenance)

iOS in Swift + CloudKit, Android in Kotlin + Google Drive sync, web stays Next.js or dies.

| Aspect | Detail |
|---|---|
| Effort | 9–15 months |
| Codebases | 2–3 |
| App Store / Play Store | Yes |
| Offline | First-class per platform |
| Data burden | Zero per platform (each user's cloud) |
| Cost at scale | Effectively zero infra |
| Migration cost | Per-platform export/import |
| MCP | Mac companion for Apple users; unclear story for Android-only |
| Visual design | Each platform redesigned in native idiom |
| Maintenance | 2–3x — divergent codebases, divergent UX |
| Reversible? | No — once committed, the web app is gone |

This is the "if we'd started over" architecture. Worse trade-off than Track 2 in almost every dimension given we already have a working web app.

---

## Track 1 detail

### Tech stack

- **Capacitor** wraps the existing Next.js app
- iOS + Android targets, both consuming the same JS bundle
- Web build (current) continues to work via `next build`
- **Capacitor plugins** for native shell APIs:
  - `@capacitor/status-bar` — match status bar to app theme
  - `@capacitor/haptics` — tap feedback on key interactions
  - `@capacitor/share` — share recipes via system share sheet
  - `@capacitor/preferences` — small native key-value store (for tokens, prefs)
  - `@capacitor/network` — network-state events (more reliable than navigator.onLine on iOS Safari)
  - `@capacitor/keyboard` — keyboard show/hide events for input focus handling

### What ships

- iOS app in App Store (requires Apple Developer account — pending DUNS)
- Android app in Play Store (Google Play Console — $25 one-time)
- Same web app at withgoodmeasure.com unchanged
- All three pull from the same Railway backend
- Offline cache works on all three via the existing service worker (plus Capacitor adds a SQLite-backed cache option later if wanted)

### Implementation phases

**Phase 1A — Capacitor scaffolding (1 week)**
- `npx @capacitor/cli init`
- iOS + Android project shells
- Build pipeline (export Next.js static, embed in Capacitor)
- Status bar / safe-area handling

**Phase 1B — Native shell polish (1–2 weeks)**
- App icons in all required sizes (iOS + Android)
- Splash screens
- Status bar theming
- Haptics on key actions (save, delete, applied template)
- System share sheet integration

**Phase 1C — App Store submission (2–3 weeks, mostly waiting)**
- Privacy policy (see below)
- App Store screenshots
- App Store listing copy (overlap with playbook stories)
- Submission + review cycle (typically 1–3 days, sometimes longer)
- Play Store submission (faster, usually < 24h)

**Phase 1D — Internal testing + iteration (2 weeks)**
- TestFlight invite for friends-and-family
- Play Store Internal Testing
- Bug fixes and polish based on real device usage

**Total: 4–8 weeks.**

### Privacy policy considerations

The Capacitor wrap doesn't change the data we store — same fields as the web app — but it does require a privacy policy document hosted somewhere stable. Apple and Google won't approve apps without one.

Topics the policy needs to cover:
- What data we collect (name, email, recipes, ingredients, meal plans, goals)
- How it's stored (Railway-hosted Postgres in [region])
- Who can access it (operator + invited household members)
- Third-party services (Supabase auth, Cloudflare R2 for images, USDA FoodData Central)
- User rights (export, delete account, GDPR/CCPA mention if relevant)
- Children (we'd say "not directed at children under 13" — standard COPPA stance)
- Contact for privacy questions
- Last updated date

The app already has `/privacy` — needs to be expanded to meet App Store + Play Store requirements. Estimated 1–2 hours of writing.

### Decision points before starting

1. **App name on the stores** — "Good Measure" available? Trademark check?
2. **Pricing model at launch** — free, or $X one-time? My read: free during friends-and-family, decide on monetization once Track 1 is shipped and there's signal.
3. **iCloud / iOS keychain integration** — should the magic-link token persist in keychain so the app stays signed in across reinstalls? Yes, via `@capacitor/preferences`.
4. **Push notifications** — out of scope for Phase 1A. Worth adding in a Phase 1E if there's a use case (e.g., "meal prep day reminder").
5. **Deep linking** — `goodmeasure://recipes/42` for sharing recipes between users. Worth setting up the URL scheme even if not deeply used yet.

### Open question for Track 1

The PWA install path stays alive in parallel. Two install paths (App Store + Add to Home Screen) is fine, but the PWA install probably becomes less promoted. Decide whether to keep promoting PWA install on the web, or only on Android (where it's still useful pre-store).

---

## Track 2 detail (for future reference)

### Tech stack (if/when we go this way)

- **Capacitor** (already from Track 1)
- **Yjs** for CRDT sync (most mature CRDT library; used by Linear, JupyterLab, others)
  - Alternative: **Automerge 2.0** — newer, Rust core, more "git-like" mental model
- **SQLite** on iOS + Android (via Capacitor SQLite plugin or sqlite-wasm on web)
- **IndexedDB** persistence for web via `y-indexeddb`
- **WebSocket relay server** — small stateless Node/Bun, deployed on Fly.io or Cloudflare Workers (~$5/mo)
- **Email magic link auth** via Resend or Postmark; server issues JWT
- **R2 for images** — pragmatic hybrid; CRDTs don't handle blobs well, R2 is cheap
- **Tauri** for desktop companion (Mac + Windows + Linux) — hosts MCP server bound to local Yjs state

### Architecture sketch

```
┌──────────────────────────────────────────────────────────────┐
│  User devices                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  iPhone  │  │   iPad   │  │ Android  │  │   Web    │     │
│  │ SQLite   │  │ SQLite   │  │ SQLite   │  │ IndexDB  │     │
│  │ + Yjs    │  │ + Yjs    │  │ + Yjs    │  │ + Yjs    │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       │             │             │             │             │
│       │     ┌───────┴─────────────┴─────────────┴───────┐    │
│       └─────│  WebSocket relay (Fly.io, ~$5/mo)         │    │
│             │  Authenticates via JWT, routes messages,  │    │
│             │  buffers for offline devices.             │    │
│             │  Stores nothing long-term.                │    │
│             └───────┬───────────────────────────────────┘    │
│                     │                                         │
│                     │  Same Yjs sync protocol                 │
│                     │                                         │
│             ┌───────┴───────────────────┐                    │
│             │  Tauri desktop companion  │                    │
│             │  Local Yjs state          │                    │
│             │  MCP server bound to it   │  ←── Claude        │
│             └───────────────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

### Phase breakdown (35 weeks total)

| Phase | Duration | Deliverable |
|---|---|---|
| 2A — Local SQLite layer | 8 wk | All reads against local DB; mutations still dual-write to Railway |
| 2B — Yjs sync engine | 10 wk | Devices sync via relay; Railway becomes read-only mirror |
| 2C — Migration tool | 3 wk | Postgres data → Yjs structures, one-shot per existing user |
| 2D — Auth + relay polish | 3 wk | Magic-link auth, JWT-scoped household access, device pairing |
| 2E — Tauri MCP companion | 5 wk | Cross-platform desktop app hosts MCP against local Yjs |
| 2F — Sunset Railway | 2 wk | Last user migrated; Railway turned off; bills drop to ~$5/mo |
| Cumulative buffer | 4 wk | CRDT sync bugs always take longer than planned |

### Maintenance characteristics

**Easier:**
- No database server to patch, scale, back up
- No Postgres migrations
- No Supabase auth quirks
- No Vercel/Railway billing surprises
- No GDPR data-deletion requests (users own their data; user uninstalls app = data gone)
- No "I lost my account" — devices ARE the account

**Harder:**
- Sync bugs reproduce only on specific timing/state combos
- Schema migrations need to handle old + new versions because data is on user devices
- Relay server still needs babysitting (TLS, uptime, abuse handling)
- App Store + Play Store review on every release
- Capacitor plugins occasionally break with iOS/Android updates
- Yjs library evolution — breaking changes happen

### Risks / unknowns

1. **CRDT schema design** — translating Prisma → Yjs requires real thought; foreign-key-style references between records don't translate cleanly
2. **Conflict resolution UX** — two people edit the same field offline; Yjs picks a winner deterministically but the loser doesn't always know
3. **Image strategy** — pragmatic hybrid (R2 for blobs) is the only sane option; means we're not 100% local-first
4. **Identity recovery** — uninstall from all devices = data gone unless we add encrypted backup
5. **CRDT history growth** — Yjs documents accumulate change history; need snapshot/compaction logic
6. **Multi-platform sync edge cases** — corner cases when devices come online out of order
7. **App Store review of sync apps** — Apple sometimes scrutinizes apps that bypass their cloud; low risk but real
8. **Yjs ecosystem stability** — active library, occasional breaking changes

### What's lost vs current web app

- Public recipe URLs — can't share a recipe link with non-users (workaround: explicit "publish snapshot" feature)
- Anonymous browsing — every user must install + sign in
- Server-side image processing — has to happen client-side or stay on R2
- MCP friction — npm package replaced by Tauri install; higher install bar for MCP users

### When Track 2 is the right answer

- Good Measure passes ~1k active users
- Philosophical commitment to user data ownership is the marketing story
- You're willing to commit 8+ months of focused work
- Engineering complexity is acceptable

### When Track 2 is the wrong answer

- Friends-and-family validation mode
- Wider product validation hasn't happened
- You'd rather ship features than rebuild architecture
- Track 1 is sufficient

---

## Track 3 detail (brief)

Fully native iOS (Swift + CloudKit) + Android (Kotlin + Google Drive) + web (Next.js stays or dies).

Honest read: this was option G in the original `future-data-architecture.md` brief, scoped Apple-only. Adding Android triples the complexity and breaks the clean CloudKit story (Google Drive integration is workable but messy). Track 2 is strictly better for cross-platform.

**Track 3 only makes sense if:**
- We were starting from scratch (we're not)
- Apple-only was acceptable (it isn't per Jen)
- Native-per-platform UX is the priority (Capacitor gets us 90% of the way)

Not pursuing.

---

## Decision: Track 1 first, evaluate before committing further

**As of June 2026:** Start Track 1 (Capacitor wrap). Reasons:

1. **Reversible** — Track 1 is an additive layer on the current stack. Failing or pivoting doesn't break anything.
2. **App Store presence** — gets Good Measure into the iOS App Store alongside Jen's other app (pending DUNS for Apple Developer account). Real distribution channel.
3. **Privacy story** — requires a real privacy policy; healthy forcing function that we'd want anyway.
4. **Low cost / low effort** — 4–8 weeks instead of 8 months.
5. **Validates audience** — does anyone actually install? Does it change usage patterns? Real signal before committing to Track 2.
6. **Doesn't preclude Track 2** — Phase 2A of Track 2 (local SQLite layer) is a continuation of Track 1, not a replacement.

**Trigger to re-evaluate (revisit deciding on Track 2):**
- ~50+ active App Store / Play Store installs (signal of real demand)
- Recurring requests for offline-write or cross-device sync
- Railway bill crosses $50/mo (real but very gradual signal)

**Trigger to abandon native apps entirely:**
- App Store install conversion is low (e.g., <20% of web users who could install do)
- Maintenance overhead of Capacitor + native shell isn't justified by actual usage

---

## Open questions

1. App name on App Store / Play Store — is "Good Measure" trademark-clear? Worth a USPTO TESS search before submission.
2. Pricing at launch — free? One-time? My take: free during friends-and-family era; revisit at ~100+ installs.
3. Push notifications — useful enough for Phase 1, or wait? No clear use case yet.
4. Existing PWA install — keep promoting on web, or only on Android (which lacks an App Store pre-installed audience)?
5. Privacy policy — write fresh, or use a template (e.g., termly.io)? Either works for friends-and-family; tighter copy worth the writing time if going wider.

---

## What this doc does NOT decide

- Pricing / monetization (deferred until Track 1 is shipped + has usage signal)
- Whether Good Measure becomes a "real product" or stays portfolio + personal tool
- Exact App Store category and keywords
- Whether to open-source any part of the codebase

These can wait. Ship Track 1, then revisit.

# Good Measure — Future data architecture

## Where the data lives, who owns it, what it costs

**Status:** Strategic framing doc.
**Author:** Jen (with Claude)
**Date:** May 2026 (updated June 2026)

> **Implementation question now lives in [`native-app-tracks.md`](./native-app-tracks.md).**
> That doc maps three concrete tracks (Capacitor wrap, local-first Yjs sync, fully native per-platform), records the decision to start with Track 1, and documents Track 2 as a future option with explicit re-evaluation triggers.
> This doc remains the source of truth for *why* (cost / data burden / monetization framing) — it's the strategy. The other doc is the plan.

---

## Why this doc exists

Good Measure currently runs as a web app on Railway. Postgres on Railway, images on Cloudflare R2, auth via Supabase, optional Claude integration via MCP.

At current scale (Jen + a few friends), the data burden is small. The concern is forward-looking: if Good Measure grew, the operator is on the hook for hosting cost, security posture, backup discipline, GDPR/CCPA obligations, breach response, and the moral weight of holding other people's personal nutrition and health data.

The instinct: avoid all of that if possible. Make the data live with the user.

This doc maps the options — what's possible, what each costs, what tradeoffs come with it. **No decision made.** A flag in the ground so we can come back to it.

---

## Current state

- **Frontend:** Next.js App Router on Railway
- **Database:** Postgres on Railway
- **Images:** Cloudflare R2 (recipe photos, user uploads)
- **Auth:** Supabase (email/password, OAuth providers)
- **AI integration:** MCP server exposing recipes, pantry, meal plans to Claude (Desktop or Code)

Operator's data exposure:
- Recipes, ingredients, meal plans, daily goals, household composition
- User emails (auth), invite codes, waitlist entries
- Optional: bloodwork notes if a user pastes them into a recipe's notes

What's NOT stored: payment data (no monetization yet), photos beyond R2, biometric data, location, browsing history.

---

## Cost projections

Rough order-of-magnitude estimates. Real numbers depend on usage patterns.

### Railway

| Users | DB storage | DB CPU/mem | R2 storage | Estimated $/mo |
|---|---|---|---|---|
| 10 | <1 GB | minimal | <1 GB | $5–10 (current) |
| 100 | 2–5 GB | one small instance | 5–20 GB | $25–60 |
| 1k | 20–50 GB | one mid instance | 50–200 GB | $200–500 |
| 10k | 200+ GB | multi-instance + read replica | 500 GB–2 TB | $2k–5k |

These are operator-borne costs. Free tier is gone — users get the app for whatever pricing model is in place, and the operator pays the infra bill regardless.

At 1k users with $0 revenue, that's ~$400/month out of pocket. At 10k, prohibitive.

### Supabase auth

- Free up to 50k MAU. Past that, $0.00325/MAU. Negligible compared to DB cost.

### Total picture

The dominant cost is **Postgres at scale**. R2 is cheap. Auth is cheap. CPU/mem is the second-biggest line item.

If Good Measure ever monetized, pricing would need to cover ~$0.40/user/month at the 1k scale or ~$0.50/user/month at the 10k scale just to break even on infra. Doable, but it's not a free hobby project anymore.

---

## Architecture options

Seven options, scored against six criteria below.

### A. Stay on Railway (status quo)

Operator runs Postgres, owns backups, owns security. Users have accounts. Households are server-side joins.

**Cost:** Linear with users, see table above.
**Data liability:** Full.
**Dev cost:** Zero (current).

### B. Supabase RLS, no server reads

Move Postgres to Supabase. Enforce row-level security so the API never reads raw rows on the user's behalf — every query is scoped by `auth.uid()`. Operator can technically read with the service role key but practices a "no-touch" policy.

**Cost:** Slightly higher than Railway at scale, similar at small.
**Data liability:** Reduced morally, not legally. Operator still holds the data.
**Dev cost:** ~2 weeks to migrate auth + add RLS policies. Documented in `rls_plan.md`.

### C. BYO database

User provisions their own Postgres (Supabase, Neon, Railway, whatever) and pastes the connection string into Good Measure. App is just the UI.

**Cost:** Operator pays only for the frontend bandwidth. Users pay for their own DB.
**Data liability:** Effectively zero — operator never sees a connection string in their own DB.
**Dev cost:** ~3-4 weeks. Onboarding becomes a tutorial. Lots of error states for misconfigured DBs.
**Friction:** High. Excludes non-technical users. Maybe a power-user tier.

### D. Fully local-first web (IndexedDB + CRDT sync)

Data lives in the browser. Sync between devices uses something like Y.js + a tiny relay server, or self-hosted realtime.

**Cost:** Tiny — the relay server is stateless and small.
**Data liability:** Minimal. Operator stores ciphertext or nothing.
**Dev cost:** ~6-8 weeks. CRDT sync is hard. Conflict resolution, household merging, offline edge cases.
**Limitations:** Households are hard. No-account users lose data if they clear cookies. Onboarding to a new device is awkward without an account.

### E. Hybrid — Supabase auth + user-supplied storage

Auth and identity stay with the operator (small, low-risk data). Actual recipe/plan data is in the user's own bucket — could be S3, could be iCloud Drive, could be a Postgres they own.

**Cost:** Low for the operator. Auth + thin metadata only.
**Data liability:** Low — operator holds emails and pointers, not the data itself.
**Dev cost:** ~4-6 weeks. Multiple storage backends to support.
**Limitations:** Tricky for households (whose bucket?). Sharing requires cryptographic dance.

### F. iOS-only with CloudKit

Drop the web app. Native iOS + iPadOS. Data in CloudKit, which is Apple's iCloud-backed key-value + record store. Households use CloudKit sharing. Operator never sees the data.

**Cost:** Apple developer account ($99/year). No infra. App Store cut on any future revenue.
**Data liability:** Effectively zero. CloudKit is Apple's problem.
**Dev cost:** 3-6 months for one person — full native rewrite. Design system needs partial reimplementation. MCP integration requires a companion approach (see G).
**Limitations:** No Android, no web. No casual try-the-URL discovery. Apple App Store review on every release. Mac users need to download the iOS-on-Mac version (works via Catalyst).

### G. iOS + macOS companion (for MCP)

Same as F, but with a macOS companion app that reads the same CloudKit data and exposes the MCP server. Power users have the Mac app; phone-only users don't get MCP.

**Cost:** Same as F.
**Data liability:** Same as F.
**Dev cost:** F + ~1-2 months for the macOS app.
**Strategic note:** This is probably the only realistic way to keep MCP if going native. An iPhone in your pocket isn't a stable MCP server host.

---

## Trade-off matrix

| Option | Liability | Cost @ 1k | Dev cost | MCP | Households | Discoverability |
|---|---|---|---|---|---|---|
| A. Railway status quo | High | $$$ | None | ✓ | Easy | ✓ web |
| B. Supabase RLS | Medium | $$$ | 2 wk | ✓ | Easy | ✓ web |
| C. BYO database | Low | $ | 3-4 wk | ✓ | Awkward | ✓ web |
| D. Local-first web | Low | $ | 6-8 wk | ✓ (per-device) | Hard | ✓ web |
| E. Hybrid auth + storage | Low | $$ | 4-6 wk | Maybe | Hard | ✓ web |
| F. iOS + CloudKit | None | $0 | 3-6 mo | ✗ | Native | ✗ App Store only |
| G. iOS + macOS companion | None | $0 | 4-7 mo | ✓ (Mac) | Native | ✗ App Store only |

Reading this honestly:

- If the goal is "real product some day, no data burden ever" → **G** is the only complete answer
- If the goal is "validate the matrix idea with friends in 2026, decide later" → **A or B** are fine
- If the goal is "low cost forever, accept friction" → **C** for power users, or accept that you'll never grow past ~hundreds

---

## Landscape — AI in nutrition apps

Where the market is in 2026, roughly:

### Logging-focused

- **MyFitnessPal AI** — barcode + image recognition, AI summaries. Logging-first. No goal-setting depth. Massive user base.
- **Cronometer** — best-in-class nutrient data quality. No AI to speak of. Quietly dominant among dieticians.
- **Foodvisor / Calorie Mama / Bitesnap** — image recognition for logging. Convenience, not insight.

### Coaching algorithms (not LLMs)

- **MacroFactor** — adaptive algorithm that adjusts your targets based on weight trends. Closed system. Loved by lifters. Algorithmic, not conversational.
- **Lumen** — hardware (breath analyzer) + adaptive plan. Premium price. Subscription.
- **Carbon Diet Coach** — algorithmic macro coaching from Layne Norton. Spreadsheet-feel.

### Chatbot wrappers

- **Yazio / Lifesum** — chat features bolted on, mostly Q&A. Not deeply integrated with the meal plan.
- **Suggestic / Lifesum AI** — recipe-Q&A bots. Recommendations are okay, integration with the user's actual data is thin.

### Meal planning (no AI)

- **Mealime / Plan to Eat / Paprika** — meal planners and grocery list generators. No optimization layer. Manual.

### DIY in productivity tools

- People using **Notion + Claude / ChatGPT** to build their own version of what Good Measure does. This is the cohort closest to Good Measure's target user — they want LLM-assisted optimization on data they own and trust.

### The gap

Nothing in the market is:

- **LLM-native** (not a chatbot bolted on)
- **For deliberate cooks** (people who actually open the kitchen, not gym-only macro counters)
- **Data they own** (not a coaching algorithm's opinion)
- **Goal-derived, not preset** (the user sets the targets, the app respects them)

Good Measure sits in that gap. Audience is narrow but real — bloodwork-driven home cooks, biohackers, people managing specific conditions (LDL, T2D, hypertension), households with mixed goals.

---

## Where this leaves us

**For now:** Stay on Railway. Cost is negligible. Data burden is small. Move forward with the matrix view, the Playbook, and the recipe-import refinements. Don't let the long-term architecture question block the short-term product validation.

**Trigger to revisit:**

- ≥100 active users → migrate to Supabase RLS (option B). Low-effort risk reduction.
- ≥500 active users → start planning the native rewrite (option G) or commit to monetization that covers infra
- Any meaningful breach risk surfacing → reconsider immediately

**Strategic decision deferred:**

Whether Good Measure ever grows into a real product is itself an open question. The current goal (portfolio + personal tool + friends) doesn't require this decision. The doc exists so the decision isn't surprising when it becomes necessary.

---

## Monetization — coupled to the architecture decision

Tightly entwined with the iOS / data question because *how* users pay (App Store IAP vs Stripe-on-web) and *what* they're paying for (the app vs the AI features) determines what's even possible.

### The fork

**Option A — BYO Claude (current state).**
User brings their own Claude Desktop or API key. App is free. Operator pays nothing for AI.
- Best UX for users who already have Claude set up — small fraction of the deliberate-cook audience.
- Filters audience toward technical users — both a feature and a limit on growth.
- Compatible with any architecture (web, iOS, hybrid).
- Hard to monetize: users perceive the app as "the wrapper around my own AI." Price ceiling is low.

**Option B — Operator-provided AI.**
App ships with AI integrated. User doesn't need their own Claude.
- Better UX for everyone. Removes the biggest setup friction.
- Variable cost scales with usage. Operator pays Anthropic per call.
- One-time payment fights against ongoing API costs.
- Requires a usage model (caps, credits, or subscription) to be sustainable.

### Pricing models in context

- **One-time purchase ($20–40).** Plausible at small scale. Comparable to a year of MyFitnessPal Premium ($80). Works if AI is BYO (Option A) — operator has no variable cost to recover. With Option B, this only works if the app caps AI usage to a fixed budget.

- **Credits ($X for N AI generations).** Used by Notion AI, Granola, the wave of one-time AI tools. Works for occasional-use surfaces. **Probably bad for Good Measure** — people don't want to ration meal planning. Daily-use apps with rationed AI feel hostile.

- **Subscription ($5–10/month).** Honest for Option B because the variable cost is ongoing. But subscription fatigue is real, and the niche may not support it at scale. Probably the right model if Good Measure becomes a real product, but a poor fit for the current "personal tool + portfolio + friends" goal.

- **Middle path: tiered features.** App is $20 one-time. Includes "small AI" features running on a cheap model (recipe scoring, basic suggestions, dietary-restriction filtering) within a fixed operator budget per user. "Big AI" features (smart meal-plan generation, household optimization, weekly review) require BYO Claude. Most users get out-of-box value; power users get the deep stuff.

The middle path is the most defensible for an indie product. Sets a one-time purchase floor that pays back infra, while letting users opt into deeper AI at no cost to the operator.

### Honest math

At current goals (portfolio + personal + friends), monetization isn't worth the plumbing.

| Users | One-time $20 | One-time $40 | Worth IAP setup? |
|---|---|---|---|
| 20 | $400 | $800 | No |
| 100 | $2k | $4k | Marginal |
| 500 | $10k | $20k | Yes |
| 5k | $100k | $200k | Real income |

Below ~500 users, the dev/admin time of setting up IAP, handling refunds, and managing App Store relationship eats most of the revenue. The threshold to bother is "actual real demand," not "could theoretically monetize."

### Recommended posture

- **For now:** App is free. BYO Claude. Don't think about pricing.
- **If/when growth is real:** Move to the middle path. iOS-only with App Store IAP + tiered features (small AI included, big AI BYO). The iOS architecture decision and the monetization decision become the same decision.
- **Subscription is off the table** unless the audience explicitly proves it wants it.

## Open questions

1. At what user count does monetization need to start? Probably ~500, not 100 as initially guessed.
2. Is iOS-only acceptable for Jen as a long-term form factor? (Big personal-preference question.)
3. Does Good Measure stay a web app forever and accept the data burden? Real possibility.
4. Is there interest in selling Good Measure or open-sourcing it before native rewrite is forced?
5. Would a Mac-only client be a useful middle step before iOS?
6. If/when monetization happens, what does the "small AI" budget per user look like in $/month? Drives the price floor on the one-time purchase.
7. How does the Playbook factor into monetization — gated content (paid users get all stories), free forever, or some mix?

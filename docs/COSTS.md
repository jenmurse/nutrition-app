# Good Measure — Cost Sheet

Running ledger of what Good Measure costs to operate, what's covered by free tiers, and what changes when usage grows or the app opens to the public.

Last updated: June 19, 2026.

---

## Today (invite-only, friends-and-family scale)

Stack migrated to Supabase Pro + Vercel on June 19, 2026. Railway retired.

| Service | Plan | Monthly cost | What it covers |
|---|---|---|---|
| **Supabase Pro** (Postgres + auth + storage) | Pro | **$25 plan + ~$0 compute** = **~$25/mo** | Database, auth (email + Google + Apple OAuth), Storage (recipe images — pending R2 migration). Spend caps ON. Micro Compute add-on ($10) covered by $10 credit. Currently $34.62/mo because quiet-surface project also uses Micro Compute — drops to ~$25 once quiet-surface moves off Supabase. |
| **Cloudflare R2** (image storage) | Free tier | **$0/mo** | Recipe images still here pending migration to Supabase Storage. Will be retired once migration script runs. |
| **Vercel** (Next.js app) | Free tier (Hobby) | **$0/mo** | Next.js app + API routes. Serverless, scales to zero. Upgrade to Pro ($20/mo) if commercial use policy requires it at launch. |
| **Resend** (email) | Free tier | **$0/mo** | Auth emails via Supabase SMTP. 3,000/mo free — well above current usage. |
| **Claude API tokens** | n/a — MCP architecture | **$0/mo** | See "AI costs" section below — user's own Claude covers it |
| **Domain** (`withgoodmeasure.com`) | Annual | **~$1.25/mo** | ~$15/year prorated |
| **npm** (`good-measure-mcp` package) | Free | **$0/mo** | Public package, free hosting |
| **GitHub** (code hosting) | Free | **$0/mo** | Personal account, public repos free, private repos free at this scale |
| | | **~$26–27/mo total** | |

---

## Cost detail — Supabase Pro

Supabase Pro is $25/mo flat with spend caps, covering:
- **Postgres:** 8 GB database, 250 GB egress, PITR (7 days)
- **Auth:** 100K MAU (well above current usage)
- **Storage:** 100 GB (more than enough for recipe images once R2 is migrated)
- **Edge Functions:** 2M invocations/mo (not used yet)
- **Realtime:** 500 concurrent connections (not used yet)

There are no separate meters for CPU or memory at the Pro level. If usage spikes beyond the plan's included quotas, spend caps prevent surprise bills and the dashboard alerts instead.

**Supabase vs Railway comparison:**
- Railway Hobby was ~$8–9/mo but required a warm-up cron, had cold starts, and mixed compute + DB on one platform.
- Supabase Pro is ~$25/mo flat, no cold starts, DB + auth + storage all included, spend caps prevent overruns.

---

## AI / Claude costs

**Today: $0 to Good Measure.** This is a deliberate architectural decision, not an omission.

Good Measure exposes an MCP server (`good-measure-mcp` on npm) instead of calling Claude directly. The user installs the MCP into their own Claude Desktop, Claude Code, or other MCP-compatible client and authenticates with a token they generate in Settings. From that point on, the user's AI talks to Good Measure's API on their behalf — but the LLM tokens are billed to the user's own Claude subscription, not to Good Measure.

| Who pays for AI tokens today | What they pay |
|---|---|
| **Good Measure (the app)** | $0 — no API key in any env var, no `anthropic` SDK installed for runtime use |
| **The user (Jen, Garth, friends)** | Whatever their existing Claude subscription is — typically **Claude Pro at $20/mo** or **Claude Max at $100–200/mo**. No marginal cost per Good Measure session, since their plan covers all their Claude usage |

### What the user actually consumes

Per AI session (asking Claude to dial in a recipe, plan a week, save a template), rough token usage:
- **Input:** 5K–20K tokens (recipe data + meal plan context + user's question)
- **Output:** 1K–5K tokens (suggested edits / new plan / confirmation)

On Claude Pro / Max, this is free at the margin — the user already pays the flat monthly fee. On metered API pricing (Sonnet 4.5 ≈ $3 in / $15 out per million tokens), each session would cost roughly **$0.05–0.30**. With prompt caching (which MCP-using clients typically enable), that drops 80–90%.

### What it would cost if Good Measure ever offered in-app AI directly

A future product decision worth flagging: should there be a "no setup needed" AI option for users who don't want to install MCP? If so, Good Measure would pay for tokens itself.

Rough projection at 1,000 MAU using AI features ~daily, with prompt caching enabled:
- **Per active user:** ~$0.50–2/month in API costs
- **Total:** **~$500–2,000/month** in Anthropic API bills

This would need to be paid for by either a paid tier on Good Measure or by absorbing the cost. **Not recommended for the foreseeable future** — the MCP architecture is one of Good Measure's clearest differentiators (no AI fees, no data privacy concerns, user owns the LLM relationship). Worth re-evaluating only if user friction with MCP installation becomes a real growth blocker.

### In-app chat costs — measured (June 2026)

The in-app chat ("Ask") shipped in June 2026 and IS Anthropic-billed to Good Measure. These are actual measured costs from `/admin/usage`, not projections.

**Per-turn cost (Sonnet 4.6, the current default):**

| Cache state | Cost/turn | Notes |
|---|---|---|
| COLD (first turn, writes cache) | ~$0.033 | Pays the 9k-token prefix write at $3.75/MTok |
| WARM (cache reads only) | ~$0.011 | Cheapest — most subsequent turns within an hour |
| MIXED (cache + new content) | ~$0.017–0.023 | When a tool call adds new context |
| Bulk/proposal turns | ~$0.025–0.030 | Tool calls + larger output |

**Typical session cost:** A 5–10 turn multi-step session (analysis + a few swaps + a template apply) runs **~$0.10–$0.20 total on Sonnet 4.6**.

**Sonnet 4.6 vs Haiku 4.5 head-to-head (June 2026):**

Same prompts run through both models for direct comparison:

| Metric | Sonnet 4.6 | Haiku 4.5 |
|---|---|---|
| Turns to complete same task | 6 | 11 |
| Total session cost | $0.14 | $0.10 |
| Avg cost/turn | $0.023 | $0.009 |
| Per-MTok pricing | $3 in / $15 out | $1 in / $5 out |
| Quality at proposing swaps | Decisive, optimal | More cautious, asks more |
| Stale ID errors | 0 | 1 (self-recovered) |
| User-side cancellations needed | 0 | 2 |

**The per-turn discount is 3x, but Haiku needs ~2x the turns on multi-step requests** because it's more cautious — asks clarifying questions, suggests less optimal swaps, etc. Net savings on a real session is closer to **30%, not 3x**.

**Decision (June 2026):** Sonnet 4.6 stays the default. The 30% cost savings on Haiku isn't worth the conversation friction at friend-and-family scale. Revisit when DAUs cross ~50 and an eval harness exists to verify Haiku quality doesn't regress on real prompts.

**Cost projection for in-app chat at various scales** (Sonnet 4.6, assuming caching works):

| Scale | Estimate |
|---|---|
| 1 active user (3 sessions/day) | $0.30–0.60/day = **~$10–18/month** |
| 10 active users (friends-and-family) | **~$90–180/month** total |
| 100 active users (small public launch) | **~$900–1,800/month** total |
| 1,000 MAU | **~$9,000–18,000/month** total |

At friend-and-family scale (~10 active users), in-app chat costs are sustainable. Above that, the Haiku revisit + per-user rate limits become important. Public launch should include both.

**See also:** [`docs/CHAT-ARCHITECTURE.md`](./CHAT-ARCHITECTURE.md) for the full chat architecture, prompt caching strategy, model comparison, and operational lessons (bugs hit and fixed during build).

---

## What changes if Good Measure goes public

Conservative projection for 1,000 monthly active users:

| Service | Then | Why it changes |
|---|---|---|
| **Supabase Pro** | Still **$25/mo** (maybe compute bump) | 100K MAU auth free; 250 GB egress covers lots of text data. MCP users drive the most egress — gated to Pro tier, so heavy users pay. |
| **Vercel** | Upgrade to **Pro ($20/mo)** | Free tier is for personal/hobby — commercial use requires Pro. At $20/mo + function usage. |
| **Cloudflare R2** | Retired by then (→ Supabase Storage) | R2 goes away once the image migration script runs. |
| **Resend** | Likely free still | 3K/mo free tier is generous; only pays off at aggressive email volume |
| **CAPTCHA** (Cloudflare Turnstile) | **$0/mo** | Free for all use — add before public launch |
| **Sentry** or similar error monitoring | Optional, ~$0–26/mo | Free tier covers 5K errors/mo |
| **Analytics** (Plausible / PostHog / Vercel) | Optional, $0–9/mo | Plausible $9/mo; PostHog and Vercel Analytics have free tiers |
| | | **~$45–65/mo at 1K MAU** |

---

## What changes if growth keeps going (10K+ MAU)

- **Supabase:** compute add-ons kick in; egress may exceed 250 GB. At $0.09/GB overage and heavy MCP use, could add $20–100/mo.
- **Vercel Pro** stays flat at $20/mo until function invocations or bandwidth spike.
- **Supabase Storage:** 100 GB included in Pro. 10K users × 5 recipes × 1 MB = ~50 GB — still inside.
- **Sentry Team** ($26/mo) if error volume justifies it
- **Plausible Business** ($19/mo) for higher pageview tier
- **Custom infra**: at some point dedicated Postgres, queue worker, etc. — many months out

---

## Pricing model — decided (June 16, 2026)

> **Closed.** See `briefs/monetization-decision.md` for the full rationale. Summary below.

Two tiers, switching on at **native launch** (friends and family stay on `comp` until then):

| Tier | Price | What's included |
|---|---|---|
| **Free** | $0 | Single person, pantry, recipes, nutrition to the gram, manual weekly planning, shopping list, ~5 day-optimizer runs (lifetime cap) |
| **Pro** | **$7/mo or $60/yr** | Everything in Free + household (multi-person), unlimited day optimizer, day templates, MCP/AI layer (recipe Optimization + Meal Prep tabs, MCP settings) |

- **No ads, ever** — conflicts with the stated no-tracking privacy stance and pays poorly at this scale.
- **No in-app chat** — cut entirely (June 2026, `SHOW_CHAT = false`). MCP (bring your own Claude) is the whole AI story.
- **No metered AI** — MCP egress is the only real variable cost, and it sits inside the paid tier, so who-pays = who-costs.
- **Fallback price if conversion disappoints:** $5/mo + $48/yr. Do not go below that floor.
- **Apple/Google take 15%** (under $1M/yr), so Pro nets ~$51/user/yr at $60/yr. Break-even ≈ 10–18 paying subscribers.

---

## Decisions pending

1. **R2 → Supabase Storage image migration.** R2 bucket still exists; DB image URLs still point there. Run `scripts/migrate-images-to-supabase.ts` once, then swap `lib/r2.ts` → `lib/storage.ts`, then delete the R2 bucket. See `briefs/migration-runbook.md` Phase 2.

2. **`hello@withgoodmeasure.com` email.** Apex domain now uses an A record (Vercel), so MX records are no longer blocked by a CNAME conflict. Options: Cloudflare Email Routing (free forward) or Google Workspace/Fastmail ($6–12/mo). Unblocks updating the contact email from `hello@mersostudio.com` in `app/privacy/page.tsx`.

3. **Native app billing**:
   - Apple Developer Program: **$99/year** ✅ account approved June 16, 2026 (DUNS resolved)
   - Google Play developer: **$25 one-time**
   - Cloud build for iOS (Codemagic free tier or EAS Build): TBD based on Capacitor build pipeline choice

4. **Sign in with Apple** (required by Apple for App Store apps that have other social sign-in): no marginal cost; uses existing Supabase Auth provider.

---

## How to keep this doc current

- **When you add a paid service**: add a row, note what it covers
- **When Supabase usage climbs**: check the Supabase dashboard Usage tab and update the projections
- **When traffic crosses a free-tier threshold**: update the projection table
- **Quarterly**: check Supabase + Vercel dashboards against the projections, update if drift

The full architectural rationale lives in `INFRASTRUCTURE.md` § Cost expectations. This doc is the bottom-line summary intended for quick reference and budget planning.

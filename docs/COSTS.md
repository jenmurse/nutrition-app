# Good Measure — Cost Sheet

Running ledger of what Good Measure costs to operate, what's covered by free tiers, and what changes when usage grows or the app opens to the public.

Last updated: June 16, 2026.

> **Planned change (June 16, 2026):** the going-native **B2 plan** (`briefs/going-native-b2-plan.md`) consolidates the backend onto **Supabase Pro (~$25/mo flat)** and **retires Railway** (and the warm-up cron with it). Landing/privacy move to Vercel (free tier), recipe images move R2 → Supabase Storage. The "Today" table below still reflects the *current* Railway-based setup; it will be rewritten when the migration ships. See the brief's §8 for the full forward-looking cost analysis.

---

## Today (invite-only, friends-and-family scale)

| Service | Plan | Monthly cost | What it covers |
|---|---|---|---|
| **Railway** (app + Postgres) | Hobby | $5 base + ~$2–3 usage = **~$7–8/mo** | Next.js server, Prisma, Postgres database, all on Railway's internal network |
| **Cloudflare R2** (image storage) | Free tier | **$0/mo** | Recipe images. 10 GB storage / 1M writes / 10M reads free per month. **Note: bucket is currently public (UUID filenames only protection). Moving to Supabase Storage with RLS would make images private per-household — the B2 migration plan includes this.** |
| **Supabase** (auth only) | Free tier | **$0/mo** | Email + Google OAuth. 50K MAU on free tier — won't approach |
| **cron-job.org** (warm-up pings) | Free tier | **$0/mo** | Pings `/api/warm` every 5 min to prevent Railway cold starts |
| **Claude API tokens** | n/a — MCP architecture | **$0/mo** | See "AI costs" section below — user's own Claude covers it |
| **Domain** (`withgoodmeasure.com`) | Annual | **~$1.25/mo** | ~$15/year prorated |
| **npm** (`good-measure-mcp` package) | Free | **$0/mo** | Public package, free hosting |
| **GitHub** (code hosting) | Free | **$0/mo** | Personal account, public repos free, private repos free at this scale |
| | | **~$8–9/mo total** | |

**One-time credits in play:**
- Railway welcome credit: $65, covers ~13 months of the $5 base fee. Effectively free until mid-2027.

---

## Cost detail — Railway

Railway charges $5/month base for the Hobby plan, plus usage above that. Resource pricing:

| Resource | Rate |
|---|---|
| vCPU | $0.000463/vCPU-minute (≈ $20/vCPU-month if running 24/7) |
| Memory | $0.000231/GB-minute (≈ $10/GB-month if running 24/7) |
| Network egress (out to public internet) | $0.10/GB |
| Postgres internal network | $0 (app ↔ DB always free) |

**Good Measure's actual usage** (approximate, steady-state):
- ~0.1 vCPU active
- ~512 MB RAM allocated
- Running 24/7 thanks to the warm-up cron

That translates to roughly $3 vCPU + $1 RAM = **~$4/mo above the base $5**, putting total Railway billing at ~$8/mo. Slightly more during heavy use (planner recalcs, photo uploads, etc.).

**Why running 24/7 costs more:** if the app were allowed to sleep when nobody's using it, those CPU/RAM meters would stop. The warm-up cron prevents sleep — buying snappier first-load UX in exchange for ~$2–3/mo extra usage. See `LOADING-PERFORMANCE.md` § "/api/warm keep-alive endpoint" for the trade-off.

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

The biggest unknowns are traffic volume and concurrent users. Conservative projection for an app that gets 1,000 monthly active users:

| Service | Then | Why it changes |
|---|---|---|
| **Railway** | Likely move to **Pro ($20/mo flat + usage)** | Hobby plan has resource caps. Pro removes them, eliminates sleep behavior (so warm-up cron becomes unnecessary), and gives priority support. |
| **Cloudflare R2** | Still free for a while | 10 GB free tier holds for thousands of recipes |
| **Supabase Auth** | Still free | Free tier is 50K MAU — way above any realistic friends-and-family-to-public ramp |
| **CAPTCHA** (Cloudflare Turnstile) | **$0/mo** | Free for all use — needs to be added before public launch |
| **Sentry** or similar error monitoring | Optional, ~$0–26/mo | Free tier covers 5K errors/mo; pay if needed |
| **Analytics** (Plausible / PostHog / Vercel) | Optional, $0–9/mo | Plausible $9/mo cheapest paid; PostHog and Vercel Analytics have free tiers |
| **Email transactional** (Resend) | Likely free | 3,000 emails/month on free tier; only matters if account-related emails ramp up |
| | | **~$25–60/mo at 1K MAU** |

---

## What changes if growth keeps going (10K+ MAU)

This is speculative until/unless it happens, but worth knowing what the next thresholds are:

- **Railway Pro → larger compute**: scale vertical to bigger containers. Could hit $50–150/mo for app + DB.
- **Supabase Pro** ($25/mo) once over 50K MAU
- **Cloudflare R2** storage starts costing: $0.015/GB above 10 GB. 1K active users × ~5 photos each × ~1 MB = 5 GB still free.
- **Sentry Team** ($26/mo) if error volume justifies it
- **Plausible Business** ($19/mo) for higher pageview tier
- **Custom infra**: at some point a dedicated Postgres instance, queue worker, etc. but that's many months / years out

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

1. **Railway → Supabase Pro consolidation** (B2 plan). Supersedes the old "stay on Hobby vs Railway Pro" question — the plan retires Railway entirely and moves the backend to Supabase Pro (~$25/mo flat, spend caps on). Happens as part of going native. See `briefs/going-native-b2-plan.md`.

2. **Warm-up cron retires with Railway.** Once the backend is on Supabase Pro (which never pauses), the cron-job.org warm-up ping is obsolete — delete it then.

3. **Native app billing**:
   - Apple Developer Program: **$99/year** ✅ account approved June 16, 2026 (DUNS resolved)
   - Google Play developer: **$25 one-time**
   - Cloud build for iOS (Codemagic free tier or EAS Build): TBD based on Capacitor build pipeline choice

4. **Sign in with Apple** (required by Apple for App Store apps that have other social sign-in): no marginal cost; uses existing Supabase Auth provider.

---

## How to keep this doc current

- **When you change Railway plan**: update Railway row + delete/update the cron note
- **When traffic crosses a free-tier threshold**: update the projection table
- **When you add a paid service**: add a row, note what it covers
- **Quarterly**: check Railway Usage tab against the projection, update if drift

The full architectural rationale lives in `INFRASTRUCTURE.md` § Cost expectations. This doc is the bottom-line summary intended for quick reference and budget planning.

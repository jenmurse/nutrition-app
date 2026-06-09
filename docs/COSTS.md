# Good Measure — Cost Sheet

Running ledger of what Good Measure costs to operate, what's covered by free tiers, and what changes when usage grows or the app opens to the public.

Last updated: June 2026.

---

## Today (invite-only, friends-and-family scale)

| Service | Plan | Monthly cost | What it covers |
|---|---|---|---|
| **Railway** (app + Postgres) | Hobby | $5 base + ~$2–3 usage = **~$7–8/mo** | Next.js server, Prisma, Postgres database, all on Railway's internal network |
| **Cloudflare R2** (image storage) | Free tier | **$0/mo** | Recipe images. 10 GB storage / 1M writes / 10M reads free per month |
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

## Decisions pending

1. **Stay on Hobby + cron, or move to Pro?** Friends-and-family scale doesn't justify Pro. Decide before opening to the public. Recommended: stay Hobby through the public-soft-launch waitlist drain; move to Pro when you hit ~50+ DAU.

2. **When to delete the warm-up cron?** The moment you move to Railway Pro, the cron stops earning its keep — Pro doesn't sleep apps. Delete the cron-job.org job at that point.

3. **Native app billing**:
   - Apple Developer Program: **$99/year** (required for App Store submission; pending Jen's DUNS resolution)
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

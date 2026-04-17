# Infrastructure Reference

Internal reference for architecture, costs, and optimizations.

---

## 1. Current Stack (as of April 2026)

```
User → Railway (Next.js app, persistent Node.js server)
           ↓ auth checks    ↓ data queries    ↓ image storage
      Supabase Auth    Railway Postgres    Cloudflare R2
```

| Layer | Service | Notes |
|---|---|---|
| Frontend + API | Railway (Next.js) | Persistent Node.js server, not serverless |
| Database | Railway (Postgres) | Internal network — no egress cost between app and DB |
| File storage | Cloudflare R2 | Zero egress fees, S3-compatible, `recipe-images` bucket |
| Auth | Supabase Auth | Free tier only — issues JWTs, never touches DB egress |

### Why this stack

Previously the app ran on Vercel + Supabase, which created two billing meters on every request:
- Vercel Fast Origin Transfer (data between CDN edge and serverless functions)
- Supabase DB egress (data leaving the DB)

Moving app + DB to Railway puts them on the same internal network. Data between them costs nothing. Auth stays on Supabase because JWT payloads (~1 KB) are negligible.

---

## 2. Monthly Cost Estimate

| Service | Plan | Estimated Cost | Notes |
|---|---|---|---|
| Railway | Hobby | $5/month base + usage | App + Postgres on same platform |
| Cloudflare R2 | Free tier | ~$0/month | 10 GB storage, 1M writes, 10M reads free/month |
| Supabase | Free tier | $0/month | Auth only — well within free limits |
| Domain | — | ~$12–20/year | Wherever you registered it |
| **Total** | | **~$15–25/month** | Depends on Railway resource usage |

### Railway resource billing (Hobby plan)

Railway charges for actual CPU and memory used, beyond the $5 base:

| Resource | Rate |
|---|---|
| vCPU | $0.000463/vCPU/minute |
| Memory | $0.000231/GB/minute |
| Network egress (out) | $0.10/GB |
| Internal network (app ↔ DB) | Free |

At low traffic (friends and family scale), the app + Postgres together will likely stay under $20/month total. Check Railway → Usage to monitor.

### If you go over

- **Railway:** Usage scales linearly — no surprise tier jumps. You pay exactly what you use. If the bill climbs, check the Metrics tab for the service consuming the most.
- **Cloudflare R2:** After free tier, storage is $0.015/GB, writes $4.50/million, reads $0.36/million. At current recipe volume, this won't be hit for a long time.
- **Supabase Auth:** Free tier supports 50,000 MAU. If you ever approach that, upgrade to Supabase Pro ($25/month) or migrate to NextAuth.js.

---

## 3. Optimizations Done

### Lazy nutrient loading (April 2026)

`/api/recipes?slim=true` returns only display fields. Full nutrient data is only fetched when the user selects a nutrient-based sort.

**Files:** `app/api/recipes/route.ts`, `app/recipes/page.tsx`, `app/recipes/[id]/page.tsx`

---

### Image migration to Cloudflare R2 (April 2026)

Images moved from Supabase Storage → Cloudflare R2. Zero egress fees, global CDN.

- **Migration script:** `scripts/migrate-images-to-r2.ts` (migrated 36 recipes)
- **New uploads:** `app/components/RecipeBuilder.tsx` → POSTs to `/api/recipes/upload-image` (server-side, keeps R2 credentials out of browser)
- **URL imports:** `app/api/recipes/import/url/route.ts` — external images fetched and re-uploaded to R2

---

### Cache-Control headers on MCP endpoints (April 2026)

MCP read endpoints return `Cache-Control: private, max-age=600, stale-while-revalidate=120`.

Repeated fetches of the same recipe within a 10-minute window are served from cache — DB is not queried. Reduces Railway DB load during AI analysis sessions.

**Files:** `app/api/mcp/recipes/route.ts`, `app/api/mcp/recipes/[id]/route.ts`, `app/api/mcp/ingredients/route.ts`

**Tradeoff:** Edits may not be visible to Claude for up to 10 minutes after saving. Acceptable in practice.

---

### Stats route household filter fix (April 2026)

`ingredient.count()` and `recipe.count()` were missing a `householdId` filter. Fixed in `app/api/stats/route.ts`.

---

## 4. Monitoring

**Railway → Usage** (project level) — check mid-month
- **Estimated Bill** — as long as this shows $0.00, you're within the $5 included usage. Only act if it goes above $0.
- **Egress (nutrition-app service)** — the one number that grows with traffic. This is data sent from the app to users' browsers. Normal at low traffic; watch it if you get real users.
- **Egress (Postgres service)** — should always be $0.00. App and DB are on Railway's internal network so DB queries cost nothing. If this ever goes above $0, something is wrong.
- **CPU / Memory / Volume** — ignore these at current scale. Only relevant if the app starts crashing or slowing down.
- **Credits Available: $65** — one-time Railway welcome credit. Covers ~13 months of the $5 base fee. Essentially free until mid-2027.

**During MCP sessions (Claude analyzing recipes):**
- **nutrition-app Egress** goes up slightly — each tool call sends recipe/ingredient data to Claude. The 10-minute cache headers mean repeated fetches of the same recipe don't re-hit the server, so impact is buffered.
- **Postgres Egress** stays $0.00 — internal network, always free.
- A heavy MCP session (full library analysis) adds a few cents to monthly egress. Not meaningful at current scale.

**Cloudflare R2 → Overview** — check occasionally
- **Total storage** vs. 10 GB free (currently 5.84 MB — negligible)
- **Class A operations** (writes) vs. 1M free — one write per image upload
- **Class B operations** (reads) vs. 10M free — one read per image view (cached by browser after first load)
- At friends-and-family scale: $0/month. Won't matter until thousands of active users.

**Supabase → Authentication → Users**
- MAU count vs. 50,000 free limit — not a concern until real public launch

---

## 5. Known DB Query Hotspots

Not urgent, but worth revisiting if the ingredient library grows significantly.

| Query | Context | Note |
|---|---|---|
| `SELECT FROM IngredientNutrient WHERE ingredientId IN (...)` | Ingredients page + recipe detail | ~373k rows read at current scale — watch if library grows |
| Recipe list query | List page | 62 ms mean, slim payload — acceptable |

Pagination or lazy loading on the IngredientNutrient query would reduce row reads if the library scales to thousands of ingredients.

---

## 6. Pre-launch Checklist

Before opening to the public:

- [ ] **RLS (Row Level Security)** — enforce household data isolation at the DB level. See `rls_plan.md` in project memory.
- [ ] Test Google OAuth with a new account (not your own) to verify onboarding flow
- [ ] Verify Railway auto-deploys on `git push main`
- [ ] Confirm R2 bucket is not publicly listable (objects are public, listing should not be)

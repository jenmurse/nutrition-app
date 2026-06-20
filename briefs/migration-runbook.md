# Backend Migration Runbook
## Railway + R2 → Supabase Pro (Variant A)

**Date written:** June 18, 2026
**Completed:** June 19, 2026 — Phases 0–3 done. App live at withgoodmeasure.com on Vercel + Supabase Pro. Railway still running (kept as 24-hr safety net). Phase 2 (image migration) and Phase 4 (retire Railway) are the remaining tasks.
**Approach:** Variant A — keep existing Next.js API routes, deploy to Vercel serverless, point Prisma at Supabase Postgres. Minimal code change; kills Railway immediately.
**Reference:** `briefs/going-native-b2-plan.md` §6–7 for strategy; this doc for the actual steps.

---

## Before you start — decisions to lock first

From `briefs/going-native-b2-plan.md` §10:

- [ ] **Variant A confirmed** (recommended; this runbook assumes it)
- [ ] **Bundle ID decided** — e.g. `com.withgoodmeasure.app`
- [ ] **App name reserved** in App Store Connect — confirm "Good Measure" is available
- [ ] **Recipe images: move to Supabase Storage** (recommended; this runbook includes it)

---

## Phase 0 — Prep (no downtime, no cutover yet)

### 0a. Get your Supabase project ready

You already have a Supabase project (used for auth). You'll expand it into the full backend.

1. Log into [supabase.com](https://supabase.com) → open the existing project.
2. **Upgrade to Pro** — Settings → Billing → Upgrade to Pro ($25/mo). Turn on spend caps.
3. Grab your **connection string**: Settings → Database → Connection string → choose **"URI"** mode. It looks like:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
   Save this — it becomes your new `DATABASE_URL`.

### 0b. Create a Storage bucket for recipe images

1. Supabase dashboard → Storage → New bucket.
2. Name: `recipe-images`. **Keep it private** (RLS will control access).
3. Under bucket policies, add a simple read policy for now:
   ```sql
   -- Allow any authenticated user to read recipe images
   CREATE POLICY "Authenticated users can read recipe images"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'recipe-images');

   -- Allow any authenticated user to upload recipe images
   CREATE POLICY "Authenticated users can upload recipe images"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'recipe-images');
   ```
   *(Fine-grained per-household RLS comes when you do the full RLS pass — this gets you unblocked now.)*

### 0c. Wire up Supabase email (Resend)

Before touching auth, make sure auth emails work:

1. Resend dashboard → Domains → verify `withgoodmeasure.com` (adds SPF/DKIM DNS records).
2. Supabase → Auth → Email → SMTP settings → use Resend's SMTP:
   - Host: `smtp.resend.com`
   - Port: 465
   - User: `resend`
   - Password: your Resend API key
   - From: `hello@mersostudio.com` (update to `hello@withgoodmeasure.com` after DNS move)
3. Supabase → Auth → Email Templates → verify the templates use the **token_hash** flow (see `docs/supabase_auth_config.md`). This is required for mobile; confirm it's set now.

### 0d. Add Sign in with Apple as a Supabase provider

1. Apple Developer portal → Certificates, Identifiers & Profiles → **Keys** → create a new key with "Sign in with Apple" enabled. Download it (`.p8` file) — you only get one download.
2. Supabase → Auth → Providers → Apple → enable, paste in your:
   - Team ID (from Apple Developer account)
   - Key ID (from the key you just created)
   - Service ID (create a new Service ID in Apple Developer → Identifiers → add "Sign in with Apple" to it)
   - The contents of the `.p8` key file
3. Add the Supabase callback URL to the Service ID's domains/return URLs in Apple Developer.

---

## Phase 1 — Database migration

### 1a. Export data from Railway Postgres

On your local machine:

```bash
# Get your Railway connection string from Railway dashboard → your Postgres service → Connect
pg_dump --no-owner --no-acl -Fc \
  "postgresql://USER:PASSWORD@HOST:PORT/railway" \
  > good-measure-$(date +%Y%m%d).dump
```

That `.dump` file is your backup. Keep it.

### 1b. Apply Prisma migrations to Supabase

The schema needs to exist in Supabase before you restore data:

```bash
# Temporarily point at Supabase
DATABASE_URL="postgresql://postgres.PROJECTREF:PASSWORD@..." npx prisma migrate deploy
```

This runs all your existing migrations against the Supabase database, creating the tables.

### 1c. Restore data into Supabase

```bash
pg_restore --no-owner --no-acl -d \
  "postgresql://postgres.PROJECTREF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  good-measure-$(date +%Y%m%d).dump
```

Verify with a quick sanity check:
```bash
psql "postgresql://postgres.PROJECTREF:PASSWORD@..." \
  -c "SELECT COUNT(*) FROM \"Recipe\"; SELECT COUNT(*) FROM \"MealPlan\";"
```

---

## Phase 2 — Image migration (R2 → Supabase Storage)

### 2a. List all image URLs currently in the database

```bash
psql "your-railway-connection-string" \
  -c "SELECT \"imageUrl\" FROM \"Recipe\" WHERE \"imageUrl\" IS NOT NULL;"
```

Note the URL pattern: `https://[R2_PUBLIC_URL]/[uuid].[ext]`

### 2b. Run the migration script

Create `scripts/migrate-images-to-supabase.ts` and run it once:

```typescript
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role bypasses RLS for migration
);

async function run() {
  const recipes = await prisma.recipe.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
  });

  console.log(`Migrating ${recipes.length} images...`);

  for (const recipe of recipes) {
    const oldUrl = recipe.imageUrl!;
    const filename = oldUrl.split("/").pop()!;

    // Fetch from R2
    const res = await fetch(oldUrl);
    if (!res.ok) {
      console.error(`  SKIP ${filename} — fetch failed (${res.status})`);
      continue;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(filename, buffer, { contentType, upsert: true });

    if (error) {
      console.error(`  FAIL ${filename}:`, error.message);
      continue;
    }

    // Get the new public URL
    const { data } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(filename);

    // Update the database record
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { imageUrl: data.publicUrl },
    });

    console.log(`  OK ${filename}`);
  }

  await prisma.$disconnect();
  console.log("Done.");
}

run().catch(console.error);
```

Run it:
```bash
DATABASE_URL="supabase-connection-string" \
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
npx tsx scripts/migrate-images-to-supabase.ts
```

At 3 users' worth of images, this takes seconds.

### 2c. Swap the image upload code

Replace `lib/r2.ts` with a Supabase Storage equivalent:

```typescript
// lib/storage.ts (replaces lib/r2.ts)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadImage(
  filename: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from("recipe-images")
    .upload(filename, body, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from("recipe-images")
    .getPublicUrl(filename);

  return data.publicUrl;
}
```

Update `app/api/recipes/upload-image/route.ts` to import from `lib/storage` instead of `lib/r2`.

---

## Phase 3 — Vercel deploy (Variant A)

### 3a. Configure env vars in Vercel

In your Vercel project → Settings → Environment Variables, add/update:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase pooler connection string |
| `DIRECT_URL` | Your Supabase direct connection string (for Prisma migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[ref].supabase.co` |
| `SUPABASE_ANON_KEY` | From Supabase → API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → API settings (server-side only) |

Remove (or leave unused — they won't be used once code is switched):
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### 3b. Deploy to Vercel

```bash
vercel --prod
```

Verify:
- [ ] App loads
- [ ] Sign in works (email magic link)
- [ ] Google sign-in works
- [ ] Recipes load
- [ ] Images display from Supabase Storage URLs
- [ ] Recipe image upload works (upload a new photo, confirm it saves)

### 3c. Point your domain at Vercel

In your domain registrar / Cloudflare DNS:
- Remove the CNAME pointing to Railway
- Add an **A record** pointing `withgoodmeasure.com` to Vercel's IP (Vercel dashboard → Domains will tell you the exact value)
- Add a `CNAME` for `www` → `cname.vercel-dns.com`

Vercel will auto-provision the SSL cert.

---

## Phase 4 — Retire Railway

Once the Vercel deploy is stable and the domain is pointed:

1. **Cancel Railway service** — Railway dashboard → your project → Settings → Danger → Delete project. Your billing stops.
2. ✅ **Warm-up cron deleted** — cron-job.org ping removed June 19, 2026.
3. The `/api/warm` endpoint can stay in the codebase (it's harmless).

---

## Phase 5 — Post-migration cleanup

- ✅ `docs/COSTS.md` updated — Railway/R2 rows removed, Supabase Pro row added
- [ ] Update `app/privacy/page.tsx` — swap "Where your data lives" to Supabase (remove Railway + Cloudflare R2 references). The `TODO (backend migration)` comment is already there.
- [ ] Delete `lib/r2.ts` — replaced by `lib/storage.ts`. Delete once Railway is retired and everything is confirmed stable.
- ✅ R2 bucket deleted — June 19, 2026. All 67 recipe images migrated to Supabase Storage. `recipe-images` bucket is public (UUID filenames = unguessable; signed URLs deferred to full RLS pass).
- [ ] Set up `hello@withgoodmeasure.com` — apex domain now uses A record so MX is unblocked. Options: Cloudflare Email Routing (free forward) or Google Workspace/Fastmail. Then update `app/privacy/page.tsx` contact email (currently `hello@mersostudio.com`).

---

## After this is done — what's next

- **Phase 3 (Capacitor)** — init the native shell, iOS first
- **MCP remote connector** — repoint from Railway API URL to Vercel API URL (trivial — env var change on the MCP host, or just update the token-in-URL base URL)
- **Full RLS** — currently deferred; apply per-household row policies when the architecture is stable. See `docs/rls_plan.md`.
- **Landing/privacy split** — extract `app/(marketing)/` + `/privacy` to a separate Vercel project. Low priority until native launch.

---

## Rollback plan

If something goes wrong post-cutover:

1. Point DNS back at Railway (add the CNAME back).
2. Railway is still running until you delete it — so if you hold off on Phase 4, you have a live fallback for 24–48 hours while DNS propagates back.
3. The Railway database is still intact; data only diverges if new writes happen on Supabase before you roll back.

**Recommendation:** do the domain cutover on a low-traffic hour. At 3 users, coordinate with Garth and Angie — "heads up, doing a maintenance window at [time]."

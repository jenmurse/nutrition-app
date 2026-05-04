# Auth & Access Control

## Overview

Good Measure is currently **invite-only**. There are two ways to get access:

1. **Invite code** — a shared code distributed to friends and family
2. **Household invite link** — generated from within the app when adding a household member

Public visitors who don't have a code can join a waitlist.

---

## Routes

| Route | Who it's for | What it does |
|---|---|---|
| `/login` | Existing users | Sign in only |
| `/invite` | New users with an invite code | Validates code, then collects name/email/password and creates account |
| `/waitlist` | General public | Collects name + email and saves to the waitlist |
| `/waitlist-success` | — | Confirmation page after waitlist signup |
| `/admin/waitlist` | Jen only | Password-protected view of all waitlist entries |

---

## The invite code

A single shared invite code is stored as an environment variable:

```
INVITE_CODE=Friends_Measure_2X
```

- Set in `.env` for local development
- Set in the Railway dashboard (Variables tab) for production
- Validation happens **server-side only** via `POST /api/invite/validate` — the code is never exposed to the browser
- Comparison is **case-insensitive**

---

## The `/invite` page flow

The invite page is two steps:

**Step 1 — Code validation**
User enters their invite code and clicks Continue. The code is validated server-side. If wrong, an inline error shows and they stay on step 1.

**Step 2 — Account creation**
Once the code is accepted, the full signup form appears: Name, Email, Password, Confirm Password, and a Create Account button. There is also a "Continue with Google" option. On Google, the code is re-validated server-side before redirecting to OAuth.

After signup, Supabase sends a confirmation email. The user clicks the link and lands at `/auth/callback`, which completes session setup and routes them to onboarding.

---

## The `/login` page — sign in only

The login page shows only the sign-in form. There is no "Create account" tab visible.

**Household invite links** still work: when a user follows a household invite link (e.g. `/login?invite=<token>`), the login page switches into signup mode automatically — no code required, as the household invite token is the auth mechanism.

`/login?signup=1` (the old direct-to-signup URL) now redirects to `/invite`.

---

## Previous design — tabbed login

The original login page had two tabs: **Sign in** and **Create account**. This was the entry point for all signups before the invite-only gate was introduced.

The tabbed design is archived at:
```
briefs/_archived/login-page-tabbed.tsx
```

This file is the exact snapshot of the login page before the tabs were removed. When Good Measure opens to the general public, restore this file (or use it as the basis for `/login`) and remove the invite gate.

---

## The waitlist

Public visitors who don't have a code can join the waitlist at `/waitlist`.

**What it collects:** name + email  
**Where it saves:** the `Waitlist` table in the Railway Postgres database  
**Schema:**
```sql
CREATE TABLE "Waitlist" (
  "id"        TEXT        PRIMARY KEY,
  "name"      TEXT        NOT NULL,
  "email"     TEXT        NOT NULL,
  "createdAt" TIMESTAMP   DEFAULT NOW()
);
```

Duplicate emails are allowed — no unique constraint. If someone submits twice, both rows are saved.

### Viewing the waitlist

Go to `withgoodmeasure.com/admin/waitlist` and enter the admin password. Shows name, email, and signup date for all entries, newest first.

The admin page is password-gated via `ADMIN_PASSWORD` env var (set in `.env` and Railway). The password is stored in the project memory file `project_env_vars.md`.

To query directly with SQL:
```sql
SELECT * FROM "Waitlist" ORDER BY "createdAt" DESC;
```

---

## Auth middleware

The file `proxy.ts` at the project root acts as Next.js middleware. It:

- Refreshes the Supabase session on every request
- Redirects unauthenticated users to `/login` for any non-public route
- Passes the verified user ID to API routes via `x-supabase-user-id` header (avoids redundant auth calls)

**Public routes** (no auth required):
- `/` — landing page
- `/login` — sign in
- `/auth/*` — Supabase auth callbacks
- `/invite` — invite code + signup
- `/waitlist` — waitlist form
- `/waitlist-success` — waitlist confirmation
- `/admin/*` — admin pages (have their own password gate)
- `/api/invite/*` — invite code validation
- `/api/waitlist` — waitlist submission
- `/api/admin/*` — admin API routes (password-gated internally)
- `/api/auth/*` — Google OAuth
- `/preview` — preview route

If you add a new public page, add it to the `isPublicRoute` check in `proxy.ts`.

---

## Opening to the public (future)

When the app is ready for general signup:

1. Restore `briefs/_archived/login-page-tabbed.tsx` as the login page (or merge the Create Account tab back in)
2. Remove the invite code field from `/invite` (or retire the page entirely)
3. Update the landing page CTAs — swap `JOIN WAITLIST →` back to `GET STARTED →` linking `/login?signup=1`
4. Optionally email the waitlist

The `INVITE_CODE` env var can be left in place or removed — it won't affect anything once the gate is gone.

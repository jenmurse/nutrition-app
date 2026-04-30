---
name: Supabase auth — email template config (token_hash flow)
description: The app's auth flow depends on Supabase email templates being customized off the default. Required config that lives outside the codebase.
type: project
originSessionId: f24dd28a-ed8a-44b2-acc9-c1701ec9d0eb
---
The email confirmation flow uses **`token_hash`** (`/auth/confirm` route), not the default PKCE `?code=` redirect to `/auth/callback`.

**Why:** PKCE requires the code verifier cookie to be in the same browser context that initiated signup. On mobile, email links often open in a different context (Gmail in-app browser, Safari View Controller) where the verifier isn't available — so `exchangeCodeForSession` fails and the user lands on `/login`. The `token_hash` flow validates server-side via `verifyOtp` and sets the session via cookies, working regardless of which browser opens the link.

**How to apply / verify:**

1. **Email templates** in Supabase Dashboard → Authentication → Email Templates must use:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
   ```
   (and `type=magiclink` / `type=email_change` / `type=recovery` for the other templates)

   NOT the default `{{ .ConfirmationURL }}`.

2. **Redirect URLs allow list** in Supabase Dashboard → Authentication → URL Configuration must include both `/auth/confirm` and `/auth/callback` on the production domain.

3. **Code paths:**
   - `app/auth/confirm/route.ts` — calls `verifyOtp`, then redirects to `/auth/callback` so existing provisioning logic runs.
   - `app/auth/callback/route.ts` — provisions Person/Household, routes to `/onboarding` for new users.
   - `proxy.ts` bypasses both `/auth/callback` and `/auth/confirm` so middleware doesn't interfere with cookie/PKCE handling.

**Symptoms if the templates regress to default:** users tap email confirmation link → land on `/login` (not onboarding) and no Person row exists in Postgres despite the auth row in Supabase.

**Related:** the login page also detects Supabase's email-enumeration protection via `data.user.identities.length === 0` to surface a "this email already exists" error on duplicate signups (instead of silently pretending to send a new confirmation).

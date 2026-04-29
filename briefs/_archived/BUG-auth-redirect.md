# Bug — Auth redirect fails on first Google OAuth sign-in

## Repro steps

1. Land on `withgoodmeasure.com` while logged out
2. Click SIGN IN (lands on `/login`)
3. Click `Continue with Google`
4. Complete Google OAuth (in this case, via passkey + Touch ID)

## Expected

After successful auth, the user is redirected to the dashboard at `/`.

## Actual

After successful auth, the user is shown the auth screen again at `/login`. The session is established (verified by clicking `Continue with Google` a second time, which immediately routes to the dashboard without re-prompting Google), but the initial redirect after the OAuth callback didn't fire.

## Likely cause

This is almost certainly a race condition or stale-cookie issue in the OAuth callback handler at `app/auth/callback/route.ts`. Possibilities:

1. **Session cookie not propagated before redirect.** The Supabase auth cookie is set, but the redirect to `/` (or `/onboarding` for new users) fires before the middleware can read the cookie on the next request, so the user gets bounced back to `/login` by the auth gate.
2. **Redirect target stale.** The callback route may be redirecting to a path stored from before the OAuth flow started, and that path resolves to the login page.
3. **Onboarding flag check race.** The callback sets `onboardingComplete: false` on new user creation but reads the flag in the same request, getting a stale value.

## What to investigate

Walk through `app/auth/callback/route.ts` carefully. Check:

1. The order of operations: cookie set → DB write (if new user) → redirect target determined → redirect fired.
2. Whether the redirect uses `NextResponse.redirect()` with a properly constructed absolute URL, or a relative path that might resolve differently than expected.
3. Whether the middleware's session check is awaiting the cookie correctly. The `x-supabase-user-id` header injection in `middleware.ts` is the gate that determines whether `/login` redirects to `/` or stays put.
4. Whether the issue is specific to passkey/Touch ID flows. Standard Google OAuth password flow may behave differently than passkey flow because of timing — the passkey response may complete faster than the cookie can fully establish.

## Reproducibility check

Before assuming this is universal:

- Try the flow again from a fresh browser session (incognito) to see if it reproduces.
- Try without passkey (sign in with Google password instead) to isolate whether the passkey flow specifically is breaking.
- Check the browser network tab on the failing flow: is there a redirect chain that ends at `/login`, or does the callback never redirect at all?

## Severity

Medium. The session is established correctly — the user is authenticated, just stranded on the wrong page. Clicking Google sign-in a second time recovers. But it's a confusing first impression for new users and worth fixing before launch.

## Files

- `app/auth/callback/route.ts` — OAuth callback handler
- `middleware.ts` — session validation and redirect logic
- `app/login/page.tsx` — to verify the login page itself isn't bouncing post-auth users somewhere unexpected

## Effort

Unknown until reproduced and the cause identified. Probably small once the race condition is found. Could be a single `await` fix or a redirect URL correction.

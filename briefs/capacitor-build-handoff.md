# Capacitor Native Build — Session Handoff

**Date written:** June 20, 2026
**Purpose:** Everything a fresh session needs to take Good Measure from "live web app" to "iOS app in the simulator → TestFlight → App Store," then Android.
**Read first:** [`going-native-b2-plan.md`](going-native-b2-plan.md) is the strategy. This doc is the *execution* plan and supersedes its phase table for what's actually left.

---

## TL;DR

The backend migration is **done** (Vercel + Supabase Pro, Railway/R2 retired, Apple Sign In configured, MCP connector built). The web app at `withgoodmeasure.com` is a polished PWA already (manifest, service worker, safe-area handling, standalone display).

**The remaining work is the native shell.** Because this is a Next.js 16 **SSR app** (API routes + React Server Components + cookie-based Supabase auth), it **cannot be statically exported** into Capacitor. The right approach — and the natural fit for "Variant A," which is already chosen and live — is:

> **Capacitor wraps the live site via `server.url`.** The native app is a WKWebView pointed at `https://withgoodmeasure.com`, enriched with native plugins (Sign in with Apple, keychain auth, haptics, status bar, share, local notifications). No frontend rewrite.

The build session's job: scaffold Capacitor, wire native plugins, get it running in the iOS Simulator, do an iPad layout pass, then archive to TestFlight.

---

## 1. What's already done — DO NOT redo

| Area | Status |
|---|---|
| Backend on Supabase Pro (Postgres + auth + storage) | ✅ Live since June 19 |
| App hosted on Vercel serverless (Variant A) | ✅ Live at `withgoodmeasure.com` |
| Railway retired, R2 retired, `lib/r2.ts` deleted | ✅ June 20 |
| Recipe images on Supabase Storage | ✅ |
| Sign in with Apple — **server/provider side** configured in Supabase | ✅ Key ID `J63X338X2Q`, Team ID `V95AGCD2P7`, secret renews **Dec 15, 2026** |
| token_hash email flow (mobile-safe) | ✅ See `docs/supabase_auth_config.md` |
| MCP hosted remote connector | ✅ Built — see `mcp-hosted-connector.md` |
| PWA: manifest, service worker, offline, safe areas, standalone | ✅ Already shipped |
| Email `hello@withgoodmeasure.com` (+support@/help@) | ✅ Forwarding live |
| Monetization decided (Free + Pro $7/mo·$60/yr) | ✅ `monetization-decision.md` — **not yet enforced in UI** |

**What's NOT done:** the Capacitor shell, native plugins, iPad layout pass, app store listing, TestFlight, Android. That's this work.

---

## 2. The architecture decision (read this before scaffolding)

### Why `server.url`, not static export
- Static export (`output: 'export'`) requires no SSR and no API routes. This app is **all** SSR + API routes + cookie auth. Exporting would mean rewriting the entire data layer to client-only Supabase calls (that's the brief's "Variant B" — weeks of work).
- `server.url` loads the live Vercel app in the native webview. Zero frontend change. The existing service worker already provides offline. This is the standard, supported pattern for shipping an SSR Next.js app to the App Store.

### `capacitor.config.ts` shape (target)
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.withgoodmeasure.app',     // ← decide/confirm (see §3)
  appName: 'Good Measure',
  webDir: 'public',                     // placeholder; server.url is what loads
  server: {
    url: 'https://withgoodmeasure.com',
    cleartext: false,
  },
  ios: { contentInset: 'always' },
};

export default config;
```

### The one real risk: Apple Guideline 4.2 (Minimum Functionality)
Apple rejects apps that are "just a website in a wrapper." We pass by adding genuine native value — most of which we already have or get cheaply:
- **Sign in with Apple** (provider already configured; needs the *native* flow wired)
- **Native keychain** session storage (`@capacitor/preferences`)
- **Haptics** on key interactions (`@capacitor/haptics`)
- **Native status bar / safe-area theming** (`@capacitor/status-bar`)
- **Share sheet** (`@capacitor/share`) — share a recipe
- **Local notifications** (`@capacitor/local-notifications`) — cook/plan reminders, no server needed
- **Offline** via the existing service worker

Document these in the App Review notes. This is the single most likely rejection reason; the mitigation is real native features, not arguing.

### Auth nuance to solve in-session
The web app uses **cookie-based** Supabase auth (`@supabase/ssr`). In a `server.url` webview loading the real domain, cookies work normally. But:
- **Sign in with Apple** should use the native Apple flow (`@capacitor-community/apple-sign-in` or Supabase's native sign-in) then hand the identity token to Supabase, rather than a web redirect — cleaner UX and Apple prefers it.
- Persist/refresh the session so users aren't logged out. Verify session survival across app cold starts early — it's the highest-risk integration point.

---

## 3. Decisions to lock at session start (5 minutes)

| Decision | Recommendation | Action |
|---|---|---|
| **Bundle ID** | `com.withgoodmeasure.app` | Create the App ID in Apple Developer portal |
| **App Store name** | "Good Measure" | **Reserve in App Store Connect** — confirm it's free (note: you also have "Quiet Measure"; same dev account/naming family is fine) |
| **Deep-link scheme** | `goodmeasure://` | Register now even if lightly used; needed for auth redirects |
| **Variant A vs B** | A (already live) | No action — A is the on-ramp; B is a later optional purity pass |

---

## 4. Prerequisites to install (machine setup — do these first)

Verified on this machine June 20, 2026:

1. **CocoaPods is NOT installed.** Capacitor iOS needs it:
   ```bash
   brew install cocoapods
   ```
2. **`xcode-select` points at the CLI tools, not full Xcode.** Builds will fail until repointed:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   xcodebuild -runFirstLaunch   # accept license / install components
   ```
3. Node v24 — ✅ fine. Xcode + Simulator — ✅ user has them.
4. Open Xcode once, sign in with the Apple Developer account: **Xcode → Settings → Accounts → +** (so signing works later).

---

## 5. Capacitor scaffolding — step by step

```bash
# from repo root
npm install @capacitor/core @capacitor/cli
npx cap init "Good Measure" com.withgoodmeasure.app --web-dir=public

# native platforms
npm install @capacitor/ios
npx cap add ios
# (Android later: npm install @capacitor/android && npx cap add android)

# core plugins (native value for Apple 4.2 + UX)
npm install @capacitor/status-bar @capacitor/haptics @capacitor/share \
            @capacitor/preferences @capacitor/network @capacitor/keyboard \
            @capacitor/local-notifications @capacitor/app

npx cap sync ios
```

Then edit `capacitor.config.ts` to add the `server.url` block from §2.

**Gotchas:**
- `ios/` and `android/` native folders get committed. Add Pods build artifacts to `.gitignore` (Capacitor's default `.gitignore` in those folders usually handles this).
- After any config or plugin change: `npx cap sync ios`.
- Because we use `server.url`, you do **not** rebuild Next.js for each native run — the app loads the live site. (For testing against local dev, temporarily point `server.url` at your LAN IP + dev port, with `cleartext: true`.)

---

## 6. Xcode + Simulator workflow (refresher)

You did this for Quiet Measure; here's the muscle memory:

1. **Open the native project in Xcode:**
   ```bash
   npx cap open ios
   ```
   This opens `ios/App/App.xcworkspace` (always the **.xcworkspace**, never **.xcodeproj**, because CocoaPods).
2. **Pick a simulator:** top toolbar device dropdown → e.g. "iPhone 16 Pro." For iPad testing pick an iPad (e.g. "iPad Pro 11-inch").
3. **Set signing:** select the **App** target → **Signing & Capabilities** → check "Automatically manage signing" → pick your **Team** (the Apple Developer account). Add the **Sign in with Apple** capability here too.
4. **Run:** press **▶︎** (or **Cmd+R**). Xcode builds, boots the simulator, installs, and launches. First build is slow (Pods compile).
5. **Iterate:** since it's `server.url`, most changes are just web deploys to Vercel — reload the app (stop/run, or pull-to-refresh) to see them. Only native changes (plugins, config, icons) need a rebuild + `npx cap sync ios`.
6. **Logs:** Xcode console shows native logs. For web/JS logs, use Safari → Develop → Simulator → [the app's webview] for full devtools against the WKWebView.

---

## 7. App icons, splash, iPad

- **App icon:** 1024×1024 master. Use the existing `public/PWA_icon-512x512.png` as the design source but export a crisp 1024². Drop into Xcode's asset catalog (or use `@capacitor/assets` to generate all sizes: `npx @capacitor/assets generate --ios`).
- **Splash screen:** simple paper/ink wordmark on `#F5F4EF` (matches manifest `background_color`).
- **iPad "full experience":** the app already has desktop + mobile responsive layouts. On iPad it should serve the **desktop-class matrix planner**, not the phone layout. This is a breakpoint-audit + device-test pass, **not a rewrite**. Set the iOS target to **Universal** (iPhone + iPad). Test the planner matrix, recipe builder, and optimizer at iPad widths in the simulator.

---

## 8. TestFlight path

Once it runs in the simulator and on a physical device:

1. **App Store Connect:** create the app record (name "Good Measure," bundle ID, primary language, SKU).
2. In Xcode: device dropdown → **Any iOS Device (arm64)** (not a simulator).
3. **Product → Archive.** When the archive finishes, the **Organizer** opens.
4. **Distribute App → App Store Connect → Upload.** Xcode validates + uploads the build.
5. In App Store Connect → **TestFlight** tab: the build appears after processing (~5–30 min). Add **Internal testers** (you, Garth, Angie) — internal needs no review. **External** testers require a Beta App Review (~1 day).
6. Testers install via the **TestFlight app** on their device.

**Privacy/listing prep (can run in parallel):** privacy policy is done (`/privacy`). Needed: App Privacy questionnaire in App Store Connect (we collect name + email; no tracking — matches the privacy page), screenshots (6.7" iPhone + 12.9" iPad), description, keywords, support URL (`withgoodmeasure.com` or `hello@`), category.

---

## 9. Android fast-follow (after iOS is stable)

```bash
npm install @capacitor/android
npx cap add android
npx cap sync android
npx cap open android   # opens Android Studio
```
- Same `server.url` model. Run in an emulator (AVD) or borrowed device.
- Google Play: $25 one-time dev account. Sign in with Apple still required on Android too (Apple's rule applies wherever Google sign-in is offered — already handled by Supabase).
- iOS-first because that's where QA devices are; Android once there's a way to test on a real device.

---

## 10. Known gotchas / risk register

- **Apple 4.2 rejection** — biggest risk. Mitigation: ship the native plugins in §2 and list them in review notes. (Likelihood drops a lot with Sign in with Apple + haptics + local notifications + offline.)
- **Session persistence in the webview** — verify Supabase session survives cold start before building anything else. Highest-risk integration point.
- **`server.url` + offline** — the service worker handles cached reads, but the *first* launch needs network. Confirm the offline fallback shell (`app/offline/page.tsx`) renders inside the native webview.
- **Status bar overlap / safe areas** — already handled in CSS via `env(safe-area-inset-*)` + `viewportFit: cover`. Verify on a notched simulator; adjust `contentInset` if content sits under the status bar.
- **Deep links / auth redirects** — `goodmeasure://` scheme must be registered in Xcode (URL Types) and added to Supabase redirect allow-list for native OAuth.
- **Apple secret expiry** — the Sign in with Apple JWT renews **Dec 15, 2026** via `scripts/generate-apple-secret.mjs`. Unrelated to the build but don't let it lapse.

---

## 11. Suggested session order

1. Lock §3 decisions (bundle ID, reserve app name, deep-link scheme).
2. Machine prereqs §4 (CocoaPods, xcode-select, Xcode account).
3. Scaffold Capacitor §5, get it running in the simulator §6 — **prove the live site loads in the webview.**
4. Wire native auth (Sign in with Apple native flow) + verify session persistence.
5. Add the other native plugins (haptics, status bar, share, local notifications, preferences).
6. Icons/splash + iPad layout pass §7.
7. Physical-device test → Archive → TestFlight §8.
8. Android fast-follow §9.

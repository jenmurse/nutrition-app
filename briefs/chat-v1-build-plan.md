# Chat v1 — Build Plan

**Spec:** `briefs/chat-v1.html` (the visual mock)
**Status:** Gate 0 approved, ready to start Gate 1
**Scope:** in-app AI chat ("Ask") as the primary front door for Good Measure's AI features. MCP stays, demoted to advanced "connect your own AI" option.

---

## Architecture — locked

| Decision | Value |
|---|---|
| AI provider | Anthropic API directly (`@anthropic-ai/sdk`). Not Vercel AI Gateway — we're on Railway, not Vercel. |
| Model | `claude-sonnet-4-5` (or current Sonnet) — best balance of speed, cost, tool-use quality |
| Streaming | Yes — server-sent events. Materially better feel than wait-for-full-response. |
| Context loading | Lightweight + tool-on-demand. Send recipe names + macros + pantry summary + goals + current week. Full recipe detail fetched via tool call only when a recipe comes up in conversation. |
| Prompt caching | Yes — Anthropic supports it natively, cuts repeat-message input tokens by 80–90% within a session. Cache the system prompt + lightweight context block per person. |
| Container — desktop | Right-docked overlay panel, ~480px, fixed full-height. Same shape as `.mx-manage-sheet`. |
| Container — mobile | Bottom sheet using `.mob-sheet` vocabulary, max-height 82dvh. |
| Mount point | Portal to `document.body` (avoids `animate-page-enter` stacking-context trap). |
| Z-index | New tokens in `:root` — `--z-chat-backdrop: 9200; --z-chat-panel: 9201`. Above existing tool sheets (9101), below `dialog.confirm` (10000). |
| Trigger | `✦` glyph (ink, not theme-reactive) in TopNav (desktop) and MobileTopBar (mobile). |
| Panel header label | `✦ Ask` |
| Speaker labels | `YOU` in person accent (identity); `GOOD MEASURE` in ink (system). |
| Confirm pattern | Propose-then-confirm for ALL writes. Inline confirm-card in chat panel — never auto-applies. Editorial ruled-block vocabulary, not chat bubbles. |
| Confirm-card actions | Reuse existing app endpoints (`/api/meal-plans/[id]/meals` etc.) — confirm-card writes through the same paths as manual UI writes. No parallel write API. |
| Cache invalidation on confirm | `clientCache.invalidate('/api/meal-plans')` after any planner write so off-page changes are visible on navigation. |
| Chat history persistence | **Server-persisted, per-person, last 50 turns.** New Prisma model `ChatMessage` keyed on `personId`. Older messages aged out by row count, not time. |
| Hide chat on | Same `HIDDEN` route set the navs already use (landing, login, invite, waitlist, privacy, admin). |

---

## Cost & budget (be explicit)

Per `docs/COSTS.md`: at friends-and-family scale this costs essentially nothing — a few dollars a month in Anthropic API usage at most. At 1K MAU with daily AI usage it's projected at ~$500–2K/mo. The build does not commit us to that — but the moment the app opens to the public, that bill becomes real. Worth keeping the rate-limit / paid-tier conversation alive as a parallel track.

For now (invite-only, ~5 users), the Anthropic bill will read $5–25/mo. Negligible.

---

## Gates

Each gate has: **what's in scope**, **files touched**, **acceptance** (what "done" looks like before moving on), and **risks**.

### Gate 0 — Mock approval ✓ DONE

Visual spec locked in this conversation. See `briefs/chat-v1.html`.

### Gate 1 — Read-only chat (desktop)

**Scope:** chat panel mounts, opens via ✦, shows conversation, can answer questions about your data. No writes. No confirm-cards yet.

**What this proves:** the container, the trigger, the streaming, the speaker-label rendering, the message format, the lightweight context loading, the tool-calling round-trip for recipe/pantry detail.

**Files touched:**
- New: `app/api/chat/route.ts` — POST endpoint, streams SSE
- New: `lib/chat/context.ts` — builds the lightweight context payload from current person's pantry summary + recipe names/macros + goals + current week
- New: `lib/chat/tools.ts` — tool definitions for `get_recipe`, `get_meal_plan_week`, `search_ingredients` (lightweight mirrors of existing MCP read tools, calling internal services)
- New: `lib/chat/anthropic.ts` — wrapper around `@anthropic-ai/sdk`, handles streaming + tool use + prompt caching
- New: `prisma/schema.prisma` — add `ChatMessage` model (`id`, `personId`, `role`, `content`, `createdAt`)
- New: `app/api/chat/history/route.ts` — GET last 50 messages for current person
- New: `app/components/chat/ChatProvider.tsx` — state, history, send, isStreaming, abort
- New: `app/components/chat/ChatTrigger.tsx` — the ✦ button (used by both navs)
- New: `app/components/chat/ChatPanel.tsx` — desktop right-docked overlay (portal to body)
- New: `app/components/chat/Message.tsx` — speaker label + body render
- New: `app/components/chat/Input.tsx` — bottom-pinned input with Enter to send
- New: `app/components/chat/EmptyState.tsx`
- Modified: `app/globals.css` — add `ck-*` class section + z-index tokens
- Modified: `app/components/TopNav.tsx` — add `ChatTrigger` before person dots
- Modified: `app/layout.tsx` — mount `ChatProvider` at root
- Modified: `.env` — add `ANTHROPIC_API_KEY`
- Modified: `docs/COSTS.md` — note `ANTHROPIC_API_KEY` env var added

**Acceptance:**
- [ ] Tap ✦ → panel slides in from right, focus moves to input
- [ ] Ask "what's my fiber average this week?" → assistant streams a paragraph answer with the actual number
- [ ] Ask "which recipes hit fiber hardest?" → assistant calls tool, gets full recipe data, answers with real top-3 by fiber from Jen's library
- [ ] Close panel, reopen → previous conversation is still there (history persisted)
- [ ] Switch from Jen to Garth → assistant's next answer reflects Garth's data, not Jen's
- [ ] Refresh page mid-stream → no broken state; can resume conversation
- [ ] `tsc --noEmit` clean

**Risks:**
- **Tool-use loop divergence.** Anthropic tool-use can call multiple tools sequentially; need to handle the loop, not just one round-trip.
- **Streaming abort.** User closes panel mid-stream → cancel the in-flight request, don't write partial assistant message to history.
- **Context bloat.** "Lightweight" still grows over time. Start with 70 recipes × ~80 bytes = ~5.5KB recipe slice; pantry 232 × ~30 bytes = ~7KB; goals + week ~2KB. Total context per turn: ~15–20KB input tokens. With prompt caching: ~1.5–3KB after first message in session. Acceptable.
- **Stacking-context trap.** Portal-to-body is mandatory.

**STOP HERE until acceptance is green.** Don't start writes until reads work cleanly end-to-end.

---

### Gate 2 — Single-meal write with confirm-card (desktop)

**Scope:** chat can propose a single write (add a meal, swap a meal, remove a meal, change servings). Confirm-card renders in panel. User taps APPLY → write goes through existing endpoint → toast/ack in chat.

**What this proves:** the write path end-to-end, the confirm-card visual, the cache invalidation, the off-page change discovery.

**Files touched:**
- New: `lib/chat/tools.ts` — add write tools that return PROPOSALS (don't execute): `propose_add_meal`, `propose_swap_meal`, `propose_remove_meal`, `propose_update_meal`. The tool returns structured proposal data; the chat UI renders it as a confirm-card. Tools do NOT execute until user confirms.
- New: `app/components/chat/ConfirmCard.tsx` — renders proposal, has CANCEL + APPLY buttons. On APPLY, calls existing endpoints (`POST /api/meal-plans/[id]/meals` etc.) and invalidates client cache.
- New: `app/components/chat/MacroDelta.tsx` — semantic green/red macro change row
- New: `app/components/chat/SwapLine.tsx` — From → To visual
- Modified: `app/components/chat/Message.tsx` — message can carry a `proposal` payload that renders as `ConfirmCard`

**System prompt addition:** instruct the model that ALL write operations must be proposed via the proposal tools, never spoken in prose. "When the user asks for any change to their data, call the appropriate proposal tool — never describe the change in prose and ask for verbal confirmation."

**Acceptance:**
- [ ] "Swap Tuesday's lunch for something with more protein" → confirm-card renders inline with From → To + macro deltas
- [ ] Tap CANCEL → card collapses to a brief ack ("Got it — no change made.")
- [ ] Tap APPLY → write fires, card collapses to ack with "View in planner →" link (when not on planner)
- [ ] Navigate to planner → change is visible immediately (no stale cache)
- [ ] Try a remove ("delete Wednesday breakfast") → confirm-card shows the meal to be removed, APPLY removes it
- [ ] Try a servings change ("make Thursday lunch 2 servings") → confirm-card shows old → new, APPLY updates
- [ ] Edge: ask for a change to a meal that doesn't exist → assistant responds clarifying ("I don't see breakfast on Wednesday — did you mean Tuesday?")

**Risks:**
- **Proposal vs execution split.** The model must reliably propose, never execute. Two safeguards: (a) tools are NAMED `propose_*` so the model can't accidentally call an `execute_*` tool that doesn't exist, (b) write endpoints reject unauth'd calls (already do).
- **Ambiguous reference resolution.** "Tuesday's lunch" needs to map to the right `mealLogId`. The model uses tool data (which includes `mealLogId` per `get_meal_plan_week`) to resolve. Confirm-card MUST surface the actual meal being swapped so user can catch errors.
- **APPLY failures.** Network error after confirm: surface the error inline in the chat ("Couldn't apply — try again?"), don't silently retry.

**STOP HERE until acceptance is green.**

---

### Gate 3 — Bulk write / fill-week confirm-card (desktop)

**Scope:** chat can propose multi-row writes (fill a whole week, apply a day template, batch-replace several meals). One confirm-card lists all proposed changes; one APPLY commits all of them.

**What this proves:** the longer confirm-card layout, multi-row writes through existing endpoints, sensible error handling when half the writes succeed.

**Files touched:**
- Modified: `app/components/chat/ConfirmCard.tsx` — handles `n>1` row arrays cleanly
- New tool: `propose_fill_week` — returns a list of per-meal proposals
- New tool: `propose_apply_template` — wraps existing day-template apply with proposal flow
- Modified: `lib/chat/tools.ts` — bulk-write proposal execution: sequential POSTs, surface per-row failures

**Acceptance:**
- [ ] "Fill next week with high-protein dinners" → confirm-card shows 7 ruled rows + summary macros at the bottom
- [ ] Tap APPLY → all 7 dinners added; card collapses to ack with "View in planner →"
- [ ] Apply a saved day template via chat ("apply Workout Day to Friday") → existing apply endpoint runs, confirm-card shows what'll land
- [ ] Edge: 6 of 7 writes succeed, 1 fails → ack shows count + which one failed, suggests retry
- [ ] V1 ships all-or-nothing (one APPLY commits everything). Per-row "Skip" deferred to V2.

**Risks:**
- **Transaction integrity.** Sequential POSTs without DB transaction → partial state possible. Acceptable for v1 (the existing write endpoints already work this way for templates), but flag it. Future: wrap in a single transaction endpoint.
- **Confirm-card height blowing past viewport.** 7+ rows can exceed 480px panel height. The scroll area handles it but make sure the APPLY button stays visible at the bottom (sticky foot).

**STOP HERE until acceptance is green.**

---

### Gate 4 — Mobile sheet + phone testing

**Scope:** mobile presentation. Shares all chat internals from Gates 1–3; only the container chrome changes.

**Files touched:**
- New: `app/components/chat/ChatSheet.tsx` — bottom-sheet variant using `.mob-sheet` vocabulary
- Modified: `app/components/MobileTopBar.tsx` — add `ChatTrigger` between person pulldown and hamburger
- Modified: `app/components/chat/ChatProvider.tsx` — `useMediaQuery('(max-width: 768px)')` switches between Panel and Sheet
- Modified: `app/components/chat/Input.tsx` — pinned-bottom on mobile sheet (sticky), handles iOS keyboard occlusion
- Modified: `app/components/chat/ConfirmCard.tsx` — compact variant for narrow widths (smaller macro grid, tighter padding)

**Acceptance:**
- [ ] PWA installed on iPhone: tap ✦ → sheet slides up to ~82dvh
- [ ] Long conversation: input stays pinned at bottom of sheet, messages scroll above
- [ ] Typing → iOS keyboard pushes up → input stays visible, doesn't get occluded
- [ ] Drag handle dismisses sheet
- [ ] Opening sheet while another `.mob-sheet` is open auto-dismisses the other
- [ ] Confirm-card readable at mobile widths (no horizontal scroll, macro grid wraps gracefully)
- [ ] `overscroll-behavior: contain` works — scrolling top/bottom of chat doesn't bleed into page

**Risks:**
- **iOS keyboard / Capacitor.** Behavior differs slightly between Safari PWA and Capacitor WebView. Validate both once Capacitor lands. For PWA-only v1, test on real iPhone.
- **Z-index collisions.** Other mobile sheets (`.pl-shop-sheet`, picker sheets) at z 290/300. Chat sheet at the same tier needs the "auto-dismiss competitors" rule to work cleanly.

**STOP HERE — Chat v1 ships after this.**

---

## After v1 ships — queued

- **Per-row "Skip" on bulk confirm-cards** (v2)
- **Hotkey** (Cmd+K or similar) to open chat from anywhere
- **Settings → 04 MCP Integration** update — new lede positioning MCP as advanced "connect your own Claude" option, with in-app chat as recommended default
- **Rate limiting** if/when app opens to public — token spend caps per user per day
- **Mobile Capacitor validation** once Apple Developer account lands

---

## Open considerations worth flagging

1. **Chat history privacy.** Stored per-person on the server. If a person is deleted, their chat history should cascade-delete. Add to the `Person` cascade delete logic.

2. **System prompt versioning.** The system prompt that teaches the model how to behave (propose, don't execute; cite numbers; etc.) lives in `lib/chat/anthropic.ts`. Should be a constant with a version string in a comment so we know when it changed. Future: A/B test prompt revisions.

3. **Tool error visibility.** When a tool call fails (network blip, malformed data), the user sees an opaque "thinking…" forever. Need a visible error state in the message rendering.

4. **What gets sent to Anthropic.** All chat messages + tool call data (which includes recipe names, macros, plan data) goes to Anthropic's API. Anthropic's standard data policy applies — they don't train on API traffic. Worth a privacy-policy update on `/privacy` before public launch.

5. **MCP and in-app chat coexist.** Users with MCP installed can use both. The chat doesn't know what MCP has done since last turn — but the lightweight context block is rebuilt per turn from live data, so the chat always sees current state. No special coordination needed.

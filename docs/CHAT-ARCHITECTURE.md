# Chat — Architecture Reference

In-app AI chat ("Ask"). This doc is the operational reference: what it is, where each piece lives, how it costs, and what to touch when you need to change something.

For the visual spec see [`briefs/chat-v1.html`](../briefs/chat-v1.html). For the gated build plan see [`briefs/chat-v1-build-plan.md`](../briefs/chat-v1-build-plan.md).

---

## Quick facts

| | |
|---|---|
| **Status** | Gates 1–4 shipped (read + single write + bulk write + apply-template + mobile sheet). **Recipe authoring shipped** (propose_save_recipe — edit / from-scratch / replace, full 9-nutrient panel). Fully functional end-to-end. |
| **Model** | `claude-sonnet-4-6` — pinned via `CHAT_MODEL = CHAT_MODEL_SONNET` in `lib/chat/anthropic.ts`. Haiku 4.5 also wired as `CHAT_MODEL_HAIKU` for easy A/B. See [Model comparison](#model-comparison-sonnet-46-vs-haiku-45). |
| **System prompt** | `SYSTEM_PROMPT_V11` — versioned constant; bump on every prompt change so cache-hit telemetry stays interpretable. |
| **Provider** | Anthropic API direct (`@anthropic-ai/sdk`). Not Vercel AI Gateway — we're on Railway. |
| **Env var required** | `ANTHROPIC_API_KEY` on Railway + local `.env`. |
| **History** | Server-persisted per person. Last **20** messages loaded into context (was 50 — lowered to cut uncached input cost). |
| **Container** | Desktop right-docked overlay (480px), portaled to `document.body`. Mobile bottom sheet. |
| **Trigger** | `✦` glyph in ink, in TopNav (desktop) and MobileTopBar (mobile). |
| **Streaming** | SSE. `message_id` (frame 1) → text deltas / tool / proposal events → `done`. |
| **Friends-and-family cost** | ~$0.02/turn Sonnet, ~$0.01/turn Haiku. See [Cost & caching](#cost--caching) and [Model comparison](#model-comparison-sonnet-46-vs-haiku-45). |
| **Admin dashboard** | `/admin/usage` (password-gated). Shows cost per turn, cache state, tools fired, the verbatim prompt, and prompt version per row. |

---

## File map

```
app/
  api/chat/
    route.ts                         POST /api/chat — SSE streaming endpoint
    history/route.ts                 GET/DELETE /api/chat/history
  components/chat/
    ChatProvider.tsx                 State (messages, isStreaming, send/abort/clear)
    ChatPanel.tsx                    Desktop right-docked overlay (portaled to body)
    ChatTrigger.tsx                  ✦ glyph button (desktop + mobile variants)
    Message.tsx                      Document-style message render
    Input.tsx                        Bottom-pinned textarea
    EmptyState.tsx                   First-load editorial lede + example prompts
  layout.tsx                         Mounts ChatProvider + ChatPanel at root
  globals.css                        §13 CHAT section — all .ck-* classes

lib/chat/
  anthropic.ts                       SDK wrapper, system prompt, streaming, tool loop
  context.ts                         Per-turn lightweight context builder
  tools.ts                           Tool definitions + Prisma-backed execution

prisma/schema.prisma                 ChatMessage model
```

Production class prefix: `ck-` (chat-kit).

---

## Cost & caching

The whole architecture is shaped around keeping Anthropic spend low for a personal-tool / friends-and-family app. Without these patterns, naive chat with the same data would cost ~10× more.

### What gets cached

The Anthropic API caches by **prefix match** — any byte change in the prefix invalidates everything after it. The request is structured so the prefix is byte-stable across turns:

```
[system prompt v3]                          ← frozen, never changes
[tool definitions: 3 read tools]            ← frozen list
[stable context: household + recipes +      ← stable within a session
 pantry]
[← cache_control: ephemeral breakpoint here]
[today's date + currently-viewing person]   ← changes daily / per person switch
[message history + new user turn]           ← varies per turn — NOT cached
```

The `cache_control: { type: "ephemeral" }` marker sits on the context block (the last item in the stable prefix). Everything above it caches together. TTL is 5 minutes, refreshed on every read.

### Cost per turn

| Operation | Multiplier on base input price |
|---|---|
| Uncached input tokens | 1.0× |
| Cache write (first turn in session) | 1.25× |
| Cache read (subsequent turns in session) | 0.1× |
| Output tokens | base output price (no cache concept) |

**Sonnet 4.6 pricing as of build:** $3/M input, $15/M output.

Per-turn napkin math:
- **Stable prefix:** ~10–15K tokens (system + 3 tool schemas + context block)
- **First turn:** pay 1.25× on stable prefix + 1× on new user message. Roughly $0.04–0.05.
- **Turn 2+:** stable prefix at 0.1× + 1× on new tokens. Roughly **$0.005–0.01 per turn**.
- **Output:** 200–1500 tokens × $15/M = $0.003–0.02 per response.

**Monthly projection for friends-and-family** (~5 users × 20 turns/day average):
- ~3,000 turns/month
- ~$0.005 per turn × 3,000 = **~$15/month worst case**
- Realistically half that because most sessions chain multiple turns sharing the cache: **$5–10/month.**

### Why lightweight context (not full library)

The model could route on the full library if we sent it all on every turn (70 recipes × ~3KB each = ~210KB per turn = ~50K input tokens). With caching that's affordable. **But** the lightweight context (name + 4 macros per recipe = ~80 bytes) is small enough that even uncached cost is trivial, AND it leaves room in the context window for long conversations without compaction concerns, AND it stays under the 2048-token minimum-prefix cap on Sonnet so caching reliably kicks in.

When the model needs deeper detail (full ingredient list, all 17 nutrients, instructions), it calls `get_recipe` on demand. Tool responses don't go into the cached prefix — they're per-turn payload.

### What would break caching

Don't do any of these without understanding the impact:

| Action | Cache impact |
|---|---|
| Change the system prompt text (`SYSTEM_PROMPT_V3` in `lib/chat/anthropic.ts`) | Full invalidation. Bump the version constant when you change it. |
| Add/remove/reorder tools in `lib/chat/tools.ts` | Full invalidation. Tools render at position 0 in the prompt. |
| Interpolate `new Date()` or any timestamp into the system prompt body | Per-request invalidation — nothing ever caches. |
| Change the recipe/pantry context shape mid-session | Per-session invalidation. The shape is byte-identical within a session because it's deterministic. |
| Switch model | Caches are model-scoped — switching invalidates everything. |

### How to verify caching is working

Pull a recent chat response from Railway logs and look for the `usage` block. Expected after a few turns in one session:

```
cache_read_input_tokens: 12340      ← should grow turn-over-turn
cache_creation_input_tokens: 0       ← should stay 0 after first turn
input_tokens: 87                     ← only NEW tokens this turn
output_tokens: 412
```

If `cache_read_input_tokens` is always 0, a silent invalidator is at work — most likely a timestamp or non-deterministic JSON serialization in the prefix.

---

## Request flow (end-to-end)

```
User types in <Input>
    ↓
ChatProvider.send(text)
    ↓
fetch POST /api/chat (body: { message })
    ↓
app/api/chat/route.ts
  1. getAuthenticatedHousehold() → personId + householdId
  2. loadHistory(personId)     → last 50 ChatMessage rows (chronological)
  3. buildContext(personId, householdId) → lightweight payload
  4. prisma.chatMessage.create({ role: "user", ... })  ← persisted BEFORE streaming
  5. ReadableStream → runChatTurn() → SSE events out
    ↓
lib/chat/anthropic.ts runChatTurn()
  - Builds system blocks: [SYSTEM_PROMPT_V3, today's date + context (+ cache_control)]
  - Builds messages: history + new user turn
  - Loop (max 8 iterations):
    - client.messages.stream({ model, system, tools, messages })
    - Yield "text" event for each text_delta as it arrives (real-time to UI)
    - On stop_reason "tool_use": run each tool via runChatTool(), feed results, loop
    - On stop_reason "end_turn": yield "done", break
    ↓
SSE frames sent to client → ChatProvider parses → setMessages updates UI
    ↓
On stream close: persist assistant message (whatever was streamed, even partial)
```

---

## System prompt voice (locked)

Lives in `lib/chat/anthropic.ts` as `SYSTEM_PROMPT_V3`. Voice rules that are intentional:

- **Direct + confident** — lead with the answer, then reasoning
- **Numbers in `**bold**`** — model wraps key numbers; UI renders as `<strong>` in ink
- **One short paragraph by default** — lists only for 3+ items
- **No emoji, no chatbot tics** — "Great question!" / "Let me help" are explicitly forbidden
- **Editorial register** — matches the rest of the app

The prompt also tells the model:
- What it knows about (person, household, recipes, pantry, current week)
- What it can do (Gate 1: read-only)
- What it CANNOT do yet (writes — acknowledge politely, offer read-only equivalent)
- To call tools when needed, never guess; surface tool errors plainly

**When you change the prompt:** bump the version constant. Cache-hit telemetry across versions becomes hard to interpret otherwise.

---

## Tools

Defined in `lib/chat/tools.ts`. Three tools, all read-only:

| Tool | Use | Latency |
|---|---|---|
| `get_recipe` | Full ingredients + per-serving nutrition for all 17 tracked nutrients + instructions | ~50–100ms (1 Prisma query, well-indexed) |
| `get_meal_plan_week` | Per-day totals for every tracked nutrient + comparison to goals | ~200–400ms (the heaviest query — joins recipes + meal logs + ingredient nutrients) |
| `search_ingredients` | Pantry items matching a substring, with per-100g nutrition | ~50ms |

Tools run in-process via Prisma — no HTTP hop. Tool errors return `{ error: "..." }` so the model can surface them cleanly.

**Write tools land in Gate 2:** `propose_add_meal`, `propose_swap_meal`, etc. They will be named `propose_*` (not `execute_*`) so the model can only *propose* changes — actual writes fire on user APPLY tap via existing app endpoints.

---

## Persistence

```prisma
model ChatMessage {
  id        Int      @id @default(autoincrement())
  personId  Int
  role      String   // "user" | "assistant"
  content   String   // plain text body
  createdAt DateTime @default(now())

  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  @@index([personId, createdAt])
}
```

- **Per-person history.** Each household member has their own conversation.
- **Cascade delete with Person** — deleting a person wipes their chat history.
- **Last 50 messages** loaded into context (constant `HISTORY_LIMIT` in `route.ts` and `history/route.ts`).
- **User message persisted before streaming** — so a network drop mid-response still preserves the question.
- **Assistant message persisted after streaming** — even partial responses if the client aborts.
- **DELETE /api/chat/history** wipes the current person's history. Useful for "start over." The frontend `clear()` calls this.

---

## Streaming protocol (SSE)

Server emits events to `/api/chat` as `text/event-stream`. Each frame is one JSON event matching the `ChatStreamEvent` union in `lib/chat/anthropic.ts`:

| Event | Payload | UI behavior |
|---|---|---|
| `{type: "text", delta: string}` | One token chunk | Appended to current assistant message |
| `{type: "tool_start", name: string}` | Tool name | Shows "Looking up …" status line |
| `{type: "tool_done", name: string}` | Tool name | Clears status line |
| `{type: "done", usage?: {...}}` | Final usage stats | Marks message complete; clears streaming cursor |
| `{type: "error", message: string}` | Error string | Marks message with error chrome |

Headers set on the response:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `X-Accel-Buffering: no` — disables nginx/proxy buffering so deltas reach the client live

---

## Container layout (desktop)

`ChatPanel.tsx` portals to `document.body` so it escapes any `transform`'d ancestor (the documented stacking-context trap that bit us with the planner VIEW menu).

| Layer | z-index | Purpose |
|---|---|---|
| `.ck-backdrop` | 9200 | Dismissable backdrop |
| `.ck-panel` | 9201 | The panel itself |

Above tool sheets (`.mx-manage-sheet` etc. at 9101). Below `dialog.confirm` modals (10000). The panel auto-closes on Esc when not streaming; Esc aborts the stream when one is in flight.

Mobile breakpoint (`@media (max-width: 768px)`) currently widens the desktop panel to full viewport. Gate 4 replaces this with a proper bottom-sheet variant.

---

## Voice + design system compliance

All chat UI uses tokens from the design system. No new tokens were added. Notable choices:

| Element | Spec | Rationale |
|---|---|---|
| ✦ trigger glyph | `var(--fg)` (ink), 15px desktop / 18px mobile | Global affordance, not identity. Accent moments live inside the panel. |
| `YOU` speaker label | `var(--accent)` (theme-reactive) | The user IS the identity — colored per person theme |
| `GOOD MEASURE` speaker label | `var(--fg)` (ink) | The system is the constant |
| Body text | DM Sans 13px, -0.03em, `var(--fg-2)`, line-height 1.65 | App body register |
| Speaker label | DM Mono 9px, 0.14em, 600, uppercase | Chrome register |
| Empty-state prompts | Ruled-block pattern (left border `var(--rule)`, no fill) | §6d — same as planner prompts, paste-notes textarea |
| **Bold** in body | DM Sans 600, `var(--fg)` | Numbers/key terms emphasized as data, not chatbot bold |
| Confirm cards (Gate 2+) | Ruled-row + ruled-block pattern, sharp, semantic green/red macros | Editorial language, NOT chat bubbles |

**No chat bubbles. No avatars. No "AI is typing…" animations.** Document-style messages with mono speaker labels above each.

---

## Gate roadmap

- **Gate 1 (shipped)** — read-only chat, desktop panel, persisted history
- **Gate 2** — single-meal write with confirm-card (add/swap/remove/update via `propose_*` tools)
- **Gate 3** — bulk write (fill-week, apply-template) with multi-row confirm-card
- **Gate 4** — mobile sheet (`.mob-sheet` vocabulary, max 82dvh, iOS-keyboard safe)

After Gate 4 ships:
- Per-row "Skip" on bulk confirm-cards (v2 of confirm-card)
- Optional Cmd+K hotkey to open chat from anywhere
- Settings → 04 MCP Integration update (chat as primary, MCP as advanced)
- Rate-limit middleware if/when app goes public
- Privacy policy update (one paragraph noting chat content + lightweight data goes to Anthropic API)

### Abuse / cost guardrails

For friends-and-family scale, no work needed beyond the system prompt's "Scope" section (in `SYSTEM_PROMPT_V3`) which tells the model to politely refuse off-topic requests. That handles 95% of casual misuse for free.

**Usage logging is LIVE (June 2026).** Every `/api/chat` call writes a row to `ApiUsageLog` with personId, householdId, token counts (input / cache read / cache create / output), and a precomputed cost in USD. Implementation: `lib/chat/usage.ts` + `feature: "chat"` rows. Use this data to:

- See real per-user usage distribution before deciding cap size
- Track caching effectiveness (`cacheReadTokens` should be high; `inputTokens` low after first turn)
- Sum 30-day cost per person / household for any dashboard or rate-limit check

**Before public launch, add hard rate limiting.** The system prompt is a soft fence — coaxed past with effort, doesn't bound runaway scripts. Required additions:

| Layer | Implementation | Cap suggestion (verify against real usage first) |
|---|---|---|
| Per-user daily cost cap | Sum `estimatedCostUsd` from `ApiUsageLog` for last 24h; 429 if over | ~$0.30–0.50/day per user (≈ 50–100 turns) |
| Per-household monthly backstop | Same approach, 30-day window | $X/month hard ceiling so a runaway script can't bankrupt anyone |
| UX when capped (desktop + mobile) | Panel shows "You've reached today's chat limit — resets at midnight." Optional: "Connect your own AI via MCP for unlimited" (desktop only — MCP doesn't run on iOS / Android) | — |

**Mobile constraint worth flagging:** MCP servers don't run on iOS or Android. Once the native apps ship, mobile users have NO unlimited path via MCP. The "install MCP" upgrade nudge only works on desktop / web. Mobile heavy users need a paid tier to have any ceiling-removal option — see `docs/COSTS.md` § Pricing model — open thinking.

**Not pursuing:** pre-classifying messages with a smaller model (adds latency, costs tokens to decide whether to spend tokens), keyword/regex blocking (whack-a-mole), complex jailbreak detection (Anthropic's base model already refuses genuinely harmful categories).

### Queued chat UX improvements

These came up during Gate 1 testing — small, can ship independently of Gates 2–4:

- **Clear conversation button** in panel header. Endpoint already exists (`DELETE /api/chat/history`); just needs a UI affordance. Confirm dialog before wiping.
- **Rolling cap on stored messages.** DB grows unbounded today. Cap per-person at, say, 500 rows; trim oldest on insert. Each row is ~1KB so not urgent until usage scales.
- **Session dividers / timestamps in history.** "2 days ago" hairline rules between conversations so the panel reads as multiple distinct sessions, not one infinite scroll.
- **Richer in-app context (instead of MCP-style context files).** The MCP integration lets users drop arbitrary `.md` files in front of Claude Desktop; the in-app chat can't, so any persistent context has to live in the app. Worth considering — see [Persistent context options](#persistent-context-options) below.

### Recipe authoring — SHIPPED (June 2026)

`propose_save_recipe` lets the user iterate on a recipe in prose ("lower the sodium, keep the umami") and only fires a confirm-card when they say "save". Three modes:
- **`new` + source_recipe_id** — editing an existing recipe (saves a copy; diff vs source shown). Default for ambiguous "save".
- **`new` without source_recipe_id** — brand-new from scratch ("design me a lemon brownie"). No diff.
- **`replace`** — overwrite the source (destructive; coral pill + footer warning).

Supporting pieces:
- **`list_pantry_ingredients`** — read tool to browse the pantry with filters (category, max_sodium, min_protein, etc.). Used during ideation to find flavor-compensating substitutions. Returns ingredient_id so the model reuses ids instead of re-searching.
- **`get_recipe` returns ingredient_ids** — when editing, the model reuses existing ids and only searches for genuinely new ingredients (cut a save turn from ~12 tool calls to ~2-3).
- **Confirm-card** — `SaveRecipeCard` in `ConfirmCard.tsx`. Full 9-nutrient before→after panel (Option 1 from `briefs/mockup-save-recipe-nutrients.html`): every tracked nutrient shown, changed rows color-coded by directional improvement, unchanged rows dim, the optimized nutrient (`targetNutrient`) gets a coral left-rule. Ingredient diff one tap away. Photo inherited from source on "save as new".
- **Culinary persona allowance** (V12) — "pretend you're a pastry chef" is in scope for recipe design.

Key lessons that came out of building it (see Operational lessons below): macro preview must use the real `convertToGrams` not a simplified converter; save is TERMINAL so it must NOT trigger the meal-chain auto-continue; saving a recipe invalidates the cached recipe library so the next turn is always cold.

### Future write features (under design)

- **`propose_save_day_template`** (next) — save a new day template from a description ("3 dinner-rotation templates that hit 35g+ protein, max 800mg sodium"). Confirm-card mirrors the existing apply-template card.
- **`propose_save_optimization_notes` / `propose_save_meal_prep_notes`** — write notes to a recipe (markdown text). Cheap to build, lowest user value of the three.

### Voice input (future, free)

Users want to dictate prompts so they don't have to type, especially on mobile while cooking. The plan:

- **Voice input only.** No TTS — users read responses, they don't get read back. Avoids both robotic-voice UX and the per-minute cost of premium TTS APIs.
- **Web Speech API** (browser-built-in `webkitSpeechRecognition` / `SpeechRecognition`). $0 cost — no server call, no API key. Works on Chrome desktop, iOS Safari, Android Chrome. Quality varies by device but acceptable for command-style prompts.
- **UI:** mic button next to the Send button in `Input.tsx`. Tap to start dictating, tap again to stop, transcribed text appears in the textarea (user can edit before sending).
- **Cost impact:** zero on the chat itself. Adds maybe 20 lines of code to `Input.tsx`.
- **Why not Whisper:** higher quality but $0.006/minute and adds a server roundtrip + ~1s latency. Not worth it for short conversational prompts. Revisit if Web Speech API quality complaints become real.

Skip until after the save-recipe write features land — the bigger UX win is the new capabilities, not the input modality.

### Persistent context options

The MCP workflow lets a user drop a `.md` brief in front of Claude Desktop and have it influence every conversation. The in-app chat doesn't have that lever — anything not stored as structured data in the app is invisible to the model. Things worth considering for v2 of the context block:

| Candidate | Why | Where it'd live |
|---|---|---|
| **Per-person "about me" note** | Free-text: dietary preferences ("I don't eat pork"), training context ("strength training 3×/week, on a cut"), constraints ("breastfeeding so calorie floor is higher"). One paragraph the user owns. | New `Person.aboutMe` text field. Surface in Settings → Profile. Injected into the system prompt. |
| **Recent meal logs (last 14 days)** | Lets the model answer "what have I been eating lately?" without a giant query. | Already in DB; add to context block. ~30–50 entries, ~3KB. |
| **Favorite recipes** | Heavy signal for "suggest something" type questions. Model should weight favorites higher. | Already in DB (`RecipeFavorite`). Mark in the recipe slice with a `★` or a `favorited: true` flag. |
| **Day templates** | "Apply Workout Day to Friday" reads better when the model knows your templates exist. | Already in DB (`DayTemplate`). Add a slim list to context: name + meal count. |
| **Recent optimization notes** | Recipe-detail-level notes the user has saved. Surfaces history like "I cut the miso paste in half last time." | Already in DB (`Recipe.optimizeAnalysis`). Could surface in `get_recipe` tool response. |
| **Person-level conversation summary** | After N turns, summarize older history into a "what we've discussed" block. Lets the model remember earlier without the full transcript bloating context. | New `Person.chatSummary` text field, updated by a background job after every 20 turns or so. |
| **Household preferences** | Shared facts: "we cook for 4 people on weeknights, 2 on weekends." | New `Household.preferences` text. |

The pattern: every candidate is **structured app data**, not arbitrary user-uploaded files. The model gets the structure, not the file. This stays consistent with the editorial restraint of the app (no file upload chrome, no "manage your context files" UI surface) and keeps the context block deterministic for caching.

**Open question:** how much context is too much? Right now the lightweight context is ~10–15K tokens. Adding "about me" + favorites markers + 14 days of meal logs would push it to ~20–25K. Still well within Sonnet's window, still well within caching minimums, but worth measuring per-turn cost before committing.

---

## Operational notes

### Monitoring cost

- **Per-request:** every response's `usage` block lands in Railway logs. Look for `cache_read_input_tokens` (good — should be high) and `cache_creation_input_tokens` (acceptable on first turn, suspicious after).
- **Per-day:** Anthropic Console → Settings → Usage shows token spend by model.
- **Per-month:** the Anthropic bill rolls up there too. Cross-reference with `docs/COSTS.md`.

**How to pull usage from the DB** (run via Railway → Connect → psql, or any Postgres client):

```sql
-- Per-person usage last 30 days
SELECT
  p.name,
  COUNT(*) AS calls,
  SUM(a."inputTokens") AS input_tokens,
  SUM(a."cacheReadTokens") AS cache_read,
  SUM(a."outputTokens") AS output_tokens,
  ROUND(SUM(a."estimatedCostUsd")::numeric, 4) AS cost_usd
FROM "ApiUsageLog" a
LEFT JOIN "Person" p ON p.id = a."personId"
WHERE a.feature = 'chat'
  AND a."createdAt" > NOW() - INTERVAL '30 days'
GROUP BY p.name
ORDER BY cost_usd DESC;

-- Daily totals (to see usage trend over time)
SELECT
  DATE(a."createdAt") AS day,
  COUNT(*) AS calls,
  ROUND(SUM(a."estimatedCostUsd")::numeric, 4) AS cost_usd,
  SUM(a."cacheReadTokens") AS cache_hits,
  SUM(a."inputTokens") AS cache_misses
FROM "ApiUsageLog" a
WHERE a.feature = 'chat'
  AND a."createdAt" > NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;

-- Cache effectiveness check (high cache_hit_pct = good)
SELECT
  ROUND(
    100.0 * SUM("cacheReadTokens") /
    NULLIF(SUM("inputTokens" + "cacheReadTokens" + "cacheCreationTokens"), 0),
  1) AS cache_hit_pct,
  ROUND(SUM("estimatedCostUsd")::numeric, 4) AS total_cost_usd,
  COUNT(*) AS total_calls
FROM "ApiUsageLog"
WHERE feature = 'chat'
  AND "createdAt" > NOW() - INTERVAL '7 days';
```

### Debugging a slow/broken chat session

1. **Browser console** — JavaScript errors in the streaming SSE parse
2. **Network tab** — `/api/chat` should show `Content-Type: text/event-stream` and content should stream (not arrive as one chunk)
3. **Railway logs** — look for "Persist assistant message" failures, Anthropic API errors, tool execution errors
4. **`ANTHROPIC_API_KEY`** — most common silent failure is the env var not set on Railway

### Rate limits

Anthropic Tier 1: 50 requests/min, 30K input tokens/min, 8K output tokens/min on Sonnet 4.6. **Cache reads don't count against input TPM.** Friends-and-family usage stays comfortably under all three. Auto-promotes to higher tiers as spend grows; no manual request needed.

### Clearing a person's history

```sql
DELETE FROM "ChatMessage" WHERE "personId" = <id>;
```

Or via the app: open the chat panel, click clear (UI for this comes later — for now use `fetch('/api/chat/history', { method: 'DELETE' })` from the browser console).

### Changing the model

In `lib/chat/anthropic.ts`, change `export const CHAT_MODEL`. Beware:
- Switching to Opus 4.x triples input cost
- Different models have different cache TTL behavior
- The cache is model-scoped — first request after a model change writes fresh
- The `model` column on `/admin/usage` shows which model each turn used, so you can compare A/B in the same window

---

## Model comparison: Sonnet 4.6 vs Haiku 4.5

Tested side-by-side June 2026 with the same multi-step session: sodium analysis + 3 swaps + meal plan modifications.

| Metric | Sonnet 4.6 | Haiku 4.5 |
|---|---|---|
| Turns to complete same task | 6 | 11 |
| Total session cost | $0.14 | $0.10 |
| Avg cost/turn | $0.023 | $0.009 |
| Stale meal_log_id errors | 0 | 1 (self-recovered via V11 prompt) |
| User-side cancellations needed | 0 | 2 |
| Pricing (per MTok) | $3 in / $15 out | $1 in / $5 out |

**Per-turn Haiku is ~3x cheaper, but Haiku takes ~2x the turns** for complex chains because:
- More cautious — asks clarifying questions instead of proposing decisively
- Less likely to suggest templates when user hints at them
- Sometimes grabs stale IDs from earlier in conversation (V11 prompt teaches it to re-fetch)
- Strategy tends toward removes; Sonnet finds optimal swaps faster

**Net cost savings is closer to 30%, not 3x** when measured on real multi-step sessions.

### When to use which

- **Sonnet 4.6 (current default)** — friends-and-family testing, pre-launch, any quality-sensitive flow. The conversation friction with Haiku is annoying when you're trying to demo or test.
- **Haiku 4.5** — switch when you have ≥50 DAUs and the cost compounds, AND you have an eval harness to verify proposal quality doesn't regress on real prompts.

The flip is one line in `anthropic.ts`. Both models work with the same prompt, tools, and cache strategy.

---

## Operational lessons (bugs hit and fixed)

This is the running record of every non-trivial bug we ran into while building the chat. Read this before adding new read/write tools or changing the SSE protocol — most of these are easy to re-introduce by accident.

### 1. Stop renaming local message ids on `message_id` arrival ⚠️

**Symptom:** Network tab shows a perfect SSE response (text deltas, proposal events). UI shows the "GOOD MEASURE" speaker label but no body text — completely blank message.

**Root cause:** When the server emitted `message_id`, the client renamed `messages[i].id` from local `a-{timestamp}` → server `srv-{N}`. Subsequent text deltas tried `prev.map(m => m.id === asstId ? ...)` where `asstId` had been reassigned to `srv-{N}`. React's setState batching meant `prev` still had the old `a-{ts}` id — the match failed, the text delta was silently dropped, the message stayed blank.

**Fix:** Never rename the local id. Only set the `dbId` field. Apply/cancel handlers use `dbId` to PATCH the DB row.

**Lesson:** If you must mutate an identifier mid-stream, do it in a way that doesn't race with already-queued state updates. Two parallel fields (display id + DB id) is safer than renaming.

### 2. Persistence-after-refresh: place `message_id` first, not last

**Symptom:** Confirm cards still showed as "pending" with APPLY/CANCEL buttons after apply + refresh, instead of as "Applied" acks.

**Root cause:** We waited until the SSE stream completed before persisting the assistant ChatMessage row and emitting `message_id` as the **last** frame. If anything cut the connection in the final milliseconds (proxy timeout, browser buffering, fast network close), the id was lost. Without `dbId`, the client couldn't PATCH the proposal status when the user tapped APPLY.

**Fix:** Create a placeholder ChatMessage row at the **start** of the stream. Emit `message_id` as the **first** SSE frame. Update the row at the end with content + proposal. If no content gets produced (rare error path), delete the placeholder in finally so history isn't polluted.

**Lesson:** Anything that the client needs in order to act on later events must arrive in the **first** frame, not the last. The "last frame" position is the most vulnerable to connection issues.

### 3. Don't block the stream on the placeholder write

**Symptom:** "Thinking..." indicator hangs for many seconds; no text appears. Cold Railway connection + cold Prisma made the placeholder write take 2–5s before the model stream even started.

**Fix:** Fire the placeholder write as a Promise (not awaited). Start `runChatTurn` immediately. Emit `message_id` whenever the placeholder write resolves. Both run in parallel. The `finally` block awaits the promise before trying to update/delete the row.

**Lesson:** Sequential awaits inside `ReadableStream.start()` will silently delay everything downstream. If two operations don't depend on each other, race them.

### 4. Service worker was strangling /api/chat

**Symptom:** Chat hangs indefinitely. Network tab shows `/api/chat` request but no response, or no request at all.

**Root cause:** `public/sw.js` was wrapping all `/api/*` requests in `networkFirst`. For streaming SSE responses, `networkFirst` does `cache.put(request, fresh.clone())`. The `.clone()` forks the body stream; `cache.put` then fails silently for POSTs (Cache API rejects them) — but the body has already been forked and the original Response's body never completes streaming.

**Fix:** In `sw.js`, pass through to native fetch for:
- `/api/chat` (SSE streaming, body fork breaks it)
- `/api/health` (offline indicator probe)
- All non-GET API requests (POST/PATCH/DELETE — Cache API rejects them anyway)

Also bumped `CACHE_VERSION` v1→v2 to force SW update on next page load.

**Lesson:** Service workers and SSE streams interact in non-obvious ways. Always bypass the SW for any streaming endpoint. Cache API CANNOT cache POST requests — wrapping them is pure overhead with silent failure modes.

### 5. Tool macro fabrication — give the model real numbers or it makes them up

**Symptom:** Model said "this template drops sodium to 1435mg" but the actual planner showed 1968mg after apply. Different days off by 30–500mg.

**Root cause:** `proposeApplyTemplate` returned the item list but **no nutrition data**. The model invented totals from rough recipe memory in the context block. Haiku is more prone to this than Sonnet.

**Fix:** Compute real macros in `proposeApplyTemplate` — sum per-item macros from `getRecipeMacros` + (mode='append' ? existing day's macros : 0). Return as `summaryMacros`. V10+ prompt explicitly forbids inventing macros: "If a propose_* tool returns summaryMacros, quote them exactly. If the tool didn't return numbers, don't claim any."

**Lesson:** If you don't want the model to fabricate a number, give it the real one in the tool result. Prompting alone doesn't stop hallucination — only providing the ground truth does.

### 6. One proposal per turn (server-side guard, not just prompt)

**Symptom:** User asked for "swap dinner AND dessert." Model called `propose_swap_meal` twice in one turn. Client stored one `proposalJson` per assistant message → second proposal overwrote the first. User saw only one card and thought the assistant ignored the dessert request.

**Fix:** Two layers:
- **Prompt (V10+):** "One proposal per turn. Call exactly one propose_* tool per response, then write one sentence and stop."
- **Server guard (`anthropic.ts`):** Track `proposalEmitted` across the whole tool-use loop. If the model fires a second propose_* call, short-circuit the tool with a synthetic error telling it to defer and stop. Defense in depth — even if the prompt fails, the user always sees exactly one card per turn.

Exception: `propose_fill_week` is designed for multi-meal adds in a single card.

**Lesson:** Prompts alone don't enforce constraints. If something is critical (would corrupt user-visible state), guard it server-side too.

### 7. Auto-continue across chains — wording matters

**Symptom:** After applying a swap in a multi-step request, the user had to manually re-prompt for the next change. Chain didn't auto-advance.

**Fix v1:** After every successful apply, client auto-sends `"Applied."` as a follow-up user message. Model sees the ack and proposes the next item.

**Fix v2:** "Applied." alone read as a stop signal half the time — model would ack-and-stop instead of continuing. Changed to: `"Applied. If there are more changes from my original request, propose the next one. Otherwise just confirm we're done."` Now the directive is unambiguous.

**Lesson:** Conversational auto-prompts must be directive, not ambiguous. Test against actual model behavior — what sounds clear to a human may not be clear to an LLM under load.

### 8. Stale `meal_log_id` after apply

**Symptom:** Model proposes a swap for Friday dinner referencing `meal_log_id 1556`. User applies. In the next turn, model uses the OLD `meal_log_id` for the same slot and the API returns "Meal log not found."

**Fix:** V11 prompt — "Call `get_meal_plan_week` IMMEDIATELY before each propose_* tool. After any apply, previous meal_log_ids are stale. Never rely on IDs from earlier in the conversation."

Combined with proposal guard, the model now self-corrects: if its propose fires with a stale id and the tool returns an error, it tells the user to tap CANCEL and re-proposes from a fresh fetch.

**Lesson:** IDs that change as a side effect of writes are dangerous to cache in conversation memory. Force fresh fetches.

### 9. Cache prefix design — what goes in stays cached, what changes goes out

**Symptom:** Cache hit rate stuck at ~66%. Every planner edit invalidated the cached prefix and forced a $0.03+ rewrite on the next chat turn.

**Root cause:** The "stable context" cached block included every household member's day-by-day meal plan. The planner is the most-edited data in the app, so the cache invalidated constantly.

**Fix:** Split context into two formatters:
- `formatStableContextForPrompt` (cached, 1h TTL): members + goals, plan_ids + weekStartDate, recipes, pantry, templates
- `formatWeeklyPlansForPrompt` (uncached, per-turn): each member's day-by-day meal contents

The cached prefix now stays valid through planner edits. Only recipe/pantry/template/goal changes invalidate it — which happens infrequently.

**Lesson:** The cache key is the entire prefix. Anything you put before the cache marker should change rarely. Anything that changes mid-session must live after the marker, even if it's "logically system context."

### 10. Multiple Anthropic features need usage logging, not just chat

**Symptom:** Admin dashboard total cost didn't match Anthropic's dashboard. Off by 30%+.

**Root cause:** Only `/api/chat` was logging to `ApiUsageLog`. Other Anthropic-billed endpoints (`/api/recipes/[id]/analyze`, `/api/ai/analyze`) were either not logging or logging without proper `feature` tags + cost computation.

**Fix:** Every Anthropic call site now writes to `ApiUsageLog` with `feature` tag (`chat` / `recipe_analyze` / `ai_analyze`) and computed `estimatedCostUsd`. Admin endpoint defaults to all features summed.

**Lesson:** If you add a new Anthropic call anywhere, log it the same way — same `ApiUsageLog` table, set `feature`, compute cost. Otherwise the admin dashboard drifts from billing reality.

### 11. Strict-tool grammar size cap

**Symptom:** `invalid_request_error: The compiled grammar is too large, which would cause performance issues. Simplify your tool schemas or reduce the number of strict tools.` Hit when adding `propose_save_recipe` (the 12th strict tool).

**Root cause:** `strict: true` compiles a tool's JSON schema into a sampling grammar. Anthropic sums ALL strict tools into one grammar with a hard size cap. Each `strict` tool adds to it; tools with nested array-of-objects schemas (`propose_fill_week`, `propose_save_recipe`) contribute disproportionately because the grammar has to encode the repeating nested structure.

**Fix:** Drop `strict: true` from the heaviest nested-schema tools. They keep `additionalProperties: false` (still a valid schema, just not grammar-enforced) and their handlers validate defensively — `propose_save_recipe` even checks every ingredient id against the pantry. Flat-schema tools keep strict.

**Lesson:** Strict isn't free — it has a shared budget. Reserve it for flat-schema tools where type coercion bugs are likely (number vs string ids). For tools with nested arrays, validate in the handler instead. Rule of thumb documented at the `CHAT_TOOLS` declaration: heavy nested schemas stay non-strict.

---

## Auto-refresh: notifying other pages of writes

When the chat applies a change, other pages showing meal-plan data (currently `/planner`) need to refetch. We use a window-scoped CustomEvent:

```typescript
// In ChatProvider.tsx, after a successful apply:
window.dispatchEvent(new CustomEvent("gm:meal-plan-changed"));

// In any page that should auto-refresh:
useEffect(() => {
  const handler = () => { void reloadData(); };
  window.addEventListener("gm:meal-plan-changed", handler);
  return () => window.removeEventListener("gm:meal-plan-changed", handler);
}, [/* deps */]);
```

Currently wired: `/planner`. Not yet wired: `/home` (dashboard), `/shopping` — add the listener there if needed. Cross-tab updates would need `BroadcastChannel` instead.

---

## Adding a new tool — checklist

When you add a new tool (read or write) to the chat, walk through this list:

1. **Define the tool in `lib/chat/tools.ts`** with `strict: true` and `additionalProperties: false` on its schema. Use `enum` for any constrained string field.
2. **Implement the handler** in `runChatTool`. Validate inputs even with `strict: true` — defense in depth.
3. **If it's a write (`propose_*` naming):**
   - Return a `MealProposal` or `BulkMealProposal` matching the existing shape
   - Include real macros (`summaryMacros` or `macroDeltas`) — never let the model invent them
   - Wire it into the proposal flow in `ChatProvider.tsx` if the apply needs special handling
4. **Update the system prompt** with one sentence describing when to call this tool. Keep it short — Sonnet/Haiku 4.x dislike verbose tool descriptions in the system prompt.
5. **Bump `SYSTEM_PROMPT_V{N+1}`** if the prompt changed, and update the `promptVersion` string passed to `logChatUsage`.
6. **Test with both Sonnet AND Haiku.** What works on Sonnet may need clarification on Haiku.
7. **Check the admin dashboard** after a few test turns — does the tool name appear in the `tools` column? Are costs reasonable?

If any of these get skipped, refer back to the "Operational lessons" above — the bugs there are mostly cases of one of these steps being skipped.

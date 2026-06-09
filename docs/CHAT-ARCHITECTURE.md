# Chat — Architecture Reference

In-app AI chat ("Ask"). This doc is the operational reference: what it is, where each piece lives, how it costs, and what to touch when you need to change something.

For the visual spec see [`briefs/chat-v1.html`](../briefs/chat-v1.html). For the gated build plan see [`briefs/chat-v1-build-plan.md`](../briefs/chat-v1-build-plan.md).

---

## Quick facts

| | |
|---|---|
| **Status** | Gate 1 shipped (read-only). Gate 2 (single write), Gate 3 (bulk write), Gate 4 (mobile sheet) pending. |
| **Model** | `claude-sonnet-4-6` — pinned in `lib/chat/anthropic.ts` as `MODEL`. |
| **Provider** | Anthropic API direct (`@anthropic-ai/sdk`). Not Vercel AI Gateway — we're on Railway. |
| **Env var required** | `ANTHROPIC_API_KEY` on Railway + local `.env`. |
| **History** | Server-persisted per person. Last 50 messages loaded into context. |
| **Container** | Desktop right-docked overlay panel, 480px, portaled to `document.body`. Mobile sheet pending. |
| **Trigger** | `✦` glyph in ink, in TopNav (desktop) and MobileTopBar (mobile). |
| **Streaming** | SSE. Real-time text deltas, tool-call markers, done/error events. |
| **Friends-and-family cost** | $2–10/month total Anthropic spend. See [Cost & caching](#cost--caching). |

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
[system prompt v1]                    ← frozen, never changes
[tool definitions: 3 read tools]      ← frozen list
[today's date + lightweight context]  ← stable within a session
[← cache_control: ephemeral breakpoint here]
[message history + new user turn]     ← varies per turn — NOT cached
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
| Change the system prompt text (`SYSTEM_PROMPT_V2` in `lib/chat/anthropic.ts`) | Full invalidation. Bump the version constant when you change it. |
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
  - Builds system blocks: [SYSTEM_PROMPT_V2, today's date + context (+ cache_control)]
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

Lives in `lib/chat/anthropic.ts` as `SYSTEM_PROMPT_V2`. Voice rules that are intentional:

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

### Queued chat UX improvements

These came up during Gate 1 testing — small, can ship independently of Gates 2–4:

- **Clear conversation button** in panel header. Endpoint already exists (`DELETE /api/chat/history`); just needs a UI affordance. Confirm dialog before wiping.
- **Rolling cap on stored messages.** DB grows unbounded today. Cap per-person at, say, 500 rows; trim oldest on insert. Each row is ~1KB so not urgent until usage scales.
- **Session dividers / timestamps in history.** "2 days ago" hairline rules between conversations so the panel reads as multiple distinct sessions, not one infinite scroll.
- **Richer in-app context (instead of MCP-style context files).** The MCP integration lets users drop arbitrary `.md` files in front of Claude Desktop; the in-app chat can't, so any persistent context has to live in the app. Worth considering — see [Persistent context options](#persistent-context-options) below.

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

In `lib/chat/anthropic.ts`, change `const MODEL`. Beware:
- Switching to Opus 4.x triples input cost
- Different models have different cache TTL behavior
- The cache is model-scoped — first request after a model change writes fresh

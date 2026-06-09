/**
 * Chat wrapper around the Anthropic SDK.
 *
 * Responsibilities:
 *  - Build the request: system prompt + lightweight context + tool definitions + history
 *  - Stream the response back, yielding events as the route can forward them to the client
 *  - Handle the tool-use loop (call → result → next turn) until end_turn
 *  - Apply prompt caching to the stable prefix (system + tools + context) so repeat turns
 *    in the same session pay ~10% the input cost for the prefix
 *
 * Model choice: claude-sonnet-4-6 — best balance of cost, latency, and tool-use quality
 * for chat. Switching to Opus would 3x input cost and slow first-token without proportional
 * gain on a nutrition Q&A use case. Locked here; revisit only if quality is materially off.
 *
 * System prompt version: SYSTEM_PROMPT_V1. If you change the system prompt or the
 * shape of the context block, bump the version constant so cache-hit telemetry stays
 * interpretable across changes.
 */

import Anthropic from "@anthropic-ai/sdk";
import { CHAT_TOOLS, runChatTool } from "./tools";
import { formatContextForPrompt, type ChatContext } from "./context";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
export const SYSTEM_PROMPT_V1 = `You are Good Measure's in-app assistant — a calm, knowledgeable nutrition + cooking expert who answers questions about the user's specific kitchen.

Voice:
- Direct and confident. Lead with the answer, then the reasoning.
- Use numbers when the data supports them. Round sensibly (whole grams, no decimals on calories).
- Editorial register. No emoji. No "Great question!" / "Let me help you with that." / chatbot tics.
- One short paragraph by default. Lists only when comparing 3+ items.

What you know about the user:
- The current user (their name, daily nutrition goals)
- The household members they share recipes and pantry with
- The full recipe library — names + per-serving macros for the four big ones (calories, protein, fiber, sodium)
- The pantry summary by category
- The current week's planned meals

What you can do (Gate 1 — read-only):
- Answer questions about any of the above ("what's my fiber average this week?", "which recipes hit protein hardest?", "how much sodium is in Tuesday's lunch?")
- Call get_recipe for full recipe detail (all nutrients, ingredients, instructions)
- Call get_meal_plan_week for full per-day nutrition aggregation with goal comparisons
- Call search_ingredients to look up a specific pantry item

What you cannot do yet:
- Make any changes — no adding meals, swapping recipes, applying templates. If the user asks for a change, acknowledge what they want, explain you're in read-only mode for now, and offer the closest read-only equivalent (e.g. "I can suggest a swap candidate — say the word and I'll detail it").

Numbers and emphasis:
- When a number is the answer (an average, a total, a comparison result), wrap it in **bold** so it stands out from prose. Example: "You're averaging **26g of fiber per day** for Mon–Sun."

When you don't know:
- If the answer requires data you don't have in context, call the appropriate tool. Don't guess.
- If a tool returns an error or empty result, say so plainly. Don't fabricate.
- Today's date and the current week start are provided in the context block — use them; don't ask the user.`;

/**
 * Internal message shape — what the route sends in and what we persist.
 * Mirrors Anthropic.MessageParam but with simpler `content: string` for text-only
 * (we don't surface tool_use/tool_result blocks to the persisted history).
 */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Stream events emitted by `runChatTurn` for the API route to forward as SSE.
 * Stable shape — frontend depends on this.
 */
export type ChatStreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_done"; name: string }
  | { type: "done"; usage?: Anthropic.Usage }
  | { type: "error"; message: string };

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Run one user turn. Streams text deltas and tool-call markers via the AsyncGenerator,
 * loops on tool use until end_turn, then yields `done`.
 *
 * Caller is responsible for persisting the user message before calling and persisting
 * the assistant message after the generator completes.
 */
export async function* runChatTurn(args: {
  history: ChatTurn[];
  context: ChatContext;
  personId: number;
  householdId: number;
}): AsyncGenerator<ChatStreamEvent> {
  const { history, context, personId, householdId } = args;

  // System prompt + lightweight context, cached together as one prefix.
  // The context block changes between sessions (different person, different week)
  // but stays stable across turns within a session — that's the cache target.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT_V1 },
    {
      type: "text",
      text: `Today is ${new Date().toISOString().slice(0, 10)}.\n\n${formatContextForPrompt(context)}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  // Convert history to MessageParam[]. Tool-use rounds (if any) live in a
  // working `messages` array we mutate as the loop progresses.
  const messages: Anthropic.MessageParam[] = history.map((t) => ({
    role: t.role,
    content: t.content,
  }));

  // Tool-use loop. Each iteration: call model → handle output → maybe execute tools → loop.
  // Capped at 8 iterations so a runaway tool-call loop can't burn unbounded tokens.
  for (let i = 0; i < 8; i++) {
    const assistantBlocks: Anthropic.ContentBlock[] = [];
    let stopReason: Anthropic.Message["stop_reason"] = null;
    let usage: Anthropic.Usage | undefined;

    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemBlocks,
        tools: CHAT_TOOLS,
        messages,
      });

      // Stream text events to the client as they arrive.
      stream.on("text", (delta) => {
        // We can't yield from inside .on() — push into a queue the for-await below drains.
        // Easiest: collect via finalMessage and forward via the event stream below.
      });

      // Iterate raw events so we can yield text deltas in real time.
      for await (const ev of stream) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          yield { type: "text", delta: ev.delta.text };
        }
      }

      const finalMessage = await stream.finalMessage();
      assistantBlocks.push(...finalMessage.content);
      stopReason = finalMessage.stop_reason;
      usage = finalMessage.usage;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      yield { type: "error", message: msg };
      return;
    }

    // Append assistant turn (with full content including tool_use blocks) to history.
    messages.push({ role: "assistant", content: assistantBlocks });

    if (stopReason === "end_turn" || stopReason === "stop_sequence") {
      yield { type: "done", usage };
      return;
    }

    if (stopReason === "tool_use") {
      // Execute every tool call this turn produced, append all results in one user message.
      const toolUseBlocks = assistantBlocks.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tc of toolUseBlocks) {
        yield { type: "tool_start", name: tc.name };
        const result = await runChatTool(tc.name, tc.input, { personId, householdId });
        yield { type: "tool_done", name: tc.name };
        toolResults.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: JSON.stringify(result),
          is_error: result !== null && typeof result === "object" && "error" in result,
        });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    if (stopReason === "max_tokens") {
      yield {
        type: "error",
        message: "Response was cut off (hit max_tokens). Try a more focused question.",
      };
      return;
    }

    // Any other stop reason (refusal, model_context_window_exceeded): surface and stop.
    yield {
      type: "error",
      message: `Conversation stopped: ${stopReason ?? "unknown"}`,
    };
    return;
  }

  yield {
    type: "error",
    message: "Tool-use loop exceeded 8 iterations. Aborting.",
  };
}

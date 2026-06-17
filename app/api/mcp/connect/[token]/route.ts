import { NextResponse } from "next/server";
import { getMcpAuthFromToken } from "@/lib/mcp-auth";
import { MCP_TOOLS, MCP_TOOLS_BY_NAME } from "@/lib/mcpToolCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hosted remote MCP connector (Streamable HTTP, stateless).
 *
 * Users add `https://<host>/api/mcp/connect/<token>` as a custom connector in
 * any MCP-capable assistant (Claude, ChatGPT, Cursor, …). The token in the path
 * is the auth. We speak JSON-RPC over POST and return application/json — no SSE,
 * no session state. tools/call forwards to the existing /api/mcp/* REST routes
 * (with the token as a Bearer header), so all business logic, auth, and the plan
 * gate are reused. See lib/mcpToolCatalog.ts for the tool → REST mapping.
 */

const SERVER_INFO = { name: "good-measure", version: "1.4.1" };
const DEFAULT_PROTOCOL = "2025-06-18";

type RpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const rpcError = (id: RpcRequest["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

const rpcResult = (id: RpcRequest["id"], result: unknown) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

function apiBase(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

async function callTool(
  request: Request,
  token: string,
  name: string,
  args: Record<string, unknown>
) {
  const tool = MCP_TOOLS_BY_NAME[name];
  if (!tool) {
    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
  // Auth + plan gate happen here (not at initialize) so the connector can still
  // hand-shake and list tools; actual data access is what's gated.
  const auth = await getMcpAuthFromToken(token);
  if ("error" in auth) {
    return { content: [{ type: "text", text: auth.error }], isError: true };
  }
  try {
    const { method, path, body } = tool.toRequest(args ?? {});
    const res = await fetch(`${apiBase(request)}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep raw text */ }

    if (!res.ok) {
      const msg =
        (parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : `API error ${res.status}`);
      return { content: [{ type: "text", text: msg }], isError: true };
    }
    return {
      content: [{ type: "text", text: typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Tool failed: ${message}` }], isError: true };
  }
}

async function handleRpc(request: Request, token: string, msg: RpcRequest) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: (params?.protocolVersion as string) ?? DEFAULT_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "notifications/initialized":
    case "initialized":
      return null; // notification — no response
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments as Record<string, unknown>) ?? {};
      const result = await callTool(request, token, name, args);
      return rpcResult(id, result);
    }
    default:
      if (isNotification) return null; // ignore unknown notifications
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  let payload: RpcRequest | RpcRequest[];
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 200 });
  }

  if (Array.isArray(payload)) {
    const responses = (await Promise.all(payload.map((m) => handleRpc(request, token, m)))).filter(
      (r) => r !== null
    );
    // All-notification batch → 202 with no body.
    if (responses.length === 0) return new NextResponse(null, { status: 202 });
    return NextResponse.json(responses);
  }

  const response = await handleRpc(request, token, payload);
  if (response === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(response);
}

// Stateless server — no server-initiated SSE stream.
export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

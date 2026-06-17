import { prisma } from '@/lib/db';
import { getHouseholdPlan, planAllowsMcp } from '@/lib/entitlements';

export interface McpAuth {
  householdId: number;
  personId: number;
}

export type McpAuthError = { error: string; status: number };

/**
 * Validates an MCP API token and applies the plan gate. This is the single
 * enforcement point for the AI/MCP layer: the existing /api/mcp/* REST routes
 * call it via getMcpAuth (Bearer header), and the hosted remote connector calls
 * it via getMcpAuthFromToken (token from the URL). Gating here means every
 * client — the npm package, the hosted URL, or a raw API call — is treated
 * identically. During the friends-and-family phase every household is "comp",
 * so the gate passes; at launch it blocks non-Pro accounts.
 *
 * Tokens are per-person: key format is `mcpApiToken_${personId}`.
 */
async function resolveToken(token: string): Promise<McpAuth | McpAuthError> {
  if (!token) return { error: 'Empty token', status: 401 };

  const setting = await prisma.systemSetting.findFirst({
    where: { key: { startsWith: 'mcpApiToken_' }, value: token },
  });
  if (!setting?.householdId) return { error: 'Invalid or revoked token', status: 401 };

  const personId = parseInt(setting.key.split('_')[1], 10);
  if (!personId) return { error: 'Malformed token record', status: 401 };

  // Plan gate — the AI/MCP layer is Pro-only (comp passes).
  const plan = await getHouseholdPlan(setting.householdId);
  if (!planAllowsMcp(plan)) {
    return { error: 'The AI assistant (MCP) connection requires Good Measure Pro.', status: 402 };
  }

  return { householdId: setting.householdId, personId };
}

/**
 * Validates a Bearer token from the Authorization header (used by /api/mcp/* REST routes).
 */
export async function getMcpAuth(
  request: Request
): Promise<McpAuth | McpAuthError> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }
  return resolveToken(authHeader.slice(7).trim());
}

/**
 * Validates a token passed directly (used by the hosted remote connector, which
 * carries the token in the URL path).
 */
export async function getMcpAuthFromToken(
  token: string
): Promise<McpAuth | McpAuthError> {
  return resolveToken((token ?? '').trim());
}

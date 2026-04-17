import { prisma } from '@/lib/db';

export interface McpAuth {
  householdId: number;
  personId: number;
}

/**
 * Validates a Bearer token from the Authorization header and returns
 * the person + household context for the MCP server to use.
 *
 * Tokens are per-person: key format is `mcpApiToken_${personId}`.
 * The personId is parsed directly from the key — no owner lookup needed.
 */
export async function getMcpAuth(
  request: Request
): Promise<McpAuth | { error: string; status: number }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }

  const token = authHeader.slice(7).trim();
  if (!token) return { error: 'Empty token', status: 401 };

  const setting = await prisma.systemSetting.findFirst({
    where: { key: { startsWith: 'mcpApiToken_' }, value: token },
  });

  if (!setting?.householdId) return { error: 'Invalid or revoked token', status: 401 };

  // Parse personId from key: 'mcpApiToken_123' → 123
  const personId = parseInt(setting.key.split('_')[1], 10);
  if (!personId) return { error: 'Malformed token record', status: 401 };

  return { householdId: setting.householdId, personId };
}

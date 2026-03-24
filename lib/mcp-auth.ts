import { prisma } from '@/lib/db';

export interface McpAuth {
  householdId: number;
  personId: number;
}

/**
 * Validates a Bearer token from the Authorization header and returns
 * the household context for the MCP server to use.
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
    where: { key: 'mcpApiToken', value: token },
  });

  if (!setting?.householdId) return { error: 'Invalid or revoked token', status: 401 };

  const owner = await prisma.householdMember.findFirst({
    where: { householdId: setting.householdId, role: 'owner', active: true },
    select: { personId: true },
  });

  return { householdId: setting.householdId, personId: owner?.personId ?? 0 };
}

import { NextResponse } from "next/server";
import { getAuthenticatedHousehold } from "@/lib/auth";

export type AuthSuccess = { personId: number; supabaseId: string; householdId: number; role: string };

/**
 * Wraps a route handler with authentication and a top-level error boundary.
 * Injects the resolved `auth` object as the first argument to the handler.
 *
 * Handlers that need a custom error format (e.g. including error.message) should
 * catch internally and return their own response — the HOF catch won't fire for those.
 *
 * @example
 * export const GET = withAuth(async (auth, request: Request) => {
 *   const items = await prisma.thing.findMany({ where: { householdId: auth.householdId } });
 *   return NextResponse.json(items);
 * }, "Failed to fetch things");
 */
export function withAuth<Args extends unknown[]>(
  handler: (auth: AuthSuccess, ...args: Args) => Promise<NextResponse>,
  fallbackError = "Internal server error"
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      const auth = await getAuthenticatedHousehold();
      if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      return await handler(auth, ...args);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: fallbackError }, { status: 500 });
    }
  };
}

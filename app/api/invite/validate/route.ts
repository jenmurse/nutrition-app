import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Validates a signup code WITHOUT consuming it. The /invite page may call this
 * more than once (gate step, then again on submit), so it must be idempotent.
 * The code is actually consumed — and the household's plan assigned — when the
 * new household is created in app/auth/callback/route.ts.
 */
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const entered = code?.trim().toLowerCase();
  if (!entered) return NextResponse.json({ valid: false });

  // Primary: a unique signup code in the DB (carries its own plan).
  const row = await prisma.signupCode.findUnique({ where: { code: entered } });
  if (row) {
    const notExpired = !row.expiresAt || row.expiresAt > new Date();
    const hasUses = row.usedCount < row.maxUses;
    return NextResponse.json({ valid: notExpired && hasUses });
  }

  // Transitional fallback: the legacy shared INVITE_CODE env var. Grants access
  // and the household defaults to comp (no code row to read a plan from).
  // Remove this branch once everyone is invited via unique codes.
  const legacy = process.env.INVITE_CODE;
  if (legacy && entered === legacy.trim().toLowerCase()) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/households/invite/info?token=<uuid>
 * Public endpoint — returns household name for an invite token (no auth required).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    const invite = await prisma.householdInvite.findUnique({
      where: { token },
      include: { household: { select: { name: true } } },
    });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }

    return NextResponse.json({ householdName: invite.household.name });
  } catch (error) {
    console.error("Error fetching invite info:", error);
    return NextResponse.json({ error: "Failed to fetch invite" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedHousehold } from "@/lib/auth";

/**
 * POST /api/households/invite — generate an invite link for the active household
 * Returns: { token, url, expiresAt }
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedHousehold();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const invite = await prisma.householdInvite.create({
      data: {
        householdId: auth.householdId,
        createdBy: auth.personId,
        expiresAt,
      },
    });

    const { origin } = new URL(request.url);
    const url = `${origin}/login?invite=${invite.token}`;

    return NextResponse.json({
      token: invite.token,
      url,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

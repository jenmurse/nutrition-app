import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

/**
 * GET /api/settings
 * Returns current system settings (API key masked, provider)
 */
export const GET = withAuth(async (auth) => {
  const [keyRow, providerRow] = await Promise.all([
    prisma.systemSetting.findFirst({ where: { key: "anthropicApiKey", householdId: auth.householdId } }),
    prisma.systemSetting.findFirst({ where: { key: "aiProvider", householdId: auth.householdId } }),
  ]);

  const rawKey = keyRow?.value ?? process.env.AI_API_KEY ?? "";
  const provider = providerRow?.value ?? process.env.AI_PROVIDER ?? "anthropic";

  // Mask key: show last 6 chars only
  const maskedKey = rawKey.length > 6
    ? "•".repeat(Math.min(rawKey.length - 6, 20)) + rawKey.slice(-6)
    : rawKey.length > 0 ? "•".repeat(rawKey.length) : "";

  const hasKey = rawKey.length > 0;

  return NextResponse.json({ hasKey, maskedKey, provider });
}, "Failed to load settings");

/**
 * PUT /api/settings
 * Save API key and/or provider
 * Body: { apiKey?: string, provider?: string }
 */
export const PUT = withAuth(async (auth, request: NextRequest) => {
  const body = await request.json();
  const { apiKey, provider } = body;

  const ops: Promise<any>[] = [];

  if (typeof apiKey === "string") {
    if (apiKey.trim() === "") {
      // Clear the key
      ops.push(prisma.systemSetting.deleteMany({ where: { key: "anthropicApiKey", householdId: auth.householdId } }));
    } else {
      ops.push(
        prisma.systemSetting.upsert({
          where: { key_householdId: { key: "anthropicApiKey", householdId: auth.householdId } },
          update: { value: apiKey.trim() },
          create: { key: "anthropicApiKey", value: apiKey.trim(), householdId: auth.householdId },
        })
      );
    }
  }

  if (typeof provider === "string" && provider.trim()) {
    ops.push(
      prisma.systemSetting.upsert({
        where: { key_householdId: { key: "aiProvider", householdId: auth.householdId } },
        update: { value: provider.trim() },
        create: { key: "aiProvider", value: provider.trim(), householdId: auth.householdId },
      })
    );
  }

  await Promise.all(ops);
  return NextResponse.json({ success: true });
}, "Failed to save settings");

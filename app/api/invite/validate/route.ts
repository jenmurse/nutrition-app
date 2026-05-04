import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const expected = process.env.INVITE_CODE;
  if (!expected) return NextResponse.json({ valid: false }, { status: 500 });
  const valid = code?.trim().toLowerCase() === expected.trim().toLowerCase();
  return NextResponse.json({ valid });
}

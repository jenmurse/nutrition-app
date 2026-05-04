import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { name, email } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  await prisma.waitlist.create({ data: { name: name.trim(), email: email.trim() } });
  return NextResponse.json({ ok: true });
}

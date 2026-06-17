import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SIGNUP_PLANS, randomSignupCode, type SignupPlan } from "@/lib/signupCodes";

// Same auth as /api/admin/waitlist and /api/admin/usage: the shared ADMIN_PASSWORD.
function authed(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** GET — list all signup codes, newest first. */
export async function GET(req: NextRequest) {
  if (!authed(req)) return unauthorized();
  const codes = await prisma.signupCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(codes);
}

/** POST — create a code. Body: { label, plan?, maxUses?, code? } */
export async function POST(req: NextRequest) {
  if (!authed(req)) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });

  const plan = (typeof body.plan === "string" ? body.plan : "comp").toLowerCase() as SignupPlan;
  if (!SIGNUP_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const maxUses =
    Number.isInteger(body.maxUses) && body.maxUses > 0 ? body.maxUses : 1;

  const explicit = typeof body.code === "string" && !!body.code.trim();
  let code = (explicit ? body.code : randomSignupCode()).trim().toLowerCase();

  // Resolve uniqueness. An explicit collision is a user error (409); an
  // auto-generated collision just retries with a fresh random code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await prisma.signupCode.findUnique({ where: { code } });
    if (!exists) break;
    if (explicit) {
      return NextResponse.json({ error: `Code "${code}" already exists` }, { status: 409 });
    }
    code = randomSignupCode();
  }

  const row = await prisma.signupCode.create({ data: { code, label, plan, maxUses } });
  return NextResponse.json(row, { status: 201 });
}

/** PATCH — edit a code's label. Body: { id, label } */
export async function PATCH(req: NextRequest) {
  if (!authed(req)) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const row = await prisma.signupCode
    .update({ where: { id }, data: { label: label || null } })
    .catch(() => null);
  if (!row) return NextResponse.json({ error: "Code not found" }, { status: 404 });
  return NextResponse.json(row);
}

/** DELETE — remove a code by id (?id=123). */
export async function DELETE(req: NextRequest) {
  if (!authed(req)) return unauthorized();
  const id = parseInt(new URL(req.url).searchParams.get("id") ?? "", 10);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.signupCode.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

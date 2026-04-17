import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/apiUtils";

type Ctx = { params: Promise<{ fdcId: string }> };

export const GET = withAuth(async (auth, _request: Request, { params }: Ctx) => {
  const { fdcId } = await params;
  if (!fdcId) return NextResponse.json({ found: false });

  const ingredient = await prisma.ingredient.findFirst({
    where: { fdcId, householdId: auth.householdId },
    include: { nutrientValues: { include: { nutrient: true } } },
  });

  if (!ingredient) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, ingredient });
}, "Lookup failed");

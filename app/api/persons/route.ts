import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const persons = await prisma.person.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(persons);
}

export async function POST(request: Request) {
  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const person = await prisma.person.create({
    data: { name: name.trim(), color: color ?? "#6B9E7B" },
  });
  return NextResponse.json(person, { status: 201 });
}

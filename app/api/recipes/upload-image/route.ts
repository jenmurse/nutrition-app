import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/apiUtils";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "crypto";

export const POST = withAuth(async (_auth, request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const contentType = file.type || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const publicUrl = await uploadToR2(filename, buffer, contentType);
  return NextResponse.json({ url: publicUrl });
}, "Image upload failed");

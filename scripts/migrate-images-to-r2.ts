/**
 * migrate-images-to-r2.ts
 *
 * One-time migration: downloads images stored in Supabase Storage and
 * re-uploads them to Cloudflare R2, then updates each recipe row with
 * the new R2 public URL.
 *
 * Run with:
 *   npx tsx scripts/migrate-images-to-r2.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *   R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";

// Load .env.local manually
try {
  const env = readFileSync(".env.local", "utf-8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {}

const prisma = new PrismaClient();

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function uploadToR2(filename: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filename,
    Body: body,
    ContentType: contentType,
  }));
  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");

  // Find all recipes with Supabase Storage URLs
  const recipes = await prisma.recipe.findMany({
    where: { image: { contains: supabaseUrl } },
    select: { id: true, name: true, image: true },
  });

  console.log(`Found ${recipes.length} recipes with Supabase Storage images.`);
  if (recipes.length === 0) { console.log("Nothing to migrate."); return; }

  let success = 0;
  let failed = 0;

  for (const recipe of recipes) {
    try {
      const imageUrl = recipe.image!;

      // Download from Supabase
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) throw new Error(`Unexpected content-type: ${contentType}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const filename = `${randomUUID()}.${ext}`;

      // Upload to R2
      const r2Url = await uploadToR2(filename, buffer, contentType);

      // Update recipe row
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { image: r2Url },
      });

      console.log(`  ✓ [${recipe.id}] ${recipe.name}`);
      success++;
    } catch (err) {
      console.error(`  ✗ [${recipe.id}] ${recipe.name}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. ${success} migrated, ${failed} failed.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

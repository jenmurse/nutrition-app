/**
 * migrate-images-to-storage.ts
 *
 * One-time migration: moves base64 recipe images stored in Postgres
 * to Supabase Storage and updates each recipe row with the public URL.
 *
 * Run with:
 *   npx tsx scripts/migrate-images-to-storage.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Find all recipes with base64 images
  const recipes = await prisma.recipe.findMany({
    where: { image: { startsWith: "data:" } },
    select: { id: true, name: true, image: true },
  });

  console.log(`Found ${recipes.length} recipes with base64 images.`);
  if (recipes.length === 0) { console.log("Nothing to migrate."); return; }

  let success = 0;
  let failed = 0;

  for (const recipe of recipes) {
    try {
      // Strip the data URI prefix and decode
      const matches = recipe.image!.match(/^data:(.+);base64,(.+)$/);
      if (!matches) { console.warn(`  [${recipe.id}] Unrecognised image format, skipping.`); failed++; continue; }

      const mimeType = matches[1];
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const buffer = Buffer.from(matches[2], "base64");
      const filename = `${randomUUID()}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(filename, buffer, { contentType: mimeType });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("recipe-images")
        .getPublicUrl(filename);

      // Update the recipe row
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { image: publicUrl },
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

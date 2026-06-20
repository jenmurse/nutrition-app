import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const recipes = await prisma.recipe.findMany({
    where: { image: { not: null } },
    select: { id: true, image: true, name: true },
  });

  console.log(`Found ${recipes.length} recipes with images.\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const recipe of recipes) {
    const oldUrl = recipe.image!;

    // Skip if already on Supabase Storage
    if (oldUrl.includes("supabase.co/storage")) {
      console.log(`  SKIP (already migrated) ${recipe.name}`);
      skip++;
      continue;
    }

    const filename = oldUrl.split("/").pop()!;

    const res = await fetch(oldUrl);
    if (!res.ok) {
      console.error(`  FAIL fetch ${recipe.name} — ${res.status}`);
      fail++;
      continue;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";

    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(filename, buffer, { contentType, upsert: true });

    if (error) {
      console.error(`  FAIL upload ${recipe.name} — ${error.message}`);
      fail++;
      continue;
    }

    const { data } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(filename);

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { image: data.publicUrl },
    });

    console.log(`  OK ${recipe.name}`);
    ok++;
  }

  await prisma.$disconnect();
  console.log(`\nDone. ${ok} migrated, ${skip} skipped, ${fail} failed.`);
}

run().catch((e) => { console.error(e); process.exit(1); });

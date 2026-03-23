import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing nutrients (in case re-seeding)
  await prisma.nutrient.deleteMany();

  // Create the 8 tracked nutrients
  const nutrients = await prisma.nutrient.createMany({
    data: [
      {
        name: "calories",
        displayName: "Calories",
        unit: "kcal",
        orderIndex: 0,
      },
      {
        name: "fat",
        displayName: "Fat",
        unit: "g",
        orderIndex: 1,
      },
      {
        name: "satFat",
        displayName: "Saturated Fat",
        unit: "g",
        orderIndex: 2,
      },
      {
        name: "sodium",
        displayName: "Sodium",
        unit: "mg",
        orderIndex: 3,
      },
      {
        name: "carbs",
        displayName: "Carbs",
        unit: "g",
        orderIndex: 4,
      },
      {
        name: "sugar",
        displayName: "Sugar",
        unit: "g",
        orderIndex: 5,
      },
      {
        name: "protein",
        displayName: "Protein",
        unit: "g",
        orderIndex: 6,
      },
      {
        name: "fiber",
        displayName: "Fiber",
        unit: "g",
        orderIndex: 7,
      },
    ],
  });

  console.log(`Seeded ${nutrients.count} nutrients`);

  // Seed household persons (upsert so re-running is safe)
  await prisma.person.upsert({
    where: { name: "Jen" },
    update: {},
    create: { name: "Jen", color: "#6B9E7B" },
  });
  await prisma.person.upsert({
    where: { name: "Garth" },
    update: {},
    create: { name: "Garth", color: "#7B8E9E" },
  });
  console.log("Seeded persons: Jen, Garth");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

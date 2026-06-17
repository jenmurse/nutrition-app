/**
 * Mint a signup code for friends-and-family / beta access.
 *
 * Usage:
 *   npx tsx scripts/make-signup-code.ts <label> [plan] [maxUses] [code]
 *
 *   <label>   required — note to self, e.g. "Angie" or "Launch promo"
 *   [plan]    comp | free | pro     (default: comp)
 *   [maxUses] integer               (default: 1 — single use)
 *   [code]    explicit code string  (default: random 6-char code)
 *
 * Examples:
 *   npx tsx scripts/make-signup-code.ts "Angie"                # comp, single-use, random code
 *   npx tsx scripts/make-signup-code.ts "Beta tester" free     # free-tier tester
 *   npx tsx scripts/make-signup-code.ts "Launch promo" pro 50 launch50
 *
 * Prints the code and the ready-to-share signup URL.
 */
import { PrismaClient } from "@prisma/client";
import { SIGNUP_PLANS as PLANS, randomSignupCode, type SignupPlan as Plan } from "../lib/signupCodes";

const prisma = new PrismaClient();

async function main() {
  const [label, planArg, maxUsesArg, codeArg] = process.argv.slice(2);

  if (!label) {
    console.error('Label required. e.g. npx tsx scripts/make-signup-code.ts "Angie" comp');
    process.exit(1);
  }

  const plan = (planArg ?? "comp").toLowerCase() as Plan;
  if (!PLANS.includes(plan)) {
    console.error(`Invalid plan "${planArg}". Use one of: ${PLANS.join(", ")}`);
    process.exit(1);
  }

  const maxUses = maxUsesArg ? parseInt(maxUsesArg, 10) : 1;
  if (!Number.isInteger(maxUses) || maxUses < 1) {
    console.error(`Invalid maxUses "${maxUsesArg}". Use a positive integer.`);
    process.exit(1);
  }

  const code = (codeArg ?? randomSignupCode()).trim().toLowerCase();

  const existing = await prisma.signupCode.findUnique({ where: { code } });
  if (existing) {
    console.error(`Code "${code}" already exists. Pick another.`);
    process.exit(1);
  }

  const row = await prisma.signupCode.create({
    data: { code, label, plan, maxUses },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://withgoodmeasure.com";
  console.log("\n✔ Signup code created");
  console.log(`  code:    ${row.code}`);
  console.log(`  label:   ${row.label}`);
  console.log(`  plan:    ${row.plan}`);
  console.log(`  maxUses: ${row.maxUses}`);
  console.log(`  share:   ${base}/invite   (then enter code: ${row.code})\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

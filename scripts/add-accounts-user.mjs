/**
 * One-time script: Create Priyadharshini (Accounts) employee.
 * Run: node scripts/add-accounts-user.mjs
 */
import { PrismaClient } from "../src/generated/prisma/client.ts";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.employee.findFirst({
    where: {
      OR: [
        { email: "accounts@caveoinfosystems.com" },
        { msEmail: "accounts@caveoinfosystems.com" },
      ],
    },
  });

  if (existing) {
    console.log("✓ Employee already exists:", existing.name, "(id:", existing.id + ")");
    return;
  }

  const emp = await prisma.employee.create({
    data: {
      name: "Priyadharshini",
      email: "accounts@caveoinfosystems.com",
      msEmail: "accounts@caveoinfosystems.com",
      department: "Accounts",
      role: "Accounts",
      isManager: false,
    },
  });
  console.log("✓ Created accounts employee:", emp.name, "(id:", emp.id + ")");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

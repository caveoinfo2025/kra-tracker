/**
 * One-time setup: marks Vijesh as manager and seeds msEmail for all employees.
 * Run: npx tsx setup_manager.mts
 */
import path from "node:path";
import fs from "node:fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./src/generated/prisma/client.ts";

function resolveDbPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "prisma", "dev.db"),
    path.resolve(process.cwd(), "dev.db"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

const dbPath = resolveDbPath();
console.log("Using database:", dbPath);
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as never);

const employees = await prisma.employee.findMany();
console.log(`Found ${employees.length} employees.\n`);

for (const emp of employees) {
  const isManager = emp.name.toLowerCase().includes("vijesh");
  const msEmail = emp.msEmail ?? emp.email;

  const updated = await prisma.employee.update({
    where: { id: emp.id },
    data: { isManager, msEmail },
  });
  console.log(
    `${updated.name.padEnd(22)} manager: ${String(updated.isManager).padEnd(5)}  msEmail: ${updated.msEmail}`
  );
}

console.log("\nDone. Vijesh will see all employee data after signing in with Microsoft.");
await prisma.$disconnect();

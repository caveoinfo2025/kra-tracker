/**
 * One-time setup: marks Vijesh as manager and seeds msEmail for all employees.
 * Runs directly against the database (no HTTP, works even without a dev server).
 * Run: node setup_manager.js
 */

// Minimal path resolution to match resolveDbPath() in src/lib/prisma.ts
const path = require('path');
const fs = require('fs');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('./src/generated/prisma/client.js');

function resolveDbPath() {
  const candidates = [
    path.resolve(process.cwd(), 'prisma', 'dev.db'),
    path.resolve(process.cwd(), 'dev.db'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

const dbPath = resolveDbPath();
console.log('Using database:', dbPath);
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

(async () => {
  const employees = await prisma.employee.findMany();
  console.log(`Found ${employees.length} employees.\n`);

  for (const emp of employees) {
    const isManager = emp.name.toLowerCase().includes('vijesh');
    const msEmail = emp.msEmail ?? emp.email; // keep existing msEmail, fall back to company email

    const updated = await prisma.employee.update({
      where: { id: emp.id },
      data: { isManager, msEmail },
    });
    console.log(`${updated.name.padEnd(20)} — manager: ${String(updated.isManager).padEnd(5)} msEmail: ${updated.msEmail}`);
  }

  console.log('\nDone. Vijesh will see all employee data after signing in with Microsoft.');
  await prisma.$disconnect();
})();

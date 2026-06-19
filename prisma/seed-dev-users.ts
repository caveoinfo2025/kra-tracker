/**
 * DEV-ONLY seed — sample employees for dev quick-login testing.
 *
 * Seeds one employee per access pattern so you can switch users on the
 * /login quick-login widget and exercise every role gate:
 *   - Head of Sales        (isManager) — full access
 *   - Operations Head      — manager-like finance reach WITHOUT isManager
 *   - Accounts             — finance (collections / payments / vouchers)
 *   - Business Dev Manager — senior sales
 *   - BDE / Inside Sales   — standard reps
 *   - Sales Coordinator    — tasks / read-only leads
 *
 * Idempotent (upsert by email). Run against a DEV database only:
 *   $env:DATABASE_URL = "mysql://.../u686730471_caveodev"
 *   npx tsx prisma/seed-dev-users.ts
 *
 * NOT wired into `prisma db seed` (that runs the finance config seed).
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const url = new URL(process.env.DATABASE_URL!.replace(/\\(.)/g, "$1"));
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  }),
});

type DevUser = {
  name: string;
  email: string;
  department: string;
  role: string;
  isManager: boolean;
  /** email of this person's manager (resolved in pass 2) */
  reportsToEmail?: string;
};

const HEAD = "vijesh@caveoinfosystems.com";
const OPS = "deepak.ops@caveoinfosystems.com";

const USERS: DevUser[] = [
  { name: "Vijesh Vijayan",    email: HEAD,                                  department: "Sales",        role: "Head of Sales",                isManager: true },
  { name: "Deepak Sharma",     email: OPS,                                   department: "Operations",   role: "Operations Head",              isManager: false, reportsToEmail: HEAD },
  { name: "Priyadharshini R",  email: "priyadharshini.accounts@caveoinfosystems.com", department: "Accounts", role: "Accounts",          isManager: false, reportsToEmail: OPS },
  { name: "Arun Menon",        email: "arun.bdm@caveoinfosystems.com",       department: "Sales",        role: "Business Development Manager", isManager: false, reportsToEmail: HEAD },
  { name: "Priya Nair",        email: "priya.bde@caveoinfosystems.com",      department: "Sales",        role: "BDE",                          isManager: false, reportsToEmail: HEAD },
  { name: "Rahul Kumar",       email: "rahul.isr@caveoinfosystems.com",      department: "Inside Sales", role: "Inside Sales",                 isManager: false, reportsToEmail: HEAD },
  { name: "Sneha Pillai",      email: "sneha.coord@caveoinfosystems.com",    department: "Sales",        role: "Sales Coordinator",            isManager: false, reportsToEmail: HEAD },
];

async function main() {
  // Pass 1 — upsert every employee (no reportsTo yet)
  for (const u of USERS) {
    await prisma.employee.upsert({
      where: { email: u.email },
      update: { name: u.name, department: u.department, role: u.role, isManager: u.isManager },
      create: { name: u.name, email: u.email, department: u.department, role: u.role, isManager: u.isManager },
    });
  }

  // Pass 2 — wire up the reportsTo hierarchy
  const byEmail = new Map(
    (await prisma.employee.findMany({ select: { id: true, email: true } })).map((e) => [e.email, e.id])
  );
  for (const u of USERS) {
    if (!u.reportsToEmail) continue;
    const id = byEmail.get(u.email);
    const managerId = byEmail.get(u.reportsToEmail);
    if (id && managerId) {
      await prisma.employee.update({ where: { id }, data: { reportsToId: managerId } });
    }
  }

  const all = await prisma.employee.findMany({
    select: { id: true, name: true, role: true, isManager: true },
    orderBy: { name: "asc" },
  });
  console.log(`Seeded ${all.length} dev employees:`);
  for (const e of all) {
    console.log(`  #${e.id}  ${e.name.padEnd(18)} ${e.isManager ? "[Manager] " : "          "}${e.role}`);
  }
  console.log("\nOpen http://localhost:3000/login → 'Select an employee to log in as'.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

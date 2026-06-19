/**
 * Finance Operations Module — Phase 1 seed (config / master data only).
 *
 * Seeds:
 *   - FinAccount     : one cash account (HO Cash) + one bank account
 *   - VoucherSequence: a row for the current Indian financial year (lastNumber = 0)
 *   - ApprovalRule   : a sensible default "Standard Expense Approval" policy
 *
 * Idempotent — safe to run multiple times (guards on existing rows / upsert).
 *
 * Run with a MySQL/MariaDB DATABASE_URL set (host 127.0.0.1, not localhost):
 *   npx prisma db seed
 *
 * Connection mirrors src/lib/prisma.ts: prefers DB_* env vars, else parses
 * DATABASE_URL (stripping Passenger's stray backslash-escapes).
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function resolveDbConfig(): DbConfig {
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER ?? "",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "",
    };
  }
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set (and no DB_HOST fallback)");
  const url = new URL(raw.replace(/\\(.)/g, "$1"));
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

/** Indian financial year label, e.g. "26-27" (FY runs Apr 1 → Mar 31). */
function currentFinancialYear(now = new Date()): string {
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? y : y - 1; // month 3 = April (0-indexed)
  const a = String(startYear % 100).padStart(2, "0");
  const b = String((startYear + 1) % 100).padStart(2, "0");
  return `${a}-${b}`;
}

async function main() {
  const cfg = resolveDbConfig();
  const adapter = new PrismaMariaDb({ ...cfg, connectionLimit: 5 });
  const prisma = new PrismaClient({ adapter });

  try {
    // ── FinAccount: seed default cash + bank accounts only if none exist ──
    const accountCount = await prisma.finAccount.count();
    if (accountCount === 0) {
      await prisma.finAccount.createMany({
        data: [
          {
            name: "HO Cash",
            type: "cash",
            branchName: "HO",
            openingBalance: 0,
            currentBalance: 0,
          },
          {
            name: "Primary Current A/C",
            type: "bank",
            branchName: "HO",
            bankName: "HDFC Bank",
            accountHolder: "Caveo Infosystems Pvt. Ltd.",
            openingBalance: 0,
            currentBalance: 0,
          },
        ],
      });
      console.log("Seeded 2 finance accounts (HO Cash, Primary Current A/C).");
    } else {
      console.log(`FinAccount already has ${accountCount} row(s) — skipped.`);
    }

    // ── VoucherSequence: ensure a row for the current financial year ──
    const fy = currentFinancialYear();
    await prisma.voucherSequence.upsert({
      where: { financialYear: fy },
      update: {}, // never reset an existing counter
      create: { financialYear: fy, lastNumber: 0 },
    });
    console.log(`VoucherSequence ready for FY ${fy}.`);

    // ── ApprovalRule: seed a default policy only if none exist ──
    const ruleCount = await prisma.approvalRule.count();
    if (ruleCount === 0) {
      await prisma.approvalRule.create({
        data: {
          name: "Standard Expense Approval",
          entityType: "all",
          autoApproveLimit: 0.1, // ≤ ₹0.10 L (₹10,000) auto-approves
          level1Limit: 1.0, // ≤ ₹1 L  → line manager
          level1Role: "Business Development Manager",
          level2Limit: 5.0, // ≤ ₹5 L  → Operations Head
          level2Role: "Operations Head",
          level3Limit: null, // > ₹5 L → Head of Sales
          level3Role: "Head of Sales",
          isActive: true,
        },
      });
      console.log("Seeded default ApprovalRule (Standard Expense Approval).");
    } else {
      console.log(`ApprovalRule already has ${ruleCount} row(s) — skipped.`);
    }

    console.log("Finance Phase 1 seed complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

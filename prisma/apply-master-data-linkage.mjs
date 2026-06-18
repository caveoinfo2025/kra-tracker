/**
 * Phase 17: Apply master_data_linkage migration to the dev database.
 *
 * Run:
 *   $env:DATABASE_URL="mysql://u686730471_devuser:Caveo%402026@srv2201.hstgr.io:3306/u686730471_caveodev"
 *   node prisma/apply-master-data-linkage.mjs
 *
 * Then:
 *   $env:DATABASE_URL="..."; npx prisma migrate resolve --applied 20260618000000_master_data_linkage
 *   npx prisma generate
 */

import { createConnection } from "mariadb";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

// Strip Passenger's \% escaping
const cleanUrl = url.replace(/\\%/g, "%");
const u = new URL(cleanUrl);

const conn = await createConnection({
  host: u.hostname,
  port: Number(u.port) || 3306,
  user: u.username,
  password: decodeURIComponent(u.password),
  database: u.pathname.slice(1),
  multipleStatements: true,
});

const stmts = [
  // LeadGeneration → Customer
  "ALTER TABLE `LeadGeneration` ADD COLUMN `customerId` INT NULL",
  "ALTER TABLE `LeadGeneration` ADD CONSTRAINT `LeadGeneration_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
  "CREATE INDEX `LeadGeneration_customerId_idx` ON `LeadGeneration`(`customerId`)",
  // SalesFunnel → Customer
  "ALTER TABLE `SalesFunnel` ADD COLUMN `customerId` INT NULL",
  "ALTER TABLE `SalesFunnel` ADD CONSTRAINT `SalesFunnel_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
  "CREATE INDEX `SalesFunnel_customerId_idx` ON `SalesFunnel`(`customerId`)",
  // Collection → Customer
  "ALTER TABLE `Collection` ADD COLUMN `customerId` INT NULL",
  "ALTER TABLE `Collection` ADD CONSTRAINT `Collection_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
  "CREATE INDEX `Collection_customerId_idx` ON `Collection`(`customerId`)",
  // OrderAdvance → Customer
  "ALTER TABLE `OrderAdvance` ADD COLUMN `customerId` INT NULL",
  "ALTER TABLE `OrderAdvance` ADD CONSTRAINT `OrderAdvance_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
  "CREATE INDEX `OrderAdvance_customerId_idx` ON `OrderAdvance`(`customerId`)",
  // Expense → ExpenseCategory
  "ALTER TABLE `Expense` ADD COLUMN `expenseCategoryId` INT NULL",
  "ALTER TABLE `Expense` ADD CONSTRAINT `Expense_expenseCategoryId_fkey` FOREIGN KEY (`expenseCategoryId`) REFERENCES `expense_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE",
  "CREATE INDEX `Expense_expenseCategoryId_idx` ON `Expense`(`expenseCategoryId`)",
];

for (const sql of stmts) {
  try {
    await conn.query(sql);
    console.log("✅", sql.slice(0, 80));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME" || e.code === "ER_DUP_KEYNAME" || e.errno === 1060 || e.errno === 1061) {
      console.log("⏭  already exists:", sql.slice(0, 80));
    } else {
      console.error("❌", e.message, "\n  SQL:", sql);
      await conn.end();
      process.exit(1);
    }
  }
}

await conn.end();
console.log("\n✅ Migration applied. Now run:");
console.log('  $env:DATABASE_URL="..."; npx prisma migrate resolve --applied 20260618000000_master_data_linkage');

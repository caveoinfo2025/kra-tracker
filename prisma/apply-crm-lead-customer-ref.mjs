/**
 * One-time migration: add customerRefId FK on CrmLead → Customer
 * Run: node prisma/apply-crm-lead-customer-ref.mjs
 * Then: npx prisma migrate resolve --applied 20260618100000_crm_lead_customer_ref
 *       npx prisma generate
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mariadb = require("mariadb/promise.js");
const dotenv  = require("dotenv");
dotenv.config();

const url = process.env.DATABASE_URL || "";
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!m) { console.error("Could not parse DATABASE_URL"); process.exit(1); }

const conn = await mariadb.createConnection({
  host: m[3], port: Number(m[4]), user: m[1],
  password: decodeURIComponent(m[2]), database: m[5],
});

async function run(sql) {
  try {
    await conn.query(sql);
    console.log("✅", sql.slice(0, 100));
  } catch (e) {
    if ([1060, 1061, 1091].includes(e.errno)) {
      console.log("⏭  already ok:", sql.slice(0, 100));
    } else {
      console.warn("⚠️ ", e.message.slice(0, 120), "\n   SQL:", sql.slice(0, 100));
    }
  }
}

async function dropFk(table, fkName) {
  try {
    await conn.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
    console.log(`🗑  Dropped FK ${fkName}`);
  } catch { /* doesn't exist — fine */ }
}

await run("ALTER TABLE `CrmLead` ADD COLUMN `customerRefId` INT NULL");
await dropFk("CrmLead", "CrmLead_customerRefId_fkey");
await run("ALTER TABLE `CrmLead` ADD CONSTRAINT `CrmLead_customerRefId_fkey` FOREIGN KEY (`customerRefId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE");
await run("CREATE INDEX `CrmLead_customerRefId_idx` ON `CrmLead`(`customerRefId`)");

await conn.end();
console.log("\n✅ Migration complete. Now run:");
console.log("   npx prisma migrate resolve --applied 20260618100000_crm_lead_customer_ref");
console.log("   npx prisma generate");

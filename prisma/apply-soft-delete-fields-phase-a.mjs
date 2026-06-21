/**
 * One-time migration: add deletedAt/deletedById/deleteReason to the 7 approved
 * Phase A soft-delete models (Customer, Vendor, Expense, EmployeeAdvance,
 * TravelClaim, Payment, Collection). See docs/database/SOFT_DELETE_DECISION_LOG.md.
 * Run: node prisma/apply-soft-delete-fields-phase-a.mjs
 * Then: npx prisma migrate resolve --applied 20260621120000_add_soft_delete_fields_phase_a
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

if (m[5] !== "u686730471_caveodev") {
  console.error(`Refusing to run: DATABASE_URL points at "${m[5]}", not the dev DB "u686730471_caveodev".`);
  process.exit(1);
}

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

const models = ["Collection", "Customer", "EmployeeAdvance", "Expense", "Payment", "TravelClaim", "Vendor"];

for (const model of models) {
  await run(`ALTER TABLE \`${model}\` ADD COLUMN \`deleteReason\` TEXT NULL`);
  await run(`ALTER TABLE \`${model}\` ADD COLUMN \`deletedAt\` DATETIME(3) NULL`);
  await run(`ALTER TABLE \`${model}\` ADD COLUMN \`deletedById\` INTEGER NULL`);
  await run(`CREATE INDEX \`${model}_deletedAt_idx\` ON \`${model}\`(\`deletedAt\`)`);
}

await conn.end();
console.log("\n✅ Migration complete. Now run:");
console.log("   npx prisma migrate resolve --applied 20260621120000_add_soft_delete_fields_phase_a");
console.log("   npx prisma generate");

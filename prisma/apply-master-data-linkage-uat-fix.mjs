/**
 * Phase 17: UAT migration fix — handles existing columns/constraints gracefully.
 * Drops FK constraints before re-adding to avoid errno 121 conflicts.
 */
import { createConnection } from "mariadb";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const cleanUrl = url.replace(/\\%/g, "%");
const u = new URL(cleanUrl);
const db = u.pathname.slice(1);

const conn = await createConnection({
  host: u.hostname, port: Number(u.port) || 3306,
  user: u.username, password: decodeURIComponent(u.password),
  database: db,
});

async function run(sql) {
  try {
    await conn.query(sql);
    console.log("✅", sql.slice(0, 90));
  } catch (e) {
    if ([1060, 1061, 1091].includes(e.errno)) {
      console.log("⏭  already ok:", sql.slice(0, 90));
    } else {
      console.warn("⚠️ ", e.message.slice(0, 120), "\n   SQL:", sql.slice(0, 90));
    }
  }
}

// Helper: drop FK if it exists (ignores error if it doesn't)
async function dropFk(table, fkName) {
  try {
    await conn.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
    console.log(`🗑  Dropped FK ${fkName}`);
  } catch { /* doesn't exist — fine */ }
}

const tasks = [
  { table: "LeadGeneration", col: "customerId",       ref: "Customer",         fk: "LeadGeneration_customerId_fkey",       idx: "LeadGeneration_customerId_idx" },
  { table: "SalesFunnel",    col: "customerId",       ref: "Customer",         fk: "SalesFunnel_customerId_fkey",          idx: "SalesFunnel_customerId_idx" },
  { table: "Collection",     col: "customerId",       ref: "Customer",         fk: "Collection_customerId_fkey",           idx: "Collection_customerId_idx" },
  { table: "OrderAdvance",   col: "customerId",       ref: "Customer",         fk: "OrderAdvance_customerId_fkey",         idx: "OrderAdvance_customerId_idx" },
  { table: "Expense",        col: "expenseCategoryId",ref: "expense_category", fk: "Expense_expenseCategoryId_fkey",       idx: "Expense_expenseCategoryId_idx" },
];

for (const t of tasks) {
  const refCol = "id";
  await run(`ALTER TABLE \`${t.table}\` ADD COLUMN \`${t.col}\` INT NULL`);
  await dropFk(t.table, t.fk);
  await run(`ALTER TABLE \`${t.table}\` ADD CONSTRAINT \`${t.fk}\` FOREIGN KEY (\`${t.col}\`) REFERENCES \`${t.ref}\`(\`${refCol}\`) ON DELETE SET NULL ON UPDATE CASCADE`);
  await run(`CREATE INDEX \`${t.idx}\` ON \`${t.table}\`(\`${t.col}\`)`);
}

await conn.end();
console.log("\n✅ UAT migration complete. Now run:");
console.log('  $env:DATABASE_URL="..."; npx prisma migrate resolve --applied 20260618000000_master_data_linkage');

/**
 * Phase 17: Backfill customerId FK on operational tables from existing customerName strings.
 *
 * Matches by exact name first, then case-insensitive prefix (first 20 chars).
 * Safe to re-run: only updates rows where customerId IS NULL.
 *
 * Run AFTER apply-master-data-linkage.mjs:
 *   $env:DATABASE_URL="mysql://..."
 *   node scripts/phase17-backfill-customer-fks.mjs
 */

import { createConnection } from "mariadb";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const cleanUrl = url.replace(/\\%/g, "%");
const u = new URL(cleanUrl);

const conn = await createConnection({
  host: u.hostname,
  port: Number(u.port) || 3306,
  user: u.username,
  password: decodeURIComponent(u.password),
  database: u.pathname.slice(1),
});

async function backfill(table, nameCol) {
  // Exact match
  const exact = await conn.query(
    `UPDATE \`${table}\` t
     INNER JOIN \`Customer\` c ON LOWER(TRIM(c.name)) = LOWER(TRIM(t.\`${nameCol}\`))
     SET t.customerId = c.id
     WHERE t.customerId IS NULL AND t.\`${nameCol}\` != ''`
  );
  // Prefix match (first 20 chars) for slight mismatches
  const prefix = await conn.query(
    `UPDATE \`${table}\` t
     INNER JOIN \`Customer\` c ON LOWER(LEFT(TRIM(c.name), 20)) = LOWER(LEFT(TRIM(t.\`${nameCol}\`), 20))
     SET t.customerId = c.id
     WHERE t.customerId IS NULL AND t.\`${nameCol}\` != '' AND LENGTH(TRIM(t.\`${nameCol}\`)) >= 5`
  );
  const total = (exact.affectedRows ?? 0) + (prefix.affectedRows ?? 0);
  console.log(`  ${table}: ${total} rows linked (${exact.affectedRows ?? 0} exact, ${prefix.affectedRows ?? 0} prefix)`);
  return total;
}

console.log("🔗 Phase 17: Backfilling customer FKs...\n");

await backfill("LeadGeneration", "customerName");
await backfill("SalesFunnel",    "customerName");
await backfill("Collection",     "customerName");
await backfill("OrderAdvance",   "customerName");

// Expense: match category string → ExpenseCategory.name
const expExact = await conn.query(
  `UPDATE \`Expense\` e
   INNER JOIN \`expense_category\` ec ON LOWER(TRIM(ec.name)) = LOWER(TRIM(e.category))
   SET e.expenseCategoryId = ec.id
   WHERE e.expenseCategoryId IS NULL AND e.category != ''`
);
const expCode = await conn.query(
  `UPDATE \`Expense\` e
   INNER JOIN \`expense_category\` ec ON LOWER(TRIM(ec.code)) = LOWER(TRIM(e.categoryCode))
   SET e.expenseCategoryId = ec.id
   WHERE e.expenseCategoryId IS NULL AND e.categoryCode != ''`
);
console.log(`  Expense: ${(expExact.affectedRows ?? 0) + (expCode.affectedRows ?? 0)} rows linked`);

await conn.end();
console.log("\n✅ Backfill complete.");

/**
 * One-time data migration: copy data from production DB into UAT DB
 * for the 33 tables that exist in both schemas. Maps only columns common
 * to both tables (UAT has newer columns/tables from later migrations that
 * prod doesn't have yet — those are left untouched).
 *
 * Run: node prisma/migrate-prod-to-uat.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mariadb = require("mariadb/promise.js");

const PROD = {
  host: "srv2201.hstgr.io", port: 3306,
  user: "u686730471_caveoadmincrm", password: "Caveo@2026",
  database: "u686730471_caveo_crm",
};
const UAT = {
  host: "srv2201.hstgr.io", port: 3306,
  user: "u686730471_caveouat", password: "Caveo@2026",
  database: "u686730471_Caveo_UAT",
};

const prod = await mariadb.createConnection({ ...PROD, connectTimeout: 30000, socketTimeout: 0 });
const uat = await mariadb.createConnection({ ...UAT, connectTimeout: 30000, socketTimeout: 0 });

const tablesRes = await prod.query("SHOW TABLES");
const allTables = tablesRes.map(r => Object.values(r)[0]).filter(n => n !== "_prisma_migrations");

const startFrom = process.argv[2];
const tables = startFrom ? allTables.slice(allTables.indexOf(startFrom)) : allTables;

async function getColumns(conn, db, table) {
  const rows = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
    [db, table]
  );
  return rows.map(r => r.COLUMN_NAME);
}

await uat.query("SET FOREIGN_KEY_CHECKS = 0");

for (const table of tables) {
  const prodCols = await getColumns(prod, PROD.database, table);
  const uatColsRes = await uat.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.TABLES t JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME WHERE t.TABLE_SCHEMA = ? AND t.TABLE_NAME = ?",
    [UAT.database, table]
  );
  if (uatColsRes.length === 0) {
    console.log(`⏭  Skipping ${table} — table doesn't exist in UAT`);
    continue;
  }
  const uatCols = await getColumns(uat, UAT.database, table);
  const common = prodCols.filter(c => uatCols.includes(c));

  const rows = await prod.query(`SELECT * FROM \`${table}\``);
  await uat.query(`TRUNCATE TABLE \`${table}\``);

  if (rows.length === 0) {
    console.log(`✅ ${table}: truncated, 0 rows to copy`);
    continue;
  }

  const colList = common.map(c => `\`${c}\``).join(", ");
  const placeholders = common.map(() => "?").join(", ");
  const insertSql = `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`;

  const batchValues = rows.map(row => common.map(c => row[c]));
  const CHUNK = 100;
  let count = 0;
  for (let i = 0; i < batchValues.length; i += CHUNK) {
    const chunk = batchValues.slice(i, i + CHUNK);
    await uat.batch(insertSql, chunk);
    count += chunk.length;
  }
  console.log(`✅ ${table}: copied ${count} rows (${common.length}/${prodCols.length} columns)`);
}

await uat.query("SET FOREIGN_KEY_CHECKS = 1");

await prod.end();
await uat.end();
console.log("\n✅ Migration complete.");

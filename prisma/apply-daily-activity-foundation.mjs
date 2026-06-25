/**
 * One-time migration: apply 20260625120000_daily_activity_foundation to the dev DB.
 * Reads the migration SQL file directly (does not re-derive it) and executes each statement
 * in order. Targets the dev DB only — hardcoded guard below refuses to run against anything
 * else. Stops on the first real failure (does not silently skip/workaround) — only
 * "already exists" style errors (matching prior idempotent-rerun behavior in this project's
 * other apply-*.mjs scripts) are treated as non-fatal.
 *
 * Run: node prisma/apply-daily-activity-foundation.mjs
 * Then (only after manual verification): npx prisma migrate resolve --applied 20260625120000_daily_activity_foundation
 */
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "migrations", "20260625120000_daily_activity_foundation", "migration.sql");
const raw = readFileSync(sqlPath, "utf8");

// Strip full-line comments, then split into statements on ';'.
const statements = raw
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Read ${statements.length} statements from ${sqlPath}`);

const conn = await mariadb.createConnection({
  host: m[3], port: Number(m[4]), user: m[1],
  password: decodeURIComponent(m[2]), database: m[5],
});

const IDEMPOTENT_ERRNOS = [1050, 1060, 1061, 1091]; // table exists, column exists, dup key name, index/column not found
let applied = 0;
let skipped = 0;

for (const [i, stmt] of statements.entries()) {
  try {
    await conn.query(stmt);
    applied++;
    console.log(`✅ [${i + 1}/${statements.length}]`, stmt.slice(0, 90).replace(/\s+/g, " "));
  } catch (e) {
    if (IDEMPOTENT_ERRNOS.includes(e.errno)) {
      skipped++;
      console.log(`⏭  [${i + 1}/${statements.length}] already applied:`, stmt.slice(0, 90).replace(/\s+/g, " "));
    } else {
      console.error(`❌ [${i + 1}/${statements.length}] FAILED — stopping. Nothing further was applied.`);
      console.error("   Error:", e.message);
      console.error("   Statement:", stmt.slice(0, 200).replace(/\s+/g, " "));
      console.error(`   Statements successfully applied before failure: ${applied}, skipped (already-applied): ${skipped}, remaining unattempted: ${statements.length - i - 1}`);
      await conn.end();
      process.exit(1);
    }
  }
}

await conn.end();
console.log(`\n✅ Migration complete. Applied: ${applied}, skipped (already-applied): ${skipped}.`);
console.log("Now verify database objects manually, then run:");
console.log("   npx prisma migrate resolve --applied 20260625120000_daily_activity_foundation");
console.log("   npx prisma generate");

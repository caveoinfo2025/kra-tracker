// One-off migration apply script — Phase 9 Finance Admin Engine
// Usage: $env:DATABASE_URL="mysql://..."; node prisma/apply-finance-admin.mjs
import { createConnection } from "mariadb";
import { readFileSync }     from "fs";
import { fileURLToPath }    from "url";
import { dirname, join }    from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql       = readFileSync(
  join(__dirname, "migrations/20260605050000_finance_admin_engine/migration.sql"),
  "utf8"
);

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

// Strip Passenger backslash-escaping of % before parsing
const clean = url.replace(/\\%/g, "%");
const m     = clean.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
if (!m) { console.error("Cannot parse DATABASE_URL"); process.exit(1); }
const [, user, password, host, port, database] = m;

const conn = await createConnection({ host, port: Number(port), user, password, database });

const statements = sql
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

for (const stmt of statements) {
  try {
    await conn.query(stmt);
    const name = stmt.match(/CREATE TABLE `(\w+)`/)?.[1] ?? "statement";
    console.log(`  OK: ${name}`);
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR") {
      console.log(`  SKIP (already exists): ${e.message}`);
    } else {
      console.error(`  ERROR: ${e.message}`);
      await conn.end();
      process.exit(1);
    }
  }
}

await conn.end();
console.log("\nDone. Run: npx prisma migrate resolve --applied 20260605050000_finance_admin_engine");

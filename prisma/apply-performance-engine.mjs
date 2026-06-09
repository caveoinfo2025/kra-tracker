// One-off migration apply script — Phase 10 Performance Management Engine
// Usage: $env:DATABASE_URL="mysql://..."; node prisma/apply-performance-engine.mjs
import { createConnection } from "mariadb";
import { readFileSync }     from "fs";
import { fileURLToPath }    from "url";
import { dirname, join }    from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql       = readFileSync(
  join(__dirname, "migrations/20260609060000_performance_management_engine/migration.sql"),
  "utf8"
);

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

// Strip Passenger backslash-escaping of % before parsing, then URL-decode password
const clean = url.replace(/\\%/g, "%");
const m     = clean.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
if (!m) { console.error("Cannot parse DATABASE_URL"); process.exit(1); }
const [, user, rawPassword, host, port, database] = m;
const password = decodeURIComponent(rawPassword); // handles %40 → @, %25 → %, etc.

const conn = await createConnection({ host, port: Number(port), user, password, database });

const statements = sql
  .split(";")
  .map(s => s.trim())
  // Strip leading comment lines from each statement before filtering/executing
  .map(s => s.replace(/^(--[^\n]*\n)+/g, "").trim())
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
console.log("\nDone. Run: npx prisma migrate resolve --applied 20260609060000_performance_management_engine");

// One-off migration apply script — Phase 12 Integration Center
// Usage: $env:DATABASE_URL="mysql://..."; node prisma/apply-integration-center.mjs
import { createConnection } from "mariadb";
import { readFileSync }     from "fs";
import { fileURLToPath }    from "url";
import { dirname, join }    from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql       = readFileSync(
  join(__dirname, "migrations/20260610080000_integration_center/migration.sql"),
  "utf8"
);

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const clean = url.replace(/\\%/g, "%");
const m     = clean.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
if (!m) { console.error("Cannot parse DATABASE_URL"); process.exit(1); }
const [, user, rawPassword, host, port, database] = m;
const password = decodeURIComponent(rawPassword);

const conn = await createConnection({ host, port: Number(port), user, password, database });

const statements = sql
  .split(";")
  .map(s => s.trim())
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
console.log("\nDone. Run: npx prisma migrate resolve --applied 20260610080000_integration_center");

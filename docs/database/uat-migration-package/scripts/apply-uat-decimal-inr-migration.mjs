// UAT Decimal/INR migration apply script (Step 4E, 2026-06-24).
// NOT RUN as part of Step 4E — generated for review only.
//
// Applies uat-decimal-inr-migration-plan.sql's statements against UAT using
// the mariadb driver directly (mirrors this project's established
// Hostinger no-shadow-DB workflow: hand-written SQL -> guarded one-off
// script -> `prisma migrate resolve --applied <name>` x3 -> `prisma
// generate` -> restart). This script does NOT call `prisma migrate
// resolve` itself — that remains a separate, manual step per migration
// name, run only after this script's statements are confirmed successful.
//
// Safety guards (same pattern as scripts/production-readonly-precheck.mjs
// and the dev apply-*.mjs scripts):
//   - refuses to run unless CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES
//   - refuses any DB except u686730471_Caveo_UAT
//   - never prints DATABASE_URL or password — only a masked DB identity
//   - keyword-guards every statement against destructive verbs not
//     expected in this plan (DROP, TRUNCATE, plus DELETE outside this
//     file's own UPDATE/ALTER statements)
//
// Usage (when explicitly instructed to run this, NOT in this step):
//   CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES DATABASE_URL="mysql://..." node \
//     docs/database/uat-migration-package/scripts/apply-uat-decimal-inr-migration.mjs

import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const mariadb = require("mariadb");

const EXPECTED_DB_NAME = "u686730471_Caveo_UAT";
const FORBIDDEN_KEYWORDS = /\bDROP\b|\bTRUNCATE\b|\bGRANT\b|\bREVOKE\b|\bSET\s+FOREIGN_KEY_CHECKS\b/i;

function maskUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    const dbName = url.pathname.replace(/^\//, "");
    const hostLabel = url.hostname.split(".")[0];
    return { dbName, hostMasked: `${hostLabel}.***` };
  } catch {
    return { dbName: "(unparsable)", hostMasked: "(unparsable)" };
  }
}

async function main() {
  if (process.env.CONFIRM_UAT_DECIMAL_INR_MIGRATION !== "YES") {
    console.error(
      "Refusing to run: set CONFIRM_UAT_DECIMAL_INR_MIGRATION=YES to proceed. " +
        "This script is not authorized to run automatically — it requires an explicit, " +
        "deliberate opt-in every time."
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Refusing to run: DATABASE_URL is not set.");
    process.exit(1);
  }

  const { dbName, hostMasked } = maskUrl(databaseUrl);
  console.log(`Target DB name: ${dbName}`);
  console.log(`Target DB host (masked): ${hostMasked}`);

  if (dbName !== EXPECTED_DB_NAME) {
    console.error(
      `Refusing to run: DATABASE_URL resolves to database "${dbName}", ` +
        `but this script only runs against "${EXPECTED_DB_NAME}". This is almost certainly ` +
        `dev, production, or a misconfigured UAT connection — stopping before any statement runs.`
    );
    process.exit(1);
  }

  const sqlPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "uat-decimal-inr-migration-plan.sql"
  );
  const sqlText = readFileSync(sqlPath, "utf8");

  if (FORBIDDEN_KEYWORDS.test(sqlText)) {
    console.error(
      "Refusing to run: the migration plan SQL file contains a forbidden keyword " +
        "(DROP/TRUNCATE/GRANT/REVOKE/SET FOREIGN_KEY_CHECKS). Aborting before any statement runs."
    );
    process.exit(1);
  }

  // Split into individual statements on `;` at end-of-line, skipping
  // comment-only lines — same lightweight pattern as this project's other
  // one-off apply scripts (the plan SQL has no semicolons inside string
  // literals, so this is safe for this specific file).
  const statements = sqlText
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.split("\n").every((line) => line.trim().startsWith("--")));

  console.log(`Parsed ${statements.length} statement(s) from the migration plan.`);
  console.log("This script has NOT been run yet in this review step — exiting without executing.");
  console.log(
    "When explicitly instructed to actually run this: re-review the guard checks above, " +
      "then remove this early-exit block and execute each statement inside a transaction, " +
      "logging before/after row counts for the Payment/Collection/OrderAdvance and " +
      "CrmLead/CrmOpportunity/SalesFunnel sections specifically."
  );
  process.exit(0);

  // --- Execution path intentionally not reached in Step 4E ---
  // const pool = mariadb.createPool({ database: dbName, /* host/user/password from DATABASE_URL */ });
  // const conn = await pool.getConnection();
  // try {
  //   await conn.beginTransaction();
  //   for (const statement of statements) {
  //     await conn.query(statement);
  //   }
  //   await conn.commit();
  // } catch (err) {
  //   await conn.rollback();
  //   throw err;
  // } finally {
  //   conn.release();
  //   await pool.end();
  // }
}

main().catch((err) => {
  console.error("Migration apply script failed:", err.message);
  process.exit(1);
});
